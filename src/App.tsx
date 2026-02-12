import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import JadwalPelajaran from "./pages/JadwalPelajaran";
import QRCodePage from "./pages/QRCodePage";
import RiwayatAbsensi from "./pages/RiwayatAbsensi";
import AjukanIzin from "./pages/AjukanIzin";
import ScanAbsensi from "./pages/ScanAbsensi";
import ReviewIzin from "./pages/ReviewIzin";
import RekapAbsensi from "./pages/RekapAbsensi";
import KelolaKelas from "./pages/admin/KelolaKelas";
import KelolaMapel from "./pages/admin/KelolaMapel";
import KelolaUsers from "./pages/admin/KelolaUsers";
import KelolaJadwal from "./pages/admin/KelolaJadwal";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/profile" element={<Profile />} />
                <Route path="/dashboard/jadwal" element={<JadwalPelajaran />} />
                <Route path="/dashboard/qr-code" element={<QRCodePage />} />
                <Route path="/dashboard/absensi" element={<RiwayatAbsensi />} />
                <Route path="/dashboard/izin" element={<AjukanIzin />} />
                <Route path="/dashboard/scan" element={<ScanAbsensi />} />
                <Route path="/dashboard/absensi-kelas" element={<RiwayatAbsensi />} />
                <Route path="/dashboard/rekap" element={<RekapAbsensi />} />
                <Route path="/dashboard/review-izin" element={<ReviewIzin />} />
                <Route path="/dashboard/kelas" element={<KelolaKelas />} />
                <Route path="/dashboard/mapel" element={<KelolaMapel />} />
                <Route path="/dashboard/users" element={<KelolaUsers />} />
                <Route path="/dashboard/kelola-jadwal" element={<KelolaJadwal />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
