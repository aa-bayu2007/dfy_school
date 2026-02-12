package main

import (
	"backend/config"
	"backend/models"
	"fmt"
	"log"
)

func main() {
	config.LoadEnv()
	config.ConnectDatabase()
	db := config.GetDB()

	if db == nil {
		log.Fatal("DB connection failed")
	}

	var classes []models.Class
	db.Find(&classes)

	var days []models.Day
	db.Where("id BETWEEN 1 AND 5").Order("id").Find(&days)

	var slots []models.TimeSlot
	db.Order("slot_number").Find(&slots)

	var subjects []models.Subject
	db.Find(&subjects)

	var teachers []models.User
	db.Where("role = ?", "guru").Find(&teachers)

	if len(subjects) == 0 || len(teachers) == 0 {
		log.Fatal("Subjects or Teachers not found. Please ensure they are seeded first.")
	}

	fmt.Printf("Starting full seed for %d classes, %d days, %d slots...\n", len(classes), len(days), len(slots))

	subjIdx := 0
	teacherIdx := 0
	createdCount := 0
	skippedCount := 0

	for _, cls := range classes {
		for _, day := range days {
			for _, slot := range slots {
				var existing models.Schedule
				err := db.Where("class_id = ? AND day_id = ? AND time_slot_id = ?", cls.ID, day.ID, slot.ID).First(&existing).Error

				if err != nil { // Not found or error
					subject := subjects[subjIdx%len(subjects)]
					teacher := teachers[teacherIdx%len(teachers)]

					schedule := models.Schedule{
						ClassID:    cls.ID,
						DayID:      day.ID,
						TimeSlotID: slot.ID,
						SubjectID:  subject.ID,
						TeacherID:  &teacher.ID,
					}

					if err := db.Create(&schedule).Error; err != nil {
						fmt.Printf("Error creating schedule for Class %d, Day %d, Slot %d: %v\n", cls.ID, day.ID, slot.ID, err)
					} else {
						createdCount++
					}

					subjIdx++
					teacherIdx++
				} else {
					skippedCount++
				}
			}
		}
	}

	fmt.Printf("\nSeeding completed!\nCreated: %d\nSkipped: %d\n", createdCount, skippedCount)
}
