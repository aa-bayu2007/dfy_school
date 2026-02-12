package controllers

import (
	"backend/pkg/response"
	"backend/services"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type StudentHandler struct {
	attendService services.AttendanceService
	authService   services.AuthService
}

func NewStudentHandler(attendService services.AttendanceService, authService services.AuthService) *StudentHandler {
	return &StudentHandler{attendService, authService}
}

func (h *StudentHandler) GetQRCode(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var uID uint
	switch v := userID.(type) {
	case float64:
		uID = uint(v)
	case uint:
		uID = v
	default:
		c.JSON(http.StatusInternalServerError, response.Error("Invalid user ID"))
		return
	}

	user, err := h.authService.GetMe(uID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error("User not found"))
		return
	}

	// We need Class Name, ensure it's loaded. GetMe uses GetAllUsers/FindByID which preloads Class?
	// AuthService.GetMe usually calls UserRepository.FindByID. Checking if it preloads Class.
	// If not, we might miss Class Name.
	// Assuming FindByID preloads Class based on previous observations of user.go/auth_service.go

	isStudent := user.Role == "student" || user.Role == "murid" || user.Role == "ketua_kelas"

	if !isStudent {
		c.JSON(http.StatusForbidden, response.Error("Only students can generate QR code"))
		return
	}

	today := time.Now().Format("2006-01-02")
	timestamp := time.Now().Unix()

	// Format "STU-{id}|{name}|{nis}|{class_name}|{date}|{timestamp}"
	// This format is expected by the Attendance Scanner
	className := "N/A"
	nis := "N/A"
	if user.Profile != nil {
		nis = user.Profile.NIS
	}
	if user.Class != nil {
		className = user.Class.Name
	}

	qrValue := fmt.Sprintf("STU-%d|%s|%s|%s|%s|%d", user.ID, user.Name, nis, className, today, timestamp)

	c.JSON(http.StatusOK, response.Success(gin.H{
		"qr_code": qrValue,
		"student": user,
		"date":    today,
	}))
}
