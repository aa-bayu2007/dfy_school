package models

import "gorm.io/gorm"

type Class struct {
	gorm.Model
	Name      string `json:"name"`
	Grade     string `json:"grade"`
	Major     string `json:"major"`   // New field: Jurusan (e.g., PPLG, TBSM)
	Section   string `json:"section"` // New field: Kelas (e.g., 1, 2, 3)
	TeacherID *uint  `json:"teacher_id"`
	Teacher   *User  `json:"teacher,omitempty" gorm:"foreignKey:TeacherID"`
}
