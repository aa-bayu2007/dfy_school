package main

import (
	"backend/config"
	"backend/models"
	"fmt"
	"log"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	var attendances []models.Attendance
	if err := db.Find(&attendances).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d attendance records to check\n", len(attendances))

	updatedCount := 0
	for _, att := range attendances {
		if att.ClassID != 0 {
			continue
		}

		var user models.User
		if err := db.First(&user, att.StudentID).Error; err == nil {
			if user.ClassID != nil {
				db.Model(&att).Update("class_id", *user.ClassID)
				updatedCount++
			}
		}
	}

	fmt.Printf("Backfill complete. Updated %d records.\n", updatedCount)
}
