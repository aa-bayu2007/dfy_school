package services

import (
	"backend/models"
	"backend/pkg/utils"
	"backend/repositories"
	"errors"
	"log"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService interface {
	Login(identifier, password, expectedRole string) (string, string, *models.User, error)
	Register(user *models.User) error
	GetMe(userID uint) (*models.User, error)
	RefreshToken(tokenStr string) (string, string, error)
	GetAllUsers() ([]models.User, error)
	GetTeachers() ([]models.User, error)
	UpdateUserRole(userID uint, roleName string) error
	UpdateUserClass(userID uint, classID *uint) error
	CreateUser(user *models.User, profile *models.Profile) error
	ImportStudents(students []StudentImportData) error
	GetStudentsByClass(classID uint) ([]models.User, error)
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

func (s *authService) Login(identifier, password, expectedRole string) (string, string, *models.User, error) {
	var user models.User
	var err error

	// Trim whitespace to prevent formatting issues
	identifier = strings.TrimSpace(identifier)

	log.Printf("[Login] Attempt for identifier: %s", identifier)

	// Try finding by Email first
	err = s.userRepo.GetDB().Preload("Class").Preload("Profile").Where("email = ?", identifier).First(&user).Error

	// If not found by email, try finding by NIS or NIP in Profile
	if err != nil {
		// Join User with Profile to search by NIS or NIP
		// Explicitly select "users.*" to avoid ID ambiguity with profiles table
		err = s.userRepo.GetDB().
			Preload("Class").
			Preload("Profile").
			Joins("JOIN profiles ON profiles.user_id = users.id").
			Where("profiles.nis = ? OR profiles.nip = ?", identifier, identifier).
			Select("users.*").
			First(&user).Error
	}

	if err != nil {
		log.Printf("[Login] User not found for identifier: %s", identifier)
		return "", "", nil, errors.New("invalid credentials")
	}

	if !utils.CheckPasswordHash(password, user.Password) {
		log.Printf("[Login] Password mismatch for identifier: %s", identifier)
		return "", "", nil, errors.New("invalid credentials")
	}

	// Validate role matches expected login form
	if expectedRole != "" {
		actualRole := strings.ToLower(user.Role)
		if actualRole == "" {
			actualRole = "murid"
		}

		expectedRole = strings.ToLower(expectedRole)
		roleAllowed := false

		switch expectedRole {
		case "murid", "siswa", "student":
			roleAllowed = (actualRole == "murid" || actualRole == "student" || actualRole == "ketua_kelas")
		case "guru", "teacher":
			roleAllowed = (actualRole == "guru" || actualRole == "teacher")
		case "admin":
			roleAllowed = (actualRole == "admin")
		default:
			// If an unknown expectedRole is passed, we default to deny for safety
			roleAllowed = false
		}

		if !roleAllowed {
			log.Printf("[Login] Role mismatch: expected=%s, actual=%s for user %s", expectedRole, actualRole, identifier)
			return "", "", nil, errors.New("akun ini tidak memiliki akses untuk login di form ini")
		}
	}

	log.Printf("[Login] Success for user: %s (ID: %d, Role: %s)", user.Email, user.ID, user.Role)

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
	tx := s.userRepo.GetDB().Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// Fetch user to check role
	var user models.User
	if err := tx.First(&user, userID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Update user's class_id
	if err := tx.Model(&user).Update("class_id", classID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// If guru, also update the Class table to reflect Wali Kelas association
	if user.Role == "guru" {
		// 1. Clear teacher_id from any class currently assigned to this teacher
		if err := tx.Model(&models.Class{}).Where("teacher_id = ?", userID).Update("teacher_id", nil).Error; err != nil {
			tx.Rollback()
			return err
		}

		// 2. If a new class is assigned, set this teacher as its Wali Kelas
		if classID != nil {
			if err := tx.Model(&models.Class{}).Where("id = ?", *classID).Update("teacher_id", userID).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit().Error
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
		// Check if a user with this email already exists
		var existingUser models.User
		err := tx.Where("email = ?", data.Email).First(&existingUser).Error

		if err == nil {
			// User already exists — update their info instead of failing
			existingUser.Name = data.Name
			existingUser.ClassID = &data.ClassID
			if err := tx.Save(&existingUser).Error; err != nil {
				tx.Rollback()
				return err
			}

			// Update or create profile
			var profile models.Profile
			if err := tx.Where("user_id = ?", existingUser.ID).First(&profile).Error; err != nil {
				// Profile doesn't exist, create one
				profile = models.Profile{
					UserID: existingUser.ID,
					NIS:    data.NIS,
				}
				if err := tx.Create(&profile).Error; err != nil {
					tx.Rollback()
					return err
				}
			} else {
				profile.NIS = data.NIS
				if err := tx.Save(&profile).Error; err != nil {
					tx.Rollback()
					return err
				}
			}

			log.Printf("[ImportStudents] Updated existing user: %s (%s)", data.Name, data.Email)
			continue
		}

		// New user — hash password and create
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

		log.Printf("[ImportStudents] Created new user: %s (%s)", data.Name, data.Email)
	}

	return tx.Commit().Error
}

func (s *authService) GetStudentsByClass(classID uint) ([]models.User, error) {
	return s.userRepo.GetStudentsByClass(classID)
}
