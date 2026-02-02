import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, UserCog, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Profile, AppRole, Class } from '@/types/database';

export default function KelolaUsers() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('murid');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, class:classes(*)')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data as Class[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Delete existing roles
      await supabase.from('user_roles').delete().eq('user_id', userId);
      // Insert new role
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      toast.success('Role berhasil diupdate!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ userId, classId }: { userId: string; classId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ class_id: classId })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Kelas berhasil diupdate!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getUserRole = (userId: string): AppRole => {
    const role = userRoles?.find((r) => r.user_id === userId);
    return (role?.role as AppRole) || 'murid';
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive text-destructive-foreground';
      case 'guru':
        return 'bg-primary text-primary-foreground';
      case 'ketua_kelas':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleEdit = (profile: Profile) => {
    setSelectedUser(profile);
    setSelectedRole(getUserRole(profile.id));
    setSelectedClassId(profile.class_id || '');
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    await updateRoleMutation.mutateAsync({ userId: selectedUser.id, role: selectedRole });
    await updateClassMutation.mutateAsync({
      userId: selectedUser.id,
      classId: selectedClassId || null,
    });

    setEditDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Kelola Pengguna
        </h1>
        <p className="text-muted-foreground">
          Kelola data pengguna, role, dan kelas
        </p>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Daftar Pengguna</CardTitle>
          <CardDescription>{profiles?.length || 0} pengguna terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {profiles && profiles.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIS/NIP</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.full_name}</TableCell>
                      <TableCell>{profile.nis || profile.nip || '-'}</TableCell>
                      <TableCell>{profile.class?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(getUserRole(profile.id))}>
                          {getUserRole(profile.id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(profile)}>
                          <UserCog className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada pengguna</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Update role dan kelas untuk {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="murid">Murid</SelectItem>
                  <SelectItem value="ketua_kelas">Ketua Kelas</SelectItem>
                  <SelectItem value="guru">Guru</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada kelas</SelectItem>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateRoleMutation.isPending || updateClassMutation.isPending}
              className="gradient-primary"
            >
              {(updateRoleMutation.isPending || updateClassMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
