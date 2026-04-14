package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	var class models.Class
	if err := db.Preload("Teacher").Where("name = ?", "XII PPLG 3").First(&class).Error; err != nil {
		fmt.Println("Error finding class:", err)
		return
	}

	fmt.Printf("Class: %s (ID: %d)\n", class.Name, class.ID)
	if class.Teacher != nil {
		fmt.Printf("Wali Kelas: %s (ID: %d, Email: %s)\n", class.Teacher.Name, class.Teacher.ID, class.Teacher.Email)
	} else {
		fmt.Println("Wali Kelas: NOT ASSIGNED")
	}

	var schedules []models.Schedule
	db.Where("class_id = ?", class.ID).Find(&schedules)
	fmt.Printf("Total Schedule Slots: %d\n", len(schedules))
}
