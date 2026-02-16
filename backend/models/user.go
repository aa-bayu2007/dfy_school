package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Email        string     `json:"email" gorm:"unique"`
	Password     string     `json:"password"`
	Name         string     `json:"name"`
	Role         string     `json:"role"` // student, teacher, admin
	ClassID      *uint      `json:"class_id"`
	Class        *Class     `json:"class,omitempty" gorm:"foreignKey:ClassID"`
	Profile      *Profile   `json:"profile,omitempty"`
	TenureEndsAt *time.Time `json:"tenure_ends_at"`
}
