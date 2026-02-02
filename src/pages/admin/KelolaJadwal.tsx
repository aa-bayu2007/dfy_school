import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Class, Subject, Day, TimeSlot, Profile, ScheduleWithDetails } from '@/types/database';

export default function KelolaJadwal() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data as Class[];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      return data as Subject[];
    },
  });

  const { data: days } = useQuery({
    queryKey: ['days'],
    queryFn: async () => {
      const { data, error } = await supabase.from('days').select('*').order('id');
      if (error) throw error;
      return data as Day[];
    },
  });

  const { data: timeSlots } = useQuery({
    queryKey: ['time-slots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('time_slots').select('*').order('slot_number');
      if (error) throw error;
      return data as TimeSlot[];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_roles!inner(*)')
        .eq('user_roles.role', 'guru');
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['all-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          day:days(*),
          time_slot:time_slots(*),
          subject:subjects(*),
          class:classes(*),
          teacher:profiles(*)
        `)
        .order('day_id')
        .order('time_slot_id');
      if (error) throw error;
      return data as unknown as ScheduleWithDetails[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      day_id: number;
      time_slot_id: string;
      subject_id: string;
      class_id: string;
      teacher_id?: string;
    }) => {
      const { error } = await supabase.from('schedules').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Jadwal berhasil ditambahkan!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Jadwal berhasil dihapus!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setSelectedDay('');
    setSelectedTimeSlot('');
    setSelectedSubject('');
    setSelectedTeacher('');
  };

  const handleSubmit = () => {
    if (!selectedClass || !selectedDay || !selectedTimeSlot || !selectedSubject) {
      toast.error('Lengkapi semua field wajib!');
      return;
    }

    createMutation.mutate({
      day_id: parseInt(selectedDay),
      time_slot_id: selectedTimeSlot,
      subject_id: selectedSubject,
      class_id: selectedClass,
      teacher_id: selectedTeacher || undefined,
    });
  };

  const filteredSchedules = selectedClass
    ? schedules?.filter((s) => s.class_id === selectedClass)
    : schedules;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Kelola Jadwal
          </h1>
          <p className="text-muted-foreground">
            Atur jadwal pelajaran per kelas
          </p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Jadwal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Jadwal</DialogTitle>
              <DialogDescription>Tambah jadwal pelajaran baru</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kelas *</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hari *</label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Hari" />
                  </SelectTrigger>
                  <SelectContent>
                    {days?.map((day) => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jam Pelajaran *</label>
                <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jam" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots?.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        Jam ke-{slot.slot_number} ({slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mata Pelajaran *</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Guru (Opsional)</label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Guru" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Belum ditentukan</SelectItem>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="gradient-primary"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Tambah
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by class */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Filter Kelas:</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kelas</SelectItem>
                {classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Daftar Jadwal</CardTitle>
          <CardDescription>{filteredSchedules?.length || 0} jadwal</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSchedules && filteredSchedules.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hari</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Guru</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{schedule.day?.name}</TableCell>
                      <TableCell>
                        {schedule.time_slot?.start_time?.slice(0, 5)} -{' '}
                        {schedule.time_slot?.end_time?.slice(0, 5)}
                      </TableCell>
                      <TableCell className="font-medium">{schedule.class?.name}</TableCell>
                      <TableCell>{schedule.subject?.name}</TableCell>
                      <TableCell>{schedule.teacher?.full_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada jadwal</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
