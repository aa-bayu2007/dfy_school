package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	var budi models.User
	db.Where("name = ?", "Budi Santoso").First(&budi)

	if budi.ID == 0 {
		fmt.Println("Budi Santoso not found")
		return
	}

	fmt.Printf("Schedules for %s (ID: %d):\n", budi.Name, budi.ID)

	var schedules []models.Schedule
	db.Preload("Class").Preload("Subject").Preload("Day").Preload("TimeSlot").Where("teacher_id = ?", budi.ID).Find(&schedules)

	for _, s := range schedules {
		fmt.Printf("[%s] %s - %s (Jam: %s)\n", 
			s.Day.Name, 
			s.Class.Name, 
			s.Subject.Name, 
			fmt.Sprintf("%s-%s", s.TimeSlot.StartTime, s.TimeSlot.EndTime))
	}
}
