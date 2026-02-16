package services

import (
	"backend/models"
	"backend/pkg/utils"
	"backend/repositories"
	"errors"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService interface {
	Login(identifier, password string) (string, string, *models.User, error)
	Register(user *models.User) error
	GetMe(userID uint) (*models.User, error)
	RefreshToken(tokenStr string) (string, string, error)
	GetAllUsers() ([]models.User, error)
	GetTeachers() ([]models.User, error)
	UpdateUserRole(userID uint, roleName string) error
	UpdateUserClass(userID uint, classID *uint) error
	CreateUser(user *models.User, profile *models.Profile) error
	ImportStudents(students []StudentImportData) error
}

type StudentImportData struct {
	Name     string
	Email    string
	NIS      string
	ClassID  uint
	Password string
}

type authService struct {
	userRepo repositories.UserRepository
}

func NewAuthService(userRepo repositories.UserRepository) AuthService {
	return &authService{userRepo}
}

func (s *authService) Login(identifier, password string) (string, string, *models.User, error) {
	var user models.User
	var err error

	// Try finding by Email first
	err = s.userRepo.GetDB().Preload("Class").Preload("Profile").Where("email = ?", identifier).First(&user).Error

	// If not found by email, try finding by NIS or NIP in Profile
	if err != nil {
		// Join User with Profile to search by NIS or NIP
		err = s.userRepo.GetDB().
			Preload("Class").
			Preload("Profile").
			Joins("JOIN profiles ON profiles.user_id = users.id").
			Where("profiles.nis = ? OR profiles.nip = ?", identifier, identifier).
			First(&user).Error
	}

	if err != nil {
		return "", "", nil, errors.New("invalid credentials")
	}

	if !utils.CheckPasswordHash(password, user.Password) {
		return "", "", nil, errors.New("invalid credentials")
	}

	// Use direct role field
	roleName := user.Role
	if roleName == "" {
		roleName = "murid"
	}

	token, err := utils.GenerateToken(user.ID, roleName)
	if err != nil {
		return "", "", nil, err
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID)
	if err != nil {
		return "", "", nil, err
	}

	return token, refreshToken, &user, nil
}

func (s *authService) Register(user *models.User) error {
	existing, _ := s.userRepo.FindByEmail(user.Email)
	if existing != nil && existing.ID != 0 {
		return errors.New("email already registered")
	}

	hashed, err := utils.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashed

	if err := s.userRepo.Create(user); err != nil {
		return err
	}

	// Create an empty profile for the new user
	profile := models.Profile{
		UserID: user.ID,
	}
	return s.userRepo.GetDB().Create(&profile).Error
}

func (s *authService) GetMe(userID uint) (*models.User, error) {
	var user models.User
	err := s.userRepo.GetDB().Preload("Class").Preload("Profile").First(&user, userID).Error
	return &user, err
}

func (s *authService) RefreshToken(tokenStr string) (string, string, error) {
	token, err := utils.ValidateRefreshToken(tokenStr)
	if err != nil || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid claims")
	}

	userID := uint(claims["user_id"].(float64))
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", "", errors.New("user not found")
	}

	roleName := user.Role
	if roleName == "" {
		roleName = "murid"
	}

	newToken, _ := utils.GenerateToken(user.ID, roleName)
	newRefreshToken, _ := utils.GenerateRefreshToken(user.ID)

	return newToken, newRefreshToken, nil
}

func (s *authService) GetAllUsers() ([]models.User, error) {
	return s.userRepo.GetAllUsers()
}

func (s *authService) GetTeachers() ([]models.User, error) {
	return s.userRepo.FindUsersByRole("guru")
}

func (s *authService) UpdateUserRole(userID uint, roleName string) error {
	return s.userRepo.GetDB().Model(&models.User{}).Where("id = ?", userID).Update("role", roleName).Error
}

func (s *authService) UpdateUserClass(userID uint, classID *uint) error {
	return s.userRepo.GetDB().Model(&models.User{}).Where("id = ?", userID).Update("class_id", classID).Error
}

func (s *authService) CreateUser(user *models.User, profile *models.Profile) error {
	existing, _ := s.userRepo.FindByEmail(user.Email)
	if existing != nil && existing.ID != 0 {
		return errors.New("email already registered")
	}

	hashed, err := utils.HashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashed

	tx := s.userRepo.GetDB().Begin()
	if tx.Error != nil {
		return tx.Error
	}

	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return err
	}

	profile.UserID = user.ID
	if err := tx.Create(profile).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

func (s *authService) ImportStudents(students []StudentImportData) error {
	tx := s.userRepo.GetDB().Begin()
	if tx.Error != nil {
		return tx.Error
	}

	for _, data := range students {
		// Hass password
		hashed, err := utils.HashPassword(data.Password)
		if err != nil {
			tx.Rollback()
			return err
		}

		user := models.User{
			Name:     data.Name,
			Email:    data.Email,
			Password: hashed,
			Role:     "murid",
			ClassID:  &data.ClassID,
		}

		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			return err
		}

		profile := models.Profile{
			UserID: user.ID,
			NIS:    data.NIS,
		}

		if err := tx.Create(&profile).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}
