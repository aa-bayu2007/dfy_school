import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRecordAttendance } from '@/hooks/useAttendance';
import { useSchedulesByDay } from '@/hooks/useSchedules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Camera, StopCircle, CheckCircle, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

export default function ScanAbsensi() {
  const { user, profile } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<Array<{ name: string; time: string; status: 'success' | 'error' }>>([]);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedCodesRef = useRef<Set<string>>(new Set());
  const recordAttendance = useRecordAttendance();

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  const { data: schedulesByDay } = useSchedulesByDay(profile?.class_id?.toString() || undefined);

  // Load available cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` })));

        // Try to find back camera, otherwise use first
        // Note: 'back' or 'environment' usually indicates rear camera
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
      toast.error("Gagal mendeteksi kamera. Pastikan izin diberikan.");
    });
  }, []); // Only run once on mount

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Effect to handle scanner lifecycle based on `scanning` state
  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      if (!scanning) {
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            console.error("Error stopping scanner", e);
          }
          scannerRef.current = null;
        }
        setScanStatus('idle');
        return;
      }

      if (!selectedCameraId) {
        toast.error("Pilih kamera terlebih dahulu!");
        setScanning(false);
        return;
      }

      setScanStatus('scanning');

      // Wait for DOM element
      if (!document.getElementById('qr-reader')) {
        setTimeout(initScanner, 100);
        return;
      }

      if (scannerRef.current) return; // Already running

      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          selectedCameraId, // Use specific device ID instead of generic facingMode
          {
            fps: 15, // Higher FPS for better detection
            aspectRatio: 1.0,
            // qrbox removed to allow full-screen scanning
          },
          async (decodedText) => {
            if (!mounted) return;
            console.log("QR Decoded Raw:", decodedText);

            // Prevent duplicate scans in session
            if (scannedCodesRef.current.has(decodedText)) {
              if (scannerRef.current) await scannerRef.current.pause(true);
              toast.info("Siswa ini sudah diabsen barusan.");
              setScanStatus('success'); // Show green briefly for feedback that it was read

              setTimeout(() => {
                if (mounted) {
                  setScanStatus('scanning');
                  if (scannerRef.current) scannerRef.current.resume();
                }
              }, 1500);
              return;
            }

            try {
              // Pause scanner briefly
              if (scannerRef.current) {
                await scannerRef.current.pause(true);
              }

              const result = await recordAttendance.mutateAsync({
                qrCode: decodedText,
                scannerId: user?.id || '',
              });

              // SUCCESS FEEDBACK
              setScanStatus('success');
              scannedCodesRef.current.add(decodedText); // Add to session cache

              const studentName = result.student_name || "Siswa";
              toast.success(`Berhasil: ${studentName}`);

              setScannedStudents((prev) => [
                {
                  name: `${studentName} ${result.is_full_day ? '(Full Masuk)' : '(Hadir)'}`,
                  time: new Date().toLocaleTimeString('id-ID'),
                  status: 'success'
                },
                ...prev,
              ]);

              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1...');
              audio.play().catch(() => { });

              // Resume scanning after delay
              setTimeout(() => {
                if (mounted) {
                  setScanStatus('scanning');
                  if (scannerRef.current) scannerRef.current.resume();
                }
              }, 1500);

            } catch (error: any) {
              // ERROR FEEDBACK
              console.error("Scan Error:", error);
              setScanStatus('error');
              toast.error(error.message || "Gagal mencatat kehadiran");

              setScannedStudents((prev) => [
                {
                  name: `Gagal Scan: ${decodedText.substring(0, 10)}...`,
                  time: new Date().toLocaleTimeString('id-ID'),
                  status: 'error'
                },
                ...prev,
              ]);

              // Resume scanning after delay
              setTimeout(() => {
                if (mounted) {
                  setScanStatus('scanning');
                  if (scannerRef.current) scannerRef.current.resume();
                }
              }, 1500);
            }
          },
          (errorMessage) => {
            // Internal parse error, ignore
          }
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
        toast.error("Gagal memulai kamera. Pastikan izin kamera diberikan.");
        setScanning(false);
      }
    };

    initScanner();

    return () => {
      mounted = false;
    };
  }, [scanning, user?.id, selectedCameraId]);

  const startScanning = () => setScanning(true);
  const stopScanning = () => setScanning(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Scan Absensi
        </h1>
        <p className="text-muted-foreground">
          Scan QR code siswa untuk mencatat kehadiran (Desktop & Mobile Ready)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Section */}
        <Card className={`shadow-elegant transition-all duration-300 ${scanStatus === 'success' ? 'ring-4 ring-success/50' : scanStatus === 'error' ? 'ring-4 ring-destructive/50' : ''}`}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>QR Scanner</span>
              {scanning && (
                <Badge variant="outline" className="animate-pulse bg-primary/10 text-primary">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Scanning...
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex flex-col gap-2">
              <span>Arahkan kamera ke QR code siswa</span>
              {cameras.length > 0 && (
                <div className="mt-2">
                  <Select
                    value={selectedCameraId}
                    onValueChange={(val) => {
                      setSelectedCameraId(val);
                      // If scanning, stop first to allow effect to restart with new camera
                      if (scanning) setScanning(false);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Kamera / Webcam" />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map(cam => (
                        <SelectItem key={cam.id} value={cam.id}>
                          {cam.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="relative w-full aspect-square lg:aspect-video bg-muted rounded-lg overflow-hidden border-2 border-primary/5">
              <style>{`
                #qr-reader video {
                  object-fit: cover !important;
                  width: 100% !important;
                  height: 100% !important;
                  border-radius: 0.5rem;
                }
                #qr-reader {
                  width: 100% !important;
                  height: 100% !important;
                  overflow: hidden;
                }
              `}</style>

              {/* Visual Flash Overlay */}
              {scanStatus === 'success' && (
                <div className="absolute inset-0 z-50 bg-success/40 animate-out fade-out duration-500 pointer-events-none flex items-center justify-center">
                  <CheckCircle className="h-20 w-20 text-white drop-shadow-lg" />
                </div>
              )}
              {scanStatus === 'error' && (
                <div className="absolute inset-0 z-50 bg-destructive/40 animate-out fade-out duration-500 pointer-events-none flex items-center justify-center">
                  <XCircle className="h-20 w-20 text-white drop-shadow-lg" />
                </div>
              )}

              <div
                id="qr-reader"
                className="w-full h-full"
              />

              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted border-2 border-dashed border-primary/10">
                  <div className="bg-background/50 p-6 rounded-full mb-4">
                    <Camera className="h-12 w-12 text-primary opacity-40" />
                  </div>
                  <p className="text-muted-foreground text-center px-6 font-medium">
                    Kamera belum aktif
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pastikan izin kamera di-Allow
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!scanning ? (
                <Button
                  onClick={startScanning}
                  className="flex-1 gradient-primary h-12 text-lg shadow-lg"
                  disabled={!selectedCameraId}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {selectedCameraId ? 'Mulai Scan' : 'Mendeteksi Kamera...'}
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  className="flex-1 h-12 text-lg shadow-lg"
                >
                  <StopCircle className="h-5 w-5 mr-2" />
                  Stop Scan
                </Button>
              )}
            </div>

            {/* Status Text Info */}
            <div className="text-center h-6">
              {scanStatus === 'success' && <span className="text-success font-bold animate-pulse">Scan Berhasil!</span>}
              {scanStatus === 'error' && <span className="text-destructive font-bold animate-pulse">Gagal Membaca QR / Data Invalid</span>}
              {scanStatus === 'scanning' && <span className="text-muted-foreground text-xs">Pastikan QR Code Terlihat Jelas</span>}
            </div>

          </CardContent>
        </Card>

        {/* Scanned Students List */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Riwayat Scan Sesi Ini</span>
              <Badge variant="secondary">{scannedStudents.filter(s => s.status === 'success').length} siswa</Badge>
            </CardTitle>
            <CardDescription>
              Daftar siswa yang sudah diabsen hari ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scannedStudents.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scannedStudents.map((student, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg animate-fade-in ${student.status === 'success' ? 'bg-success/10' : 'bg-destructive/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      {student.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <span className={`font-medium ${student.status === 'error' ? 'text-destructive' : ''}`}>{student.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{student.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada siswa yang discan
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
