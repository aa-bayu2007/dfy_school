package models

import "gorm.io/gorm"

type Class struct {
	gorm.Model
	Name      string `json:"name"`
	Grade     string `json:"grade"`
	TeacherID *uint  `json:"teacher_id"`
	Teacher   *User  `json:"teacher,omitempty" gorm:"foreignKey:TeacherID"`
}