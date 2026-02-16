package main

import (
	"backend/config"
	"backend/models"
	"backend/repositories"
	"backend/services"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	// Mimic path 1: Find Budi Santoso ID
	var budi models.User
	db.Where("name = ?", "Budi Santoso").First(&budi)
	teacherID := budi.ID
	fmt.Printf("Simulating for Teacher: %s (ID: %d)\n", budi.Name, teacherID)

	// Mimic path 2: Setup services
	userRepo := repositories.NewUserRepository(db)
	masterRepo := repositories.NewMasterRepository(db)
	authS := services.NewAuthService(userRepo)
	masterS := services.NewMasterService(masterRepo)

	// Mimic logic in routes.go
	classes, err := masterS.GetClassesByTeacher(teacherID)
	if err != nil {
		fmt.Printf("Error GetClassesByTeacher: %v\n", err)
	}
	fmt.Printf("Found %d classes for teacher\n", len(classes))
	for _, cls := range classes {
		fmt.Printf("- Class ID: %d, Name: %s, TeacherID: %v\n", cls.ID, cls.Name, cls.TeacherID)
	}

	if len(classes) > 0 {
		classID := classes[0].ID
		
		// Debug: check all users in this class regardless of role
		var allInClass []models.User
		db.Where("class_id = ?", classID).Find(&allInClass)
		fmt.Printf("\nTotal users (any role) in Class %d: %d\n", classID, len(allInClass))
		for i, u := range allInClass {
			if i < 5 {
				fmt.Printf("  - User: %s, Role: [%s], ClassID: %v\n", u.Name, u.Role, u.ClassID)
			}
		}

		students, err := authS.GetStudentsByClass(classID)
		if err != nil {
			fmt.Printf("Error GetStudentsByClass: %v\n", err)
		}
		fmt.Printf("\nFound %d students (role='murid') for Class ID %d\n", len(students), classID)
	}
}
