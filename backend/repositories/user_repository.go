package repositories

import (
	"backend/models"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	GetMe(userID uint) (*models.User, error)
	FindByID(id uint) (*models.User, error)
	GetAllUsers() ([]models.User, error)
	FindUsersByRole(roleName string) ([]models.User, error)
	GetStudentsByClass(classID uint) ([]models.User, error)
	GetDB() *gorm.DB
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db}
}

func (r *userRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Class").Preload("Profile").Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *userRepository) GetMe(userID uint) (*models.User, error) {
	return r.FindByID(userID)
}

func (r *userRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Class").Preload("Profile").First(&user, id).Error
	return &user, err
}

func (r *userRepository) GetAllUsers() ([]models.User, error) {
	var users []models.User
	err := r.db.Preload("Class").Preload("Profile").Find(&users).Error
	return users, err
}

func (r *userRepository) FindUsersByRole(roleName string) ([]models.User, error) {
	var users []models.User
	err := r.db.Where("role = ?", roleName).
		Preload("Class").Preload("Profile").
		Find(&users).Error
	return users, err
}

func (r *userRepository) GetStudentsByClass(classID uint) ([]models.User, error) {
	var users []models.User
	err := r.db.Where("role IN (?, ?) AND class_id = ?", "murid", "ketua_kelas", classID).
		Preload("Class").Preload("Profile").
		Find(&users).Error
	return users, err
}

func (r *userRepository) GetDB() *gorm.DB {
	return r.db
}
