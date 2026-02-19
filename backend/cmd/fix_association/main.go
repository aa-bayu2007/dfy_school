package main

import (
	"backend/config"
	"backend/models"
	"fmt"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	fmt.Println("🛠 Fixing Budi Santoso association...")

	// 1. Find Budi Santoso
	var budi models.User
	db.Where("name = ?", "Budi Santoso").First(&budi)

	// 2. Find XII PPLG 3
	var class models.Class
	db.Where("name = ?", "XII PPLG 3").First(&class)

	if budi.ID == 0 || class.ID == 0 {
		fmt.Printf("Error: Teacher (ID:%d) or Class (ID:%d) not found\n", budi.ID, class.ID)
		return
	}

	// 3. Clear Budi from ANY other classes first
	db.Model(&models.Class{}).Where("teacher_id = ?", budi.ID).Update("teacher_id", nil)
	fmt.Printf("🧹 Cleared %s from previous class assignments\n", budi.Name)

	// 4. Update Target Class to have Teacher ID
	db.Model(&class).Update("teacher_id", budi.ID)
	fmt.Printf("✅ Assigned %s as teacher for %s\n", budi.Name, class.Name)

	// 5. Update User Profile to have Class ID
	db.Model(&budi).Update("class_id", class.ID)
	fmt.Printf("✅ Assigned class_id %d to %s profile\n", class.ID, budi.Name)
}
