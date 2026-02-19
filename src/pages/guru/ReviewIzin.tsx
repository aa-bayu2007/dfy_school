import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceRequests, useReviewAttendanceRequest } from '@/hooks/useAttendanceRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileText, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export default function ReviewIzin() {
  const { user, profile, roles } = useAuth();
  const isGuru = roles.includes('guru');
  const classId = isGuru ? profile?.class_id : undefined;

  const { data: pendingRequests, isLoading: loadingPending } = useAttendanceRequests(undefined, 'pending', classId);
  const { data: allRequests, isLoading: loadingAll } = useAttendanceRequests(undefined, undefined, classId);
  const reviewRequest = useReviewAttendanceRequest();

  const handleReview = async (requestId: number, status: 'approved' | 'rejected') => {
    await reviewRequest.mutateAsync({
      requestId: requestId.toString(),
      status,
      reviewerId: user?.id?.toString() || '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Disetujui
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Ditolak
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (loadingPending || loadingAll) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Izin/Sakit"
        description="Kelola pengajuan izin dan sakit siswa"
        icon={FileText}
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Menunggu Review
            {pendingRequests && pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-destructive" variant="destructive">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Semua Pengajuan</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Pengajuan Menunggu</CardTitle>
              <CardDescription>
                {pendingRequests?.length || 0} pengajuan perlu ditinjau
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests && pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex flex-col md:flex-row md:items-start justify-between p-4 border rounded-lg gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{req.student?.full_name}</span>
                          <Badge variant="outline">
                            {req.request_type === 'sakit' ? 'Sakit' : 'Izin'}
                          </Badge>
                          <Badge variant="secondary">
                            {req.is_full_day
                              ? "Seharian"
                              : req.schedules && req.schedules.length > 0
                                ? `${req.schedules.length} Jam Pelajaran`
                                : "Sebagian Hari"
                            }
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          NIS: {req.student?.nis || '-'} • Kelas: {req.student?.class?.name || '-'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Tanggal:</span>{' '}
                          {new Date(req.date).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Alasan:</span> {req.reason}
                        </p>
                        {!req.is_full_day && req.schedules && req.schedules.length > 0 && (
                          <div className="pt-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase">Mapel Terkait:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {req.schedules.map(s => (
                                <Badge key={s.id} variant="secondary" className="text-[10px] py-0 h-4">
                                  {s.subject?.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive">
                              <XCircle className="h-4 w-4 mr-1" />
                              Tolak
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tolak Pengajuan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menolak pengajuan {req.request_type} dari{' '}
                                {req.student?.full_name}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleReview(req.id, 'rejected')}
                                className="bg-destructive text-destructive-foreground"
                              >
                                {reviewRequest.isPending && (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Tolak
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button
                          size="sm"
                          className="bg-success text-success-foreground hover:bg-success/90"
                          onClick={() => handleReview(req.id, 'approved')}
                          disabled={reviewRequest.isPending}
                        >
                          {reviewRequest.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Setujui
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Semua beres!"
                  description="Tidak ada pengajuan yang menunggu review"
                  icon={CheckCircle}
                  className="py-12"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Semua Pengajuan</CardTitle>
              <CardDescription>
                Riwayat semua pengajuan izin/sakit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allRequests && allRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Siswa</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">
                            {req.student?.full_name}
                          </TableCell>
                          <TableCell>
                            {new Date(req.date).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit">
                                {req.request_type === 'sakit' ? 'Sakit' : 'Izin'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {req.is_full_day ? "Seharian" : `${req.schedules?.length || 0} Mapel`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {req.reason}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={req.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  title="Belum ada data"
                  description="Belum ada data pengajuan"
                  icon={FileText}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
