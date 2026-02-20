import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import KetuaKelasBanner from './KetuaKelasBanner';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, roles } = useAuth();

  const getRoleClass = () => {
    if (roles.includes('admin')) return 'role-admin';
    if (roles.includes('guru')) return 'role-guru';

    // Check for student major in class name
    if (roles.includes('murid') || roles.includes('ketua_kelas')) {
      const className = profile?.class?.name || '';
      const lowerName = className.toLowerCase();

      if (lowerName.includes('pplg')) return 'theme-pplg';
      if (lowerName.includes('tbsm')) return 'theme-tbsm';
      if (lowerName.includes('dkv')) return 'theme-dkv';
      if (lowerName.includes('tjkt')) return 'theme-tjkt';
      if (lowerName.includes('toi')) return 'theme-toi';

      return 'role-murid'; // Default student
    }

    return 'role-murid';
  };

  useEffect(() => {
    const roleClass = getRoleClass();
    // Cleanup old classes
    document.body.classList.remove(
      'role-admin', 'role-guru', 'role-murid',
      'theme-pplg', 'theme-tbsm', 'theme-dkv', 'theme-tjkt', 'theme-toi'
    );
    document.body.classList.add(roleClass);
    return () => {
      document.body.classList.remove(
        'role-admin', 'role-guru', 'role-murid',
        'theme-pplg', 'theme-tbsm', 'theme-dkv', 'theme-tjkt', 'theme-toi'
      );
    };
  }, [roles, profile]);

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className={`min-h-screen flex w-full bg-background ${getRoleClass()}`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AppHeader />
          <KetuaKelasBanner />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
