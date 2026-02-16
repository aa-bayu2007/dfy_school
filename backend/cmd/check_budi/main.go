package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	var users []models.User
	db.Where("name = ?", "Budi Santoso").Find(&users)
	fmt.Printf("Found %d users with name Budi Santoso\n", len(users))
	for _, u := range users {
		fmt.Printf("- ID: %d, Email: %s, Role: %s, ClassID: %v\n", u.ID, u.Email, u.Role, u.ClassID)
	}

	var classes []models.Class
	db.Where("id = 5").Find(&classes)
	for _, c := range classes {
		fmt.Printf("- Class 5: %s, TeacherID: %v\n", c.Name, c.TeacherID)
	}
}
