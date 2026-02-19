package models

import (
	"time"

	"gorm.io/gorm"
)

type VotingSession struct {
	gorm.Model
	ClassID    uint              `json:"class_id"`
	Class      Class             `json:"class" gorm:"foreignKey:ClassID"`
	TeacherID  uint              `json:"teacher_id"`
	Teacher    User              `json:"teacher" gorm:"foreignKey:TeacherID"`
	Status     string            `json:"status"` // active, finished
	WinnerID   *uint             `json:"winner_id"`
	Winner     *User             `json:"winner,omitempty" gorm:"foreignKey:WinnerID"`
	ExpiresAt  *time.Time        `json:"expires_at"`
	TenureDays int               `json:"tenure_days"`
	Candidates []VotingCandidate `json:"candidates" gorm:"foreignKey:VotingSessionID"`
}

type VotingCandidate struct {
	gorm.Model
	VotingSessionID uint `json:"voting_session_id"`
	StudentID       uint `json:"student_id"`
	Student         User `json:"student" gorm:"foreignKey:StudentID"`
	VoteCount       int  `json:"vote_count" gorm:"default:0"`
}

type Vote struct {
	gorm.Model
	VotingSessionID uint            `json:"voting_session_id" gorm:"uniqueIndex:idx_user_session"`
	UserID          uint            `json:"user_id" gorm:"uniqueIndex:idx_user_session"`
	User            User            `json:"user" gorm:"foreignKey:UserID"`
	CandidateID     uint            `json:"candidate_id"`
	Candidate       VotingCandidate `json:"candidate" gorm:"foreignKey:CandidateID"`
}
