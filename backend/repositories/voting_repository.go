package repositories

import (
	"backend/models"

	"gorm.io/gorm"
)

type VotingRepository interface {
	CreateSession(session *models.VotingSession) error
	GetActiveSessionByClass(classID uint) (*models.VotingSession, error)
	GetSessionByID(id uint) (*models.VotingSession, error)
	UpdateSession(session *models.VotingSession) error

	CreateCandidates(candidates []models.VotingCandidate) error
	GetCandidatesBySession(sessionID uint) ([]models.VotingCandidate, error)
	UpdateCandidate(candidate *models.VotingCandidate) error

	CreateVote(vote *models.Vote) error
	HasUserVoted(userID uint, sessionID uint) (bool, error)
	GetVotesBySession(sessionID uint) ([]models.Vote, error)
}

type votingRepository struct {
	db *gorm.DB
}

func NewVotingRepository(db *gorm.DB) VotingRepository {
	return &votingRepository{db}
}

func (r *votingRepository) CreateSession(session *models.VotingSession) error {
	return r.db.Create(session).Error
}

func (r *votingRepository) GetActiveSessionByClass(classID uint) (*models.VotingSession, error) {
	var session models.VotingSession
	err := r.db.Preload("Candidates.Student").Preload("Candidates").Where("class_id = ? AND status = ?", classID, "active").First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *votingRepository) GetSessionByID(id uint) (*models.VotingSession, error) {
	var session models.VotingSession
	err := r.db.Preload("Candidates.Student").Preload("Candidates").First(&session, id).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *votingRepository) UpdateSession(session *models.VotingSession) error {
	return r.db.Save(session).Error
}

func (r *votingRepository) CreateCandidates(candidates []models.VotingCandidate) error {
	return r.db.Create(&candidates).Error
}

func (r *votingRepository) GetCandidatesBySession(sessionID uint) ([]models.VotingCandidate, error) {
	var candidates []models.VotingCandidate
	err := r.db.Preload("Student").Where("voting_session_id = ?", sessionID).Find(&candidates).Error
	return candidates, err
}

func (r *votingRepository) UpdateCandidate(candidate *models.VotingCandidate) error {
	return r.db.Save(candidate).Error
}

func (r *votingRepository) CreateVote(vote *models.Vote) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(vote).Error; err != nil {
			return err
		}
		return tx.Model(&models.VotingCandidate{}).Where("id = ?", vote.CandidateID).UpdateColumn("vote_count", gorm.Expr("vote_count + ?", 1)).Error
	})
}

func (r *votingRepository) HasUserVoted(userID uint, sessionID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.Vote{}).Where("user_id = ? AND voting_session_id = ?", userID, sessionID).Count(&count).Error
	return count > 0, err
}

func (r *votingRepository) GetVotesBySession(sessionID uint) ([]models.Vote, error) {
	var votes []models.Vote
	err := r.db.Where("voting_session_id = ?", sessionID).Find(&votes).Error
	return votes, err
}
