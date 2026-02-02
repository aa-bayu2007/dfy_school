import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RiwayatAbsensi() {
  const { user } = useAuth();
  const { data: attendances, isLoading } = useAttendance(user?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hadir':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Hadir
          </Badge>
        );
      case 'sakit':
        return (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" />
            Sakit
          </Badge>
        );
      case 'izin':
        return (
          <Badge className="bg-warning text-warning-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Izin
          </Badge>
        );
      case 'alpha':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Alpha
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  // Group attendance by month
  const groupedByMonth = attendances?.reduce((acc, att) => {
    const month = new Date(att.date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
    });
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(att);
    return acc;
  }, {} as Record<string, typeof attendances>);

  // Calculate stats
  const stats = attendances?.reduce(
    (acc, att) => {
      acc[att.status] = (acc[att.status] || 0) + 1;
      acc.total++;
      return acc;
    },
    { hadir: 0, sakit: 0, izin: 0, alpha: 0, pending: 0, total: 0 }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Riwayat Absensi
        </h1>
        <p className="text-muted-foreground">
          Rekap kehadiran Anda
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hadir</p>
                <p className="text-2xl font-bold text-success">{stats?.hadir || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sakit</p>
                <p className="text-2xl font-bold">{stats?.sakit || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Izin</p>
                <p className="text-2xl font-bold text-warning">{stats?.izin || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-warning/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alpha</p>
                <p className="text-2xl font-bold text-destructive">{stats?.alpha || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Detail Kehadiran</CardTitle>
          <CardDescription>
            {stats?.total || 0} total data kehadiran
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendances && attendances.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell>
                        {new Date(att.date).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {att.schedule?.subject?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {att.schedule?.time_slot?.start_time?.slice(0, 5)} -{' '}
                        {att.schedule?.time_slot?.end_time?.slice(0, 5)}
                      </TableCell>
                      <TableCell>{getStatusBadge(att.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {att.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Belum ada data kehadiran
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
