package controllers

import (
	"backend/models"
	"backend/pkg/response"
	"backend/services"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
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

func (h *AdminHandler) CreateUser(c *gin.Context) {
	var input struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Role     string `json:"role" binding:"required"`
		ClassID  *uint  `json:"class_id"`
		NIS      string `json:"nis"`
		NIP      string `json:"nip"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input: "+err.Error()))
		return
	}

	validRoles := map[string]bool{
		"admin":       true,
		"guru":        true,
		"murid":       true,
		"ketua_kelas": true,
	}
	if !validRoles[input.Role] {
		c.JSON(http.StatusBadRequest, response.Error("Invalid role"))
		return
	}

	switch input.Role {
	case "guru":
		input.ClassID = nil
		input.NIS = ""
	case "admin":
		input.ClassID = nil
		input.NIS = ""
		input.NIP = ""
	default:
		input.NIP = ""
	}

	if input.NIS != "" {
		if match, _ := regexp.MatchString(`^\d+$`, input.NIS); !match {
			c.JSON(http.StatusBadRequest, response.Error("NIS must be numeric"))
			return
		}
	}
	if input.NIP != "" {
		if match, _ := regexp.MatchString(`^\d+$`, input.NIP); !match {
			c.JSON(http.StatusBadRequest, response.Error("NIP must be numeric"))
			return
		}
	}

	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: input.Password,
		Role:     input.Role,
		ClassID:  input.ClassID,
	}

	profile := models.Profile{
		NIS: input.NIS,
		NIP: input.NIP,
	}

	if err := h.authService.CreateUser(&user, &profile); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusCreated, response.Success(gin.H{"message": "User created successfully", "user_id": user.ID}))
}

func (h *AdminHandler) CreateClass(c *gin.Context) {
	var input struct {
		Grade     string `json:"grade" binding:"required"`
		Major     string `json:"major" binding:"required"`
		Section   string `json:"section" binding:"required"`
		TeacherID *uint  `json:"teacher_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input: "+err.Error()))
		return
	}

	if err := h.masterService.CreateClass(input.Grade, input.Major, input.Section, input.TeacherID); err != nil {
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
		Grade     string `json:"grade" binding:"required"`
		Major     string `json:"major" binding:"required"`
		Section   string `json:"section" binding:"required"`
		TeacherID *uint  `json:"teacher_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.masterService.UpdateClass(uint(classID), input.Grade, input.Major, input.Section, input.TeacherID); err != nil {
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

func (h *AdminHandler) MigrateClassData(c *gin.Context) {
	if err := h.masterService.MigrateClassData(); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AdminHandler) ImportStudents(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Failed to get file: "+err.Error()))
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to open file: "+err.Error()))
		return
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to read excel: "+err.Error()))
		return
	}
	defer f.Close()

	// Get all rows from the first sheet
	rows, err := f.GetRows(f.GetSheetList()[0])
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to get rows: "+err.Error()))
		return
	}

	if len(rows) < 2 {
		c.JSON(http.StatusBadRequest, response.Error("Excel file is empty or missing header"))
		return
	}

	// Fetch all classes to map Name -> ID
	classes, err := h.masterService.GetAllClasses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch classes for mapping"))
		return
	}
	classMap := make(map[string]uint)
	for _, cls := range classes {
		classMap[strings.ToUpper(cls.Name)] = cls.ID
	}

	var students []services.StudentImportData
	// Skip header (row 0)
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if len(row) < 4 {
			continue // Skip incomplete rows
		}

		name := row[0]
		email := row[1]
		nis := row[2]
		className := strings.ToUpper(row[3])
		password := "123456" // Default password if not provided
		if len(row) >= 5 && row[4] != "" {
			password = row[4]
		}

		classID, ok := classMap[className]
		if !ok {
			c.JSON(http.StatusBadRequest, response.Error("Class not found: "+className+" at row "+strconv.Itoa(i+1)))
			return
		}

		students = append(students, services.StudentImportData{
			Name:     name,
			Email:    email,
			NIS:      nis,
			ClassID:  classID,
			Password: password,
		})
	}

	if err := h.authService.ImportStudents(students); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to import students: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{"message": "Successfully imported " + strconv.Itoa(len(students)) + " students"}))
}
