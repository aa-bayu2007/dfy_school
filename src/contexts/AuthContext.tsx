import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppRole, Profile } from '@/types/database';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRole = (backendRole: string): AppRole => {
    const roleMap: Record<string, AppRole> = {
      'admin': 'admin',
      'guru': 'guru',
      'teacher': 'guru',
      'ketua_kelas': 'ketua_kelas',
      'murid': 'murid',
      'student': 'murid',
    };
    return roleMap[backendRole] || 'murid';
  };

  useEffect(() => {
    const loadSession = async () => {
      const storedToken = localStorage.getItem('user_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setProfile(parsedUser);

          if (parsedUser.role) {
            setRoles([mapRole(parsedUser.role)]);
          }

          // Background refresh to get latest data including Class
          await refreshProfile();
        } catch (e) {
          console.error("Failed to parse stored user", e);
          localStorage.removeItem('user_token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiClient.post<any>('/auth/login', { email, password });

      const backendUser = data.user;
      const token = data.token;
      const backendRole = data.role || (backendUser.roles?.[0]?.name) || 'murid';

      const standardizedUser = {
        ...backendUser,
        id: Number(backendUser.id || backendUser.ID),
        role: backendRole,
        full_name: backendUser.name || backendUser.Name || 'User',
        tenure_ends_at: backendUser.tenure_ends_at || backendUser.TenureEndsAt
      };

      localStorage.setItem('user_token', token);
      localStorage.setItem('user', JSON.stringify(standardizedUser));

      setUser(standardizedUser);
      setProfile(standardizedUser);
      setRoles([mapRole(backendRole)]);

      toast.success('Berhasil masuk!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Gagal masuk');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await apiClient.post('/auth/register', { email, password, name: fullName, role: 'murid' });
      toast.success('Registrasi berhasil! Silakan login.');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Gagal registrasi');
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
    setRoles([]);
    toast.success('Berhasil keluar');
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const refreshProfile = async () => {
    try {
      const backendUser = await apiClient.get<any>('/auth/me');

      const role = backendUser.role || 'murid';
      const standardizedUser = {
        ...backendUser,
        id: Number(backendUser.id || backendUser.ID),
        role: role,
        full_name: backendUser.name || backendUser.Name || 'User',
        tenure_ends_at: backendUser.tenure_ends_at || backendUser.TenureEndsAt
      };

      localStorage.setItem('user', JSON.stringify(standardizedUser));
      setUser(standardizedUser);
      setProfile(standardizedUser);
      setRoles([mapRole(role)]);
    } catch (error: any) {
      console.error("Refresh profile error:", error);
      // If user doesn't exist or token invalid, log out
      if (error.message?.includes('not found') || error.message?.includes('Unauthorized')) {
        signOut();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
