package repositories

import (
	"backend/models"
	"time"

	"gorm.io/gorm"
)

type AttendanceRepository interface {
	Create(attendance *models.Attendance) error
	FindByStudentAndSchedule(studentID uint, scheduleID uint, date string) (*models.Attendance, error)
	GetHistory(studentID string, classID string, date string, scannedBy string) ([]models.Attendance, error)
	GetDailyQRCode(studentID uint, date string) (*models.DailyQRCode, error)
	SaveDailyQRCode(qr *models.DailyQRCode) error
	GetStats(classID string, startDate string, endDate string) ([]map[string]interface{}, error)
	UpdateStatusForRemainingSchedules(studentID uint, date string, timeTime time.Time, status string) error
	UpdateStatus(attendanceID uint, status models.AttendanceStatus, notes string, approvedAt *time.Time) error
	GetMonthlyRecap(classID string, startDate string, endDate string) ([]map[string]interface{}, error)
}

type attendanceRepository struct {
	db *gorm.DB
}

func NewAttendanceRepository(db *gorm.DB) AttendanceRepository {
	return &attendanceRepository{db}
}

func (r *attendanceRepository) Create(attendance *models.Attendance) error {
	return r.db.Create(attendance).Error
}

func (r *attendanceRepository) FindByStudentAndSchedule(studentID uint, scheduleID uint, date string) (*models.Attendance, error) {
	var attendance models.Attendance
	err := r.db.Where("student_id = ? AND schedule_id = ? AND DATE(date) = ?", studentID, scheduleID, date).First(&attendance).Error
	return &attendance, err
}

func (r *attendanceRepository) GetHistory(studentID string, classID string, date string, scannedBy string) ([]models.Attendance, error) {
	query := r.db.Preload("Student.Class").Preload("Student.Profile").
		Preload("Schedule.Subject").Preload("Schedule.Day").Preload("Schedule.TimeSlot").
		Preload("Scanner.Profile").Preload("Scanner")

	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}

	if classID != "" {
		query = query.Where("attendances.class_id = ?", classID)
	}

	if date != "" {
		query = query.Where("DATE(attendances.date) = ?", date)
	}

	if scannedBy != "" {
		query = query.Where("scanned_by = ?", scannedBy)
	}

	var attendances []models.Attendance
	err := query.Order("attendances.date DESC, attendances.created_at DESC").Find(&attendances).Error
	return attendances, err
}

func (r *attendanceRepository) GetDailyQRCode(studentID uint, date string) (*models.DailyQRCode, error) {
	var qr models.DailyQRCode
	err := r.db.Where("student_id = ? AND date = ?", studentID, date).First(&qr).Error
	return &qr, err
}

func (r *attendanceRepository) SaveDailyQRCode(qr *models.DailyQRCode) error {
	return r.db.Save(qr).Error
}

func (r *attendanceRepository) GetStats(classID string, startDate string, endDate string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	type StatusCount struct {
		Status string
		Count  int64
	}
	var counts []StatusCount

	// This is the old "GetStats" which might not be used anymore or used for charts.
	// It counts rows (subjects). If we want charts to be accurate per day, this should also change.
	// But for now, let's focus on the RECAP TABLE which uses GetMonthlyRecap.

	err := r.db.Table("attendances").
		Select("daily_status as status, COUNT(*) as count").
		Joins(`JOIN (
			SELECT 
				student_id, 
				DATE(date) as date_only,
				CASE 
					WHEN MAX(CASE WHEN status = 'sakit' THEN 4 WHEN status = 'izin' THEN 3 WHEN status = 'alpha' THEN 2 WHEN status = 'hadir' THEN 1 ELSE 0 END) = 4 THEN 'sakit'
					WHEN MAX(CASE WHEN status = 'sakit' THEN 4 WHEN status = 'izin' THEN 3 WHEN status = 'alpha' THEN 2 WHEN status = 'hadir' THEN 1 ELSE 0 END) = 3 THEN 'izin'
					WHEN MAX(CASE WHEN status = 'sakit' THEN 4 WHEN status = 'izin' THEN 3 WHEN status = 'alpha' THEN 2 WHEN status = 'hadir' THEN 1 ELSE 0 END) = 2 THEN 'alpha'
					ELSE 'hadir'
				END as daily_status
			FROM attendances
			GROUP BY student_id, DATE(date)
		) daily ON daily.student_id = attendances.student_id AND daily.date_only = DATE(attendances.date)`).
		Joins("JOIN users ON users.id = attendances.student_id").
		Where("users.class_id = ? AND DATE(attendances.date) BETWEEN ? AND ?", classID, startDate, endDate).
		Group("daily_status").
		Scan(&counts).Error

	for _, c := range counts {
		results = append(results, map[string]interface{}{"status": c.Status, "count": c.Count})
	}
	return results, err
}

