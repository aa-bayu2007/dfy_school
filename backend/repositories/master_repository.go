package repositories

import (
	"backend/models"
	"gorm.io/gorm"
)

type MasterRepository interface {
	// Class
	CreateClass(class *models.Class) error
	UpdateClass(classID uint, name string, grade string, teacherID *uint) error
	DeleteClass(classID uint) error
	GetAllClasses() ([]models.Class, error)
	GetClassesByTeacher(teacherID uint) ([]models.Class, error)
	FindClassByID(id uint) (*models.Class, error)

	// Subject
	CreateSubject(subject *models.Subject) error
	UpdateSubject(subjectID uint, name string, code string, teacherID *uint) error
	DeleteSubject(subjectID uint) error
	GetAllSubjects() ([]models.Subject, error)

	// Schedule
	CreateSchedule(schedule *models.Schedule) error
	UpdateSchedule(scheduleID uint, schedule *models.Schedule) error
	DeleteSchedule(scheduleID uint) error
	GetSchedules(classID string, teacherID string, dayID int) ([]models.Schedule, error)

	// TimeSlot & Days
	GetAllTimeSlots() ([]models.TimeSlot, error)
	GetAllDays() ([]models.Day, error)

	ResetSchedules() error
}

type masterRepository struct {
	db *gorm.DB
}

func NewMasterRepository(db *gorm.DB) MasterRepository {
	return &masterRepository{db}
}

// Class Impl
func (r *masterRepository) CreateClass(class *models.Class) error {
	return r.db.Create(class).Error
}
func (r *masterRepository) GetAllClasses() ([]models.Class, error) {
	var classes []models.Class
	err := r.db.Preload("Teacher").Find(&classes).Error
	return classes, err
}
func (r *masterRepository) GetClassesByTeacher(teacherID uint) ([]models.Class, error) {
	var classes []models.Class
	err := r.db.Preload("Teacher").Where("teacher_id = ?", teacherID).Find(&classes).Error
	return classes, err
}
func (r *masterRepository) FindClassByID(id uint) (*models.Class, error) {
	var class models.Class
	err := r.db.Preload("Teacher").First(&class, id).Error
	return &class, err
}

// Subject Impl
func (r *masterRepository) CreateSubject(subject *models.Subject) error {
	return r.db.Create(subject).Error
}
func (r *masterRepository) GetAllSubjects() ([]models.Subject, error) {
	var subjects []models.Subject
	err := r.db.Preload("Teacher").Preload("Teacher.Profile").Find(&subjects).Error
	return subjects, err
}

// Schedule Impl
func (r *masterRepository) CreateSchedule(schedule *models.Schedule) error {
	return r.db.Create(schedule).Error
}
func (r *masterRepository) GetSchedules(classID string, teacherID string, dayID int) ([]models.Schedule, error) {
	query := r.db.Preload("Class").Preload("Subject").Preload("TimeSlot").Preload("Day").Preload("Teacher").Preload("Teacher.Profile")

	if classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if teacherID != "" {
		query = query.Where("teacher_id = ?", teacherID)
	}
	if dayID != 0 {
		query = query.Where("day_id = ?", dayID)
	}

	var schedules []models.Schedule
	err := query.Order("day_id ASC, time_slot_id ASC").Find(&schedules).Error
	return schedules, err
}

func (r *masterRepository) GetAllTimeSlots() ([]models.TimeSlot, error) {
	var slots []models.TimeSlot
	err := r.db.Order("slot_number ASC").Find(&slots).Error
	return slots, err
}

func (r *masterRepository) GetAllDays() ([]models.Day, error) {
	var days []models.Day
	err := r.db.Order("id ASC").Find(&days).Error
	return days, err
}

// Update implementations
func (r *masterRepository) UpdateClass(classID uint, name string, grade string, teacherID *uint) error {
	updates := map[string]interface{}{
		"name":  name,
		"grade": grade,
	}
	if teacherID != nil {
		updates["teacher_id"] = *teacherID
	}
	return r.db.Model(&models.Class{}).Where("id = ?", classID).Updates(updates).Error
}

func (r *masterRepository) UpdateSubject(subjectID uint, name string, code string, teacherID *uint) error {
	updates := map[string]interface{}{
		"name": name,
		"code": code,
	}
	if teacherID != nil {
		updates["teacher_id"] = *teacherID
	}
	return r.db.Model(&models.Subject{}).Where("id = ?", subjectID).Updates(updates).Error
}

func (r *masterRepository) UpdateSchedule(scheduleID uint, schedule *models.Schedule) error {
	return r.db.Model(&models.Schedule{}).Where("id = ?", scheduleID).Updates(schedule).Error
}

// Delete implementations
func (r *masterRepository) DeleteClass(classID uint) error {
	return r.db.Delete(&models.Class{}, classID).Error
}

func (r *masterRepository) DeleteSubject(subjectID uint) error {
	return r.db.Delete(&models.Subject{}, subjectID).Error
}

func (r *masterRepository) DeleteSchedule(scheduleID uint) error {
	return r.db.Delete(&models.Schedule{}, scheduleID).Error
}

func (r *masterRepository) ResetSchedules() error {
	return r.db.Exec("DELETE FROM schedules").Error
}
