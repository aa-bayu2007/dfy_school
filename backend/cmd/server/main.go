package main

import (
	"backend/config"
	controllers "backend/controller"
	"backend/models"
	"backend/repositories"
	"backend/routes"
	"backend/services"
	"log"

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
	)

	// Repositories
	userRepo := repositories.NewUserRepository(db)
	masterRepo := repositories.NewMasterRepository(db)
	attendRepo := repositories.NewAttendanceRepository(db)
	requestRepo := repositories.NewRequestRepository(db)

	// Services
	authService := services.NewAuthService(userRepo)
	masterService := services.NewMasterService(masterRepo)
	attendService := services.NewAttendanceService(attendRepo, userRepo, masterRepo)
	reqService := services.NewRequestService(requestRepo, attendRepo, userRepo, masterRepo)

	// Handlers
	authHandler := controllers.NewAuthHandler(authService)
	adminHandler := controllers.NewAdminHandler(masterService, authService)
	attendHandler := controllers.NewAttendanceHandler(attendService)
	reqHandler := controllers.NewRequestHandler(reqService)
	studentHandler := controllers.NewStudentHandler(attendService, authService)
	notifHandler := controllers.NewNotificationHandler()

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

	routes.SetupRoutes(r, authHandler, adminHandler, attendHandler, reqHandler, studentHandler, notifHandler)

	log.Println("Server starting on port 8081")
	r.Run(":8081")
}
