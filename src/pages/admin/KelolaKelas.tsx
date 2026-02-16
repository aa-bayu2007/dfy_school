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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GraduationCap, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Class } from '@/types/database';

export default function KelolaKelas() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);

  // New States
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [section, setSection] = useState('');

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/admin/classes');
      return data.map(c => ({
        ...c,
        id: c.id || c.ID
      })) as Class[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ grade, major, section }: { grade: string; major: string; section: string }) => {
      return apiClient.post<Class>('/admin/classes', { grade, major, section });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Kelas berhasil ditambahkan!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, grade, major, section }: { id: string; grade: string; major: string; section: string }) => {
      return apiClient.put<Class>(`/admin/classes/${id}`, { grade, major, section });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Kelas berhasil diupdate!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Kelas berhasil dihapus!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setOpen(false);
    setEditingClass(null);
    setGrade('');
    setMajor('');
    setSection('');
  };

  const handleSubmit = () => {
    if (!grade || !major || !section) {
      toast.error('Lengkapi semua field!');
      return;
    }

    if (editingClass) {
      updateMutation.mutate({ id: editingClass.id.toString(), grade, major, section });
    } else {
      createMutation.mutate({ grade, major, section });
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setGrade(cls.grade || '');
    setMajor(cls.major || '');
    setSection(cls.section || '');
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Kelola Kelas
          </h1>
          <p className="text-muted-foreground">
            Tambah dan kelola data kelas
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              apiClient.post('/admin/classes/migrate')
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ['classes'] });
                  toast.success('Data berhasil disinkronkan!');
                })
                .catch((err) => toast.error('Gagal sinkronisasi: ' + err.message));
            }}
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Sinkronkan Data
          </Button>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(v); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Kelas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Kelas' : 'Tambah Kelas'}</DialogTitle>
                <DialogDescription>
                  {editingClass ? 'Edit data kelas' : 'Tambah kelas baru ke sistem'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Grade Selection */}
                <div className="space-y-2">
                  <Label>Tingkat</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      {['X', 'XI', 'XII'].map(g => (
                        <SelectItem key={g} value={g}>Kelas {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Major Selection */}
                <div className="space-y-2">
                  <Label>Jurusan</Label>
                  <Select value={major} onValueChange={setMajor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jurusan" />
                    </SelectTrigger>
                    <SelectContent>
                      {['PPLG', 'TBSM', 'DKV', 'TJKT', 'TOI'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Selection */}
                <div className="space-y-2">
                  <Label>Kelas</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
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
                  {editingClass ? 'Simpan' : 'Tambah'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Daftar Kelas</CardTitle>
          <CardDescription>{classes?.length || 0} kelas terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {classes && classes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Jurusan</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls, idx) => (
                  <TableRow key={cls.id || `class-${idx}`}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.grade}</TableCell>
                    <TableCell>{cls.major}</TableCell>
                    <TableCell>{cls.section}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cls)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(cls.id?.toString() || "")}
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
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada kelas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
