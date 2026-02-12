package models

import (
	"gorm.io/gorm"
	"time"
)

type Notification struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	UserID    uint           `json:"user_id"`
	User      User           `json:"user" gorm:"foreignKey:UserID"`
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	IsRead    bool           `json:"is_read" gorm:"default:false"`
}
