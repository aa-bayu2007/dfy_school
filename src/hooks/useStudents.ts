import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Profile } from '@/types/database';

export function useStudents(classId?: string | number) {
    return useQuery({
        queryKey: ['students', classId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (classId) params.append('class_id', classId.toString());

            // Use the existing voting endpoint which returns students by class
            // Ideally this should be a general endpoint, but for now this works and is protected for teachers/KM
            return apiClient.get<Profile[]>(`/voting/students?${params.toString()}`);
        },
        enabled: true, // Always enable, let the endpoint handle permission/default class logic
    });
}
