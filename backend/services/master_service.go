package services

import (
	"backend/models"
	"backend/repositories"
	"fmt"
	"strings"
)

type MasterService interface {
	// Class
	CreateClass(grade string, major string, section string, teacherID *uint) error
	UpdateClass(classID uint, grade string, major string, section string, teacherID *uint) error
	DeleteClass(classID uint) error
	GetAllClasses() ([]models.Class, error)
	GetClassesByTeacher(teacherID uint) ([]models.Class, error)
	FindClassByID(id uint) (*models.Class, error) // Added FindClassByID to interface if missing

	// Subject
	CreateSubject(name string, code string, teacherID *uint) error
	UpdateSubject(subjectID uint, name string, code string, teacherID *uint) error
	DeleteSubject(subjectID uint) error
	GetAllSubjects() ([]models.Subject, error)

	// Schedule
	CreateSchedule(classID uint, subjectID uint, dayID int, timeSlotID uint, teacherID uint) error
	UpdateSchedule(scheduleID uint, classID uint, subjectID uint, dayID int, timeSlotID uint, teacherID uint) error
	DeleteSchedule(scheduleID uint) error
	GetSchedules(classID string, teacherID string) ([]models.Schedule, error)

	GetDays() ([]models.Day, error)
	GetAllTimeSlots() ([]models.TimeSlot, error)
	ResetSchedules() error
	MigrateClassData() error
}

type masterService struct {
	repo repositories.MasterRepository
}

func NewMasterService(repo repositories.MasterRepository) MasterService {
	return &masterService{repo}
}

func (s *masterService) CreateClass(grade string, major string, section string, teacherID *uint) error {
	name := fmt.Sprintf("%s %s %s", grade, major, section)
	class := models.Class{Name: name, Grade: grade, Major: major, Section: section, TeacherID: teacherID}
	return s.repo.CreateClass(&class)
}

func (s *masterService) GetAllClasses() ([]models.Class, error) {
	return s.repo.GetAllClasses()
}

func (s *masterService) GetClassesByTeacher(teacherID uint) ([]models.Class, error) {
	return s.repo.GetClassesByTeacher(teacherID)
}

func (s *masterService) CreateSubject(name string, code string, teacherID *uint) error {
	subject := models.Subject{Name: name, Code: code, TeacherID: teacherID}
	return s.repo.CreateSubject(&subject)
}

func (s *masterService) GetAllSubjects() ([]models.Subject, error) {
	return s.repo.GetAllSubjects()
}

func (s *masterService) CreateSchedule(classID uint, subjectID uint, dayID int, timeSlotID uint, teacherID uint) error {
	schedule := models.Schedule{
		ClassID:    classID,
		SubjectID:  subjectID,
		DayID:      dayID,
		TimeSlotID: timeSlotID,
		TeacherID:  &teacherID,
	}
	return s.repo.CreateSchedule(&schedule)
}

func (s *masterService) GetSchedules(classID string, teacherID string) ([]models.Schedule, error) {
	return s.repo.GetSchedules(classID, teacherID, 0)
}

func (s *masterService) GetDays() ([]models.Day, error) {
	return s.repo.GetAllDays()
}

func (s *masterService) GetAllTimeSlots() ([]models.TimeSlot, error) {
	return s.repo.GetAllTimeSlots()
}

// Update implementations
func (s *masterService) UpdateClass(classID uint, grade string, major string, section string, teacherID *uint) error {
	name := fmt.Sprintf("%s %s %s", grade, major, section)
	return s.repo.UpdateClass(classID, name, grade, major, section, teacherID)
}

func (s *masterService) UpdateSubject(subjectID uint, name string, code string, teacherID *uint) error {
	return s.repo.UpdateSubject(subjectID, name, code, teacherID)
}

func (s *masterService) UpdateSchedule(scheduleID uint, classID uint, subjectID uint, dayID int, timeSlotID uint, teacherID uint) error {
	schedule := models.Schedule{
		ClassID:    classID,
		SubjectID:  subjectID,
		DayID:      dayID,
		TimeSlotID: timeSlotID,
		TeacherID:  &teacherID,
	}
	return s.repo.UpdateSchedule(scheduleID, &schedule)
}

// Delete implementations
func (s *masterService) DeleteClass(classID uint) error {
	return s.repo.DeleteClass(classID)
}

func (s *masterService) DeleteSubject(subjectID uint) error {
	return s.repo.DeleteSubject(subjectID)
}

func (s *masterService) DeleteSchedule(scheduleID uint) error {
	return s.repo.DeleteSchedule(scheduleID)
}

func (s *masterService) FindClassByID(id uint) (*models.Class, error) {
	return s.repo.FindClassByID(id)
}

func (s *masterService) ResetSchedules() error {
	return s.repo.ResetSchedules()
}

func (s *masterService) MigrateClassData() error {
	classes, err := s.repo.GetAllClasses()
	if err != nil {
		return err
	}

	for _, class := range classes {
		// Simple logic: if Major or Section is empty, try to parse from Name
		if class.Major == "" || class.Section == "" {
			parts := strings.Split(class.Name, " ")
			if len(parts) >= 3 {
				// Assuming format: "X PPLG 1" -> Grade="X", Major="PPLG", Section="1"
				// Or "XII DKV 2" -> Grade="XII", Major="DKV", Section="2"
				grade := parts[0]
				major := parts[1]
				section := strings.Join(parts[2:], " ") // Section might be "1" or "2" or "A"

				// Update using existing repo method (which also re-generates name, ensuring consistency)
				err := s.repo.UpdateClass(class.ID, class.Name, grade, major, section, class.TeacherID)
				if err != nil {
					fmt.Printf("Failed to migrate class %d: %v\n", class.ID, err)
				}
			}
		}
	}
	return nil
}
