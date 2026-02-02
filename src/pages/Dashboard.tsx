import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useAttendanceRequests } from '@/hooks/useAttendanceRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export default function Dashboard() {
  const { profile, roles, user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const { data: todayAttendance } = useAttendance(user?.id, today);
  const { data: pendingRequests } = useAttendanceRequests(undefined, 'pending');

  const isAdmin = roles.includes('admin');
  const isGuru = roles.includes('guru');
  const isKetuaKelas = roles.includes('ketua_kelas');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const stats = [
    {
      title: 'Hadir Hari Ini',
      value: todayAttendance?.filter((a) => a.status === 'hadir').length || 0,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Izin/Sakit',
      value:
        todayAttendance?.filter((a) => a.status === 'izin' || a.status === 'sakit').length || 0,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Alpha',
      value: todayAttendance?.filter((a) => a.status === 'alpha').length || 0,
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Pending Review',
      value: pendingRequests?.length || 0,
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      showFor: ['admin', 'guru'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-xl gradient-primary p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">
          {getGreeting()}, {profile?.full_name}!
        </h1>
        <p className="opacity-90">
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.map((role) => (
            <Badge key={role} variant="secondary" className="bg-white/20 text-white">
              {role === 'admin' && 'Administrator'}
              {role === 'guru' && 'Guru'}
              {role === 'ketua_kelas' && 'Ketua Kelas'}
              {role === 'murid' && 'Murid'}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats
          .filter(
            (stat) =>
              !stat.showFor ||
              stat.showFor.some((r) => roles.includes(r as any))
          )
          .map((stat) => (
            <Card key={stat.title} className="shadow-elegant">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isKetuaKelas && (
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Scan Absensi
              </CardTitle>
              <CardDescription>
                Scan QR code teman sekelas untuk mencatat kehadiran
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Jadwal Hari Ini
            </CardTitle>
            <CardDescription>
              Lihat jadwal pelajaran untuk hari ini
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Riwayat Absensi
            </CardTitle>
            <CardDescription>
              Lihat rekap kehadiran bulan ini
            </CardDescription>
          </CardHeader>
        </Card>

        {(isAdmin || isGuru) && (
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Laporan & Statistik
              </CardTitle>
              <CardDescription>
                Export dan analisis data kehadiran
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
          <CardDescription>Riwayat absensi terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          {todayAttendance && todayAttendance.length > 0 ? (
            <div className="space-y-4">
              {todayAttendance.slice(0, 5).map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        attendance.status === 'hadir'
                          ? 'bg-success'
                          : attendance.status === 'alpha'
                          ? 'bg-destructive'
                          : 'bg-warning'
                      }`}
                    />
                    <div>
                      <p className="font-medium">
                        {attendance.schedule?.subject?.name || 'Mata Pelajaran'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {attendance.schedule?.time_slot?.start_time?.slice(0, 5)} -{' '}
                        {attendance.schedule?.time_slot?.end_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      attendance.status === 'hadir'
                        ? 'default'
                        : attendance.status === 'alpha'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Belum ada data absensi hari ini
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
