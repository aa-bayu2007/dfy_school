package main

import (
	"backend/config"
	"backend/models"
	"fmt"
	"log"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes)
}

func main() {
	// Initialize database connection
	config.ConnectDatabase()
	db := config.GetDB()

	fmt.Println("🌱 Seeding data for XII PPLG 3...")

	// 1. Ensure Class exists
	class := models.Class{
		Name:    "XII PPLG 3",
		Grade:   "XII",
		Major:   "PPLG",
		Section: "3",
	}
	db.Where("name = ?", class.Name).FirstOrCreate(&class)
	fmt.Printf("✅ Class: %s (ID: %d)\n", class.Name, class.ID)

	// 2. Define Subjects and Teachers
	type SubjectData struct {
		Name string
		Code string
		TeacherName string
		TeacherEmail string
		TeacherNIP string
	}

	subjectsToSeed := []SubjectData{
		{"Pemrograman Web", "WEB-XII-3", "Ahmad Fauzi", "ahmad.fauzi@school.com", "NIP001"},
		{"Basis Data", "DB-XII-3", "Siti Rohmah", "siti.rohmah@school.com", "NIP002"},
		{"Pemrograman Berorientasi Objek", "PBO-XII-3", "Budi Pratama", "budi.pratama@school.com", "NIP003"},
		{"Matematika", "MTK-XII-3", "Dewi Lestari", "dewi.lestari@school.com", "NIP004"},
		{"Bahasa Inggris", "BING-XII-3", "Eko Prasetyo", "eko.prasetyo@school.com", "NIP005"},
		{"Pendidikan Kewarganegaraan", "PKN-XII-3", "Fitriani", "fitriani@school.com", "NIP006"},
		{"Agama", "AGM-XII-3", "Guntur", "guntur@school.com", "NIP007"},
		{"Olahraga", "OR-XII-3", "Hendra", "hendra@school.com", "NIP008"},
	}

	var createdSubjects []models.Subject

	for _, data := range subjectsToSeed {
		// Create Teacher
		teacher := models.User{
			Name:     data.TeacherName,
			Email:    data.TeacherEmail,
			Password: hashPassword("password123"),
			Role:     "guru",
		}
		db.Where("email = ?", teacher.Email).FirstOrCreate(&teacher)
		db.Where(models.Profile{UserID: teacher.ID}).
			Assign(models.Profile{NIP: data.TeacherNIP}).
			FirstOrCreate(&models.Profile{})

		// Create Subject
		subject := models.Subject{
			Name:      data.Name,
			Code:      data.Code,
			TeacherID: &teacher.ID,
		}
		db.Where("code = ?", subject.Code).FirstOrCreate(&subject)
		createdSubjects = append(createdSubjects, subject)
		fmt.Printf("✅ Subject: %s | Teacher: %s\n", subject.Name, teacher.Name)
	}

	// 3. Ensure Time Slots exist (1-6)
	var slots []models.TimeSlot
	db.Find(&slots)
	if len(slots) < 6 {
		log.Fatal("Time slots not fully seeded. Please run main seeder first.")
	}

	// 4. Seed Schedule (Monday to Friday, 6 slots each)
	// We'll rotate subjects to fill the 30 slots (5 days * 6 slots)
	subjectIdx := 0
	for dayID := 1; dayID <= 5; dayID++ {
		for slotIdx := 0; slotIdx < 6; slotIdx++ {
			subject := createdSubjects[subjectIdx%len(createdSubjects)]
			
			schedule := models.Schedule{
				DayID:      dayID,
				TimeSlotID: slots[slotIdx].ID,
				SubjectID:  subject.ID,
				ClassID:    class.ID,
				TeacherID:  subject.TeacherID,
			}
			
			// Use FirstOrCreate with unique fields to avoid duplication
			db.Where(models.Schedule{
				DayID:      dayID,
				TimeSlotID: slots[slotIdx].ID,
				ClassID:    class.ID,
			}).FirstOrCreate(&schedule)
			
			subjectIdx++
		}
	}

	fmt.Println("✅ Successfully seeded full schedule for XII PPLG 3!")
}
