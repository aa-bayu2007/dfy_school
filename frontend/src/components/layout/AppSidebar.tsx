import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Calendar,
  QrCode,
  ClipboardList,
  FileText,
  Users,
  BookOpen,
  Clock,
  Settings,
  GraduationCap,
  ScanLine,
  UserCog,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = {
  murid: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Jadwal Pelajaran', url: '/dashboard/jadwal', icon: Calendar },
    { title: 'QR Code Saya', url: '/dashboard/qr-code', icon: QrCode },
    { title: 'Vote KM', url: '/dashboard/vote-km', icon: UserCheck },
    { title: 'Riwayat Absensi', url: '/dashboard/absensi', icon: ClipboardList },
    { title: 'Ajukan Izin', url: '/dashboard/izin', icon: FileText },
  ],
  ketua_kelas: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Scan Absensi', url: '/dashboard/scan', icon: ScanLine },
    { title: 'Jadwal Pelajaran', url: '/dashboard/jadwal', icon: Calendar },
    { title: 'QR Code Saya', url: '/dashboard/qr-code', icon: QrCode },
    { title: 'Vote KM', url: '/dashboard/vote-km', icon: UserCheck },
    { title: 'Absensi Kelas', url: '/dashboard/absensi-kelas', icon: ClipboardList },
    { title: 'Ajukan Izin', url: '/dashboard/izin', icon: FileText },
  ],
  guru: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Scan Absensi', url: '/dashboard/scan', icon: ScanLine },
    { title: 'Jadwal Mengajar', url: '/dashboard/jadwal', icon: Calendar },
    { title: 'Rekap Absensi', url: '/dashboard/rekap', icon: ClipboardList },
    { title: 'Permintaan Izin', url: '/dashboard/review-izin', icon: FileText },
  ],
  admin: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Kelola Pengguna', url: '/dashboard/users', icon: Users },
    { title: 'Kelola Kelas', url: '/dashboard/kelas', icon: GraduationCap },
    { title: 'Kelola Mapel', url: '/dashboard/mapel', icon: BookOpen },
    { title: 'Kelola Jadwal', url: '/dashboard/kelola-jadwal', icon: Clock },
    { title: 'Rekap Absensi', url: '/dashboard/rekap', icon: ClipboardList },
    { title: 'Permintaan Izin', url: '/dashboard/review-izin', icon: FileText },
  ],
};

export default function AppSidebar() {
  const { roles, profile } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  // Get menu based on highest role
  const getMenuItems = () => {
    if (roles.includes('admin')) return menuItems.admin;
    if (roles.includes('guru')) {
      const items = [...menuItems.guru];
      // Wali Kelas check: if guru has a class_id
      if (profile?.class_id) {
        items.splice(1, 0, { title: 'Daftar Siswa', url: '/dashboard/daftar-siswa', icon: Users });
        items.splice(2, 0, { title: 'Vote KM', url: '/dashboard/vote-km', icon: UserCheck });
      }
      return items;
    }
    if (roles.includes('ketua_kelas')) return menuItems.ketua_kelas;
    return menuItems.murid;
  };

  const getRoleLabel = () => {
    if (roles.includes('admin')) return 'Administrator';
    if (roles.includes('guru')) return 'Guru';
    if (roles.includes('ketua_kelas')) return 'Ketua Kelas';
    return 'Murid';
  };

  const items = getMenuItems();

  const getRoleTheme = () => {
    return 'bg-primary/5 text-primary';
  };

  const themeClass = getRoleTheme();

  return (
    <Sidebar className="border-r border-sidebar-border shadow-sm">
      <SidebarHeader className={`p-4 ${themeClass}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-sm">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Absensi</span>
              <span className="text-xs text-sidebar-foreground/70">Sistem Sekolah</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.url === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="transition-all duration-300 h-10"
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === '/dashboard'}
                        className="flex items-center gap-3 px-3 w-full h-full relative group"
                      >
                        <div className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-sidebar-primary transition-opacity duration-300",
                          isActive ? "opacity-100" : "opacity-0"
                        )} />
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-colors duration-300",
                          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                        )} />
                        {!collapsed && (
                          <span className={cn(
                            "transition-colors duration-300",
                            isActive ? "font-semibold text-sidebar-foreground" : "text-sidebar-foreground/80"
                          )}>
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`p-4 ${themeClass}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3 backdrop-blur-sm shadow-sm border border-sidebar-border/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-sm font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.full_name || 'User'}
              </span>
              <span className="text-xs text-sidebar-foreground/70">{getRoleLabel()}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
