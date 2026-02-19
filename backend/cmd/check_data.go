package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	fmt.Println("=== Teachers and their Classes ===")
	var teachers []models.User
	db.Where("role = ?", "guru").Preload("Profile").Find(&teachers)

	for _, t := range teachers {
		var classes []models.Class
		db.Where("teacher_id = ?", t.ID).Find(&classes)
		
		classNames := []string{}
		for _, c := range classes {
			classNames = append(classNames, c.Name)
		}
		
		fmt.Printf("Teacher: %s (ID: %d) | Wali Kelas: %v\n", t.Name, t.ID, classNames)
	}

	fmt.Println("\n=== Recent Schedules with Teachers ===")
	var schedules []models.Schedule
	db.Preload("Class").Preload("Subject").Preload("Teacher").Order("id desc").Limit(20).Find(&schedules)

	for _, s := range schedules {
		teacherName := "Unknown"
		if s.Teacher != nil {
			teacherName = s.Teacher.Name
		}
		fmt.Printf("[%d] Class: %s | Subject: %s | Teacher: %s (ID: %v)\n", 
			s.ID, s.Class.Name, s.Subject.Name, teacherName, s.TeacherID)
	}
}
