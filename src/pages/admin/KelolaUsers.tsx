import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
  RotateCcw,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  FileUp,
  Download,
  Plus,
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
  const [activeTab, setActiveTab] = useState('student');
  const [selectedRole, setSelectedRole] = useState<AppRole>('murid');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [selectedPromoStudent, setSelectedPromoStudent] = useState<string>('');
  const [dialogSearchName, setDialogSearchName] = useState('');
  const [dialogSearchGrade, setDialogSearchGrade] = useState<string>('all');
  const [dialogSearchMajor, setDialogSearchMajor] = useState<string>('all');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'murid',
    class_id: '',
    nis: '',
    nip: ''
  });

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedFilterClass, setSelectedFilterClass] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all profiles (users)
  const { data: profiles, isLoading, refetch } = useQuery({
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
    queryFn: () => apiClient.get<Class[]>('/admin/classes'),
  });

  const handleImportExcel = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const promise = apiClient.post<any>('/admin/users/import', formData);

    toast.promise(promise, {
      loading: 'Mengimpor data siswa...',
      success: (res) => {
        refetch();
        return res.message || 'Data siswa berhasil diimpor!';
      },
      error: (err) => {
        const errorMsg = err instanceof Error ? err.message : 'Gagal mengimpor data';
        return `Kesalahan: ${errorMsg}`;
      },
    });
  };

  const downloadTemplate = () => {
    const headers = ["Nama", "Email", "NIS", "Kelas (Nama)", "Password (Opsional)"];
    const rows = [
      ["Ahmad Fauzi", "ahmad@student.com", "12345", "X PPLG 1", "123456"],
      ["Siti Aminah", "siti@student.com", "12346", "XI DKV 2", "123456"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");
    XLSX.writeFile(workbook, "template_import_siswa.xlsx");
  };

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

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        class_id: data.class_id ? parseInt(data.class_id) : null
      };
      return apiClient.post('/admin/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
      toast.success('Pengguna berhasil dibuat!');
      setAddUserDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'murid',
        class_id: '',
        nis: '',
        nip: ''
      });
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

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Mohon lengkapi data wajib (Nama, Email, Password)');
      return;
    }
    await createUserMutation.mutateAsync(newUser);
  };

  const studentsForManagement = useMemo(() => {
    return profiles?.filter(p => {
      // Show only murid and ketua_kelas in this management dialog
      const isRoleMatch = p.role === 'murid' || p.role === 'ketua_kelas' || p.role === 'student';
      if (!isRoleMatch) return false;

      // Filter by Dialog Search States
      if (dialogSearchName && !p.name.toLowerCase().includes(dialogSearchName.toLowerCase())) return false;
      if (dialogSearchGrade !== 'all' && p.class?.grade !== dialogSearchGrade) return false;
      if (dialogSearchMajor !== 'all' && p.class?.major !== dialogSearchMajor) return false;

      return true;
    }) || [];
  }, [profiles, dialogSearchName, dialogSearchGrade, dialogSearchMajor]);

  const handlePromote = async () => {
    if (!selectedPromoStudent) {
      toast.error('Pilih siswa terlebih dahulu');
      return;
    }
    await updateRoleMutation.mutateAsync({
      userId: parseInt(selectedPromoStudent),
      role: 'ketua_kelas'
    });
    setShowPromoteDialog(false);
    setSelectedPromoStudent('');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Kelola Pengguna
            </h1>
            <p className="text-muted-foreground">
              Kelola data pengguna, role, dan kelas
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {activeTab === 'student' && (
              <>
                <Button onClick={() => downloadTemplate()} variant="outline" className="rounded-xl border-dashed">
                  <Download className="h-4 w-4 mr-2" />
                  Template Excel
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    id="excel-upload"
                    className="hidden"
                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportExcel(file);
                    }}
                  />
                  <Button onClick={() => document.getElementById('excel-upload')?.click()} variant="outline" className="rounded-xl gradient-primary text-white border-none shadow-lg shadow-primary/20 hover:opacity-90">
                    <FileUp className="h-4 w-4 mr-2" />
                    Import Excel
                  </Button>
                </div>
              </>
            )}
            {activeTab === 'ketua_kelas' ? (
              <Button onClick={() => setShowPromoteDialog(true)} className="rounded-xl gradient-primary border-none shadow-lg shadow-primary/20 hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Ketua Kelas
              </Button>
            ) : (
              <Button onClick={() => setAddUserDialogOpen(true)} className="rounded-xl gradient-primary border-none shadow-lg shadow-primary/20 hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Pengguna
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Tabs
          value={activeTab}
          className="w-full"
          onValueChange={(value) => {
            setActiveTab(value);
            setSelectedGrade(null);
            setSelectedMajor(null);
            setSelectedSection(null);
            setSelectedFilterClass('all');
            setSearchQuery('');
            setCurrentPage(1);
          }}
        >
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

          {['student', 'ketua_kelas', 'guru', 'admin'].map((role) => {
            // Filter Logic
            const filteredUsers = profiles?.filter(p => {
              // 1. Role Filter
              const isRoleMatch = p.role === role || (role === 'student' && p.role === 'murid');
              if (!isRoleMatch) return false;

              // 2. Grade, Major, & Section Filter (For students and class leaders)
              if (role === 'student' || role === 'ketua_kelas') {
                // If a specific class is selected, it takes precedence
                if (selectedFilterClass && selectedFilterClass !== 'all') {
                  if (p.class_id?.toString() !== selectedFilterClass) return false;
                } else {
                  // Apply granular filters if present
                  if (selectedGrade && p.class?.grade !== selectedGrade) return false;
                  if (selectedMajor && p.class?.major !== selectedMajor) return false;
                  if (selectedSection && p.class?.section !== selectedSection) return false;
                }
              }

              // 3. Search Filter
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                  p.name.toLowerCase().includes(query) ||
                  (p.nis && p.nis.includes(query)) ||
                  (p.nip && p.nip.includes(query)) ||
                  p.email.toLowerCase().includes(query)
                );
              }

              return true;
            }) || [];

            // Pagination Logic
            const totalItems = filteredUsers.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

            return (
              <TabsContent key={role} value={role} className="mt-6">
                <Card className="shadow-elegant border-none bg-card/60 backdrop-blur-sm">
                  <CardHeader className="pb-3 px-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl capitalize">
                            {role === 'student' ? 'Daftar Siswa' :
                              role === 'ketua_kelas' ? 'Ketua Kelas' :
                                role === 'guru' ? 'Tenaga Pendidik' : 'Administrator'}
                          </CardTitle>
                          <CardDescription>
                            Total {totalItems} pengguna ditemukan
                          </CardDescription>
                        </div>
                      </div>

                      {/* Search and Filters Bar */}
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Cari nama, NIS/NIP, email..."
                              className="flex h-10 w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 pl-10"
                              value={searchQuery}
                              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            />
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto">
                            {(selectedGrade || selectedMajor || selectedSection || (selectedFilterClass && selectedFilterClass !== 'all') || searchQuery) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedGrade(null);
                                  setSelectedMajor(null);
                                  setSelectedSection(null);
                                  setSelectedFilterClass('all');
                                  setSearchQuery('');
                                  setCurrentPage(1);
                                  toast.info('Filter dibersihkan');
                                }}
                                className="text-muted-foreground hover:text-primary transition-colors"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset Filter
                              </Button>
                            )}
                          </div>
                        </div>

                        {(role === 'student' || role === 'ketua_kelas') && (
                          <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-2xl border border-border/50">
                            <div className="flex flex-wrap gap-3">
                              {/* Grade Filter */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Tingkat</span>
                                <Select
                                  value={selectedGrade || "all"}
                                  onValueChange={(value) => {
                                    setSelectedGrade(value === "all" ? null : value);
                                    setSelectedFilterClass('all');
                                    setCurrentPage(1);
                                  }}
                                >
                                  <SelectTrigger className="w-[140px] h-9 rounded-lg">
                                    <SelectValue placeholder="Tingkat" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="X">Kelas X</SelectItem>
                                    <SelectItem value="XI">Kelas XI</SelectItem>
                                    <SelectItem value="XII">Kelas XII</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Major Filter */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Jurusan</span>
                                <Select
                                  value={selectedMajor || "all"}
                                  onValueChange={(value) => {
                                    setSelectedMajor(value === "all" ? null : value);
                                    setSelectedFilterClass('all');
                                    setCurrentPage(1);
                                  }}
                                >
                                  <SelectTrigger className="w-[140px] h-9 rounded-lg">
                                    <SelectValue placeholder="Jurusan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="PPLG">PPLG</SelectItem>
                                    <SelectItem value="TBSM">TBSM</SelectItem>
                                    <SelectItem value="DKV">DKV</SelectItem>
                                    <SelectItem value="TJKT">TJKT</SelectItem>
                                    <SelectItem value="TOI">TOI</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Section Filter */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Kelas</span>
                                <Select
                                  value={selectedSection || "all"}
                                  onValueChange={(value) => {
                                    setSelectedSection(value === "all" ? null : value);
                                    setSelectedFilterClass('all');
                                    setCurrentPage(1);
                                  }}
                                >
                                  <SelectTrigger className="w-[110px] h-9 rounded-lg">
                                    <SelectValue placeholder="Kelas" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                    <SelectItem value="4">4</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Pilih Kelas Terdaftar</span>
                              <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex pb-3 gap-2 items-center">
                                  <Button
                                    variant={selectedFilterClass === null || selectedFilterClass === 'all' ? "default" : "outline"}
                                    size="sm"
                                    className={`rounded-full h-8 whitespace-nowrap ${selectedFilterClass === null || selectedFilterClass === 'all' ? "gradient-primary border-none" : "bg-background/50"}`}
                                    onClick={() => { setSelectedFilterClass('all'); setCurrentPage(1); }}
                                  >
                                    Semua Kelas
                                  </Button>
                                  {classes?.filter(c => {
                                    if (selectedGrade && c.grade !== selectedGrade) return false;
                                    if (selectedMajor && c.major !== selectedMajor) return false;
                                    if (selectedSection && c.section !== selectedSection) return false;
                                    return true;
                                  }).map((cls) => (
                                    <Button
                                      key={cls.id}
                                      variant={selectedFilterClass === cls.id?.toString() ? "default" : "outline"}
                                      size="sm"
                                      className={`rounded-full h-8 whitespace-nowrap ${selectedFilterClass === cls.id?.toString() ? "gradient-primary border-none" : "bg-background/50"}`}
                                      onClick={() => { setSelectedFilterClass(cls.id?.toString() || null); setCurrentPage(1); }}
                                    >
                                      {cls.name}
                                    </Button>
                                  ))}
                                </div>
                                <ScrollBar orientation="horizontal" className="h-1.5" />
                              </ScrollArea>
                            </div>
                          </div>
                        )}
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
                          {paginatedUsers.length > 0 ? (
                            paginatedUsers.map((profile, pIdx) => (
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
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                  <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                  <p className="text-muted-foreground font-medium">Tidak ada pengguna ditemukan</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalItems > 0 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} data
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Sebelumnya
                          </Button>
                          <div className="text-sm font-medium">
                            Halaman {currentPage} dari {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Selanjutnya
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
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

      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Buat akun pengguna baru dengan role spesifik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nama Lengkap"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@sekolah.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Password minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
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

            {(newUser.role === 'murid' || newUser.role === 'ketua_kelas') && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">NIS</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newUser.nis}
                    onChange={(e) => setNewUser({ ...newUser, nis: e.target.value })}
                    placeholder="Nomor Induk Siswa"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kelas</label>
                  <Select
                    value={newUser.class_id}
                    onValueChange={(v) => setNewUser({ ...newUser, class_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id?.toString() || ""}>
                          {cls.name} - {cls.grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {newUser.role === 'guru' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">NIP</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newUser.nip}
                  onChange={(e) => setNewUser({ ...newUser, nip: e.target.value })}
                  placeholder="Nomor Induk Pegawai"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              className="gradient-primary"
            >
              {createUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Buat Pengguna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Kelola Ketua Kelas
            </DialogTitle>
            <DialogDescription>
              Cari siswa dan atur status Ketua Kelas mereka.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 min-h-0 flex-1 flex flex-col">
            {/* Search Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Nama</label>
                <input
                  type="text"
                  placeholder="Cari nama..."
                  className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={dialogSearchName}
                  onChange={(e) => setDialogSearchName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Tingkat</label>
                <Select value={dialogSearchGrade} onValueChange={setDialogSearchGrade}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="Semua Tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tingkat</SelectItem>
                    <SelectItem value="X">Kelas X</SelectItem>
                    <SelectItem value="XI">Kelas XI</SelectItem>
                    <SelectItem value="XII">Kelas XII</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Jurusan</label>
                <Select value={dialogSearchMajor} onValueChange={setDialogSearchMajor}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="Semua Jurusan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jurusan</SelectItem>
                    <SelectItem value="PPLG">PPLG</SelectItem>
                    <SelectItem value="TBSM">TBSM</SelectItem>
                    <SelectItem value="DKV">DKV</SelectItem>
                    <SelectItem value="TJKT">TJKT</SelectItem>
                    <SelectItem value="TOI">TOI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex-1 min-h-0 border rounded-xl overflow-hidden bg-muted/10">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Nama</TableHead>
                      <TableHead className="text-xs font-bold">NIS</TableHead>
                      <TableHead className="text-xs font-bold">Kelas</TableHead>
                      <TableHead className="text-xs font-bold text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForManagement.length > 0 ? (
                      studentsForManagement.map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium py-3 text-sm">
                            <div className="flex flex-col">
                              <span>{s.name}</span>
                              {s.role === 'ketua_kelas' && (
                                <Badge variant="outline" className="w-fit text-[10px] h-4 px-1 mt-0.5 border-warning/50 text-warning">
                                  Ketua Kelas
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{s.nis || '-'}</TableCell>
                          <TableCell className="text-xs">{s.class?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            {s.role === 'ketua_kelas' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 text-[11px]"
                                onClick={() => updateRoleMutation.mutate({ userId: s.id, role: 'murid' })}
                                disabled={updateRoleMutation.isPending}
                              >
                                {updateRoleMutation.isPending && s.id === selectedUser?.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                )}
                                Hapus
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-primary hover:text-primary hover:bg-primary/10 text-[11px]"
                                onClick={() => updateRoleMutation.mutate({ userId: s.id, role: 'ketua_kelas' })}
                                disabled={updateRoleMutation.isPending}
                              >
                                {updateRoleMutation.isPending && s.id === selectedUser?.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3 mr-1" />
                                )}
                                Tambah
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-sm">
                          Tidak ada siswa ditemukan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
