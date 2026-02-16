package services

import (
	"backend/models"
	"backend/repositories"
	"errors"
	"time"
)

type VotingService interface {
	CreateSession(classID uint, teacherID uint, studentIDs []uint, durationMinutes int, tenureDays int) error
	GetActiveSessionByClass(classID uint) (*models.VotingSession, error)
	CastVote(userID uint, sessionID uint, candidateID uint) error
	FinishSession(sessionID uint) (*models.User, error)
	GetSessionByID(sessionID uint) (*models.VotingSession, error)
	DemoteKetuaKelas(classID uint, teacherID uint) error
}

type votingService struct {
	votingRepo   repositories.VotingRepository
	userRepo     repositories.UserRepository
	notifService NotificationService
}

func NewVotingService(votingRepo repositories.VotingRepository, userRepo repositories.UserRepository, notifService NotificationService) VotingService {
	return &votingService{votingRepo, userRepo, notifService}
}

func (s *votingService) CreateSession(classID uint, teacherID uint, studentIDs []uint, durationMinutes int, tenureDays int) error {
	// 1. Check if there's already a Ketua Kelas in this class
	var existingKM models.User
	err := s.userRepo.GetDB().Where("class_id = ? AND role = ?", classID, "ketua_kelas").First(&existingKM).Error
	if err == nil {
		// If KM exists, check if their tenure has expired (extra safety)
		if existingKM.TenureEndsAt != nil && time.Now().After(*existingKM.TenureEndsAt) {
			// Auto demote if expired
			_ = s.DemoteKetuaKelas(classID, teacherID)
		} else {
			return errors.New("kelas ini sudah memiliki Ketua Kelas. Silakan cabut jabatan terlebih dahulu")
		}
	}

	// 2. Check if there's already an active session
	existing, _ := s.votingRepo.GetActiveSessionByClass(classID)
	if existing != nil {
		return errors.New("kelas ini sudah memiliki sesi voting yang aktif")
	}

	expiresAt := time.Now().Add(time.Duration(durationMinutes) * time.Minute)

	session := models.VotingSession{
		ClassID:    classID,
		TeacherID:  teacherID,
		Status:     "active",
		ExpiresAt:  &expiresAt,
		TenureDays: tenureDays,
	}

	if err := s.votingRepo.CreateSession(&session); err != nil {
		return err
	}

	var candidates []models.VotingCandidate
	for _, sid := range studentIDs {
		candidates = append(candidates, models.VotingCandidate{
			VotingSessionID: session.ID,
			StudentID:       sid,
		})
	}

	return s.votingRepo.CreateCandidates(candidates)
}

func (s *votingService) GetActiveSessionByClass(classID uint) (*models.VotingSession, error) {
	session, err := s.votingRepo.GetActiveSessionByClass(classID)

	// If active session found, check for expiry
	if err == nil && session != nil {
		if session.Status == "active" && session.ExpiresAt != nil && time.Now().After(*session.ExpiresAt) {
			_, _ = s.FinishSession(session.ID)
			return s.votingRepo.GetSessionByID(session.ID)
		}
		return session, nil
	}

	// If no active session, return the latest finished session if any
	var latestFinished models.VotingSession
	err = s.userRepo.GetDB().Preload("Candidates.Student").Preload("Candidates").
		Where("class_id = ? AND status = ?", classID, "finished").
		Order("created_at desc").First(&latestFinished).Error

	if err == nil {
		// Verify if the winner is still a Ketua Kelas
		if latestFinished.WinnerID != nil {
			var winner models.User
			if s.userRepo.GetDB().First(&winner, *latestFinished.WinnerID).Error == nil {
				if winner.Role != "ketua_kelas" {
					return nil, errors.New("tidak ada sesi voting aktif (pemenang sebelumnya telah dicabut jabatannya)")
				}
				// Check for tenure expiry
				if winner.TenureEndsAt != nil && time.Now().After(*winner.TenureEndsAt) {
					// Auto demote
					_ = s.DemoteKetuaKelas(classID, latestFinished.TeacherID)
					return nil, errors.New("masa jabatan ketua kelas telah berakhir")
				}
			}
		}
		return &latestFinished, nil
	}

	return nil, errors.New("tidak ada sesi voting")
}

