package models

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

var (
	ErrDuplicateRequest = errors.New("already submitted a request for this date")
)

type AttendanceStatus string
type RequestStatus string

const (
	StatusHadir   AttendanceStatus = "hadir"
	StatusSakit   AttendanceStatus = "sakit"
	StatusIzin    AttendanceStatus = "izin"
	StatusAlpha   AttendanceStatus = "alpha"
	StatusPending AttendanceStatus = "pending"

	RequestPending  RequestStatus = "pending"
	RequestApproved RequestStatus = "approved"
	RequestRejected RequestStatus = "rejected"
)

type Attendance struct {
	ID         uint             `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
	DeletedAt  gorm.DeletedAt   `gorm:"index" json:"-"`
	StudentID  uint             `json:"student_id" gorm:"uniqueIndex:idx_student_schedule_date"`
	Student    User             `json:"student" gorm:"foreignKey:StudentID"`
	ClassID    uint             `json:"class_id"`
	Class      Class            `json:"class" gorm:"foreignKey:ClassID"`
	ScheduleID *uint            `json:"schedule_id" gorm:"uniqueIndex:idx_student_schedule_date"`
	Schedule   Schedule         `json:"schedule" gorm:"foreignKey:ScheduleID"`
	Date       time.Time        `json:"date" gorm:"type:date;uniqueIndex:idx_student_schedule_date"`
	Status     AttendanceStatus `json:"status"`
	ScannedBy  *uint            `json:"scanned_by"`
	Scanner    *User            `gorm:"foreignKey:ScannedBy" json:"scanner"`
	ScannedAt  *time.Time       `json:"scanned_at"`
	ApprovedAt *time.Time       `json:"approved_at"`
	Notes      string           `json:"notes"`
}

type AttendanceRequest struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	StudentID        uint           `json:"student_id"`
	Student          User           `json:"student" gorm:"foreignKey:StudentID"`
	Date             time.Time      `json:"date" gorm:"type:date"`
	EndDate          *time.Time     `json:"end_date" gorm:"type:date"`
	AutoMarkUpcoming bool           `json:"auto_mark_upcoming" gorm:"default:false"`
	RequestType      string         `json:"request_type"` // sakit, izin
	Reason           string         `json:"reason"`
	AttachmentURL    string         `json:"attachment_url"`
	IsFullDay        bool           `json:"is_full_day" gorm:"default:true"`
	Schedules        []Schedule     `json:"schedules" gorm:"many2many:attendance_request_schedules"`
	Status           RequestStatus  `json:"status" gorm:"default:'pending'"`
	ReviewedBy       *uint          `json:"reviewed_by"`
	Reviewer         User           `json:"reviewer" gorm:"foreignKey:ReviewedBy"`
	ReviewedAt       *time.Time     `json:"reviewed_at"`
}
