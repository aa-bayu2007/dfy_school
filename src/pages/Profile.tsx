import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Shield, IdCard, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';

export default function Profile() {
    const { profile, roles } = useAuth();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Profil Saya"
                description="Informasi akun dan data diri Anda"
                icon={User}
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-elegant">
                    <CardHeader>
                        <CardTitle>Data Akun</CardTitle>
                        <CardDescription>Informasi dasar akun Anda</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-full bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                                <p className="font-medium">{profile?.full_name || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-full bg-primary/10">
                                <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-medium text-sm sm:text-base break-all">{profile?.email || '-'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-full bg-primary/10">
                                <Shield className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Role</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {roles.map((role) => (
                                        <Badge key={role} variant="secondary" className="capitalize">
                                            {role.replace('_', ' ')}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {(profile?.nis || profile?.nip || profile?.class) && (
                    <Card className="shadow-elegant">
                        <CardHeader>
                            <CardTitle>Data Akademik</CardTitle>
                            <CardDescription>Informasi terkait sekolah</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(profile?.nis || profile?.nip) && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <div className="p-2 rounded-full bg-primary/10">
                                        <IdCard className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">{profile?.role === 'guru' ? 'NIP' : 'NIS'}</p>
                                        <p className="font-medium">{profile?.nis || profile?.nip || '-'}</p>
                                    </div>
                                </div>
                            )}

                            {profile?.class && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                    <div className="p-2 rounded-full bg-primary/10">
                                        <GraduationCap className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Kelas</p>
                                        <p className="font-medium">{profile.class?.name || '-'} ({profile.class?.grade || '-'})</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
