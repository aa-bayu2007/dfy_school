package controllers

import (
	"backend/models"
	"backend/pkg/response"
	"backend/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService services.AuthService
}

func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{authService}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input struct {
		Email        string `json:"email" binding:"required"`
		Password     string `json:"password" binding:"required"`
		ExpectedRole string `json:"expected_role"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	token, refreshToken, user, err := h.authService.Login(input.Email, input.Password, input.ExpectedRole)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.Error(err.Error()))
		return
	}

	// Extract primary role for frontend compatibility
	roleName := user.Role
	if roleName == "" {
		roleName = "murid"
	}

	c.JSON(http.StatusOK, response.Success(gin.H{
		"token":         token,
		"refresh_token": refreshToken,
		"user":          user,
		"role":          roleName,
	}))
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	token, refreshToken, err := h.authService.RefreshToken(input.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(gin.H{
		"token":         token,
		"refresh_token": refreshToken,
	}))
}

func (h *AuthHandler) Register(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("Invalid input"))
		return
	}

	if err := h.authService.Register(&user); err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")
	// userID might be float64 from JWT claims in gin
	var uID uint
	switch v := userID.(type) {
	case float64:
		uID = uint(v)
	case uint:
		uID = v
	default:
		c.JSON(http.StatusInternalServerError, response.Error("Invalid user ID type"))
		return
	}

	user, err := h.authService.GetMe(uID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error("User not found"))
		return
	}

	c.JSON(http.StatusOK, response.Success(user))
}
