package main

import (
	"backend/config"
	controllers "backend/controller"
	"backend/models"
	"backend/repositories"
	"backend/routes"
	"backend/services"
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	config.ConnectDatabase()
	db := config.GetDB()

	// Auto Migration
	log.Println("Migrating database schema...")
	db.AutoMigrate(
		&models.Role{},
		&models.Permission{},
		&models.Day{},
		&models.TimeSlot{},
		&models.User{},
		&models.Class{},
		&models.Profile{},
		&models.Subject{},
		&models.Schedule{},
		&models.Attendance{},
		&models.AttendanceRequest{},
		&models.DailyQRCode{},
		&models.VotingSession{},
		&models.VotingCandidate{},
		&models.Vote{},
	)

	// Check if seeding is needed (e.g., if no roles exist)
	var roleCount int64
	db.Model(&models.Role{}).Count(&roleCount)
	if roleCount == 0 {
		log.Println("Database appears empty. Seeding initial data...")
		config.SeedData()
	}

	// Repositories
	userRepo := repositories.NewUserRepository(db)
	masterRepo := repositories.NewMasterRepository(db)
	attendRepo := repositories.NewAttendanceRepository(db)
	requestRepo := repositories.NewRequestRepository(db)
	votingRepo := repositories.NewVotingRepository(db)
	notifRepo := repositories.NewNotificationRepository(db)

	// Services
	authService := services.NewAuthService(userRepo)
	masterService := services.NewMasterService(masterRepo, userRepo)
	attendService := services.NewAttendanceService(attendRepo, userRepo, masterRepo)
	notifService := services.NewNotificationService(notifRepo)
	reqService := services.NewRequestService(requestRepo, attendRepo, userRepo, masterRepo, notifService)
	votingService := services.NewVotingService(votingRepo, userRepo, notifService)

	// Handlers
	authHandler := controllers.NewAuthHandler(authService)
	adminHandler := controllers.NewAdminHandler(masterService, authService)
	attendHandler := controllers.NewAttendanceHandler(attendService)
	reqHandler := controllers.NewRequestHandler(reqService)
	studentHandler := controllers.NewStudentHandler(attendService, authService)
	notifHandler := controllers.NewNotificationHandler(notifService)
	votingHandler := controllers.NewVotingHandler(votingService, authService)

	r := gin.Default()

	// CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	routes.SetupRoutes(r, authHandler, adminHandler, attendHandler, reqHandler, studentHandler, notifHandler, votingHandler, masterService, authService)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	log.Println("Server starting on port " + port)
	r.Run(":" + port)

}
