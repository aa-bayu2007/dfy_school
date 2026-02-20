package controllers

import (
	"backend/pkg/response"
	"backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AttendanceHandler struct {
	attendService services.AttendanceService
}

func NewAttendanceHandler(attendService services.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{attendService}
}

func (h *AttendanceHandler) Scan(c *gin.Context) {
	// Get user_id from AuthMiddleware context
	rawUserID, _ := c.Get("user_id")
	var scannerID uint
	switch v := rawUserID.(type) {
	case float64:
		scannerID = uint(v)
	case uint:
		scannerID = v
	}

	var input struct {
		QRCode    string `json:"qr_code" binding:"required"`
		ScannerID uint   `json:"scanner_id"` // can be overridden by body if needed, but we use context
		Force     bool   `json:"force"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	result, err := h.attendService.ScanQR(input.QRCode, scannerID, input.Force)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(result))
}

func (h *AttendanceHandler) GetHistory(c *gin.Context) {
	studentID := c.Query("student_id")
	classID := c.Query("class_id")
	date := c.Query("date")
	scannedBy := c.Query("scanned_by")

	history, err := h.attendService.GetHistory(studentID, classID, date, scannedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch history"))
		return
	}

	c.JSON(http.StatusOK, response.Success(history))
}

func (h *AttendanceHandler) GetStats(c *gin.Context) {
	classID := c.Query("class_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if classID == "" || startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, response.Error("Missing required parameters"))
		return
	}

	stats, err := h.attendService.GetStats(classID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(stats))
}

func (h *AttendanceHandler) GetRecap(c *gin.Context) {
	classID := c.Query("class_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if classID == "" || startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, response.Error("Missing required parameters"))
		return
	}

	recap, err := h.attendService.GetRecap(classID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(recap))
}

func (h *AttendanceHandler) UpdateStatus(c *gin.Context) {
	idStr := c.Param("id")
	attendanceID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid attendance ID"))
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
		Notes  string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	// Validate status enum
	validStatus := map[string]bool{
		"hadir": true,
		"sakit": true,
		"izin":  true,
		"alpha": true,
	}
	if !validStatus[input.Status] {
		c.JSON(http.StatusBadRequest, response.Error("Invalid status"))
		return
	}

	if err := h.attendService.UpdateStatus(uint(attendanceID), input.Status, input.Notes, nil); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}
