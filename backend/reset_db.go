package main

import (
	"backend/config"
	"backend/models"
	"fmt"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect to database to drop and recreate
	config.ConnectDatabase()
	db := config.GetDB()

	fmt.Println("💥 Dropping and recreating database...")
	db.Exec("DROP DATABASE IF EXISTS school_system")
	db.Exec("CREATE DATABASE school_system")
	db.Exec("USE school_system")

	// Reconnect to the new database
	config.ConnectDatabase()
	db = config.GetDB()

	fmt.Println("\n🔨 Creating tables...")

	// Auto migrate all models
	modelsToMigrate := []interface{}{
		&models.Permission{},
		&models.Role{},
		&models.Class{},
		&models.User{},
		&models.Profile{},
		&models.Subject{},
		&models.Schedule{},
		&models.Day{},
		&models.TimeSlot{},
		&models.Attendance{},
		&models.AttendanceRequest{},
		&models.Notification{},
		&models.DailyQRCode{},
	}

	// Disable FK checks to handle circular dependencies
	db.Exec("SET FOREIGN_KEY_CHECKS = 0")

	for _, m := range modelsToMigrate {
		if err := db.AutoMigrate(m); err != nil {
			log.Fatalf("❌ Failed to migrate model %T: %v", m, err)
		}
	}

	fmt.Println("✅ All tables created!")

	fmt.Println("\n🌱 Seeding data...")
	config.SeedData()

	// Re-enable FK checks
	db.Exec("SET FOREIGN_KEY_CHECKS = 1")

	fmt.Println("\n✅ Database reset and seeded successfully!")
	fmt.Println("\n📝 Default accounts created:")
	fmt.Println("   Admin: admin@school.com / password")
	fmt.Println("   Guru: budi@school.com / password")
	fmt.Println("\n⚠️  Please login with new credentials!")
}
