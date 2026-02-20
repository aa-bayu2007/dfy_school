import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceRequests, useCreateAttendanceRequest } from '@/hooks/useAttendanceRequests';
import { useSchedulesByDay } from '@/hooks/useSchedules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  Calendar as CalendarIcon,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export default function AjukanIzin() {
  const { user, profile } = useAuth();
  const { data: requests, isLoading } = useAttendanceRequests(user?.id);
  const createRequest = useCreateAttendanceRequest();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [type, setType] = useState<'sakit' | 'izin'>('izin');
  const [reason, setReason] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);

  // Get weekday name for the selected date
  const selectedDayName = useMemo(() => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', { weekday: 'long' });
  }, [date]);

  // Fetch student's schedules for their class
  const { rawData: schedules, isLoading: loadingSchedules } = useSchedulesByDay(profile?.class_id?.toString());

  // Filter schedules that match the selected day
  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter(s => s.day?.name === selectedDayName);
  }, [schedules, selectedDayName]);

  const handleSubmit = async () => {
    if (!date || !reason) {
      toast.error('Lengkapi semua field!');
      return;
    }

    if (!isFullDay && selectedScheduleIds.length === 0) {
      toast.error('Pilih minimal satu mata pelajaran!');
      return;
    }

    try {
      await createRequest.mutateAsync({
        studentId: user?.id || '',
        date: date ? format(date, 'yyyy-MM-dd') : '',
        requestType: type,
        reason,
        isFullDay,
        scheduleIds: isFullDay ? [] : selectedScheduleIds,
      });
      setOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setDate(new Date());
    setType('izin');
    setReason('');
    setIsFullDay(true);
    setSelectedScheduleIds([]);
  };

  const toggleSchedule = (id: number) => {
    setSelectedScheduleIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // getStatusBadge removed in favor of StatusBadge component

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajukan Izin/Sakit"
        description="Ajukan permintaan izin atau sakit per Mapel atau Full Day"
        icon={FileText}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Ajukan Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajukan Izin/Sakit</DialogTitle>
                <DialogDescription>
                  Pilih tanggal dan tentukan apakah izin seharian atau mapel tertentu.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(val: Date | undefined) => {
                          setDate(val);
                          setSelectedScheduleIds([]);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="fullDay"
                    checked={isFullDay}
                    onCheckedChange={(checked) => setIsFullDay(!!checked)}
                  />
                  <Label htmlFor="fullDay" className="cursor-pointer font-medium text-sm">Izin Seharian Penuh</Label>
                </div>

                {!isFullDay && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg animate-in fade-in slide-in-from-top-2 border">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                      <BookOpen className="h-3 w-3" />
                      Pilih Mata Pelajaran ({selectedDayName})
                    </Label>

                    {loadingSchedules ? (
                      <div className="py-4 text-center text-xs text-muted-foreground italic flex items-center justify-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Memuat jadwal...
                      </div>
                    ) : filteredSchedules.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {filteredSchedules.map((s) => (
                          <div key={s.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`sch-${s.id}`}
                              checked={selectedScheduleIds.includes(s.id)}
                              onCheckedChange={() => toggleSchedule(s.id)}
                            />
                            <Label
                              htmlFor={`sch-${s.id}`}
                              className="text-sm font-normal cursor-pointer flex-1 flex justify-between gap-2"
                            >
                              <span className="truncate">{s.subject?.name}</span>
                              <span className="text-xs text-muted-foreground">{s.time_slot?.start_time}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-destructive py-2 text-center">
                        Tidak ada jadwal pelajaran pada hari {selectedDayName}.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="type">Jenis</Label>
                  <Select value={type} onValueChange={(v) => setType(v as 'sakit' | 'izin')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="izin">Izin</SelectItem>
                      <SelectItem value="sakit">Sakit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Alasan</Label>
                  <Textarea
                    id="reason"
                    placeholder="Jelaskan alasan Anda..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <div className="flex-1 flex flex-col items-start">
                  {date && requests?.some(r => format(new Date(r.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) && (
                    <p className="text-[10px] text-destructive font-bold flex items-center gap-1 animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      Sudah ada pengajuan pada tanggal ini
                    </p>
                  )}
                </div>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createRequest.isPending ||
                    !date ||
                    requests?.some(r => format(new Date(r.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                  }
                  className="gradient-primary"
                >
                  {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Kirim
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Riwayat Pengajuan</CardTitle>
          <CardDescription>
            {requests?.length || 0} pengajuan izin/sakit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {req.request_type === 'sakit' ? 'Sakit' : 'Izin'}
                      </Badge>
                      <Badge variant="secondary">
                        {req.is_full_day ? "Seharian" : "Per Mapel"}
                      </Badge>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="font-medium">
                      {new Date(req.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {!req.is_full_day && req.schedules && req.schedules.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {req.schedules.map(s => (
                          <Badge key={s.id} variant="outline" className="text-[10px] py-0 h-4 bg-muted/30">
                            {s.subject?.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 md:mt-0">
                    Diajukan:{' '}
                    {new Date(req.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada pengajuan"
              description="Belum ada pengajuan izin/sakit yang tercatat."
              icon={FileText}
            />
          )}
        </CardContent>
      </Card>
    </div >
  );
}
