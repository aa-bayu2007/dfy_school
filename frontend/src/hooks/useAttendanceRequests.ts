import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AttendanceRequest, RequestStatus } from '@/types/database';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export function useAttendanceRequests(studentId?: string, status?: RequestStatus, classId?: string | number) {
  return useQuery({
    queryKey: ['attendance-requests', studentId, status, classId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (studentId) params.append('student_id', studentId);
      if (status) params.append('status', status);
      if (classId) params.append('class_id', classId.toString());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await apiClient.get<any[]>(`/attendance/requests?${params.toString()}`);
      return data.map(req => ({
        ...req,
        id: req.id || req.ID,
        student: req.student ? {
          ...req.student,
          id: req.student.id || req.student.ID,
          // Backend User model has 'name' field directly
          full_name: req.student.name || req.student.full_name || req.student.profile?.full_name,
          nis: req.student.profile?.nis,
          // Class can be direct relation or through profile
          class: req.student.class || req.student.Class || req.student.profile?.class
        } : null,
        reviewer: req.reviewer ? {
          ...req.reviewer,
          id: req.reviewer.id || req.reviewer.ID,
          full_name: req.reviewer.name || req.reviewer.full_name || req.reviewer.profile?.full_name
        } : null,
        // Ensure schedules array exists
        schedules: req.schedules || []
      })) as AttendanceRequest[];
    },
  });
}

export function useCreateAttendanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      date,
      endDate,
      autoMarkUpcoming,
      requestType,
      reason,
      attachmentUrl,
      isFullDay = true,
      scheduleIds = [],
    }: {
      studentId: string;
      date: string;
      endDate?: string;
      autoMarkUpcoming?: boolean;
      requestType: 'sakit' | 'izin';
      reason: string;
      attachmentUrl?: string;
      isFullDay?: boolean;
      scheduleIds?: number[];
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return apiClient.post<any>('/attendance/request', {
        student_id: Number(studentId),
        date,
        end_date: endDate,
        auto_mark_upcoming: autoMarkUpcoming,
        request_type: requestType,
        reason,
        attachment_url: attachmentUrl || "",
        is_full_day: isFullDay,
        schedule_ids: scheduleIds
      });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return apiClient.post<any>(`/attendance/requests/${requestId}/approve`, {
        status,
        reviewer_id: Number(reviewerId)
      });
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
