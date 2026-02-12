package controllers

import (
	"backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct{}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	// Return empty list instead of 404
	c.JSON(http.StatusOK, response.Success([]interface{}{}))
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	c.JSON(http.StatusOK, response.Success(nil))
}

func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	c.JSON(http.StatusOK, response.Success(0))
}
