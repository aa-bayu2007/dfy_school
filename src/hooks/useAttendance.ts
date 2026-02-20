import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Attendance, DailyQRCode } from '@/types/database';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export function useAttendance(studentId?: string | number, classId?: string | number, date?: string, scannedBy?: string | number) {
  return useQuery({
    queryKey: ['attendance', studentId, classId, date, scannedBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (studentId) params.append('student_id', studentId.toString());
      if (classId) params.append('class_id', classId.toString());
      if (date) params.append('date', date);
      if (scannedBy) params.append('scanned_by', scannedBy.toString());

      const data = await apiClient.get<any[]>(`/attendance/history?${params.toString()}`);
      return data.map(a => ({
        ...a,
        student: a.student ? {
          ...a.student,
          id: a.student.id || a.student.ID,
          full_name: a.student.name || a.student.profile?.full_name,
          nis: a.student.profile?.nis,
          class: a.student.class || a.student.profile?.class
        } : null,
        scanner: a.scanner ? {
          ...a.scanner,
          id: a.scanner.id || a.scanner.ID,
          full_name: a.scanner.name || a.scanner.profile?.full_name
        } : null
      })) as Attendance[];
    },
  });
}

export function useStudentQRCode(studentId?: string) {
  return useQuery({
    queryKey: ['qrcode', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return apiClient.get<DailyQRCode>(`/student/qrcode`);
    },
    enabled: !!studentId,
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      qrCode,
      scannerId,
      force,
    }: {
      qrCode: string;
      scannerId: string;
      force?: boolean;
    }) => {
      return apiClient.post<{
        student_name: string;
        is_full_day: boolean;
        created_count: number;
        total_schedules: number;
        confirmation_required?: boolean;
        message?: string;
      }>('/attendance/scan', {
        qr_code: qrCode,
        scanner_id: Number(scannerId),
        force,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-recap'] });

      if (!data.confirmation_required) {
        const name = data.student_name || 'Siswa';
        toast.success(`Absensi ${name} berhasil dicatat!`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAttendanceStats(classId?: string, month?: number, year?: number) {
  return useQuery({
    queryKey: ['attendance-stats', classId, month, year],
    queryFn: async () => {
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || new Date().getMonth();

      const startDateObj = new Date(targetYear, targetMonth, 1);
      const endDateObj = new Date(targetYear, targetMonth + 1, 0);

      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const startDate = formatDate(startDateObj);
      const endDate = formatDate(endDateObj);

      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId);
      params.append('start_date', startDate);
      params.append('end_date', endDate);

      return apiClient.get<any>(`/attendance/stats?${params.toString()}`);
    },
    enabled: !!classId,
  });
}

export function useAttendanceRecap(classId?: string, month?: number, year?: number) {
  return useQuery({
    queryKey: ['attendance-recap', classId, month, year],
    queryFn: async () => {
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || new Date().getMonth();

      const startDateObj = new Date(targetYear, targetMonth, 1);
      const endDateObj = new Date(targetYear, targetMonth + 1, 0);

      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const startDate = formatDate(startDateObj);
      const endDate = formatDate(endDateObj);

      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId);
      params.append('start_date', startDate);
      params.append('end_date', endDate);

      const data = await apiClient.get<any[]>(`/attendance/recap?${params.toString()}`);
      return data.map((s: any) => ({
        ...s,
        student: s.student ? {
          ...s.student,
          id: s.student.id || s.student.ID,
          // Backend returns 'name' and 'full_name' (both set to user.Name)
          name: s.student.name || s.student.full_name,
          full_name: s.student.full_name || s.student.name,
          nis: s.student.nis || s.student.profile?.nis,
          // Class can be direct relation
          class: s.student.class || s.student.Class
        } : null
      }));
    },
    enabled: !!classId,
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
    }: {
      studentId: number;
    }) => {
      return apiClient.post<{
        student_name: string;
        updated_count: number;
        created_count: number;
        message: string;
      }>('/attendance/manual', {
        student_id: studentId,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-recap'] });

      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}