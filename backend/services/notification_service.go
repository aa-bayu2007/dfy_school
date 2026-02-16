package services

import (
	"backend/models"
	"backend/repositories"
)

type NotificationService interface {
	NotifyUser(userID uint, title, message string) error
	NotifyUsers(userIDs []uint, title, message string) error
	GetNotifications(userID uint) ([]models.Notification, error)
	GetUnreadCount(userID uint) (int64, error)
	MarkAsRead(id uint, userID uint) error
}

type notificationService struct {
	repo repositories.NotificationRepository
}

func NewNotificationService(repo repositories.NotificationRepository) NotificationService {
	return &notificationService{repo}
}

func (s *notificationService) NotifyUser(userID uint, title, message string) error {
	notif := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
	}
	return s.repo.Create(&notif)
}

func (s *notificationService) NotifyUsers(userIDs []uint, title, message string) error {
	for _, id := range userIDs {
		if err := s.NotifyUser(id, title, message); err != nil {
			return err
		}
	}
	return nil
}

func (s *notificationService) GetNotifications(userID uint) ([]models.Notification, error) {
	return s.repo.GetByUserID(userID)
}

func (s *notificationService) GetUnreadCount(userID uint) (int64, error) {
	return s.repo.GetUnreadCount(userID)
}

func (s *notificationService) MarkAsRead(id uint, userID uint) error {
	return s.repo.MarkAsRead(id, userID)
}
