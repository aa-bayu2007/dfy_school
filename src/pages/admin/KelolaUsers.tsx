import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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
  Users,
  UserCog,
  Loader2,
  Search,
  Filter as FilterIcon,
  UserCheck,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Profile, AppRole, Class } from '@/types/database';

// Define local interface to match Backend User model
interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  nis?: string;
  nip?: string;
  class_id?: number;
  class?: Class;
  // ... other fields
}

export default function KelolaUsers() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<BackendUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('murid');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch all profiles (users)
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const data = await apiClient.get<any[]>('/admin/users');
      return data.map(u => ({
        ...u,
        id: u.id || u.ID,
        role: u.role || (u.roles && u.roles.length > 0 ? u.roles[0].name : 'murid'),
        nis: u.profile?.nis,
        nip: u.profile?.nip,
        class_id: u.class_id || u.profile?.class_id,
        class: u.class || u.profile?.class
      })) as BackendUser[];
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      return apiClient.get<Class[]>('/admin/classes');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiClient.put(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Role berhasil diupdate!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ userId, classId }: { userId: number; classId: string | null }) => {
      const payload = { class_id: (classId === "" || classId === "none") ? null : parseInt(classId) };
      return apiClient.put(`/admin/users/${userId}/class`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Kelas berhasil diupdate!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getUserRole = (user: BackendUser): AppRole => {
    // Validate if the role string matches AppRole, otherwise default
    const r = user.role;
    if (r === 'admin' || r === 'guru' || r === 'ketua_kelas' || r === 'murid') return r;
    return 'murid';
  };

  const getRoleBadgeColor = (role: string) => {
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

  const handleEdit = (user: BackendUser) => {
    setSelectedUser(user);
    // Backend role is directly on user object
    setSelectedRole(getUserRole(user));
    setSelectedClassId(user.class_id ? user.class_id.toString() : 'none');
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

      <div className="space-y-4">
        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="student" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Siswa
            </TabsTrigger>
            <TabsTrigger value="ketua_kelas" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Ketua Kelas
            </TabsTrigger>
            <TabsTrigger value="guru" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Guru
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Admin
            </TabsTrigger>
          </TabsList>

          {['student', 'ketua_kelas', 'guru', 'admin'].map((role) => (
            <TabsContent key={role} value={role} className="mt-6">
              <Card className="shadow-elegant border-none bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-3 px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl capitalize">
                        {role === 'student' ? 'Daftar Siswa' :
                          role === 'ketua_kelas' ? 'Ketua Kelas' :
                            role === 'guru' ? 'Tenaga Pendidik' : 'Administrator'}
                      </CardTitle>
                      <CardDescription>
                        Total {profiles?.filter(p => p.role === role || (role === 'student' && p.role === 'murid')).length || 0} pengguna
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6">
                  <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/40">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Nama</TableHead>
                          <TableHead className="font-bold">NIS/NIP</TableHead>
                          {role !== 'admin' && <TableHead className="font-bold">{role === 'guru' ? 'Wali Kelas' : 'Kelas'}</TableHead>}
                          <TableHead className="font-bold">Email</TableHead>
                          <TableHead className="text-right font-bold pr-6">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles?.filter(p => p.role === role || (role === 'student' && p.role === 'murid')).map((profile, pIdx) => (
                          <TableRow key={profile.id || `profile-${role}-${pIdx}`} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-semibold py-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${getRoleBadgeColor(profile.role)}`}>
                                  {profile.name.charAt(0)}
                                </div>
                                {profile.name}
                              </div>
                            </TableCell>
                            <TableCell>{profile.nis || profile.nip || '-'}</TableCell>
                            {role !== 'admin' && <TableCell>{profile.class?.name || (role === 'guru' ? 'Bukan Wali Kelas' : '-')}</TableCell>}
                            <TableCell className="text-muted-foreground text-sm font-medium">{profile.email}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all"
                                onClick={() => handleEdit(profile)}
                              >
                                <UserCog className="h-3.5 w-3.5 mr-1.5" />
                                Kelola
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {(!profiles || profiles.filter(p => p.role === role || (role === 'student' && p.role === 'murid')).length === 0) && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground font-medium">Belum ada data untuk role ini</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Kelola Pengguna
            </DialogTitle>
            <DialogDescription>
              Ubah akses dan penempatan kelas untuk <strong>{selectedUser?.name}</strong>
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
              <label className="text-sm font-medium">
                {selectedRole === 'guru' ? 'Wali Kelas (Opsional)' : 'Kelas'}
              </label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada kelas</SelectItem>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id?.toString() || ""}>
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
