export type AppRole = 'admin' | 'guru' | 'ketua_kelas' | 'murid';
export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha' | 'pending';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: number;
  name: string;
  full_name: string;
  nis?: string;
  nip?: string;
  class_id?: number;
  phone?: string;
  address?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  email?: string;
  role?: string;
  class?: Class;
  tenure_ends_at?: string;
}

export interface UserRole {
  id: number;
  user_id: number;
  role: AppRole;
}

export interface Class {
  id: number;
  name: string;
  grade: string;
  major?: string;
  section?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  teacher_id?: number;
  teacher?: Profile;
  created_at: string;
  updated_at?: string;
}

export interface Day {
  id: number;
  name: string;
}

export interface TimeSlot {
  id: number;
  slot_number: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Schedule {
  id: number;
  day_id: number;
  time_slot_id: number;
  subject_id: number;
  class_id: number;
  teacher_id?: number;
  created_at: string;
  day?: Day;
  time_slot?: TimeSlot;
  subject?: Subject;
  class?: Class;
  teacher?: Profile;
}

export interface DailyQRCode {
  id: number;
  student_id: number;
  qr_code: string;
  date: string;
  is_used: boolean;
  created_at: string;
  student?: Profile;
}

export interface Attendance {
  id: number;
  student_id: number;
  schedule_id: number;
  date: string;
  status: AttendanceStatus;
  scanned_by?: number;
  scanned_at?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  student?: Profile;
  schedule?: Schedule;
  scanner?: Profile;
}

export interface AttendanceRequest {
  id: number;
  student_id: number;
  date: string;
  request_type: 'sakit' | 'izin';
  reason: string;
  attachment_url?: string;
  is_full_day: boolean;
  schedules?: ScheduleWithDetails[];
  status: RequestStatus;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  updated_at?: string;
  student?: Profile;
  reviewer?: Profile;
}

export interface Notification {
  id: number;
  user_id: number;
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
