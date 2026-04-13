import { useQuery } from '@tanstack/react-query';
import { ScheduleWithDetails, Day } from '@/types/database';
import { apiClient } from '@/lib/api-client';

export function useSchedules(classId?: string, teacherId?: string) {
  return useQuery({
    queryKey: ['schedules', classId, teacherId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (classId) params.append('class_id', classId);
      if (teacherId) params.append('teacher_id', teacherId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await apiClient.get<any[]>(`/schedules?${params.toString()}`);
      return data.map(s => ({
        ...s,
        teacher: s.teacher ? {
          ...s.teacher,
          full_name: s.teacher.profile?.full_name || s.teacher.name,
          nip: s.teacher.profile?.nip
        } : null
      })) as ScheduleWithDetails[];
    },
    enabled: !!classId || !!teacherId,
  });
}

export function useDays() {
  return useQuery({
    queryKey: ['days'],
    queryFn: async () => {
      return apiClient.get<Day[]>('/days');
    },
  });
}

export function useSchedulesByDay(classId?: string, teacherId?: string) {
  const { data: schedules, ...rest } = useSchedules(classId, teacherId);

  const groupedSchedules = schedules?.reduce((acc, schedule) => {
    const dayName = (schedule.day?.name || 'Unknown').trim();
    if (!acc[dayName]) {
      acc[dayName] = {
        id: schedule.day_id,
        nama_hari: dayName,
        jadwal: [],
      };
    }
    acc[dayName].jadwal.push({
      id: schedule.id.toString(),
      jam: `${schedule.time_slot?.start_time?.slice(0, 5)}-${schedule.time_slot?.end_time?.slice(0, 5)}`,
      mapel: schedule.subject?.name || '',
      kelas: schedule.class?.name || '',
      guru: schedule.teacher?.full_name || schedule.teacher?.name || '-',
      slot_number: schedule.time_slot?.slot_number,
    });
    return acc;
  }, {} as Record<string, { id: number; nama_hari: string; jadwal: Array<{ id: string; jam: string; mapel: string; kelas: string; guru: string; slot_number?: number }> }>);

  return {
    ...rest,
    data: groupedSchedules ? Object.values(groupedSchedules) : [],
    rawData: schedules,
  };
}
