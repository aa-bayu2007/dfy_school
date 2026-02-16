import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    UserCheck,
    Loader2,
    Plus,
    Trash2,
    Play,
    CheckCircle2,
    PieChart,
    Users,
    AlertCircle,
    Clock,
    UserMinus,
    Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface Candidate {
    id: number;
    student_id: number;
    student: {
        id: number;
        name: string;
        profile?: {
            nis: string;
        }
    };
    vote_count: number;
}

interface VotingSession {
    id: number;
    class_id: number;
    status: 'active' | 'finished';
    candidates: Candidate[];
    winner_id?: number;
    winner?: {
        name: string;
        tenure_ends_at?: string;
    };
    expires_at?: string;
}

export default function VoteKM() {
    const { user, profile, roles } = useAuth();
    const queryClient = useQueryClient();
    const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
    const [nominatedStudentIds, setNominatedStudentIds] = useState<number[]>([]);
    const [durationMinutes, setDurationMinutes] = useState<number>(60);
    const [tenureDays, setTenureDays] = useState<number>(365);
    const [timeLeft, setTimeLeft] = useState<string>('');

    const isGuru = roles.includes('guru');
    const isStudent = roles.includes('murid') || roles.includes('ketua_kelas');
    const classId = profile?.class_id;

    // 1. Fetch Active Session
    const { data: activeSession, isLoading: isLoadingSession } = useQuery({
        queryKey: ['active-voting-session', classId],
        queryFn: () => apiClient.get<VotingSession>(`/voting/active?class_id=${classId}`),
        enabled: !!classId,
        retry: false
    });

    // Timer Effect
    useEffect(() => {
        if (activeSession?.status === 'active' && activeSession.expires_at) {
            const interval = setInterval(() => {
                const now = new Date().getTime();
                const expiry = new Date(activeSession.expires_at!).getTime();
                const distance = expiry - now;

                if (distance < 0) {
                    setTimeLeft("Waktu Habis");
                    clearInterval(interval);
                    queryClient.invalidateQueries({ queryKey: ['active-voting-session'] });
                } else {
                    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [activeSession, queryClient]);

    // 2. Fetch Students in Class (for Guru/Wali Kelas)
    const { data: students } = useQuery({
        queryKey: ['class-students', classId],
        queryFn: () => apiClient.get<any[]>(`/voting/students?class_id=${classId}`),
        enabled: isGuru && !!classId,
    });

    // 3. Mutation: Create Session
    const createSessionMutation = useMutation({
        mutationFn: (studentIds: number[]) =>
            apiClient.post('/voting/session', {
                class_id: classId,
                student_ids: studentIds,
                duration_minutes: durationMinutes,
                tenure_days: tenureDays
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-voting-session'] });
            toast.success('Sesi voting berhasil dimulai!');
            setNominatedStudentIds([]);
        },
        onError: (err: any) => toast.error(err.message)
    });

    // 4. Mutation: Cast Vote
    const castVoteMutation = useMutation({
        mutationFn: (candidateId: number) =>
            apiClient.post('/voting/vote', { session_id: activeSession?.id, candidate_id: candidateId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-voting-session'] });
            toast.success('Suara Anda berhasil dikirim!');
        },
        onError: (err: any) => toast.error(err.message)
    });

    // 5. Mutation: Finish Session
    const finishSessionMutation = useMutation({
        mutationFn: (sessionId: number) =>
            apiClient.post(`/voting/finish/${sessionId}`),
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ['active-voting-session'] });
            toast.success(`Voting selesai! Pemenang: ${res.winner?.name}`);
        },
        onError: (err: any) => toast.error(err.message)
    });

    // 6. Mutation: Demote Ketua Kelas
    const demoteMutation = useMutation({
        mutationFn: () => apiClient.post('/voting/demote', { class_id: classId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-voting-session'] });
            queryClient.invalidateQueries({ queryKey: ['class-students'] });
            toast.success('Jabatan Ketua Kelas berhasil dicabut.');
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleNominate = (studentId: string) => {
        const id = parseInt(studentId);
        if (!nominatedStudentIds.includes(id)) {
            setNominatedStudentIds([...nominatedStudentIds, id]);
        }
        setSelectedCandidateId('');
    };

    const removeNomination = (id: number) => {
        setNominatedStudentIds(nominatedStudentIds.filter(sid => sid !== id));
    };

    const totalVotes = activeSession?.candidates?.reduce((sum, c) => sum + c.vote_count, 0) || 0;

    if (isLoadingSession) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // GURU VIEW: Start Session
    if (isGuru && !activeSession) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">Pengaturan Voting Ketua Kelas</h1>
                    <p className="text-muted-foreground italic text-sm">Pilih kandidat dari siswa di kelas Anda untuk memulai pemilihan.</p>
                </div>

                <Card className="border-primary/20 shadow-lg overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b pb-4">
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Plus className="h-5 w-5" />
                            Mulai Sesi Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <Label>Pilih Siswa</Label>
                            <Select value={selectedCandidateId} onValueChange={handleNominate}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih siswa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students?.filter(s => !nominatedStudentIds.includes(s.id)).map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name} ({s.profile?.nis || 'N/A'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border rounded-xl bg-muted/30 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead>Nama Siswa</TableHead>
                                        <TableHead>NIS</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {nominatedStudentIds.length > 0 ? (
                                        nominatedStudentIds.map(sid => {
                                            const s = students?.find(st => st.id === sid);
                                            return (
                                                <TableRow key={sid} className="hover:bg-primary/5 transition-colors">
                                                    <TableCell className="font-medium">{s?.name}</TableCell>
                                                    <TableCell className="text-xs">{s?.profile?.nis || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:bg-destructive/10"
                                                            onClick={() => removeNomination(sid)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm">
                                                Belum ada kandidat terpilih
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="duration">Durasi Voting (Menit)</Label>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                                        min={1}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tenure">Masa Jabatan (Hari)</Label>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="tenure"
                                        type="number"
                                        value={tenureDays}
                                        onChange={(e) => setTenureDays(parseInt(e.target.value))}
                                        min={1}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full gradient-primary h-11 text-base font-semibold shadow-md"
                            disabled={nominatedStudentIds.length < 2 || createSessionMutation.isPending}
                            onClick={() => createSessionMutation.mutate(nominatedStudentIds)}
                        >
                            {createSessionMutation.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <Play className="h-5 w-5 mr-2" />
                            )}
                            Mulai Sesi Voting
                        </Button>
                        {nominatedStudentIds.length < 2 && (
                            <p className="text-[11px] text-center text-muted-foreground italic flex items-center justify-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Minimum 2 kandidat untuk mulai
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // GURU & STUDENT VIEW: Results / Progress
    if (activeSession && activeSession.status === 'active') {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold tracking-tight">Pemilihan Ketua Kelas</h1>
                        <div className="flex items-center gap-2">
                            <Badge className="w-fit bg-emerald-500 hover:bg-emerald-600 animate-pulse">Sedang Berlangsung</Badge>
                            <Badge variant="outline" className="border-primary text-primary flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeLeft}
                            </Badge>
                        </div>
                    </div>

                    {isStudent && (
                        <Card className="border-primary/20 shadow-xl overflow-hidden bg-primary/5">
                            <CardHeader className="border-b pb-4">
                                <CardTitle className="text-lg">Berikan Suara Anda</CardTitle>
                                <CardDescription>Pilih satu kandidat yang menurut Anda terbaik untuk memimpin kelas.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-3">
                                {activeSession.candidates.map((c) => (
                                    <Button
                                        key={c.id}
                                        variant="outline"
                                        className="w-full h-14 justify-between bg-background hover:bg-primary hover:text-primary-foreground group transition-all duration-300 border-2"
                                        onClick={() => castVoteMutation.mutate(c.id)}
                                        disabled={castVoteMutation.isPending}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary-foreground/20 text-xs font-bold">
                                                {c.student.name.charAt(0)}
                                            </div>
                                            <span className="font-semibold">{c.student.name}</span>
                                        </div>
                                        <CheckCircle2 className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {isGuru && (
                        <Card className="border-warning/20 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-warning">Kontrol Wali Kelas</CardTitle>
                                <CardDescription>Selesaikan voting untuk menentukan pemenang secara otomatis.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="outline"
                                    className="w-full border-warning text-warning hover:bg-warning hover:text-warning-foreground h-11"
                                    onClick={() => finishSessionMutation.mutate(activeSession.id)}
                                    disabled={finishSessionMutation.isPending}
                                >
                                    {finishSessionMutation.isPending ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                    )}
                                    Selesaikan Voting Sekarang
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="shadow-lg border-none bg-accent/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-primary" />
                                Hasil Real-Time
                            </CardTitle>
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                <Users className="h-4 w-4" />
                                {totalVotes} Suara Masuk
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            {activeSession.candidates.map((c) => {
                                const percentage = totalVotes > 0 ? (c.vote_count / totalVotes) * 100 : 0;
                                return (
                                    <div key={c.id} className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>{c.student.name}</span>
                                            <span className="text-primary">{percentage.toFixed(0)}% ({c.vote_count})</span>
                                        </div>
                                        <Progress value={percentage} className="h-2.5 rounded-full" />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // FINISHED VIEW (Show winner)
    const sortedCandidates = [...(activeSession?.candidates || [])].sort((a, b) => b.vote_count - a.vote_count);
    const winner = sortedCandidates[0];

    return (
        <div className="max-w-2xl mx-auto py-12 text-center space-y-8 animate-in zoom-in duration-500">
            <div className="space-y-8">
                <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-500 shadow-xl">
                        <UserCheck className="h-12 w-12 text-emerald-600" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight">Ketua Kelas Terpilih!</h1>
                    <p className="text-muted-foreground">Pemilihan telah ditutup dengan hasil sebagai berikut:</p>
                </div>

                <Card className="border-emerald-500/20 shadow-2xl bg-emerald-50/30 overflow-hidden">
                    <CardHeader className="relative pb-8">
                        <Badge className="w-fit mx-auto bg-emerald-600 mb-4 uppercase tracking-widest text-[10px] py-1 px-4">Terpilih</Badge>
                        <CardTitle className="text-4xl font-black text-emerald-950 uppercase">
                            {winner?.student?.name}
                        </CardTitle>
                        <CardDescription className="text-emerald-700 font-medium pt-2">
                            Pemenang voting dengan total {winner?.vote_count} suara
                        </CardDescription>
                        {activeSession?.winner?.tenure_ends_at && (
                            <div className="flex items-center justify-center gap-2 mt-4 text-emerald-800 text-sm font-semibold bg-emerald-200/50 py-2 rounded-full px-4 w-fit mx-auto">
                                <Calendar className="h-4 w-4" />
                                Masa Jabatan Berakhir: {new Date(activeSession.winner.tenure_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        )}
                    </CardHeader>
                </Card>

                {isGuru && (
                    <div className="pt-8 border-t space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-foreground">Manajemen Jabatan</h3>
                            <p className="text-sm text-muted-foreground">Sebagai Wali Kelas, Anda dapat mencabut jabatan Ketua Kelas untuk memulai pemilihan baru di masa mendatang.</p>
                        </div>

                        <Button
                            variant="destructive"
                            className="w-full h-12 text-base font-bold shadow-lg flex items-center justify-center gap-2"
                            onClick={() => demoteMutation.mutate()}
                            disabled={demoteMutation.isPending}
                        >
                            {demoteMutation.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <UserMinus className="h-5 w-5" />
                            )}
                            Cabut Jabatan Ketua Kelas
                        </Button>

                        <p className="text-[10px] text-muted-foreground italic">
                            * Role siswa akan otomatis kembali menjadi "Murid" dan Anda dapat memulai sesi voting baru.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
