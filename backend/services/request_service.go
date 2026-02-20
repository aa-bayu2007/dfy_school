package services

import (
	"backend/models"
	"backend/repositories"
	"strconv"
	"time"
)

type RequestService interface {
	Create(studentID uint, date string, endDate string, reqType string, reason string, attachmentURL string, isFullDay bool, autoMarkUpcoming bool, scheduleIDs []uint) error
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

func (s *requestService) Create(studentID uint, date string, endDate string, reqType string, reason string, attachmentURL string, isFullDay bool, autoMarkUpcoming bool, scheduleIDs []uint) error {
	// Check if already exists for this date
	existing, _ := s.requestRepo.FindByStudentAndDate(studentID, date)
	if existing != nil && existing.ID != 0 {
		return models.ErrDuplicateRequest
	}

	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return err
	}

	var parsedEndDate *time.Time
	if endDate != "" {
		ed, err := time.Parse("2006-01-02", endDate)
		if err == nil {
			parsedEndDate = &ed
		}
	}

	req := models.AttendanceRequest{
		StudentID:        studentID,
		Date:             parsedDate,
		EndDate:          parsedEndDate,
		RequestType:      reqType,
		Reason:           reason,
		AttachmentURL:    attachmentURL,
		IsFullDay:        isFullDay,
		AutoMarkUpcoming: autoMarkUpcoming,
		Schedules:        []models.Schedule{},
		Status:           models.RequestPending,
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
				dateStr := date
				if endDate != "" && endDate != date {
					dateStr = date + " s/d " + endDate
				}
				msg := student.Name + " mengajukan " + reqType + " untuk tanggal " + dateStr
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
	if status == "approved" {
		user, err := s.userRepo.FindByID(req.StudentID)
		if err != nil {
			return err
		}
		if user.ClassID == nil {
			return nil
		}

		// Calculate start and end range
		startDate := req.Date
		endDate := req.Date
		if req.EndDate != nil {
			endDate = *req.EndDate
		}

		// Iterate through each day in the range
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			// Get Day ID (Monday=1, Sunday=7)
			weekday := d.Weekday()
			dayID := int(weekday)
			if dayID == 0 {
				dayID = 7
			}

			// Get Schedules for Class & Day
			schedules, err := s.masterRepo.GetSchedules(strconv.Itoa(int(*user.ClassID)), "", dayID)
			if err != nil {
				continue // Skip if error fetching schedules for this day
			}

			currDateStr := d.Format("2006-01-02")

			// Determine which schedules apply for this day
			applicableSchedules := schedules
			if !req.IsFullDay && d.Format("2006-01-02") == req.Date.Format("2006-01-02") {
				// Mid-day logic: Find targeted schedules
				targetSchedIDs := make(map[uint]bool)
				var latestStartTime string

				for _, rs := range req.Schedules {
					targetSchedIDs[rs.ID] = true
					// Find the latest start time among explicitly selected schedules
					for _, s := range schedules {
						if s.ID == rs.ID && s.TimeSlot.ID > 0 {
							if latestStartTime == "" || s.TimeSlot.StartTime > latestStartTime {
								latestStartTime = s.TimeSlot.StartTime
							}
						}
					}
				}

				// If it's sickness OR auto-mark-upcoming is chosen, take everything after the first targeted lesson
				if req.RequestType == "sakit" || req.AutoMarkUpcoming {
					var firstTargetStartTime string
					for _, rs := range req.Schedules {
						for _, s := range schedules {
							if s.ID == rs.ID && s.TimeSlot.ID > 0 {
								if firstTargetStartTime == "" || s.TimeSlot.StartTime < firstTargetStartTime {
									firstTargetStartTime = s.TimeSlot.StartTime
								}
							}
						}
					}

					applicableSchedules = []models.Schedule{}
					for _, s := range schedules {
						if s.TimeSlot.ID > 0 && s.TimeSlot.StartTime >= firstTargetStartTime {
							applicableSchedules = append(applicableSchedules, s)
						}
					}
				} else {
					// Only the explicitly selected schedules
					applicableSchedules = []models.Schedule{}
					for _, s := range schedules {
						if targetSchedIDs[s.ID] {
							applicableSchedules = append(applicableSchedules, s)
						}
					}
				}
			}

			for _, schedule := range applicableSchedules {
				// Check if attendance exists
				existing, err := s.attendRepo.FindByStudentAndSchedule(req.StudentID, schedule.ID, currDateStr)

				attendStatus := models.AttendanceStatus(req.RequestType)

				if err == nil && existing.ID != 0 {
					// CRITICAL: Mid-day refinement. If we already marked them as 'hadir',
					// we only update it if this schedule is within our "applicable" range today.
					// The loop already only iterates over applicableSchedules.
					s.attendRepo.UpdateStatus(existing.ID, attendStatus, req.Reason, req.ReviewedAt)
				} else {
					// Create new
					schedID := schedule.ID
					newAttendance := models.Attendance{
						StudentID:  req.StudentID,
						ClassID:    *user.ClassID,
						ScheduleID: &schedID,
						Date:       d,
						Status:     attendStatus,
						ApprovedAt: req.ReviewedAt,
						Notes:      req.Reason,
					}
					s.attendRepo.Create(&newAttendance)
				}
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
		dateStr := req.Date.Format("2006-01-02")
		if req.EndDate != nil && req.EndDate.Format("2006-01-02") != dateStr {
			dateStr = dateStr + " s/d " + req.EndDate.Format("2006-01-02")
		}
		msg := "Permintaan " + req.RequestType + " Anda untuk tanggal " + dateStr + " telah " + statusLabel
		s.notifService.NotifyUser(req.StudentID, title, msg)
	}()

	return nil
}
