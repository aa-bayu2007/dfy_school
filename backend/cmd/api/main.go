package main

import (
	"backend/config"
	"backend/internal/handlers"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadEnv()
	config.InitLogger()
	config.ConnectDatabase()

	db := config.GetDB()

	r := gin.Default()

	// Setup CORS or other global middlewares here if needed

	handlers.SetupRoutes(r, db)

	log.Println("Server starting on port 8080 (Clean Architecture)")
	r.Run(":8080")
}
