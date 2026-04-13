import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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
import { Clock, Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
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
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithDetails | null>(null);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/admin/classes');
      return data.map(c => ({
        ...c,
        id: c.id || c.ID
      })) as Class[];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/admin/subjects');
      return data.map(s => ({
        ...s,
        id: s.id || s.ID
      })) as Subject[];
    },
  });

  const { data: days } = useQuery({
    queryKey: ['days'],
    queryFn: async () => {
      return apiClient.get<Day[]>('/days');
    },
  });

  const { data: timeSlots } = useQuery({
    queryKey: ['time-slots'],
    queryFn: async () => {
      return apiClient.get<TimeSlot[]>('/time-slots');
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/admin/teachers');
      return data.map(u => ({
        ...u,
        id: u.id || u.ID,
        full_name: u.name || u.profile?.full_name,
        nip: u.profile?.nip
      })) as Profile[];
    },
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['all-schedules'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/admin/schedules');
      return data.map(s => ({
        ...s,
        id: s.id || s.ID,
        teacher: s.teacher ? {
          ...s.teacher,
          id: s.teacher.id || s.teacher.ID,
          full_name: s.teacher.name || s.teacher.profile?.full_name,
          nip: s.teacher.profile?.nip
        } : null
      })) as ScheduleWithDetails[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      day_id: number;
      time_slot_id: string; // Struct expects uint, need to convert
      subject_id: string;
      class_id: string;
      teacher_id?: string;
    }) => {
      const payload = {
        day_id: data.day_id,
        time_slot_id: parseInt(data.time_slot_id),
        subject_id: parseInt(data.subject_id),
        class_id: parseInt(data.class_id),
        teacher_id: data.teacher_id ? parseInt(data.teacher_id) : null,
      };

      return apiClient.post('/admin/schedules', payload);
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

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      day_id: number;
      time_slot_id: string;
      subject_id: string;
      class_id: string;
      teacher_id?: string;
    }) => {
      const payload = {
        day_id: data.day_id,
        time_slot_id: parseInt(data.time_slot_id),
        subject_id: parseInt(data.subject_id),
        class_id: parseInt(data.class_id),
        teacher_id: data.teacher_id ? parseInt(data.teacher_id) : null,
      };

      return apiClient.put(`/admin/schedules/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Jadwal berhasil diupdate!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/schedules/${id}`);
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

  const resetSchedulesMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete('/admin/schedules');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Semua jadwal berhasil dihapus!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditingSchedule(null);
    setSelectedDay('');
    setSelectedTimeSlot('');
    setSelectedSubject('');
    setSelectedTeacher('');
    // Keep selected class if we are filtering, otherwise maybe clear it? 
    // Usually standard UX is to reset the form fields, but `selectedClass` is used for both Filter and Add Form if confusing.
    // In this UI, `selectedClass` state seems used for specific input in Dialog AND for filter.
    // This UX is slightly ambiguous, but let's clear it only if it was set via edit.
  };

  const handleSubmit = () => {
    if (!selectedClass || !selectedDay || !selectedTimeSlot || !selectedSubject) {
      toast.error('Lengkapi semua field wajib!');
      return;
    }

    if (editingSchedule) {
      updateMutation.mutate({
        id: editingSchedule.id.toString(),
        day_id: parseInt(selectedDay),
        time_slot_id: selectedTimeSlot,
        subject_id: selectedSubject,
        class_id: selectedClass,
        teacher_id: selectedTeacher && selectedTeacher !== 'none' ? selectedTeacher : undefined,
      });
    } else {
      createMutation.mutate({
        day_id: parseInt(selectedDay),
        time_slot_id: selectedTimeSlot,
        subject_id: selectedSubject,
        class_id: selectedClass,
        teacher_id: selectedTeacher && selectedTeacher !== 'none' ? selectedTeacher : undefined,
      });
    }
  };

  const handleEdit = (schedule: ScheduleWithDetails) => {
    setEditingSchedule(schedule);

    if (schedule.class_id) setSelectedClass(schedule.class_id.toString());
    if (schedule.day_id) setSelectedDay(schedule.day_id.toString());
    if (schedule.time_slot_id) setSelectedTimeSlot(schedule.time_slot_id.toString());
    if (schedule.subject_id) setSelectedSubject(schedule.subject_id.toString());
    if (schedule.teacher_id) setSelectedTeacher(schedule.teacher_id.toString());

    setOpen(true);
  };

  const [activeTab, setActiveTab] = useState<string>('1'); // Default to Monday (ID 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Kelola Jadwal
          </h1>
          <p className="text-muted-foreground">
            Atur jadwal pelajaran per kelas dan per hari
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin menghapus SEMUA jadwal? Tindakan ini tidak dapat dibatalkan.')) {
                resetSchedulesMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Semua
          </Button>

          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(v); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Jadwal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal'}</DialogTitle>
                <DialogDescription>{editingSchedule ? 'Edit data jadwal pelajaran' : 'Tambah jadwal pelajaran baru'}</DialogDescription>
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
                        <SelectItem key={cls.id} value={cls.id.toString()}>
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
                      {days?.filter(d => d.name !== 'Sabtu' && d.name !== 'Minggu').map((day) => (
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
                        <SelectItem key={slot.id} value={slot.id.toString()}>
                          Jam ke-{slot.slot_number} ({slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mata Pelajaran *</label>
                  <Select
                    value={selectedSubject}
                    onValueChange={(val) => {
                      setSelectedSubject(val);
                      // Package handling: Auto-fill teacher if subject has one
                      const subject = subjects?.find(s => s.id.toString() === val);
                      if (subject?.teacher_id) {
                        setSelectedTeacher(subject.teacher_id.toString());
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mapel" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name} {subject.teacher ? `(${subject.teacher.full_name})` : ''}
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
                      <SelectItem value="none">Belum ditentukan</SelectItem>
                      {teachers?.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="gradient-primary"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingSchedule ? 'Simpan' : 'Tambah'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex gap-4 items-center flex-1">
              <label className="text-sm font-medium whitespace-nowrap">Pilih Kelas:</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Pilih Kelas untuk Dikelola" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <p className="text-sm text-muted-foreground">
                Mengelola jadwal untuk kelas: <span className="font-bold text-foreground">{classes?.find(c => c.id.toString() === selectedClass)?.name}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClass ? (
        <div className="space-y-4">
          <div className="flex border-b overflow-x-auto no-scrollbar">
            {days?.filter(d => d.name !== 'Sabtu' && d.name !== 'Minggu').map((day) => (
              <button
                key={day.id}
                onClick={() => setActiveTab(day.id.toString())}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === day.id.toString()
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                {day.name}
              </button>
            ))}
          </div>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Jadwal Hari {days?.find(d => d.id.toString() === activeTab)?.name}</CardTitle>
                <CardDescription>Daftar mata pelajaran per jam</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Jam Ke</TableHead>
                      <TableHead className="w-40">Waktu</TableHead>
                      <TableHead>Mata Pelajaran</TableHead>
                      <TableHead>Guru</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSlots?.sort((a, b) => a.slot_number - b.slot_number).map((slot) => {
                      const schedule = schedules?.find(
                        (s) =>
                          s.class_id.toString() === selectedClass &&
                          s.day_id.toString() === activeTab &&
                          s.time_slot_id === slot.id
                      );

                      return (
                        <TableRow key={slot.id} className={schedule ? "" : "bg-muted/30"}>
                          <TableCell className="font-medium text-center">{slot.slot_number}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                          </TableCell>
                          <TableCell>
                            {schedule ? (
                              <span className="font-medium">{schedule.subject?.name}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Kosong</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {schedule ? (
                              <span>{schedule.teacher?.full_name || '-'}</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {schedule ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(schedule)}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteMutation.mutate(schedule.id.toString())}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDay(activeTab);
                                  setSelectedTimeSlot(slot.id.toString());
                                  setOpen(true);
                                }}
                                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Pilih Mapel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Clock className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-semibold text-muted-foreground">Pilih Kelas</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Silakan pilih kelas terlebih dahulu untuk mengelola jadwal pelajaran secara mendetail per hari.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
