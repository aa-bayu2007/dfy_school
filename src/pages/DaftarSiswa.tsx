import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Hash, UserCircle, Search, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ITEMS_PER_PAGE = 10;

export default function DaftarSiswa() {
    const { profile } = useAuth();
    const classId = profile?.class_id;

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const { data: students, isLoading } = useQuery({
        queryKey: ['class-students', classId],
        queryFn: async () => {
            if (!classId) return [];
            const data = await apiClient.get<any[]>(`/voting/students?class_id=${classId}`);
            return data.map(s => ({
                ...s,
                id: s.id || s.ID,
                full_name: s.full_name || s.name || 'Siswa',
                role: s.role || (s.Role ? s.Role.toLowerCase() : 'murid')
            }));
        },
        enabled: !!classId,
    });

    // Filtering logic
    const filteredStudents = useMemo(() => {
        if (!students) return [];
        return students.filter((s) => {
            const name = (s.full_name || s.name || '').toLowerCase();
            const nis = (s.profile?.nis || s.nis || '').toLowerCase();
            const search = searchQuery.toLowerCase();
            return name.includes(search) || nis.includes(search);
        });
    }, [students, searchQuery]);

    // Pagination logic
    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const pagedStudents = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredStudents, currentPage]);

    // Reset pagination when searching
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-64 cursor-wait" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Daftar Siswa
                    </h1>
                    <p className="text-muted-foreground">
                        Daftar siswa resmi di kelas {profile?.class?.name || '...'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
                        <span className="text-sm font-bold text-primary">Total: {filteredStudents.length} Siswa</span>
                    </div>
                    {searchQuery && (
                        <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-xs h-8">
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2 bg-card p-3 rounded-xl border shadow-sm max-w-md">
                <Search className="h-4 w-4 text-muted-foreground ml-1" />
                <Input
                    placeholder="Cari nama atau NIS..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="border-none focus-visible:ring-0 h-8 text-sm p-0 bg-transparent"
                />
            </div>

            <Card className="shadow-elegant overflow-hidden border-primary/10">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="text-base font-semibold">Data Siswa</CardTitle>
                    <CardDescription>Menampilkan {pagedStudents.length} dari {filteredStudents.length} siswa</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {pagedStudents.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-16 text-center">No</TableHead>
                                        <TableHead>Nama Lengkap</TableHead>
                                        <TableHead className="flex items-center gap-2">
                                            <Hash className="h-4 w-4" /> NIS
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pagedStudents.map((student, idx) => (
                                        <TableRow key={student.id} className="hover:bg-muted/5 transition-colors">
                                            <TableCell className="text-center font-medium text-muted-foreground">
                                                {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <UserCircle className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <span className="font-bold text-foreground tracking-tight">
                                                        {student.full_name || student.name}
                                                    </span>
                                                    {student.role === 'ketua_kelas' && (
                                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px] h-5 px-1.5 ml-1 flex items-center gap-1">
                                                            <UserCheck className="h-3 w-3" />
                                                            Ketua Kelas
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {student.profile?.nis || student.nis || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    Aktif
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                            <p className="text-muted-foreground">Siswa tidak ditemukan</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground">
                        Halaman {currentPage} dari {totalPages}
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Berikutnya
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