func (r *attendanceRepository) GetMonthlyRecap(classID string, startDate string, endDate string) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	// Query to get aggregated stats PER STUDENT
	// Counts DISTINCT DATES for each status to ensure "Per Day" counting

	rows, err := r.db.Table("attendances").
		Select(`
			student_id,
			COUNT(DISTINCT CASE WHEN daily_status = 'hadir' THEN date_only END) as hadir,
			COUNT(DISTINCT CASE WHEN daily_status = 'sakit' THEN date_only END) as sakit,
			COUNT(DISTINCT CASE WHEN daily_status = 'izin' THEN date_only END) as izin,
			COUNT(DISTINCT CASE WHEN daily_status = 'alpha' THEN date_only END) as alpha,
			COUNT(DISTINCT date_only) as total_days
		`).
		Joins(`JOIN (
			SELECT 
				student_id, 
				DATE(date) as date_only,
				CASE 
					WHEN MAX(CASE WHEN status = 'sakit' THEN 4 WHEN status = 'izin' THEN 3 WHEN status = 'alpha' THEN 2 WHEN status = 'hadir' THEN 1 ELSE 0 END) = 4 THEN 'sakit'
					WHEN MAX(CASE WHEN status = 'sakit' THEN 4 WHEN status = 'izin' THEN 3 WHEN status = 'alpha' THEN 2 WHEN status = 'hadir' THEN 1 ELSE 0 END) = 3 THEN 'izin'
					WHEN MAX(CASE WHEN status = 'sakit' THEN 4 WHEN status = 'izin' THEN 3 WHEN status = 'alpha' THEN 2 WHEN status = 'hadir' THEN 1 ELSE 0 END) = 2 THEN 'alpha'
					ELSE 'hadir'
				END as daily_status
			FROM attendances
			GROUP BY student_id, DATE(date)
		) daily ON daily.student_id = attendances.student_id AND daily.date_only = DATE(attendances.date)`).
		Where("attendances.class_id = ? AND DATE(attendances.date) BETWEEN ? AND ?", classID, startDate, endDate).
		Group("attendances.student_id").
		Rows()

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var studentID uint
		var hadir, sakit, izin, alpha, totalDays int64
		if err := rows.Scan(&studentID, &hadir, &sakit, &izin, &alpha, &totalDays); err != nil {
			return nil, err
		}

		results = append(results, map[string]interface{}{
			"student_id": studentID,
			"hadir":      hadir,
			"sakit":      sakit,
			"izin":       izin,
			"alpha":      alpha,
			"total":      totalDays, // Total days with ANY status
		})
	}

	return results, nil
}

func (r *attendanceRepository) UpdateStatusForRemainingSchedules(studentID uint, date string, timeTime time.Time, status string) error {
	currentTime := timeTime.Format("15:04:05")

	return r.db.Exec(`
		UPDATE attendances 
		SET status = ?, updated_at = ? 
		WHERE student_id = ? AND DATE(date) = ? 
		AND schedule_id IN (
			SELECT s.id FROM schedules s 
			JOIN time_slots ts ON s.time_slot_id = ts.id 
			WHERE ts.start_time >= ?
		)`, status, time.Now(), studentID, date, currentTime).Error
}

func (r *attendanceRepository) UpdateStatus(attendanceID uint, status models.AttendanceStatus, notes string, approvedAt *time.Time) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if notes != "" {
		updates["notes"] = notes
	}
	if approvedAt != nil {
		updates["approved_at"] = approvedAt
	}
	return r.db.Model(&models.Attendance{}).Where("id = ?", attendanceID).Updates(updates).Error
}
