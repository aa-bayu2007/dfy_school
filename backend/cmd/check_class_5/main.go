package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	var students []models.User
	// Explicitly check role "murid" AND class_id 5
	db.Where("class_id = 5").Find(&students)
	fmt.Printf("Total users in Class 5: %d\n", len(students))
	
	for i, s := range students {
		if i < 5 {
			fmt.Printf("- %s (Role: %s, ClassID: %v)\n", s.Name, s.Role, s.ClassID)
		}
	}

	// Check if Class 5 even exists
	var cls models.Class
	db.First(&cls, 5)
	fmt.Printf("\nClass 5: %s (TeacherID: %v)\n", cls.Name, cls.TeacherID)
}
