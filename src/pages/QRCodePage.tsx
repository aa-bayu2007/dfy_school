import { useAuth } from '@/contexts/AuthContext';
import { useStudentQRCode } from '@/hooks/useAttendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, RefreshCw, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function QRCodePage() {
  const { user } = useAuth();
  const { data: qrCode, isLoading, refetch } = useStudentQRCode(user?.id);

  // Use student data from QR code response if available for most up-to-date info
  const studentInfo = qrCode?.student || null;

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <Skeleton className="h-64 w-64 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6 text-primary" />
          QR Code Absensi
        </h1>
        <p className="text-muted-foreground">
          Tunjukkan QR code ini kepada ketua kelas untuk absensi
        </p>
      </div>

      <div className="flex justify-center">
        <Card className="max-w-md w-full shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle>{studentInfo?.name || "Memuat..."}</CardTitle>
            <CardDescription>
              {studentInfo?.nis && `NIS: ${studentInfo.nis}`}
              {studentInfo?.class?.name && ` • Kelas ${studentInfo.class.name}`}
              {!studentInfo?.class?.name && " • Belum ada kelas"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="p-6 bg-white rounded-2xl shadow-inner">
              {qrCode ? (
                <QRCodeSVG
                  value={qrCode.qr_code}
                  size={256}
                  level="M"
                  includeMargin
                  className="rounded-lg"
                />
              ) : (
                <div className="h-56 w-56 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-muted-foreground">QR tidak tersedia</p>
                </div>
              )}
            </div>

            <div className="text-center space-y-2">
              <Badge variant="outline" className="text-sm">
                Berlaku untuk: {today}
              </Badge>
              {qrCode?.is_used && (
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Sudah digunakan hari ini</span>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => refetch()}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh QR Code
            </Button>

            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>QR Code ini hanya berlaku untuk hari ini</p>
              <p>Akan di-generate ulang setiap hari secara otomatis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
