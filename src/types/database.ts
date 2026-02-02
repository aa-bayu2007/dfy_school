export type AppRole = 'admin' | 'guru' | 'ketua_kelas' | 'murid';
export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha' | 'pending';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  nis?: string;
  nip?: string;
  class_id?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  class?: Class;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  created_at: string;
}

export interface Day {
  id: number;
  name: string;
}

export interface TimeSlot {
  id: string;
  slot_number: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Schedule {
  id: string;
  day_id: number;
  time_slot_id: string;
  subject_id: string;
  class_id: string;
  teacher_id?: string;
  created_at: string;
  day?: Day;
  time_slot?: TimeSlot;
  subject?: Subject;
  class?: Class;
  teacher?: Profile;
}

export interface DailyQRCode {
  id: string;
  student_id: string;
  qr_code: string;
  date: string;
  is_used: boolean;
  created_at: string;
  student?: Profile;
}

export interface Attendance {
  id: string;
  student_id: string;
  schedule_id: string;
  date: string;
  status: AttendanceStatus;
  scanned_by?: string;
  scanned_at?: string;
  notes?: string;
  created_at: string;
  student?: Profile;
  schedule?: Schedule;
  scanner?: Profile;
}

export interface AttendanceRequest {
  id: string;
  student_id: string;
  date: string;
  request_type: 'sakit' | 'izin';
  reason: string;
  attachment_url?: string;
  status: RequestStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  student?: Profile;
  reviewer?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ScheduleWithDetails extends Schedule {
  day: Day;
  time_slot: TimeSlot;
  subject: Subject;
  class: Class;
  teacher?: Profile;
}
