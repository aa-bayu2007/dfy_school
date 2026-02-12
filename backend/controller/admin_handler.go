package controllers

import (
	"backend/models"
	"backend/pkg/response"
	"backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	masterService services.MasterService
	authService   services.AuthService
}

func NewAdminHandler(masterService services.MasterService, authService services.AuthService) *AdminHandler {
	return &AdminHandler{masterService, authService}
}

func (h *AdminHandler) GetUsers(c *gin.Context) {
	users, err := h.authService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch users"))
		return
	}
	c.JSON(http.StatusOK, response.Success(users))
}

func (h *AdminHandler) GetTeachers(c *gin.Context) {
	teachers, err := h.authService.GetTeachers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch teachers"))
		return
	}
	c.JSON(http.StatusOK, response.Success(teachers))
}

func (h *AdminHandler) GetClasses(c *gin.Context) {
	teacherID := c.Query("teacher_id")

	var classes []models.Class
	var err error

	if teacherID != "" {
		tID, _ := strconv.ParseUint(teacherID, 10, 32)
		classes, err = h.masterService.GetClassesByTeacher(uint(tID))
	} else {
		classes, err = h.masterService.GetAllClasses()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch classes"))
		return
	}
	c.JSON(http.StatusOK, response.Success(classes))
}

func (h *AdminHandler) GetSubjects(c *gin.Context) {
	subjects, err := h.masterService.GetAllSubjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch subjects"))
		return
	}
	c.JSON(http.StatusOK, response.Success(subjects))
}

func (h *AdminHandler) GetTimeSlots(c *gin.Context) {
	slots, err := h.masterService.GetAllTimeSlots()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch time slots"))
		return
	}
	c.JSON(http.StatusOK, response.Success(slots))
}

func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	idStr := c.Param("id")
	userID, _ := strconv.ParseUint(idStr, 10, 32)

	var input struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.authService.UpdateUserRole(uint(userID), input.Role); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) UpdateUserClass(c *gin.Context) {
	idStr := c.Param("id")
	userID, _ := strconv.ParseUint(idStr, 10, 32)

	var input struct {
		ClassID *uint `json:"class_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.authService.UpdateUserClass(uint(userID), input.ClassID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) CreateClass(c *gin.Context) {
	var input struct {
		Name      string `json:"name" binding:"required"`
		Grade     string `json:"grade"`
		TeacherID *uint  `json:"teacher_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.masterService.CreateClass(input.Name, input.Grade, input.TeacherID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) CreateSubject(c *gin.Context) {
	var input struct {
		Name      string `json:"name" binding:"required"`
		Code      string `json:"code" binding:"required"`
		TeacherID *uint  `json:"teacher_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.masterService.CreateSubject(input.Name, input.Code, input.TeacherID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) CreateSchedule(c *gin.Context) {
	var input struct {
		ClassID    uint `json:"class_id" binding:"required"`
		SubjectID  uint `json:"subject_id" binding:"required"`
		DayID      int  `json:"day_id" binding:"required"`
		TimeSlotID uint `json:"time_slot_id" binding:"required"`
		TeacherID  uint `json:"teacher_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.masterService.CreateSchedule(uint(input.ClassID), uint(input.SubjectID), input.DayID, uint(input.TimeSlotID), uint(input.TeacherID)); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

// Update handlers
func (h *AdminHandler) UpdateSubject(c *gin.Context) {
	idStr := c.Param("id")
	subjectID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil || subjectID == 0 {
		c.JSON(http.StatusBadRequest, response.Error("Invalid subject ID"))
		return
	}

	var input struct {
		Name      string `json:"name" binding:"required"`
		Code      string `json:"code"`
		TeacherID *uint  `json:"teacher_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.masterService.UpdateSubject(uint(subjectID), input.Name, input.Code, input.TeacherID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) UpdateClass(c *gin.Context) {
	idStr := c.Param("id")
	classID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil || classID == 0 {
		c.JSON(http.StatusBadRequest, response.Error("Invalid class ID"))
		return
	}

	var input struct {
		Name      string `json:"name" binding:"required"`
		Grade     string `json:"grade"`
		TeacherID *uint  `json:"teacher_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.masterService.UpdateClass(uint(classID), input.Name, input.Grade, input.TeacherID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) UpdateSchedule(c *gin.Context) {
	idStr := c.Param("id")
	scheduleID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil || scheduleID == 0 {
		c.JSON(http.StatusBadRequest, response.Error("Invalid schedule ID"))
		return
	}

	var input struct {
		ClassID    uint `json:"class_id" binding:"required"`
		SubjectID  uint `json:"subject_id" binding:"required"`
		DayID      int  `json:"day_id" binding:"required"`
		TimeSlotID uint `json:"time_slot_id" binding:"required"`
		TeacherID  uint `json:"teacher_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.masterService.UpdateSchedule(uint(scheduleID), uint(input.ClassID), uint(input.SubjectID), input.DayID, uint(input.TimeSlotID), uint(input.TeacherID)); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

// Delete handlers
func (h *AdminHandler) DeleteSubject(c *gin.Context) {
	idStr := c.Param("id")
	subjectID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil || subjectID == 0 {
		c.JSON(http.StatusBadRequest, response.Error("Invalid subject ID"))
		return
	}

	if err := h.masterService.DeleteSubject(uint(subjectID)); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) DeleteClass(c *gin.Context) {
	idStr := c.Param("id")
	classID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil || classID == 0 {
		c.JSON(http.StatusBadRequest, response.Error("Invalid class ID"))
		return
	}

	if err := h.masterService.DeleteClass(uint(classID)); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) DeleteSchedule(c *gin.Context) {
	idStr := c.Param("id")
	scheduleID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil || scheduleID == 0 {
		c.JSON(http.StatusBadRequest, response.Error("Invalid schedule ID"))
		return
	}

	if err := h.masterService.DeleteSchedule(uint(scheduleID)); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) ResetSchedules(c *gin.Context) {
	if err := h.masterService.ResetSchedules(); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) GetSchedules(c *gin.Context) {
	classID := c.Query("class_id")
	teacherID := c.Query("teacher_id")

	schedules, err := h.masterService.GetSchedules(classID, teacherID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch schedules"))
		return
	}

	c.JSON(http.StatusOK, response.Success(schedules))
}

func (h *AdminHandler) GetDays(c *gin.Context) {
	days, err := h.masterService.GetDays()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch days"))
		return
	}
	c.JSON(http.StatusOK, response.Success(days))
}
