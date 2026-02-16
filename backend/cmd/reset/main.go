package main

import (
	"backend/config"
	"fmt"
	"log"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	fmt.Println("⚠️  Resetting database...")

	// Disable foreign key checks to drop tables with dependencies
	db.Exec("SET FOREIGN_KEY_CHECKS = 0")

	// Get all table names
	var tables []string
	db.Raw("SHOW TABLES").Scan(&tables)

	for _, table := range tables {
		fmt.Printf("Dropping table: %s\n", table)
		if err := db.Exec(fmt.Sprintf("DROP TABLE %s", table)).Error; err != nil {
			log.Printf("Failed to drop table %s: %v", table, err)
		}
	}

	db.Exec("SET FOREIGN_KEY_CHECKS = 1")
	fmt.Println("✅ Database reset completed!")
}
