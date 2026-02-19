import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import React, { useState } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ClipboardList,
  Users,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export default function RiwayatAbsensi() {
  const { user, profile, roles } = useAuth();
  const location = useLocation();
  const isClassView = location.pathname === '/dashboard/absensi-kelas';

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchName, setSearchName] = useState<string>('');

  const { data: attendances, isLoading } = useAttendance(
    isClassView ? undefined : user?.id,
    isClassView ? (profile?.class_id || undefined) : undefined,
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
  );



  // Filter attendances client-side for name search
  const filteredAttendances = attendances?.filter((att: any) => {
    if (!searchName) return true;
    const name = att.student?.full_name || att.student?.name || '';
    return name.toLowerCase().includes(searchName.toLowerCase());
  }) || [];

  // Calculate stats based on students and dates (One per day, mutually exclusive)
  const stats = (() => {
    if (!filteredAttendances.length) return { hadir: 0, sakit: 0, izin: 0, alpha: 0, pending: 0, total: 0 };

    // Map student-date to their highest priority status
    const dayStatusMap = new Map<string, string>();
    const uniqueStudentDays = new Set<string>();

    filteredAttendances.forEach((att: any) => {
      const d = new Date(att.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Use student_id, falling back to nested student.id, or even student.name to ensure we group correctly
      const studentId = att.student_id || att.student?.id || att.student?.name;

      // If we somehow still don't have an ID, we can't group effectively, but this combination should remain unique per student-day
      const uniqueKey = `${studentId}-${dateKey}`;
      uniqueStudentDays.add(uniqueKey);

      const current = dayStatusMap.get(uniqueKey);
      // Priority: hadir > sakit/izin > alpha/pending
      if (!current || att.status === 'hadir' || (current === 'alpha' && (att.status === 'sakit' || att.status === 'izin'))) {
        dayStatusMap.set(uniqueKey, att.status);
      }
    });

    const counts = { hadir: 0, sakit: 0, izin: 0, alpha: 0, pending: 0, total: 0 };
    dayStatusMap.forEach(status => {
      const s = status as keyof typeof counts;
      if (Object.prototype.hasOwnProperty.call(counts, s)) {
        counts[s]++;
      }
      counts.total++;
    });

    return counts;
  })();

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
      <PageHeader
        title={isClassView ? 'Absensi Kelas' : 'Riwayat Absensi'}
        description={isClassView ? `Daftar kehadiran siswa kelas ${profile?.class?.name || '...'}` : 'Rekap kehadiran Anda'}
        icon={isClassView ? Users : ClipboardList}
      />

      {/* Filter Section */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Filter Tanggal:</span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              size="sm"
              className={cn(
                "w-48 justify-start text-left font-normal bg-background",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Name Filter (Only for Class View / Admin / Teachers) */}
        {(isClassView || roles.includes('admin') || roles.includes('guru') || roles.includes('ketua_kelas')) && (
          <>
            <div className="h-4 w-px bg-border mx-2" />
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Cari Siswa:</span>
            </div>
            <input
              type="text"
              placeholder="Nama siswa..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="bg-background border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all w-48"
            />
          </>
        )}

        {(selectedDate || searchName) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDate(undefined);
              setSearchName('');
            }}
            className="text-xs h-8 ml-auto"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Hadir" value={stats?.hadir || 0} icon={CheckCircle} colorClass="text-success" bgColorClass="bg-success/10" />
        <StatCard title="Sakit" value={stats?.sakit || 0} icon={AlertCircle} colorClass="text-blue-500" bgColorClass="bg-blue-500/10" />
        <StatCard title="Izin" value={stats?.izin || 0} icon={Clock} colorClass="text-amber-500" bgColorClass="bg-amber-500/10" />
        <StatCard title="Alpha" value={stats?.alpha || 0} icon={XCircle} colorClass="text-destructive" bgColorClass="bg-destructive/10" />
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
          {filteredAttendances && filteredAttendances.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Tanggal</TableHead>
                    {isClassView && <TableHead>Siswa</TableHead>}
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu Scan</TableHead>
                    {(isClassView || roles.includes('admin') || roles.includes('guru')) && <TableHead>Petugas</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredAttendances]
                    .sort((a, b) => {
                      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
                      if (dateCompare !== 0) return dateCompare;
                      return (a.schedule?.time_slot?.start_time || '').localeCompare(b.schedule?.time_slot?.start_time || '');
                    })
                    .map((att: any) => (
                      <TableRow key={att.id} className="hover:bg-muted/5 transition-colors border-b border-border/40">
                        <TableCell className="py-4 font-bold text-sm text-primary">
                          {new Date(att.date).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </TableCell>
                        {isClassView && (
                          <TableCell className="py-4 font-bold text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                                {(att.student?.full_name || att.student?.name || 'S')?.charAt(0)}
                              </div>
                              {att.student?.full_name || att.student?.name || 'Siswa'}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight text-foreground">
                              {att.schedule?.subject?.name || 'Harian'}
                            </span>
                            {!isClassView && (
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {att.schedule?.day?.name || 'Harian'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {att.schedule?.time_slot ? (
                            <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 border-transparent">
                              {att.schedule.time_slot.start_time.slice(0, 5)} - {att.schedule.time_slot.end_time.slice(0, 5)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs font-medium italic">Full Day</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <StatusBadge status={att.status} />
                        </TableCell>
                        <TableCell className="py-4">
                          {att.scanned_at ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                              <Clock className="h-3 w-3 opacity-60" />
                              {new Date(att.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs opacity-40">-</span>
                          )}
                        </TableCell>
                        {(isClassView || roles.includes('admin') || roles.includes('guru')) && (
                          <TableCell className="py-4">
                            {att.scanner ? (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary px-1.5 py-0">
                                  {att.scanner.full_name || att.scanner.name || 'Petugas'}
                                </Badge>
                              </div>
                            ) : att.notes === "Auto-generated" ? (
                              <span className="text-[10px] text-muted-foreground italic">Sistem</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground opacity-40">-</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="Belum ada data"
              description="Belum ada data kehadiran untuk periode ini"
              icon={ClipboardList}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
