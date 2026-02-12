import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Profile } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function KelolaMapel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [teacherId, setTeacherId] = useState<string>('');

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

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/admin/subjects');
      return data.map(s => ({
        ...s,
        id: s.id || s.ID,
        teacher_id: s.teacher_id || s.TeacherID,
        teacher: s.teacher ? {
          ...s.teacher,
          id: s.teacher.id || s.teacher.ID,
          full_name: s.teacher.name || s.teacher.profile?.full_name,
          nip: s.teacher.profile?.nip
        } : null
      })) as Subject[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, code, teacherId }: { name: string; code?: string; teacherId?: number }) => {
      return apiClient.post<any>('/admin/subjects', { name, code, teacher_id: teacherId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Mata pelajaran berhasil ditambahkan!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, code, teacherId }: { id: string; name: string; code?: string; teacherId?: number }) => {
      return apiClient.put<any>(`/admin/subjects/${id}`, { name, code, teacher_id: teacherId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Mata pelajaran berhasil diupdate!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Mata pelajaran berhasil dihapus!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditingSubject(null);
    setName('');
    setCode('');
    setTeacherId('');
  };

  const handleSubmit = () => {
    if (!name) {
      toast.error('Nama mata pelajaran wajib diisi!');
      return;
    }

    const tIdNum = teacherId ? Number(teacherId) : undefined;
    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id.toString(), name, code, teacherId: tIdNum });
    } else {
      createMutation.mutate({ name, code, teacherId: tIdNum });
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setCode(subject.code || '');
    setTeacherId(subject.teacher_id?.toString() || '');
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Kelola Mata Pelajaran
          </h1>
          <p className="text-muted-foreground">
            Tambah dan kelola data mata pelajaran
          </p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Mapel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</DialogTitle>
              <DialogDescription>
                {editingSubject ? 'Edit data mata pelajaran' : 'Tambah mata pelajaran baru ke sistem'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Mata Pelajaran</Label>
                <Input
                  id="name"
                  placeholder="contoh: Matematika, Bahasa Indonesia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Kode (Opsional)</Label>
                <Input
                  id="code"
                  placeholder="contoh: MTK, BIN"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Guru Pengajar</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Guru" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.full_name} {teacher.nip ? `(${teacher.nip})` : ''}
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
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingSubject ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Daftar Mata Pelajaran</CardTitle>
          <CardDescription>{subjects?.length || 0} mata pelajaran terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {subjects && subjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Guru</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject, idx) => (
                  <TableRow key={subject.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.code || '-'}</TableCell>
                    <TableCell>
                      {subject.teacher ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{subject.teacher.full_name}</span>
                          {subject.teacher.nip && <span className="text-xs text-muted-foreground">NIP: {subject.teacher.nip}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">Belum ada guru</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(subject.id.toString())}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada mata pelajaran</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
