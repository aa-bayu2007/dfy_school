package models

import (
	"gorm.io/gorm"
)

type Permission struct {
	gorm.Model
	Name string `json:"name" gorm:"unique"`
	Slug string `json:"slug" gorm:"unique"` // e.g., "attendance.scan"
}

type Role struct {
	gorm.Model
	Name        string       `json:"name" gorm:"unique"`
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions"`
}
