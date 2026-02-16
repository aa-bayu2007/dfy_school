package main

import (
	"backend/config"
	"backend/models"
	"fmt"
	"log"
	"strings"

	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes)
}

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	// Get a default class if none specified
	var defaultClass models.Class
	if err := db.First(&defaultClass).Error; err != nil {
		log.Fatalf("No classes found in database. Please seed classes first: %v", err)
	}

	fmt.Printf("Using default class: %s (ID: %d)\n", defaultClass.Name, defaultClass.ID)

	// Load Excel file
	f, err := excelize.OpenFile("data/siswa.xlsx")
	if err != nil {
		log.Fatalf("Gagal buka file excel: %v", err)
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		log.Fatalf("Gagal baca sheet: %v", err)
	}

	fmt.Println("🌱 Seeding students from Excel...")

	seededCount := 0
	for i, row := range rows {
		// Skip header
		if i == 0 {
			continue
		}

		// Ensure we have enough columns (No, NIS, Name)
		if len(row) < 3 {
			continue
		}

		nis := strings.TrimSpace(row[1])
		name := strings.TrimSpace(row[2])

		if nis == "" || name == "" {
			continue
		}

		email := nis + "@student.com"

		user := models.User{
			Name:     name,
			Email:    email,
			Password: hashPassword(nis), // Default password is NIS
			Role:     "murid",
			ClassID:  &defaultClass.ID,
		}

		// Use FirstOrCreate to avoid duplicates based on Email
		if err := db.Where(models.User{Email: email}).FirstOrCreate(&user).Error; err != nil {
			fmt.Printf("❌ Failed to seed student %s: %v\n", name, err)
			continue
		}

		// Seed/Update Profile
		profile := models.Profile{
			UserID: user.ID,
			NIS:    nis,
		}
		if err := db.Where(models.Profile{UserID: user.ID}).FirstOrCreate(&profile).Error; err != nil {
			fmt.Printf("❌ Failed to seed profile for %s: %v\n", name, err)
		} else {
			fmt.Printf("✅ Seeded: %s (NIS: %s)\n", name, nis)
			seededCount++
		}
	}

	fmt.Printf("\n✅ Student seeding completed! Total: %d students.\n", seededCount)
}
