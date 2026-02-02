import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRequest, RequestStatus } from '@/types/database';
import { toast } from 'sonner';

export function useAttendanceRequests(studentId?: string, status?: RequestStatus) {
  return useQuery({
    queryKey: ['attendance-requests', studentId, status],
    queryFn: async () => {
      let query = supabase
        .from('attendance_requests')
        .select(`
          *,
          student:profiles(*),
          reviewer:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AttendanceRequest[];
    },
  });
}

export function useCreateAttendanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      date,
      requestType,
      reason,
      attachmentUrl,
    }: {
      studentId: string;
      date: string;
      requestType: 'sakit' | 'izin';
      reason: string;
      attachmentUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from('attendance_requests')
        .insert({
          student_id: studentId,
          date,
          request_type: requestType,
          reason,
          attachment_url: attachmentUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-requests'] });
      toast.success('Permintaan izin berhasil dikirim!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useReviewAttendanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      reviewerId,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
      reviewerId: string;
    }) => {
      const { data, error } = await supabase
        .from('attendance_requests')
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved, update the attendance record
      if (status === 'approved') {
        const request = data as unknown as AttendanceRequest;
        await supabase
          .from('attendances')
          .upsert({
            student_id: request.student_id,
            date: request.date,
            status: request.request_type,
            notes: request.reason,
          });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`Permintaan ${variables.status === 'approved' ? 'disetujui' : 'ditolak'}!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
