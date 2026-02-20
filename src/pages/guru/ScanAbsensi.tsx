import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRecordAttendance, useAttendance, useManualAttendance } from '@/hooks/useAttendance';
import { useStudents } from '@/hooks/useStudents';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScanLine, Camera, StopCircle, CheckCircle, AlertCircle, RefreshCw, XCircle, Clock } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';

export default function ScanAbsensi() {
  const { user, profile } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ studentName: string; decodedText: string } | null>(null);

  // Manual Entry State
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const { data: students } = useStudents(profile?.class_id);
  const manualAttendance = useManualAttendance();

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: attendances, refetch: refetchHistory } = useAttendance(
    undefined,
    undefined,
    todayStr,
    user?.id
  );

  // Derived history from persistent attendance records - sorted latest first
  // Deduplicate by student ID (or name if ID missing), keeping the LATEST record
  const scannedStudents = (() => {
    if (!attendances) return [];

    const uniqueMap = new Map();
    // Sort by scanned_at descending first to ensure we process latest first
    const sorted = [...attendances].sort((a, b) => new Date(b.scanned_at || 0).getTime() - new Date(a.scanned_at || 0).getTime());

    sorted.forEach(att => {
      const key = att.student?.id || att.student?.full_name || att.student_id; // Prefer ID
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, att);
      }
    });

    return Array.from(uniqueMap.values()).map(att => {
      let statusLabel = '';
      if (att.status === 'hadir') {
        statusLabel = '(Hadir)';
      } else if (att.status === 'izin' || att.status === 'sakit') {
        const timeStr = att.approved_at
          ? new Date(att.approved_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '';
        statusLabel = `(${att.status === 'izin' ? 'Izin' : 'Sakit'}${timeStr ? ' pd jam ' + timeStr : ''})`;
      }

      return {
        name: `${att.student?.full_name || att.student?.name || 'Siswa'} ${statusLabel}`,
        time: att.scanned_at ? new Date(att.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        status: att.status as 'hadir' | 'sakit' | 'izin' | 'alpha' | 'pending' | 'success' | 'error'
      };
    });
  })();

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
        const scanner = new Html5Qrcode('qr-reader', false);
        scannerRef.current = scanner;

        await scanner.start(
          selectedCameraId, // Use specific device ID instead of generic facingMode
          {
            fps: 15,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            // Try to get a decent resolution if available
            videoConstraints: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: "environment"
            }
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

              if (result.confirmation_required) {
                setConfirmData({ studentName: result.student_name, decodedText });
                setConfirmOpen(true);
                setScanStatus('idle'); // Pause state visualization
                return;
              }

              // SUCCESS FEEDBACK
              setScanStatus('success');
              scannedCodesRef.current.add(decodedText); // Add to session cache

              const studentName = result.student_name || "Siswa";
              toast.success(`Berhasil: ${studentName}`);

              // Refetch history to show the update
              refetchHistory();

              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1...');
              audio.play().catch(() => { });

              // Resume scanning after delay
              setTimeout(() => {
                if (mounted) {
                  setScanStatus('scanning');
                  if (scannerRef.current) scannerRef.current.resume();
                }
              }, 1500);

            } catch (error) {
              // ERROR FEEDBACK
              console.error("Scan Error:", error);
              setScanStatus('error');
              const message = error instanceof Error ? error.message : "Gagal mencatat kehadiran";
              toast.error(message);

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
  }, [scanning, selectedCameraId]); // Removed recordAttendance and user?.id to prevent re-render loop

  const startScanning = () => setScanning(true);
  const stopScanning = () => setScanning(false);

  const handleConfirmReturn = async () => {
    if (!confirmData) return;
    try {
      setScanStatus('scanning');
      const result = await recordAttendance.mutateAsync({
        qrCode: confirmData.decodedText,
        scannerId: user?.id || '',
        force: true
      });

      setScanStatus('success');
      scannedCodesRef.current.add(confirmData.decodedText);
      toast.success(`Berhasil override: ${result.student_name}`);
      refetchHistory();

      // Resume scanning
      setTimeout(() => {
        setScanStatus('scanning');
        if (scannerRef.current) scannerRef.current.resume();
      }, 1500);

    } catch (error) {
      setScanStatus('error');
      toast.error("Gagal override status");

      // Resume scanning
      setTimeout(() => {
        setScanStatus('scanning');
        if (scannerRef.current) scannerRef.current.resume();
      }, 1500);
    } finally {
      setConfirmOpen(false);
      setConfirmData(null);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmOpen(false);
    setConfirmData(null);
    setScanStatus('scanning');
    if (scannerRef.current) scannerRef.current.resume();
  };

  const handleManualSubmit = async () => {
    if (!selectedStudentId) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }

    try {
      await manualAttendance.mutateAsync({ studentId: Number(selectedStudentId) });
      setManualOpen(false);
      setSelectedStudentId('');
      refetchHistory();
    } catch (error) {
      console.error("Manual entry error", error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Absensi"
        description="Scan QR code siswa untuk mencatat kehadiran (Desktop & Mobile Ready)"
        icon={ScanLine}
      />

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
                    onValueChange={(val: string) => {
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
                  border: none !important;
                }
                #qr-shaded-region {
                  border-radius: 0.5rem !important;
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

            {/* Manual Input Dialog */}
            <div className="flex gap-2">
              {!scanning ? (
                <>
                  <Button
                    onClick={startScanning}
                    className="flex-1 gradient-primary h-12 text-lg shadow-lg"
                    disabled={!selectedCameraId}
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    {selectedCameraId ? 'Mulai Scan' : 'Mendeteksi Kamera...'}
                  </Button>
                  {/* Manual Input - Only for Wali Kelas / Guru */}
                  {(user?.role === 'guru' || user?.role === 'teacher' || user?.role === 'admin') && (
                    <Button
                      variant="outline"
                      className="h-12 px-4 border-2 border-primary/20 text-primary hover:bg-primary/5"
                      onClick={() => setManualOpen(true)}
                    >
                      Input Manual
                    </Button>
                  )}
                </>
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

            <AlertDialog open={manualOpen} onOpenChange={setManualOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Input Absensi Manual</AlertDialogTitle>
                  <AlertDialogDescription>
                    Pilih siswa yang ingin dicatat kehadirannya secara manual (misal: kembali ke kelas).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <label className="text-sm font-medium mb-2 block">Pilih Siswa</label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cari nama siswa..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {students?.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.full_name || s.name} ({s.nis || '-'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setManualOpen(false)}>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleManualSubmit} disabled={manualAttendance.isPending}>
                    {manualAttendance.isPending ? 'Menyimpan...' : 'Simpan Kehadiran'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Status Text Info */}
            <div className="text-center h-6">
              {scanStatus === 'success' && <span className="text-success font-bold animate-pulse ">Scan Berhasil!</span>}
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
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg animate-fade-in transition-all border",
                      student.status === 'hadir' || student.status === 'success' ? "bg-success/10 border-success/20 text-success" :
                        student.status === 'izin' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                          student.status === 'sakit' || student.status === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" :
                            "bg-muted border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {(student.status === 'hadir' || student.status === 'success') ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : student.status === 'izin' ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                      <span className="font-bold tracking-tight">{student.name}</span>
                    </div>
                    <span className="text-sm font-bold opacity-70 font-mono tracking-tighter">{student.time}</span>
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Kehadiran Kembali</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmData?.studentName} sedang dalam status Izin/Sakit. Apakah Anda yakin siswa ini sudah kembali masuk ke kelas?
              Status kehadirannya akan diubah menjadi Hadir untuk sisa hari ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirm}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReturn} className="gradient-primary">
              Ya, Siswa Masuk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
