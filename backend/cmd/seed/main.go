package main

import (
	"backend/config"
	"log"
)

func main() {
	// Load environment and connect to database
	config.ConnectDatabase()
	db := config.GetDB()

	if db == nil {
		log.Fatal("Failed to connect to database")
	}

	log.Println("Starting database seeding...")
	log.Println("")

	// Run the seed function
	config.SeedData()

	log.Println("")
	log.Println("✅ Seeding completed successfully!")
}
