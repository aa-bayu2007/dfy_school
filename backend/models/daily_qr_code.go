package models

import (
	"time"

	"gorm.io/gorm"
)

type DailyQRCode struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	StudentID uint           `json:"student_id"`
	Student   User           `gorm:"foreignKey:StudentID" json:"student"`
	QRCode    string         `json:"qr_code"`
	Date      string         `json:"date"` // 2024-02-02
	IsUsed    bool           `json:"is_used"`
}
