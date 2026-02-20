package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Helper to get environment variable with a fallback key
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	if value, exists := os.LookupEnv(fallback); exists {
		return value
	}
	return ""
}

func ConnectDatabase() {
	// Load environment variables if not already loaded
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	dbUser := getEnv("DB_USER", "MYSQLUSER")
	dbPass := getEnv("DB_PASSWORD", "MYSQLPASSWORD")
	dbHost := getEnv("DB_HOST", "MYSQLHOST")
	dbPort := getEnv("DB_PORT", "MYSQLPORT")
	dbName := getEnv("DB_NAME", "MYSQLDATABASE")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser,
		dbPass,
		dbHost,
		dbPort,
		dbName,
	)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	fmt.Println("Database connected!")
}

func GetDB() *gorm.DB {
	return DB
}
