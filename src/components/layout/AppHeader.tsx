import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useUnreadCount, useMarkNotificationRead } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, LogOut, User, Moon, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';

export default function AppHeader() {
  const { user, profile, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const { data: notifications } = useNotifications(user?.id);
  const { data: unreadCount } = useUnreadCount(user?.id);
  const markRead = useMarkNotificationRead();
  const [isDark, setIsDark] = useState(false);

  const getRoleLabel = () => {
    if (roles.includes('admin')) return { label: 'ADMIN', class: 'border-primary/20 bg-primary/10 text-primary' };
    if (roles.includes('guru')) return { label: 'GURU', class: 'border-primary/20 bg-primary/10 text-primary' };
    if (roles.includes('ketua_kelas')) return { label: 'KETUA KELAS', class: 'border-primary/20 bg-primary/10 text-primary' };
    return { label: 'MURID', class: 'border-primary/20 bg-primary/10 text-primary' };
  };

  const roleInfo = getRoleLabel();

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold hidden md:block tracking-tight">
            <span className="text-muted-foreground font-normal">Halo,</span> {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0 h-5 whitespace-nowrap ${roleInfo.class}`}>
            {roleInfo.label}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount && unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-64">
              {notifications && notifications.length > 0 ? (
                notifications.slice(0, 10).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.is_read ? 'bg-primary/5' : ''
                      }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        markRead.mutate(notification.id);
                      }
                    }}
                  >
                    <span className="font-medium text-sm">{notification.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Tidak ada notifikasi
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors duration-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 duration-300">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
