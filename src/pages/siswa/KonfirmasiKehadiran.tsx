import { useAuth } from '@/contexts/AuthContext';
import { useAttendance, useManualAttendance } from '@/hooks/useAttendance';
import { useStudents } from '@/hooks/useStudents';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, Clock, AlertCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function KonfirmasiKehadiran() {
    const { profile } = useAuth();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Get Class Students
    const { data: students, isLoading: loadingStudents } = useStudents(profile?.class_id);

    // 2. Get Today's Attendance
    const { data: attendances, isLoading: loadingAttendance } = useAttendance(
        undefined,
        profile?.class_id,
        todayStr
    );

    const manualAttendance = useManualAttendance();

    // 3. Filter Logic
    const eligibleStudents = (() => {
        if (!students || !attendances) return [];

        // Group attendance by student ID
        const attendanceMap = new Map<number, any[]>();
        attendances.forEach(att => {
            const list = attendanceMap.get(att.student_id) || [];
            list.push(att);
            attendanceMap.set(att.student_id, list);
        });

        return students.filter(student => {
            const studentAtts = attendanceMap.get(student.id) || [];
            if (studentAtts.length === 0) return false;

            // Sort by time descending (latest first)
            const sortedAtts = studentAtts.sort((a, b) =>
                new Date(b.scanned_at || 0).getTime() - new Date(a.scanned_at || 0).getTime()
            );

            const latestStatus = sortedAtts[0].status;

            // Criteria 1: Current status MUST be 'izin'
            if (latestStatus !== 'izin') return false;

            // Criteria 2: Must NOT be 'sakit' (handled by latestStatus check, but just to be sure)
            if (latestStatus === 'sakit') return false;

            // Criteria 3: Removed strict check for 'hadir' record.
            // Allow confirming any student who is currently 'izin' (even if they were late or izin from morning)
            // const hasPresentRecord = studentAtts.some(att => att.status === 'hadir');

            return true;
        }).map(student => {
            const studentAtts = attendanceMap.get(student.id) || [];
            const sortedAtts = studentAtts.sort((a, b) =>
                new Date(b.scanned_at || 0).getTime() - new Date(a.scanned_at || 0).getTime()
            );
            return {
                ...student,
                last_status_time: sortedAtts[0].scanned_at
            }
        });
    })();

    const handleConfirm = (studentId: number) => {
        manualAttendance.mutate({ studentId });
    };

    if (loadingStudents || loadingAttendance) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Konfirmasi Kehadiran"
                description="Konfirmasi siswa yang kembali masuk kelas setelah Izin (hanya untuk siswa yang absen di tengah pelajaran)"
                icon={UserCheck}
            />

            <Card className="shadow-elegant">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Daftar Siswa Izin Keluar</span>
                        <Badge variant="outline" className="ml-2">
                            {eligibleStudents.length} Siswa
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Menampilkan siswa yang saat ini berstatus "Izin".
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {eligibleStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <UserCheck className="h-12 w-12 mb-4 opacity-20" />
                            <p>Tidak ada siswa yang perlu konfirmasi saat ini.</p>
                            <p className="text-sm opacity-70">Semua siswa yang Izin sudah kembali atau tidak ada yang Izin Keluar.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Siswa</TableHead>
                                        <TableHead>NIS</TableHead>
                                        <TableHead>Waktu Izin</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eligibleStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                {student.full_name || student.name}
                                            </TableCell>
                                            <TableCell>{student.nis || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-amber-600">
                                                    <Clock className="h-3 w-3" />
                                                    {student.last_status_time ?
                                                        format(new Date(student.last_status_time), 'HH:mm', { locale: id })
                                                        : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    className="gradient-primary"
                                                    onClick={() => handleConfirm(student.id)}
                                                    disabled={manualAttendance.isPending}
                                                >
                                                    {manualAttendance.isPending ? 'Menyimpan...' : 'Konfirmasi Kembali'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
