package services

import (
	"backend/models"
	"backend/repositories"
	"strconv"
	"time"
)

type RequestService interface {
	Create(studentID uint, date string, reqType string, reason string, attachmentURL string, isFullDay bool, scheduleIDs []uint) error
	GetRequests(studentID string, status string, classID string) ([]models.AttendanceRequest, error)
	ReviewRequest(requestID uint, status string, reviewerID uint) error
}

type requestService struct {
	requestRepo  repositories.RequestRepository
	attendRepo   repositories.AttendanceRepository
	userRepo     repositories.UserRepository
	masterRepo   repositories.MasterRepository
	notifService NotificationService
}

func NewRequestService(
	reqRepo repositories.RequestRepository,
	attRepo repositories.AttendanceRepository,
	userRepo repositories.UserRepository,
	masterRepo repositories.MasterRepository,
	notifService NotificationService,
) RequestService {
	return &requestService{
		requestRepo:  reqRepo,
		attendRepo:   attRepo,
		userRepo:     userRepo,
		masterRepo:   masterRepo,
		notifService: notifService,
	}
}

func (s *requestService) Create(studentID uint, date string, reqType string, reason string, attachmentURL string, isFullDay bool, scheduleIDs []uint) error {
	// Check if already exists for this date
	existing, _ := s.requestRepo.FindByStudentAndDate(studentID, date)
	if existing != nil && existing.ID != 0 {
		return models.ErrDuplicateRequest // We should define this error or return a string error
	}

	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return err
	}

	req := models.AttendanceRequest{
		StudentID:     studentID,
		Date:          parsedDate,
		RequestType:   reqType,
		Reason:        reason,
		AttachmentURL: attachmentURL,
		IsFullDay:     isFullDay,
		Schedules:     []models.Schedule{},
		Status:        models.RequestPending,
	}

	if !isFullDay {
		for _, id := range scheduleIDs {
			req.Schedules = append(req.Schedules, models.Schedule{ID: id})
		}
	}

	if err := s.requestRepo.Create(&req); err != nil {
		return err
	}

	// Notify Wali Kelas
	go func() {
		student, _ := s.userRepo.FindByID(studentID)
		if student != nil && student.ClassID != nil {
			class, _ := s.masterRepo.FindClassByID(*student.ClassID)
			if class != nil && class.TeacherID != nil {
				title := "Pengajuan Izin/Sakit Baru"
				msg := student.Name + " mengajukan " + reqType + " untuk tanggal " + date
				s.notifService.NotifyUser(*class.TeacherID, title, msg)
			}
		}
	}()

	return nil
}

func (s *requestService) GetRequests(studentID string, status string, classID string) ([]models.AttendanceRequest, error) {
	return s.requestRepo.GetRequests(studentID, status, classID)
}

func (s *requestService) ReviewRequest(requestID uint, status string, reviewerID uint) error {
	req, err := s.requestRepo.FindByID(requestID)
	if err != nil {
		return err
	}

	now := time.Now()
	req.Status = models.RequestStatus(status)
	req.ReviewedBy = &reviewerID
	req.ReviewedAt = &now

	if err := s.requestRepo.Update(req); err != nil {
		return err
	}

	// If approved, create Attendance record or "Cut" existing one
	// If approved, create Attendance record for ALL schedules on that day
	if status == "approved" {
		// 1. Get Student Class ID
		user, err := s.userRepo.FindByID(req.StudentID)
		if err != nil {
			return err
		}
		if user.ClassID == nil {
			return nil // No class, no schedule to update
		}

		// 2. Get Day ID (Monday=1, Sunday=7)
		// time.Weekday returns Sunday=0, Monday=1...
		weekday := req.Date.Weekday()
		dayID := int(weekday)
		if dayID == 0 {
			dayID = 7
		} // Adjust Sunday 0 -> 7 if DB uses 1-7 (Senin-Minggu)

		// 3. Get Schedules for Class & Day
		schedules, err := s.masterRepo.GetSchedules(strconv.Itoa(int(*user.ClassID)), "", dayID)
		if err != nil {
			return err
		}

		// 4. Create/Update Attendance for each schedule
		reqDateStr := req.Date.Format("2006-01-02")

		// Parse Request Times if Partial Day
		// reqDateStr := req.Date.Format("2006-01-02") // already defined above

		for _, schedule := range schedules {
			// FILTER LOGIC FOR PARTIAL DAY (Subject-Based)
			if !req.IsFullDay {
				found := false
				for _, reqSched := range req.Schedules {
					if reqSched.ID == schedule.ID {
						found = true
						break
					}
				}
				if !found {
					continue
				}
			}

			// Check if attendance exists
			existing, err := s.attendRepo.FindByStudentAndSchedule(req.StudentID, schedule.ID, reqDateStr)

			status := models.AttendanceStatus(req.RequestType) // sakit, izin

			if err == nil && existing.ID != 0 {
				// Update existing
				s.attendRepo.UpdateStatus(existing.ID, status, req.Reason, req.ReviewedAt)
			} else {
				// Create new
				schedID := schedule.ID
				newAttendance := models.Attendance{
					StudentID:  req.StudentID,
					ScheduleID: &schedID,
					Date:       req.Date,
					Status:     status,
					ApprovedAt: req.ReviewedAt,
					Notes:      req.Reason,
				}
				s.attendRepo.Create(&newAttendance)
			}
		}
	}

	// Notify Student
	go func() {
		statusLabel := "Disetujui"
		if status == "rejected" {
			statusLabel = "Ditolak"
		}
		title := "Status Pengajuan Izin/Sakit"
		msg := "Permintaan " + req.RequestType + " Anda untuk tanggal " + req.Date.Format("2006-01-02") + " telah " + statusLabel
		s.notifService.NotifyUser(req.StudentID, title, msg)
	}()

	return nil
}
