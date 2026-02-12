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
import { GraduationCap, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Class } from '@/types/database';

export default function KelolaKelas() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');

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
    mutationFn: async ({ name, grade }: { name: string; grade: string }) => {
      return apiClient.post<any>('/admin/classes', { name, grade });
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
    mutationFn: async ({ id, name, grade }: { id: string; name: string; grade: string }) => {
      return apiClient.put<any>(`/admin/classes/${id}`, { name, grade });
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
    setName('');
    setGrade('');
  };

  const handleSubmit = () => {
    if (!name || !grade) {
      toast.error('Lengkapi semua field!');
      return;
    }

    if (editingClass) {
      updateMutation.mutate({ id: editingClass.id.toString(), name, grade });
    } else {
      createMutation.mutate({ name, grade });
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setName(cls.name || '');
    setGrade(cls.grade || '');
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
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kelas</Label>
                <Input
                  id="name"
                  placeholder="contoh: 10A, 11 IPA 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Tingkat</Label>
                <Input
                  id="grade"
                  placeholder="contoh: X, XI, XII"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls, idx) => (
                  <TableRow key={cls.id || `class-${idx}`}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.grade}</TableCell>
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
