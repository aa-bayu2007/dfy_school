package main

import (
	"backend/config"
	"backend/models"
	"log"
)

func main() {
	// Load environment and connect to database
	config.ConnectDatabase()
	db := config.GetDB()

	if db == nil {
		log.Fatal("Failed to connect to database")
	}

	log.Println("Starting database migration...")

	// Disable foreign key checks temporarily to handle circular dependencies
	db.Exec("SET FOREIGN_KEY_CHECKS=0")

	// Auto-migrate all models in correct order (respecting foreign key dependencies)
	// 1. Base tables without foreign keys
	err := db.AutoMigrate(
		&models.Role{},
		&models.Permission{},
		&models.Day{},
		&models.TimeSlot{},
	)
	if err != nil {
		log.Fatal("Migration failed (step 1):", err)
	}

	// 2. User and Class (circular dependency, so migrate together)
	err = db.AutoMigrate(
		&models.User{},
		&models.Class{},
		&models.Profile{},
	)
	if err != nil {
		log.Fatal("Migration failed (step 2):", err)
	}

	// 3. Tables that depend on User and Class
	err = db.AutoMigrate(
		&models.Subject{},
	)
	if err != nil {
		log.Fatal("Migration failed (step 3):", err)
	}

	// 4. Tables that depend on multiple other tables
	err = db.AutoMigrate(
		&models.Schedule{},
		&models.Attendance{},
		&models.AttendanceRequest{},
		&models.VotingSession{},
		&models.VotingCandidate{},
		&models.Vote{},
		&models.Notification{},
	)

	if err != nil {
		log.Fatal("Migration failed (step 4):", err)
	}

	// Re-enable foreign key checks
	db.Exec("SET FOREIGN_KEY_CHECKS=1")

	log.Println("✅ Migration completed successfully!")
	log.Println("")
	log.Println("Run seeding with: go run seed.go")
}
