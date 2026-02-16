package models

import (
	"gorm.io/gorm"
)

type Profile struct {
	gorm.Model
	UserID uint   `json:"user_id" gorm:"uniqueIndex"`
	NIS    string `json:"nis" gorm:"index"`
	NIP    string `json:"nip" gorm:"column:nip;index"`
}
