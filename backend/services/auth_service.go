package services

import (
	"backend/models"
	"backend/pkg/utils"
	"backend/repositories"
	"errors"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService interface {
	Login(email, password string) (string, string, *models.User, error)
	Register(user *models.User) error
	GetMe(userID uint) (*models.User, error)
	RefreshToken(tokenStr string) (string, string, error)
	GetAllUsers() ([]models.User, error)
	GetTeachers() ([]models.User, error)
	UpdateUserRole(userID uint, roleName string) error
	UpdateUserClass(userID uint, classID *uint) error
}

type authService struct {
	userRepo repositories.UserRepository
}

func NewAuthService(userRepo repositories.UserRepository) AuthService {
	return &authService{userRepo}
}

func (s *authService) Login(email, password string) (string, string, *models.User, error) {
	var user models.User
	if err := s.userRepo.GetDB().Preload("Class").Preload("Profile").Where("email = ?", email).First(&user).Error; err != nil {
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
