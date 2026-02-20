package controllers

import (
	"backend/pkg/response"
	"backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type RequestHandler struct {
	reqService services.RequestService
}

func NewRequestHandler(reqService services.RequestService) *RequestHandler {
	return &RequestHandler{reqService}
}

func (h *RequestHandler) SubmitRequest(c *gin.Context) {
	var input struct {
		StudentID        uint   `json:"student_id" binding:"required"`
		Date             string `json:"date" binding:"required"`
		EndDate          string `json:"end_date"`
		AutoMarkUpcoming bool   `json:"auto_mark_upcoming"`
		RequestType      string `json:"request_type" binding:"required"`
		Reason           string `json:"reason" binding:"required"`
		AttachmentURL    string `json:"attachment_url"`
		IsFullDay        *bool  `json:"is_full_day"`
		ScheduleIDs      []uint `json:"schedule_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	// Default IsFullDay to true if not provided
	isFullDay := true
	if input.IsFullDay != nil {
		isFullDay = *input.IsFullDay
	}

	if err := h.reqService.Create(input.StudentID, input.Date, input.EndDate, input.RequestType, input.Reason, input.AttachmentURL, isFullDay, input.AutoMarkUpcoming, input.ScheduleIDs); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *RequestHandler) GetRequests(c *gin.Context) {
	studentID := c.Query("student_id")
	status := c.Query("status")
	classID := c.Query("class_id")

	requests, err := h.reqService.GetRequests(studentID, status, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch requests"))
		return
	}

	c.JSON(http.StatusOK, response.Success(requests))
}

func (h *RequestHandler) ApproveRequest(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	var input struct {
		Status     string `json:"status" binding:"required"`
		ReviewerID uint   `json:"reviewer_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.reqService.ReviewRequest(uint(id), input.Status, input.ReviewerID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}
