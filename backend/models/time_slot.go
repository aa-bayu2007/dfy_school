package models

import (
	"gorm.io/gorm"
	"time"
)

type TimeSlot struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	SlotNumber int            `json:"slot_number"`
	StartTime  string         `json:"start_time"` // Format HH:MM
	EndTime    string         `json:"end_time"`   // Format HH:MM
}
