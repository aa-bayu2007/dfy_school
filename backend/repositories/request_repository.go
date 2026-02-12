package repositories

import (
	"backend/models"
	"gorm.io/gorm"
)

type RequestRepository interface {
	Create(req *models.AttendanceRequest) error
	GetRequests(studentID string, status string, classID string) ([]models.AttendanceRequest, error)
	FindByID(id uint) (*models.AttendanceRequest, error)
	Update(req *models.AttendanceRequest) error
}

type requestRepository struct {
	db *gorm.DB
}

func NewRequestRepository(db *gorm.DB) RequestRepository {
	return &requestRepository{db}
}

func (r *requestRepository) Create(req *models.AttendanceRequest) error {
	return r.db.Create(req).Error
}

func (r *requestRepository) GetRequests(studentID string, status string, classID string) ([]models.AttendanceRequest, error) {
	query := r.db.Preload("Student").Preload("Student.Class").Preload("Schedules") // Simplified preloads to prevent crash

	if studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by class if needed (admin/guru view)
	if classID != "" {
		query = query.Joins("JOIN users ON users.id = attendance_requests.student_id").
			Where("users.class_id = ?", classID)
	}

	var requests []models.AttendanceRequest
	err := query.Order("created_at DESC").Find(&requests).Error
	return requests, err
}

func (r *requestRepository) FindByID(id uint) (*models.AttendanceRequest, error) {
	var req models.AttendanceRequest
	err := r.db.Preload("Student").Preload("Student.Class").Preload("Schedules").First(&req, id).Error
	return &req, err
}

func (r *requestRepository) Update(req *models.AttendanceRequest) error {
	return r.db.Save(req).Error
}
