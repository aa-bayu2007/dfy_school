import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleWithDetails, Day } from '@/types/database';

export function useSchedules(classId?: string) {
  return useQuery({
    queryKey: ['schedules', classId],
    queryFn: async () => {
      let query = supabase
        .from('schedules')
        .select(`
          *,
          day:days(*),
          time_slot:time_slots(*),
          subject:subjects(*),
          class:classes(*),
          teacher:profiles(*)
        `)
        .order('day_id')
        .order('time_slot_id');

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ScheduleWithDetails[];
    },
    enabled: !!classId,
  });
}

export function useDays() {
  return useQuery({
    queryKey: ['days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('days')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as Day[];
    },
  });
}

export function useSchedulesByDay(classId?: string) {
  const { data: schedules, ...rest } = useSchedules(classId);

  const groupedSchedules = schedules?.reduce((acc, schedule) => {
    const dayName = schedule.day?.name || 'Unknown';
    if (!acc[dayName]) {
      acc[dayName] = {
        id: schedule.day_id,
        nama_hari: dayName,
        jadwal: [],
      };
    }
    acc[dayName].jadwal.push({
      id: schedule.id,
      jam: `${schedule.time_slot?.start_time?.slice(0, 5)}-${schedule.time_slot?.end_time?.slice(0, 5)}`,
      mapel: schedule.subject?.name || '',
      kelas: schedule.class?.name || '',
      guru: schedule.teacher?.full_name || '-',
    });
    return acc;
  }, {} as Record<string, { id: number; nama_hari: string; jadwal: Array<{ id: string; jam: string; mapel: string; kelas: string; guru: string }> }>);

  return {
    ...rest,
    data: groupedSchedules ? Object.values(groupedSchedules) : [],
    rawData: schedules,
  };
}
