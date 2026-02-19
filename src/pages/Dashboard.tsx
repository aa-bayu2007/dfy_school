import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useAttendanceRequests } from '@/hooks/useAttendanceRequests';
import { useSchedules } from '@/hooks/useSchedules';
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
  FileCheck,
  Check,
  Flag
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function Dashboard() {
  const { profile, roles, user } = useAuth();

  // Use local date string to avoid timezone shifting issues (00:00 - 07:00 WIB)
  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const today = getLocalDateString();
  const todayDayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];

  const isAdmin = roles.includes('admin');
  const isGuru = roles.includes('guru');
  const isKetuaKelas = roles.includes('ketua_kelas');
  const isMurid = roles.includes('murid') && !isKetuaKelas;

  // Timer to force re-render every minute for real-time status updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Murid sees their own, others see class/total
  const { data: todayAttendance } = useAttendance(
    isMurid ? user?.id : undefined,
    (isKetuaKelas || (isGuru && profile?.class_id)) ? profile?.class_id : undefined,
    today
  );

  const { data: classSchedules } = useSchedules(
    (isMurid || isKetuaKelas) ? profile?.class_id?.toString() : undefined,
    undefined
  );

  const { data: pendingRequests } = useAttendanceRequests(undefined, 'pending');

  // SOURCE OF TRUTH: Sort and Deduplicate backend attendance
  const sortedAttendance = (() => {
    // If we have schedules for today, use them as the base
    const roadmapBase = classSchedules?.filter(s => s.day?.name === todayDayName) || [];

    // Merge attendance into roadmap
    const roadmap = roadmapBase.map(schedule => {
      const attendance = todayAttendance?.find(a => a.schedule_id === schedule.id && a.student_id === (isMurid ? user?.id : a.student_id));
      return attendance || {
        id: `sched-${schedule.id}`,
        student_id: user?.id || 0,
        schedule_id: schedule.id,
        schedule: schedule,
        status: 'alpha', // Default if no scan
        date: today,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    if (isMurid && roadmap.length > 0) return roadmap;

    if (!todayAttendance) return [];

    // Sort by updated_at desc to prefer latest changes
    const sorted = [...todayAttendance].sort((a, b) =>
      new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    );

    // Deduplicate by student_id and schedule_id
    const uniqueMap = new Map();
    sorted.forEach(item => {
      const key = item.schedule_id ? `${item.student_id}-${item.schedule_id}` : `generic-${item.id}-${item.student_id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) =>
      (a.schedule?.time_slot?.start_time || '').localeCompare(b.schedule?.time_slot?.start_time || '')
    );
  })();

  // DISPLAY LOGIC: For Guru/Ketua, we want "Recent Scans" (1 record per student)
  // For Murid, we want "Roadmap" (All lessons for that one student)
  const displayAttendance = (() => {
    if (isMurid) {
      return sortedAttendance; // Roadmap view
    } else {
      if (!todayAttendance) return [];
      // Activity view: Most recent scan for each student
      const activityMap = new Map();
      [...todayAttendance]
        .sort((a, b) => new Date(b.scanned_at || b.updated_at).getTime() - new Date(a.scanned_at || a.updated_at).getTime())
        .forEach(item => {
          if (!activityMap.has(item.student_id)) {
            activityMap.set(item.student_id, item);
          }
        });
      return Array.from(activityMap.values()).slice(0, 20);
    }
  })();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  // Calculate mutually exclusive stats using local date logic
  const groupedStats = (() => {
    if (!sortedAttendance) return { hadir: 0, sakit: 0, alpha: 0 };

    // Map student-date to their highest priority status
    // For single-day dashboard, student_id is enough as unique key
    const studentStatusMap = new Map<number, string>();

    sortedAttendance.forEach(a => {
      const current = studentStatusMap.get(a.student_id);
      // Priority: hadir > sakit/izin > alpha/pending
      if (!current || a.status === 'hadir' || (current === 'alpha' && (a.status === 'sakit' || a.status === 'izin'))) {
        studentStatusMap.set(a.student_id, a.status);
      }
    });

    const finalized = { hadir: 0, sakit: 0, alpha: 0 };
    studentStatusMap.forEach(status => {
      if (status === 'hadir') finalized.hadir++;
      else if (status === 'sakit' || status === 'izin') finalized.sakit++;
      else finalized.alpha++;
    });

    return finalized;
  })();

  const stats = [
    {
      title: 'Hadir & Terizin',
      value: groupedStats.hadir + groupedStats.sakit,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Sakit/Izin (Detail)',
      value: groupedStats.sakit,
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Alpha / Bolos',
      value: groupedStats.alpha,
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
          {getGreeting()}, {profile?.name || profile?.full_name || 'User'}!
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats
          .filter(
            (stat) =>
              !stat.showFor ||
              stat.showFor.some((r) => roles.includes(r as import('@/types/database').AppRole))
          )
          .map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              colorClass={stat.color}
              bgColorClass={stat.bgColor}
            />
          ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(isKetuaKelas || isGuru) && (
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/scan'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Scan Absensi
              </CardTitle>
              <CardDescription>
                Scan QR code siswa untuk mencatat kehadiran
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/jadwal'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {isGuru ? 'Jadwal Mengajar' : 'Jadwal Hari Ini'}
            </CardTitle>
            <CardDescription>
              Lihat jadwal pelajaran untuk hari ini
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => window.location.href = isKetuaKelas ? '/dashboard/absensi-kelas' : '/dashboard/absensi'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isKetuaKelas ? 'Absensi Kelas' : 'Riwayat Absensi'}
            </CardTitle>
            <CardDescription>
              Lihat rekap kehadiran {isKetuaKelas ? 'satu kelas' : 'bulanan'}
            </CardDescription>
          </CardHeader>
        </Card>

        {(isAdmin || isGuru) && (
          <Card className="hover:shadow-elegant transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard/rekap'}>
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

      {/* Recent Activity / Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{isMurid ? 'Jadwal & Kehadiran Hari Ini' : 'Aktivitas Terbaru'}</span>
            {todayAttendance && todayAttendance.length > 0 && (
              <Badge variant="outline" className="text-[10px] hidden md:flex">
                {todayAttendance.length} Sesi Pelajaran
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isMurid
              ? 'Pantau kehadiran Anda di setiap mata pelajaran'
              : 'Log absensi real-time per mata pelajaran'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAttendance && todayAttendance.length > 0 ? (
            <div className="space-y-6">
              {/* Daily Progress Bar */}
              <div className="bg-muted/50 p-4 rounded-xl border border-border/50 mb-2">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progress Hari Ini</p>
                    <p className="text-lg font-bold">
                      {(() => {
                        if (!isMurid) {
                          const total = groupedStats.hadir + groupedStats.sakit + groupedStats.alpha;
                          const present = groupedStats.hadir + groupedStats.sakit;
                          const percent = total > 0 ? Math.round((present / total) * 100) : 0;
                          return `Kehadiran Kelas: ${present} dari ${total} Siswa (${percent}%)`;
                        }

                        const sorted = [...sortedAttendance].sort((a, b) => (a.schedule?.time_slot?.start_time || '').localeCompare(b.schedule?.time_slot?.start_time || ''));
                        const firstStart = sorted[0]?.schedule?.time_slot?.start_time || '07:00';
                        const lastEnd = sorted[sorted.length - 1]?.schedule?.time_slot?.end_time || '15:00';

                        const [nowH, nowM] = [new Date().getHours(), new Date().getMinutes()];
                        const currentMinutes = nowH * 60 + nowM;

                        const [startH, startM] = firstStart.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;

                        const [endH, endM] = lastEnd.split(':').map(Number);
                        const endMinutes = endH * 60 + endM;

                        const totalMinutes = endMinutes - startMinutes;
                        const elapsedMinutes = Math.min(Math.max(currentMinutes - startMinutes, 0), totalMinutes);
                        const percent = totalMinutes > 0 ? Math.round((elapsedMinutes / totalMinutes) * 100) : 0;

                        const finishedCount = sorted.filter(a => {
                          const now = new Date();
                          const currentStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                          return currentStr > (a.schedule?.time_slot?.end_time || '23:59');
                        }).length;

                        return percent >= 100 ? 'Sesi Pelajaran Selesai (100%)' : `${finishedCount} dari ${sorted.length} Pelajaran Selesai (${percent}%)`;
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-right">
                      {(() => {
                        if (!isMurid) {
                          const total = groupedStats.hadir + groupedStats.sakit + groupedStats.alpha;
                          const allPresent = total > 0 && groupedStats.alpha === 0;
                          if (allPresent) return (
                            <Badge className="bg-success animate-in fade-in zoom-in duration-500">
                              <CheckCircle className="h-3 w-3 mr-1" /> SEMUA HADIR
                            </Badge>
                          );
                          return (
                            <Badge variant="outline" className="text-warning border-warning/30">
                              <Clock className="h-3 w-3 mr-1" /> BELUM LENGKAP
                            </Badge>
                          );
                        }

                        const allHadir = sortedAttendance.length > 0 && sortedAttendance.every(a => a.status === 'hadir');
                        if (allHadir) return (
                          <Badge className="bg-success animate-in fade-in zoom-in duration-500">
                            <CheckCircle className="h-3 w-3 mr-1" /> FULL MASUK
                          </Badge>
                        );

                        return (
                          <Badge variant="outline" className="text-warning border-warning/30">
                            <Clock className="h-3 w-3 mr-1" /> DALAM PROSES
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="h-2 w-full bg-background rounded-full overflow-hidden border relative">
                  {(() => {
                    if (!isMurid) {
                      const total = groupedStats.hadir + groupedStats.sakit + groupedStats.alpha;
                      const present = groupedStats.hadir + groupedStats.sakit;
                      const percent = total > 0 ? (present / total) * 100 : 0;
                      return (
                        <div
                          className={`h-full transition-all duration-1000 ease-in-out ${percent >= 100 ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-primary'}`}
                          style={{ width: `${percent}%` }}
                        />
                      );
                    }

                    const sorted = [...sortedAttendance].sort((a, b) => (a.schedule?.time_slot?.start_time || '').localeCompare(b.schedule?.time_slot?.start_time || ''));
                    const firstStart = sorted[0]?.schedule?.time_slot?.start_time || '07:00';
                    const lastEnd = sorted[sorted.length - 1]?.schedule?.time_slot?.end_time || '15:00';

                    const [nowH, nowM] = [new Date().getHours(), new Date().getMinutes()];
                    const currentMinutes = nowH * 60 + nowM;
                    const [startH, startM] = firstStart.split(':').map(Number);
                    const startMinutes = startH * 60 + startM;
                    const [endH, endM] = lastEnd.split(':').map(Number);
                    const endMinutes = endH * 60 + endM;

                    const totalMinutes = endMinutes - startMinutes;
                    const elapsedMinutes = Math.min(Math.max(currentMinutes - startMinutes, 0), totalMinutes);
                    const percent = totalMinutes > 0 ? (elapsedMinutes / totalMinutes) * 100 : 0;

                    const allHadir = sortedAttendance.length > 0 && sortedAttendance.every(a => a.status === 'hadir');
                    return (
                      <div
                        className={`h-full transition-all duration-1000 ease-in-out ${allHadir ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-primary'}`}
                        style={{ width: `${percent}%` }}
                      />
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                {displayAttendance
                  .sort((a, b) => {
                    if (isMurid) {
                      return (a.schedule?.time_slot?.start_time || '').localeCompare(b.schedule?.time_slot?.start_time || '');
                    }
                    // For Guru, sort by most recent scan time
                    return new Date(b.scanned_at || b.updated_at).getTime() - new Date(a.scanned_at || a.updated_at).getTime();
                  })
                  .map((attendance, index, array) => {
                    const isLast = index === array.length - 1;

                    const now = new Date();
                    const currentStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                    const startTime = attendance.schedule?.time_slot?.start_time || '07:00';
                    const endTime = attendance.schedule?.time_slot?.end_time || '15:00';

                    const isPast = currentStr > endTime;
                    const isOngoing = currentStr >= startTime && currentStr <= endTime;

                    const isHadir = attendance.status === 'hadir';
                    const isIzin = attendance.status === 'izin';
                    const isSakit = attendance.status === 'sakit';
                    const isExcused = isIzin || isSakit;
                    const allHadir = sortedAttendance.length > 0 && sortedAttendance.every(a => a.status === 'hadir');

                    // Determine colors based on status
                    let statusColorClass = 'text-muted-foreground';
                    let dotColorClass = isPast ? 'bg-success' : isOngoing ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted-foreground/20';
                    let bgHighlightClass = 'bg-muted/30 border-transparent opacity-80';
                    let badgeColorClass = 'text-muted-foreground border-muted-foreground/30';

                    if (isHadir) {
                      statusColorClass = 'text-success font-bold';
                      dotColorClass = 'bg-success';
                      bgHighlightClass = 'bg-success/[0.03] border-success/20';
                      badgeColorClass = 'bg-success/10 text-success border-success/30';
                    } else if (isIzin) {
                      statusColorClass = 'text-amber-500 font-bold';
                      dotColorClass = 'bg-amber-500';
                      bgHighlightClass = 'bg-amber-500/[0.03] border-amber-500/20';
                      badgeColorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
                    } else if (isSakit) {
                      statusColorClass = 'text-blue-500 font-bold';
                      dotColorClass = 'bg-blue-500';
                      bgHighlightClass = 'bg-blue-500/[0.03] border-blue-500/20';
                      badgeColorClass = 'bg-blue-500/10 text-blue-500 border-blue-500/30';
                    } else if (isOngoing && isMurid) {
                      bgHighlightClass = 'bg-primary/5 border-primary/30 shadow-md scale-[1.02]';
                    }

                    return (
                      <div key={attendance.id} className="relative pl-12 pb-10 last:pb-0">
                        {/* Timeline Line (Only for Murid Roadmap) */}
                        {isMurid && !isLast && (
                          <div className={`absolute left-[13px] top-[1.5rem] bottom-[-2.5rem] w-[3px] rounded-full z-0 ${(isHadir || isExcused) ? 'bg-success/40' : 'bg-border/60'}`} />
                        )}

                        {/* Milestone Dot */}
                        <div className={`absolute left-0 top-1 h-7 w-7 rounded-full border-4 border-background flex items-center justify-center transition-all z-10 shadow-sm ${dotColorClass}`}>
                          {isHadir ? (
                            <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                          ) : isIzin ? (
                            <Clock className="h-3.5 w-3.5 text-white" />
                          ) : isSakit ? (
                            <AlertCircle className="h-3.5 w-3.5 text-white" />
                          ) : (
                            isMurid && isLast && allHadir ? <Flag className="h-3 w-3 text-white" /> : <div className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                          )}
                        </div>

                        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${isMurid && isLast && !isPast && !isHadir && !isExcused
                          ? 'bg-primary/[0.03] border-primary/20 border-dashed shadow-sm'
                          : bgHighlightClass
                          }`}>
                          <div className="flex items-start gap-4">
                            {isMurid && (
                              <div className="min-w-[70px] text-center pt-1 border-r border-border/50 pr-4">
                                <span className="text-[11px] font-extrabold text-muted-foreground block tracking-tight">
                                  {startTime.slice(0, 5)}
                                </span>
                                <div className="h-4 w-[1px] bg-border/50 mx-auto my-1" />
                                <span className="text-[11px] font-extrabold text-muted-foreground block tracking-tight">
                                  {endTime.slice(0, 5)}
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-base font-bold leading-none ${statusColorClass}`}>
                                  {isMurid
                                    ? (attendance.schedule?.subject?.name || 'Mata Pelajaran')
                                    : (attendance.student?.name || attendance.student?.full_name || 'Siswa')
                                  }
                                </h4>
                                {isHadir && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                                {isIzin && <Badge className="bg-amber-500 text-[9px] h-4 px-1">IZIN</Badge>}
                                {isSakit && <Badge className="bg-blue-500 text-[9px] h-4 px-1">SAKIT</Badge>}
                                {isMurid && isLast && (
                                  <Badge variant="outline" className={`text-[9px] h-5 px-1.5 font-bold ${badgeColorClass}`}>
                                    {allHadir ? 'FINAL DESTINATION' : 'GOAL AKHIR'}
                                  </Badge>
                                )}
                              </div>

                              {isMurid && isOngoing && !isHadir && (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Sesi Aktif</span>
                                </div>
                              )}

                              {!isMurid && (
                                <p className="text-sm font-medium text-muted-foreground italic">
                                  Siswa Kelas: {attendance.student?.class?.name || 'Umum'}
                                </p>
                              )}

                              <p className={`text-xs ${statusColorClass}`}>
                                {isHadir ? (isMurid ? 'Sudah Terabsen (Hadir)' : 'Telah Scan Masuk') : isIzin ? 'Status Izin' : isSakit ? 'Status Sakit' : isOngoing ? 'Sesi Sedang Berjalan' : isPast ? 'Sesi Telah Selesai' : 'Akan Datang'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1.5">
                            <Badge
                              variant={
                                attendance.status === 'hadir'
                                  ? 'default'
                                  : attendance.status === 'alpha'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                              className={`min-w-[80px] h-7 justify-center shadow-sm ${attendance.status === 'hadir' ? 'bg-success hover:bg-success/90' : ''}`}
                            >
                              {(attendance.status || 'unknown').toUpperCase()}
                            </Badge>
                            {(attendance.scanned_at || attendance.updated_at) && (
                              <p className={`text-[10px] ${isHadir ? 'text-success font-semibold' : 'text-muted-foreground'}`}>
                                {isHadir ? 'Waktu Scan: ' : 'Diperbarui: '}
                                {new Date(attendance.scanned_at || attendance.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Belum ada data"
              description="Belum ada jadwal atau data absensi untuk hari ini."
              icon={Clock}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
