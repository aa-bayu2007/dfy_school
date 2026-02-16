package controllers

import (
	"backend/pkg/response"
	"backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type VotingHandler struct {
	votingService services.VotingService
	authService   services.AuthService
}

func NewVotingHandler(votingService services.VotingService, authService services.AuthService) *VotingHandler {
	return &VotingHandler{votingService, authService}
}

func (h *VotingHandler) CreateSession(c *gin.Context) {
	var req struct {
		ClassID         uint   `json:"class_id"`
		StudentIDs      []uint `json:"student_ids"`
		DurationMinutes int    `json:"duration_minutes"`
		TenureDays      int    `json:"tenure_days"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Format request tidak valid"))
		return
	}

	u, _ := c.Get("user_id")
	var teacherID uint
	switch v := u.(type) {
	case float64:
		teacherID = uint(v)
	case uint:
		teacherID = v
	}

	if err := h.votingService.CreateSession(req.ClassID, teacherID, req.StudentIDs, req.DurationMinutes, req.TenureDays); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{"message": "Sesi voting berhasil dibuat"}))
}

func (h *VotingHandler) GetActiveSession(c *gin.Context) {
	classIDStr := c.Query("class_id")
	if classIDStr == "" {
		c.JSON(http.StatusBadRequest, response.Error("Class ID diperlukan"))
		return
	}

	classID, _ := strconv.Atoi(classIDStr)
	session, err := h.votingService.GetActiveSessionByClass(uint(classID))
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error("Tidak ada sesi voting aktif untuk kelas ini"))
		return
	}

	c.JSON(http.StatusOK, response.Success(session))
}

func (h *VotingHandler) CastVote(c *gin.Context) {
	var req struct {
		SessionID   uint `json:"session_id"`
		CandidateID uint `json:"candidate_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Format request tidak valid"))
		return
	}

	u, _ := c.Get("user_id")
	var userID uint
	switch v := u.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	}

	if err := h.votingService.CastVote(userID, req.SessionID, req.CandidateID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{"message": "Suara Anda berhasil dikirim"}))
}

func (h *VotingHandler) FinishSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, _ := strconv.Atoi(sessionIDStr)

	winner, err := h.votingService.FinishSession(uint(sessionID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{
		"message": "Voting selesai",
		"winner":  winner,
	}))
}

func (h *VotingHandler) GetSessionResults(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, _ := strconv.Atoi(sessionIDStr)

	session, err := h.votingService.GetSessionByID(uint(sessionID))
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error("Sesi voting tidak ditemukan"))
		return
	}

	c.JSON(http.StatusOK, response.Success(session))
}

func (h *VotingHandler) DemoteKetuaKelas(c *gin.Context) {
	var req struct {
		ClassID uint `json:"class_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Format request tidak valid"))
		return
	}

	u, _ := c.Get("user_id")
	var teacherID uint
	switch v := u.(type) {
	case float64:
		teacherID = uint(v)
	case uint:
		teacherID = v
	}

	if err := h.votingService.DemoteKetuaKelas(req.ClassID, teacherID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{"message": "Jabatan Ketua Kelas berhasil dicabut"}))
}
