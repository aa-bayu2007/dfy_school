package repositories

import (
	"backend/models"
	"time"

	"gorm.io/gorm"
)

type AttendanceRepository interface {
	Create(attendance *models.Attendance) error
	FindByStudentAndSchedule(studentID uint, scheduleID uint, date string) (*models.Attendance, error)
	GetHistory(studentID string, classID string, date string) ([]models.Attendance, error)
	GetDailyQRCode(studentID uint, date string) (*models.DailyQRCode, error)
	SaveDailyQRCode(qr *models.DailyQRCode) error
	GetStats(classID string, startDate string, endDate string) ([]map[string]interface{}, error)
	UpdateStatusForRemainingSchedules(studentID uint, date string, timeTime time.Time, status string) error
	UpdateStatus(attendanceID uint, status models.AttendanceStatus, notes string) error
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

func (r *attendanceRepository) GetHistory(studentID string, classID string, date string) ([]models.Attendance, error) {
	query := r.db.Preload("Student.Class").Preload("Student.Profile").Preload("Schedule.Subject").Preload("Schedule.Day").Preload("Schedule.TimeSlot")

	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}

	if classID != "" {
		query = query.Joins("JOIN users ON users.id = attendances.student_id").
			Where("users.class_id = ?", classID)
	}

	if date != "" {
		query = query.Where("DATE(date) = ?", date)
	}

	var attendances []models.Attendance
	err := query.Order("date DESC, created_at DESC").Find(&attendances).Error
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

	err := r.db.Model(&models.Attendance{}).
		Select("status, COUNT(DISTINCT student_id) as count"). // unique students per status per period?
		Joins("JOIN users ON users.id = attendances.student_id").
		Where("users.class_id = ? AND DATE(date) BETWEEN ? AND ?", classID, startDate, endDate).
		Group("status").
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
			COUNT(DISTINCT CASE WHEN status = 'hadir' THEN DATE(date) END) as hadir,
			COUNT(DISTINCT CASE WHEN status = 'sakit' THEN DATE(date) END) as sakit,
			COUNT(DISTINCT CASE WHEN status = 'izin' THEN DATE(date) END) as izin,
			COUNT(DISTINCT CASE WHEN status = 'alpha' THEN DATE(date) END) as alpha,
			COUNT(DISTINCT DATE(date)) as total_days
		`).
		Joins("JOIN users ON users.id = attendances.student_id").
		Where("users.class_id = ? AND DATE(date) BETWEEN ? AND ?", classID, startDate, endDate).
		Group("student_id").
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

func (r *attendanceRepository) UpdateStatus(attendanceID uint, status models.AttendanceStatus, notes string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if notes != "" {
		updates["notes"] = notes
	}
	return r.db.Model(&models.Attendance{}).Where("id = ?", attendanceID).Updates(updates).Error
}
