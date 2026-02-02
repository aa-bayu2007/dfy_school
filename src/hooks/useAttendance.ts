import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendance, AttendanceStatus, DailyQRCode } from '@/types/database';
import { toast } from 'sonner';

export function useAttendance(studentId?: string, date?: string) {
  return useQuery({
    queryKey: ['attendance', studentId, date],
    queryFn: async () => {
      let query = supabase
        .from('attendances')
        .select(`
          *,
          student:profiles(*),
          schedule:schedules(
            *,
            subject:subjects(*),
            time_slot:time_slots(*)
          )
        `);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Attendance[];
    },
  });
}

export function useStudentQRCode(studentId?: string) {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['qrcode', studentId, today],
    queryFn: async () => {
      if (!studentId) return null;

      // First try to get existing QR
      const { data, error } = await supabase
        .from('daily_qr_codes')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;

      // If no QR exists, create one
      if (!data) {
        const qrCode = crypto.randomUUID() + '-' + Date.now().toString(36);
        const { data: newData, error: insertError } = await supabase
          .from('daily_qr_codes')
          .insert({
            student_id: studentId,
            qr_code: qrCode,
            date: today,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as DailyQRCode;
      }

      return data as DailyQRCode;
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
      scheduleId,
    }: {
      qrCode: string;
      scannerId: string;
      scheduleId: string;
    }) => {
      const today = new Date().toISOString().split('T')[0];

      // Verify QR code
      const { data: qrData, error: qrError } = await supabase
        .from('daily_qr_codes')
        .select('*, student:profiles(*)')
        .eq('qr_code', qrCode)
        .eq('date', today)
        .single();

      if (qrError || !qrData) {
        throw new Error('QR Code tidak valid atau sudah kadaluarsa');
      }

      // Record attendance
      const { data, error } = await supabase
        .from('attendances')
        .upsert({
          student_id: qrData.student_id,
          schedule_id: scheduleId,
          date: today,
          status: 'hadir' as AttendanceStatus,
          scanned_by: scannerId,
          scanned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { attendance: data, student: qrData.student };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`Absensi ${data.student?.full_name} berhasil dicatat!`);
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
      const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 1);
      const endDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) + 1, 0);

      const { data, error } = await supabase
        .from('attendances')
        .select(`
          *,
          student:profiles(*, class:classes(*))
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by student
      const stats = (data as unknown as Attendance[]).reduce((acc, att) => {
        const studentId = att.student_id;
        if (!acc[studentId]) {
          acc[studentId] = {
            student: att.student,
            hadir: 0,
            sakit: 0,
            izin: 0,
            alpha: 0,
            total: 0,
          };
        }
        acc[studentId][att.status]++;
        acc[studentId].total++;
        return acc;
      }, {} as Record<string, any>);

      return Object.values(stats);
    },
    enabled: !!classId,
  });
}
