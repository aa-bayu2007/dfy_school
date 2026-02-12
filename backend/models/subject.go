package models

import (
	"gorm.io/gorm"
	"time"
)

type Subject struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	Name      string         `json:"name"`
	Code      string         `json:"code"`
	TeacherID *uint          `json:"teacher_id"`
	Teacher   User           `json:"teacher" gorm:"foreignKey:TeacherID"`
}
