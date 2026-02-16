package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	// 1. Check Budi Santoso
	var budi models.User
	db.Preload("Class").Where("name = ?", "Budi Santoso").First(&budi)
	fmt.Printf("Teacher: %s (ID: %d), Class ID: %v\n", budi.Name, budi.ID, budi.ClassID)
	if budi.ClassID != nil {
		fmt.Printf("Assigned Class: %s\n", budi.Class.Name)
	}

	// 2. Check all classes and their teacher IDs
	var classes []models.Class
	db.Find(&classes)
	fmt.Println("\nClasses in DB:")
	for _, c := range classes {
		fmt.Printf("- Class: %s (ID: %d), Teacher ID: %v\n", c.Name, c.ID, c.TeacherID)
	}

	// 3. Check student counts per class
	type Result struct {
		ClassID uint
		Name    string
		Count   int64
	}
	var results []Result
	db.Table("users").
		Select("users.class_id, classes.name, count(*) as count").
		Joins("join classes on classes.id = users.class_id").
		Where("role = ?", "murid").
		Group("users.class_id, classes.name").
		Scan(&results)

	fmt.Println("\nStudent counts per class:")
	for _, r := range results {
		fmt.Printf("- %s (ID: %d): %d students\n", r.Name, r.ClassID, r.Count)
	}
}
