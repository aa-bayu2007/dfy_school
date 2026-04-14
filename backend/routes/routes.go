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
					waliGroup.GET("/students", func(c *gin.Context) {
						// Filter students by class for Wali Kelas
						u, _ := c.Get("user_id")
						var teacherID uint
						switch v := u.(type) {
						case float64:
							teacherID = uint(v)
						case uint:
							teacherID = v
						}

						log.Printf("[VotingStudents] TeacherID: %d (Raw type: %T)", teacherID, u)

						// Check if class_id is passed as query param (fallback)
						queryClassID := c.Query("class_id")
						var classID uint
						if queryClassID != "" {
							parsedID, _ := strconv.ParseUint(queryClassID, 10, 32)
							classID = uint(parsedID)
						}

						if classID == 0 {
							// Fetch classes to get class ID from teacher association
							classes, err := masterS.GetClassesByTeacher(teacherID)
							if err != nil {
								log.Printf("[VotingStudents] Error GetClassesByTeacher: %v", err)
							}

							log.Printf("[VotingStudents] Found %d classes for teacher %d", len(classes), teacherID)

							if len(classes) == 0 {
								c.JSON(http.StatusOK, response.Success([]models.User{}))
								return
							}
							classID = classes[0].ID
						}

						log.Printf("[VotingStudents] Using ClassID: %d", classID)

						students, err := authS.GetStudentsByClass(classID)
						if err != nil {
							log.Printf("[VotingStudents] Error GetStudentsByClass: %v", err)
						}
						log.Printf("[VotingStudents] Successfully found %d students for class %d", len(students), classID)

						c.JSON(http.StatusOK, response.Success(students))
					})
				}
			}
		}
	}
}
