package controllers

import (
	"backend/pkg/response"
	"backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	service services.NotificationService
}

func NewNotificationHandler(service services.NotificationService) *NotificationHandler {
	return &NotificationHandler{service}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	u, _ := c.Get("user_id")
	var userID uint
	switch v := u.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	}

	notifications, err := h.service.GetNotifications(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(notifications))
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	u, _ := c.Get("user_id")
	var userID uint
	switch v := u.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	}

	if err := h.service.MarkAsRead(uint(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	u, _ := c.Get("user_id")
	var userID uint
	switch v := u.(type) {
	case float64:
		userID = uint(v)
	case uint:
		userID = v
	}

	count, err := h.service.GetUnreadCount(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.Error(err.Error()))
		return
	}

	c.JSON(http.StatusOK, response.Success(count))
}