func (s *votingService) CastVote(userID uint, sessionID uint, candidateID uint) error {
	// Check if user has already voted
	voted, err := s.votingRepo.HasUserVoted(userID, sessionID)
	if err != nil {
		return err
	}
	if voted {
		return errors.New("anda sudah memberikan suara")
	}

	vote := models.Vote{
		VotingSessionID: sessionID,
		UserID:          userID,
		CandidateID:     candidateID,
	}

	if err := s.votingRepo.CreateVote(&vote); err != nil {
		return err
	}

	// Fetch student and session for notification details
	student, _ := s.userRepo.FindByID(userID)
	session, _ := s.votingRepo.GetSessionByID(sessionID)

	if student != nil && session != nil {
		// 1. Notify Student (Confirmation)
		s.notifService.NotifyUser(userID, "Vote Berhasil", "Terima kasih, suara Anda telah berhasil diterima.")

		// 2. Notify Wali Kelas (Progress)
		s.notifService.NotifyUser(session.TeacherID, "Seseorang Telah Memilih", student.Name+" telah memberikan suara dalam pemilihan Ketua Kelas.")
	}

	return nil
}

func (s *votingService) FinishSession(sessionID uint) (*models.User, error) {
	session, err := s.votingRepo.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}

	if session.Status != "active" {
		return nil, errors.New("sesi voting sudah tidak aktif")
	}

	// Find the winner
	var winner *models.VotingCandidate
	maxVotes := -1

	for i := range session.Candidates {
		if session.Candidates[i].VoteCount > maxVotes {
			maxVotes = session.Candidates[i].VoteCount
			winner = &session.Candidates[i]
		}
	}

	if winner == nil {
		return nil, errors.New("tidak ada kandidat dalam sesi ini")
	}

	// Update session status and winner
	session.Status = "finished"
	session.WinnerID = &winner.StudentID
	if err := s.votingRepo.UpdateSession(session); err != nil {
		return nil, err
	}

	// Automatically promote winner to ketua_kelas
	user, err := s.userRepo.FindByID(winner.StudentID)
	if err != nil {
		return nil, err
	}

	user.Role = "ketua_kelas"
	if session.TenureDays > 0 {
		endsAt := time.Now().AddDate(0, 0, session.TenureDays)
		user.TenureEndsAt = &endsAt
	}

	if err := s.userRepo.GetDB().Save(user).Error; err != nil {
		return nil, err
	}

	// 1. Notify students in the same class
	students, _ := s.userRepo.GetStudentsByClass(session.ClassID)
	var studentIDs []uint
	for _, student := range students {
		if student.ID != user.ID { // Don't notify the winner themselves yet, or maybe notify everyone
			studentIDs = append(studentIDs, student.ID)
		}
	}
	s.notifService.NotifyUsers(studentIDs, "Ketua Kelas Baru!", "Selamat! "+user.Name+" telah terpilih menjadi Ketua Kelas.")

	// 2. Notify the winner
	s.notifService.NotifyUser(user.ID, "Anda Terpilih!", "Selamat! Anda telah terpilih menjadi Ketua Kelas.")

	// 3. Notify Admins
	var admins []models.User
	s.userRepo.GetDB().Where("role = ?", "admin").Find(&admins)
	var adminIDs []uint
	for _, admin := range admins {
		adminIDs = append(adminIDs, admin.ID)
	}
	s.notifService.NotifyUsers(adminIDs, "Pemilihan Selesai", "Pemilihan Ketua Kelas di "+session.Class.Name+" telah selesai. Pemenang: "+user.Name)

	return user, nil
}

func (s *votingService) GetSessionByID(sessionID uint) (*models.VotingSession, error) {
	return s.votingRepo.GetSessionByID(sessionID)
}

func (s *votingService) DemoteKetuaKelas(classID uint, teacherID uint) error {
	var km models.User
	if err := s.userRepo.GetDB().Where("class_id = ? AND role = ?", classID, "ketua_kelas").First(&km).Error; err != nil {
		return errors.New("tidak ada Ketua Kelas yang ditemukan di kelas ini")
	}

	km.Role = "murid"
	if err := s.userRepo.GetDB().Save(&km).Error; err != nil {
		return err
	}

	// Notify them
	s.notifService.NotifyUser(km.ID, "Jabatan Dicabut", "Jabatan Ketua Kelas Anda telah dicabut oleh Wali Kelas.")
	s.notifService.NotifyUser(teacherID, "Berhasil Mencabut Jabatan", "Jabatan Ketua Kelas "+km.Name+" telah berhasil dicabut.")

	return nil
}
