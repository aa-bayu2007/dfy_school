package models

import (
	"gorm.io/gorm"
	"time"
)

type Day struct {
	ID   int    `json:"id" gorm:"primaryKey"`
	Name string `json:"name"`
}

type Schedule struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	DayID      int            `json:"day_id"`
	Day        Day            `json:"day" gorm:"foreignKey:DayID"`
	TimeSlotID uint           `json:"time_slot_id"`
	TimeSlot   TimeSlot       `json:"time_slot" gorm:"foreignKey:TimeSlotID"`
	SubjectID  uint           `json:"subject_id"`
	Subject    Subject        `json:"subject" gorm:"foreignKey:SubjectID"`
	ClassID    uint           `json:"class_id"`
	Class      Class          `json:"class" gorm:"foreignKey:ClassID"`
	TeacherID  *uint          `json:"teacher_id"`
	Teacher    *User          `json:"teacher" gorm:"foreignKey:TeacherID"`
}
