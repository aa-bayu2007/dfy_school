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
import { ScanLine, Camera, StopCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

export default function ScanAbsensi() {
  const { user, profile } = useAuth();
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [scannedStudents, setScannedStudents] = useState<Array<{ name: string; time: string }>>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const recordAttendance = useRecordAttendance();

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  const { data: schedulesByDay, rawData: schedules } = useSchedulesByDay(profile?.class_id || undefined);

  const todaySchedules = schedulesByDay.find((d) => d.nama_hari === today)?.jadwal || [];

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!selectedSchedule) {
      toast.error('Pilih mata pelajaran terlebih dahulu!');
      return;
    }

    try {
      scannerRef.current = new Html5Qrcode('qr-reader');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Process QR code
          try {
            await recordAttendance.mutateAsync({
              qrCode: decodedText,
              scannerId: user?.id || '',
              scheduleId: selectedSchedule,
            });

            setScannedStudents((prev) => [
              { 
                name: 'Siswa berhasil diabsen', 
                time: new Date().toLocaleTimeString('id-ID') 
              },
              ...prev,
            ]);

            // Play success sound (optional)
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1...');
            audio.play().catch(() => {});
          } catch (error) {
            // Error already handled by mutation
          }
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );
      setScanning(true);
    } catch (error) {
      toast.error('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
      console.error(error);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Scan Absensi
        </h1>
        <p className="text-muted-foreground">
          Scan QR code siswa untuk mencatat kehadiran
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner Section */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>QR Scanner</CardTitle>
            <CardDescription>
              Arahkan kamera ke QR code siswa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Mata Pelajaran" />
              </SelectTrigger>
              <SelectContent>
                {todaySchedules.map((jadwal) => (
                  <SelectItem key={jadwal.id} value={jadwal.id}>
                    {jadwal.mapel} ({jadwal.jam})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div
              id="qr-reader"
              className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
              style={{ display: scanning ? 'block' : 'none' }}
            />

            {!scanning && (
              <div className="w-full aspect-square bg-muted rounded-lg flex flex-col items-center justify-center">
                <Camera className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Klik tombol di bawah untuk mulai scan
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {!scanning ? (
                <Button
                  onClick={startScanning}
                  className="flex-1 gradient-primary"
                  disabled={!selectedSchedule}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Mulai Scan
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  className="flex-1"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Scan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scanned Students List */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Siswa Terscann</span>
              <Badge variant="secondary">{scannedStudents.length} siswa</Badge>
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
                    className="flex items-center justify-between p-3 bg-success/10 rounded-lg animate-fade-in"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">{student.name}</span>
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
