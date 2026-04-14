package routes

import (
	controllers "backend/controller"
	middlewares "backend/middleware"
	"backend/models"
	"backend/pkg/response"
	"backend/services"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(
	r *gin.Engine,
	authH *controllers.AuthHandler,
	adminH *controllers.AdminHandler,
	attendH *controllers.AttendanceHandler,
	reqH *controllers.RequestHandler,
	studentH *controllers.StudentHandler,
	notifH *controllers.NotificationHandler,
	votingH *controllers.VotingHandler,
	masterS services.MasterService,
	authS services.AuthService,
) {
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", authH.Login)
			auth.POST("/register", authH.Register)
			auth.POST("/refresh", authH.Refresh)
			auth.GET("/me", middlewares.AuthMiddleware(), authH.GetMe)
		}

		protected := api.Group("/")
		protected.Use(middlewares.AuthMiddleware())
		{
			protected.GET("/schedules", adminH.GetSchedules)
			protected.GET("/days", adminH.GetDays)
			protected.GET("/time-slots", adminH.GetTimeSlots)
			protected.GET("/classes", adminH.GetClasses) // Added for guru access with teacher_id filter

			protected.POST("/attendance/scan", attendH.Scan)
			protected.POST("/attendance/manual", attendH.ManualEntry)
			protected.GET("/attendance/history", attendH.GetHistory)
			protected.POST("/attendance/request", reqH.SubmitRequest)
			protected.GET("/attendance/requests", reqH.GetRequests)
			protected.POST("/attendance/requests/:id/approve", reqH.ApproveRequest)
			protected.GET("/attendance/stats", attendH.GetStats)
			protected.GET("/attendance/recap", attendH.GetRecap)

			protected.GET("/student/qrcode", studentH.GetQRCode)
			protected.GET("/notifications", notifH.GetNotifications)
			protected.GET("/notifications/unread-count", notifH.GetUnreadCount)
			protected.PUT("/notifications/:id/read", notifH.MarkRead)

			admin := protected.Group("/admin")
			admin.Use(middlewares.RoleMiddleware("admin"))
			{
				admin.POST("/users/import", adminH.ImportStudents)
				admin.GET("/users", adminH.GetUsers)
				admin.GET("/teachers", adminH.GetTeachers)
				admin.GET("/classes", adminH.GetClasses)
				admin.GET("/subjects", adminH.GetSubjects)
				admin.GET("/schedules", adminH.GetSchedules)
				admin.GET("/time-slots", adminH.GetTimeSlots)
				admin.GET("/days", adminH.GetDays)
				admin.POST("/classes/migrate", adminH.MigrateClassData)
				admin.POST("/classes", adminH.CreateClass)
				admin.PUT("/classes/:id", adminH.UpdateClass)
				admin.DELETE("/classes/:id", adminH.DeleteClass)

				admin.POST("/subjects", adminH.CreateSubject)
				admin.PUT("/subjects/:id", adminH.UpdateSubject)
				admin.DELETE("/subjects/:id", adminH.DeleteSubject)

				admin.POST("/schedules", adminH.CreateSchedule)
				admin.PUT("/schedules/:id", adminH.UpdateSchedule)
				admin.DELETE("/schedules/:id", adminH.DeleteSchedule)
				admin.DELETE("/schedules", adminH.ResetSchedules)

				admin.POST("/users", adminH.CreateUser)
				admin.DELETE("/users/bulk", adminH.BulkDeleteUsers)
				admin.PATCH("/users/bulk", adminH.BulkUpdateUsers)
				admin.PUT("/users/:id/role", adminH.UpdateUserRole)
				admin.PUT("/users/:id/class", adminH.UpdateUserClass)
			}

			voting := protected.Group("/voting")
			{
				voting.GET("/active", votingH.GetActiveSession)
				voting.POST("/vote", votingH.CastVote)
				voting.GET("/results/:id", votingH.GetSessionResults)

				// Wali Kelas only routes
				waliGroup := voting.Group("/")
				waliGroup.Use(middlewares.RoleMiddleware("guru"))
				{
					waliGroup.POST("/session", votingH.CreateSession)
					waliGroup.POST("/finish/:id", votingH.FinishSession)
					waliGroup.POST("/demote", votingH.DemoteKetuaKelas)
					waliGroup.GET("/vote-log", votingH.GetVoteLog)
				}

				// Shared route for Guru and Ketua Kelas
				voting.GET("/students", func(c *gin.Context) {
					// Filter students by class for Wali Kelas OR for Ketua Kelas
					u, _ := c.Get("user_id")
					var currentUserID uint
					switch v := u.(type) {
					case float64:
						currentUserID = uint(v)
					case uint:
						currentUserID = v
					}

					// We need to know the role to decide how to fetch students
					// AuthService is available as authS
					user, err := authS.GetMe(currentUserID)
					if err != nil {
						c.JSON(http.StatusUnauthorized, response.Error("User not found"))
						return
					}

					log.Printf("[VotingStudents] UserID: %d, Role: %s", currentUserID, user.Role)

					// Allow admin, guru, ketua_kelas
					if user.Role != "admin" && user.Role != "guru" && user.Role != "teacher" && user.Role != "ketua_kelas" {
						c.JSON(http.StatusForbidden, response.Error("Unauthorized access"))
						return
					}

					// Check if class_id is passed as query param (admin/override)
					queryClassID := c.Query("class_id")
					var classID uint
					if queryClassID != "" {
						parsedID, _ := strconv.ParseUint(queryClassID, 10, 32)
						classID = uint(parsedID)
					}

					if classID == 0 {
						if user.Role == "guru" || user.Role == "teacher" {
							// For Guru: Fetch classes to get class ID from teacher association
							classes, err := masterS.GetClassesByTeacher(currentUserID)
							if err != nil {
								log.Printf("[VotingStudents] Error GetClassesByTeacher: %v", err)
							}

							log.Printf("[VotingStudents] Found %d classes for teacher %d", len(classes), currentUserID)

							if len(classes) == 0 {
								// Try checking if guru has ClassID directly assigned (some implementations use this)
								if user.ClassID != nil {
									classID = *user.ClassID
								} else {
									c.JSON(http.StatusOK, response.Success([]models.User{}))
									return
								}
							} else {
								classID = classes[0].ID
							}
						} else if user.Role == "ketua_kelas" {
							// For Ketua Kelas: Must have ClassID
							if user.ClassID == nil {
								c.JSON(http.StatusBadRequest, response.Error("Ketua Kelas has no class assigned"))
								return
							}
							classID = *user.ClassID
						} else if user.Role == "admin" {
							// Admin without query param? Return empty or error?
							// Let's return error to be specific
							c.JSON(http.StatusBadRequest, response.Error("class_id required for admin"))
							return
						}
					}

					log.Printf("[VotingStudents] Using ClassID: %d", classID)

					students, err := authS.GetStudentsByClass(classID)
					if err != nil {
						log.Printf("[VotingStudents] Error GetStudentsByClass: %v", err)
						c.JSON(http.StatusInternalServerError, response.Error("Failed to fetch students"))
						return
					}
					log.Printf("[VotingStudents] Successfully found %d students for class %d", len(students), classID)

					c.JSON(http.StatusOK, response.Success(students))
				})
			}
		}
	}
}
