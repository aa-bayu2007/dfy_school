import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import KetuaKelasBanner from './KetuaKelasBanner';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, roles } = useAuth();

  const getRoleClass = () => {
    if (roles.includes('admin')) return 'role-admin';
    if (roles.includes('guru')) return 'role-guru';
    return 'role-murid';
  };

  useEffect(() => {
    const roleClass = getRoleClass();
    document.body.classList.remove('role-admin', 'role-guru', 'role-murid');
    document.body.classList.add(roleClass);
    return () => {
      document.body.classList.remove('role-admin', 'role-guru', 'role-murid');
    };
  }, [roles]);

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
