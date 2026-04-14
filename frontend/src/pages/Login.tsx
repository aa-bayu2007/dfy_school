import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, ShieldCheck, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<'siswa' | 'guru' | 'admin'>('siswa');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expectedRole = loginType === 'siswa' ? 'murid' : loginType === 'guru' ? 'guru' : 'admin';
      await signIn(identifier, password, expectedRole);
      toast.success('Berhasil masuk!');
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Gagal masuk. Periksa data login Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tabConfig = {
    siswa: {
      label: 'NIS',
      placeholder: 'Masukkan NIS anda',
      inputType: 'text',
    },
    guru: {
      label: 'NIP',
      placeholder: 'Masukkan NIP anda',
      inputType: 'text',
    },
    admin: {
      label: 'Email',
      placeholder: 'admin@sekolah.com',
      inputType: 'email',
    },
  };

  const currentTab = tabConfig[loginType];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-elegant animate-fade-in border-none bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-lg">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain brightness-0 invert" />
          </div>
          <CardTitle className="text-2xl font-bold">DFY School</CardTitle>
          <CardDescription>Sistem Informasi Manajemen Sekolah</CardDescription>
        </CardHeader>

        <div className="px-6 pb-2">
          <Tabs defaultValue="siswa" onValueChange={(v) => { setLoginType(v as 'siswa' | 'guru' | 'admin'); setIdentifier(''); setPassword(''); }} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="siswa" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <User className="h-4 w-4" />
                Siswa
              </TabsTrigger>
              <TabsTrigger value="guru" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-4 w-4" />
                Guru
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <ShieldCheck className="h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6">
              <CardContent className="space-y-4 p-0">
                <div className="space-y-2">
                  <Label htmlFor="identifier">{currentTab.label}</Label>
                  <Input
                    id="identifier"
                    type={currentTab.inputType}
                    placeholder={currentTab.placeholder}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 px-0 pt-6">
                <Button type="submit" className="w-full h-11 gradient-primary text-base font-medium shadow-md hover:shadow-lg transition-all" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Masuk'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
