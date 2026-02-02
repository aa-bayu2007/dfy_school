
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'guru', 'ketua_kelas', 'murid');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('hadir', 'sakit', 'izin', 'alpha', 'pending');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create classes table (kelas)
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    grade VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subjects table (mata pelajaran)
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create days table (hari)
CREATE TABLE public.days (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

-- Insert days
INSERT INTO public.days (name) VALUES ('Senin'), ('Selasa'), ('Rabu'), ('Kamis'), ('Jumat'), ('Sabtu');

-- Create time slots table (jam pelajaran)
CREATE TABLE public.time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_number INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(slot_number)
);

-- Insert default time slots
INSERT INTO public.time_slots (slot_number, start_time, end_time) VALUES
(1, '07:00', '07:45'),
(2, '07:45', '08:30'),
(3, '08:30', '09:15'),
(4, '09:15', '10:00'),
(5, '10:15', '11:00'),
(6, '11:00', '11:45'),
(7, '12:30', '13:15'),
(8, '13:15', '14:00');

-- Create profiles table (untuk menyimpan data user)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    nis VARCHAR(20) UNIQUE,
    nip VARCHAR(20) UNIQUE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table (untuk role-based access)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create schedules table (jadwal pelajaran)
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id INT REFERENCES public.days(id) ON DELETE CASCADE,
    time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(day_id, time_slot_id, class_id)
);

-- Create daily QR codes table (QR harian per murid)
CREATE TABLE public.daily_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    qr_code TEXT NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, date)
);

-- Create attendance table (absensi)
CREATE TABLE public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status DEFAULT 'pending',
    scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scanned_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, schedule_id, date)
);

-- Create attendance requests table (izin/sakit)
CREATE TABLE public.attendance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    request_type attendance_status NOT NULL CHECK (request_type IN ('sakit', 'izin')),
    reason TEXT NOT NULL,
    attachment_url TEXT,
    status request_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's class
CREATE OR REPLACE FUNCTION public.get_user_class_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM public.profiles WHERE id = _user_id
$$;

-- RLS Policies for classes
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Admin can manage classes" ON public.classes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admin can manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for days
CREATE POLICY "Anyone can view days" ON public.days FOR SELECT USING (true);

-- RLS Policies for time_slots
CREATE POLICY "Anyone can view time_slots" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Admin can manage time_slots" ON public.time_slots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for schedules
CREATE POLICY "Anyone can view schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Admin can manage schedules" ON public.schedules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_qr_codes
CREATE POLICY "Students can view own QR" ON public.daily_qr_codes FOR SELECT 
    USING (student_id = auth.uid());
CREATE POLICY "Ketua kelas can view class QR" ON public.daily_qr_codes FOR SELECT 
    USING (
        public.has_role(auth.uid(), 'ketua_kelas') AND 
        student_id IN (SELECT id FROM public.profiles WHERE class_id = public.get_user_class_id(auth.uid()))
    );
CREATE POLICY "Admin and guru can view all QR" ON public.daily_qr_codes FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'guru'));
CREATE POLICY "System can insert QR" ON public.daily_qr_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update QR" ON public.daily_qr_codes FOR UPDATE USING (true);

-- RLS Policies for attendances
CREATE POLICY "Students can view own attendance" ON public.attendances FOR SELECT 
    USING (student_id = auth.uid());
CREATE POLICY "Ketua kelas can view and insert class attendance" ON public.attendances 
    FOR ALL USING (
        public.has_role(auth.uid(), 'ketua_kelas') AND 
        student_id IN (SELECT id FROM public.profiles WHERE class_id = public.get_user_class_id(auth.uid()))
    );
CREATE POLICY "Guru can view class attendance" ON public.attendances FOR SELECT 
    USING (
        public.has_role(auth.uid(), 'guru') AND
        schedule_id IN (SELECT id FROM public.schedules WHERE teacher_id = auth.uid())
    );
CREATE POLICY "Admin can manage all attendance" ON public.attendances FOR ALL 
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance_requests
CREATE POLICY "Students can view own requests" ON public.attendance_requests FOR SELECT 
    USING (student_id = auth.uid());
CREATE POLICY "Students can create requests" ON public.attendance_requests FOR INSERT 
    WITH CHECK (student_id = auth.uid());
CREATE POLICY "Guru can view and review class requests" ON public.attendance_requests 
    FOR ALL USING (
        public.has_role(auth.uid(), 'guru') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT 
    USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE 
    USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
    
    -- Default role is murid
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'murid');
    
    RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate daily QR codes
CREATE OR REPLACE FUNCTION public.generate_daily_qr_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    student RECORD;
BEGIN
    FOR student IN 
        SELECT p.id 
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id
        WHERE ur.role = 'murid'
    LOOP
        INSERT INTO public.daily_qr_codes (student_id, qr_code, date)
        VALUES (
            student.id,
            encode(gen_random_bytes(32), 'hex'),
            CURRENT_DATE
        )
        ON CONFLICT (student_id, date) DO NOTHING;
    END LOOP;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
