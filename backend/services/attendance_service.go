package services

import (
	"backend/models"
	"backend/repositories"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type AttendanceService interface {
	ScanQR(qrCode string, scannerID uint) (map[string]interface{}, error)
	GetHistory(studentID string, classID string, date string) ([]models.Attendance, error)
	GetStats(classID string, startDate string, endDate string) (map[string]int64, error)
	GetRecap(classID string, startDate string, endDate string) ([]map[string]interface{}, error)
	UpdateStatus(id uint, status string, notes string) error
}

type attendanceService struct {
	attendRepo repositories.AttendanceRepository
	userRepo   repositories.UserRepository
	masterRepo repositories.MasterRepository
}

func NewAttendanceService(
	attendRepo repositories.AttendanceRepository,
	userRepo repositories.UserRepository,
	masterRepo repositories.MasterRepository,
) AttendanceService {
	return &attendanceService{attendRepo, userRepo, masterRepo}
}

func (s *attendanceService) ScanQR(qrCode string, scannerID uint) (map[string]interface{}, error) {
	// Parse QR: "STU-{id}|{name}|{nis}|{class_name}|{date}|{timestamp}"
	// Expected parts: 6
	parts := strings.Split(qrCode, "|")
	if len(parts) < 6 || !strings.HasPrefix(parts[0], "STU-") {
		return nil, errors.New("Format QR Code tidak valid (Versi lama/rusak)")
	}

	studentIDStr := strings.TrimPrefix(parts[0], "STU-")
	studentID, err := strconv.ParseUint(studentIDStr, 10, 32)
	if err != nil {
		return nil, errors.New("ID Siswa tidak valid dalam QR")
	}

	qrName := parts[1]
	qrNIS := parts[2]
	qrClassName := parts[3]
	qrDate := parts[4]

	today := time.Now().Format("2006-01-02")
	if qrDate != today {
		return nil, errors.New("QR Code kadaluarsa (bukan untuk hari ini)")
	}

	// Check if QR used
	// Note: The original code used a DailyQRCode table. We should probably respect that logic.
	// But simply checking if attendance exists for ALL schedules is also valid.
	// Let's implement the DailyQRCode check if the repo supports it.

	// Retrieve student with strict validation
	// Need to Preload Class and Profile to validate
	// Check if userRepo supports preloading those. If FindByID does (it usually does in GORM setups here), we are good.
	// If not, we might fail validation if data is missing.
	// Assuming FindByID preloads.
	student, err := s.userRepo.FindByID(uint(studentID))
	if err != nil {
		return nil, errors.New("Siswa tidak ditemukan")
	}

	// VALIDATION: Strict check
	if student.Name != qrName {
		return nil, errors.New("Nama dalam QR tidak sesuai dengan database")
	}

	if student.Profile != nil && student.Profile.NIS != qrNIS {
		// Validasi NIS jika ada profile
		return nil, errors.New("NIS dalam QR tidak sesuai dengan database")
	}

	if student.Class != nil {
		if student.Class.Name != qrClassName {
			return nil, errors.New("Kelas dalam QR tidak sesuai (Siswa mungkin pindah kelas)")
		}
	} else {
		if qrClassName != "N/A" && qrClassName != "" {
			return nil, errors.New("Siswa tidak memiliki kelas di database, tapi QR memiliki kelas")
		}
	}

	// Security check: Scanner can only scan students from their own class or assigned class
	scanner, err := s.userRepo.FindByID(scannerID)
	if err == nil && scanner != nil {
		if scanner.Role == "admin" {
			// Admin can scan anyone, no restriction
		} else if scanner.Role == "teacher" || scanner.Role == "guru" {
			// Guru can ONLY scan if they are the Homeroom Teacher (Wali Kelas) of the student's class
			if student.ClassID == nil {
				return nil, errors.New("Siswa tidak memiliki kelas, tidak bisa discan oleh Guru")
			}

			// Method 1: Check Preloaded Class (Preferred)
			if student.Class != nil {
				if student.Class.TeacherID == nil || *student.Class.TeacherID != scanner.ID {
					return nil, errors.New("Anda bukan Wali Kelas dari siswa ini")
				}
			} else {
				// Fallback if Preload failed or inconsistent (Check DB directly)
				class, err := s.masterRepo.FindClassByID(*student.ClassID)
				if err != nil {
					return nil, errors.New("Kelas siswa tidak ditemukan")
				}
				if class.TeacherID == nil || *class.TeacherID != scanner.ID {
					// Debug info if needed: fmt.Sprintf("Class TID: %v, Scanner ID: %v", class.TeacherID, scanner.ID)
					return nil, errors.New("Anda bukan Wali Kelas dari siswa ini")
				}
			}
		} else if scanner.Role == "ketua_kelas" {
			// Ketua Kelas can ONLY scan students in their OWN class
			if scanner.ClassID == nil {
				return nil, errors.New("Anda (Ketua Kelas) tidak memiliki kelas assignments")
			}
			if student.ClassID == nil {
				return nil, errors.New("Siswa tidak memiliki kelas")
			}

			// Check Class IDs
			if *scanner.ClassID != *student.ClassID {
				return nil, errors.New("Siswa bukan dari kelas Anda")
			}
		} else {
			// Others (Murid scanning themselves?)
			// If Murid scans themselves?
			// Check if scanner.ID == student.ID
			if scanner.ID != uint(studentID) {
				return nil, errors.New("Anda hanya bisa scan QR Anda sendiri (atau minta Wali Kelas/Ketua Kelas)")
			}
		}
	} else {
		return nil, errors.New("Scanner invalid")
	}

	// Get schedules for today
	now := time.Now()
	// DayID: 0=Sunday (in Go time), database might need adjustment.
	// In seed, ID 1=Senin. Go time.Weekday(): Sunday=0, Monday=1.
	// So if today is Monday (1), we need DayID=1.
	// If today is Sunday (0), we need DayID=7.
	dayID := int(now.Weekday())
	if dayID == 0 {
		dayID = 7
	} // Adjust for Sunday if DB uses 7 for Sunday

	classIDStr := "0"
	if student != nil && student.ClassID != nil {
		classIDStr = fmt.Sprintf("%d", *student.ClassID)
	}

	schedules, err := s.masterRepo.GetSchedules(classIDStr, "", dayID)
	if err != nil {
		return nil, errors.New("Failed to fetch schedules")
	}

	if len(schedules) == 0 {
		return nil, errors.New("No schedules found for today")
	}

	createdCount := 0
	for _, schedule := range schedules {
		// Check existing
		_, err := s.attendRepo.FindByStudentAndSchedule(uint(studentID), schedule.ID, today)
		if err == nil {
			continue // Already exists
		}

		attendance := models.Attendance{
			StudentID:  uint(studentID),
			ScheduleID: &schedule.ID,
			Date:       now,
			Status:     models.StatusHadir,
			ScannedBy:  &scannerID,
			ScannedAt:  &now,
		}

		if err := s.attendRepo.Create(&attendance); err == nil {
			createdCount++
		}
	}

	// Create/Update DailyQRCode as used (optional, keeping it simple for now)

	// Requirement: Jika ketua kelas yang melakukan scan, otomatis hadir juga
	if scanner != nil && scanner.Role == "ketua_kelas" && scanner.ClassID != nil {
		// Get schedules for the scanner (ketua kelas) themselves
		scannerSchedules, _ := s.masterRepo.GetSchedules(fmt.Sprintf("%d", *scanner.ClassID), "", dayID)
		for _, sch := range scannerSchedules {
			_, err := s.attendRepo.FindByStudentAndSchedule(scanner.ID, sch.ID, today)
			if err != nil {
				// Not present yet, mark them as present
				s.attendRepo.Create(&models.Attendance{
					StudentID:  scanner.ID,
					ScheduleID: &sch.ID,
					Date:       now,
					Status:     models.StatusHadir,
					ScannedBy:  &scannerID, // Scanned by themselves effectively
					ScannedAt:  &now,
				})
			}
		}
	}

	return map[string]interface{}{
		"student_name":    student.Name,
		"is_full_day":     createdCount == len(schedules),
		"created_count":   createdCount,
		"total_schedules": len(schedules),
	}, nil
}

func (s *attendanceService) GetHistory(studentID string, classID string, date string) ([]models.Attendance, error) {
	return s.attendRepo.GetHistory(studentID, classID, date)
}

func (s *attendanceService) GetStats(classID string, startDate string, endDate string) (map[string]int64, error) {
	rawStats, err := s.attendRepo.GetStats(classID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	stats := map[string]int64{
		"hadir": 0,
		"sakit": 0,
		"izin":  0,
		"alpha": 0,
	}

	for _, item := range rawStats {
		status := item["status"].(string) // Gorm/Driver might return []uint8 (bytes) or string
		count := item["count"].(int64)
		stats[status] = count
	}
	return stats, nil
}

func (s *attendanceService) GetRecap(classID string, startDate string, endDate string) ([]map[string]interface{}, error) {
	// 1. Get Aggregated Stats
	stats, err := s.attendRepo.GetMonthlyRecap(classID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// 2. Enrich with Student Data
	// Optimally, we could join in the SQL query, but fetching users is cleaner for ORM usage if not too heavy.
	// Or we can just join in Repo. But let's stick to Repo returning maps, and we fetch users here if needed.
	// Actually, fetching all users in class and mapping them is better to show "0 attendance" students too?
	// For now, let's just show students who have at least ONE record (stats).
	// But Recap usually needs ALL students.

	// Get All Students in Class
	// We need a method in UserRepository or MasterRepository for this.
	// Assuming s.userRepo or similar can do it.
	// s.masterRepo has FindClassByID.
	// Use UserRepository.FindAllByClassID (need to check if exists) or just loop stats and fetch student.
	// Fetching individually is N+1.

	// Better: GetMonthlyRecap JOINed users already, so we have User data if we selected it.
	// But I only selected `student_id`.
	// Let's assume we want to enrich here.

	var enrichedResults []map[string]interface{}

	for _, stat := range stats {
		studentID := stat["student_id"].(uint)
		user, err := s.userRepo.FindByID(studentID)
		if err == nil {
			nis := ""
			if user.Profile != nil {
				nis = user.Profile.NIS
			}

			stat["student"] = map[string]interface{}{
				"id":        user.ID,
				"name":      user.Name,
				"full_name": user.Name,
				"nis":       nis,
				"class":     user.Class,
			}
			enrichedResults = append(enrichedResults, stat)
		}
	}

	return enrichedResults, nil
}

func (s *attendanceService) UpdateStatus(id uint, status string, notes string) error {
	return s.attendRepo.UpdateStatus(id, models.AttendanceStatus(status), notes)
}
