package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"clinic-system/backend/config"
	"clinic-system/backend/db"
	"clinic-system/backend/handlers"
	"clinic-system/backend/middleware"
	"clinic-system/backend/services"
)

func main() {
	cfg := config.Load()

	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	openaiService := services.NewOpenAIService(cfg.OpenAIKey)

	authHandler     := handlers.NewAuthHandler(database)
	patientHandler  := handlers.NewPatientHandler(database)
	visitHandler    := handlers.NewVisitHandler(database, openaiService)
	billingHandler  := handlers.NewBillingHandler(database)
	accuracyHandler := handlers.NewAccuracyHandler(database)
	userHandler		:= handlers.NewUserHandler(database)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")

	// ── Public ─────────────────────────────────────
	api.POST("/auth/login", authHandler.Login)

	// ── Protected ──────────────────────────────────
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// Auth
		protected.GET("auth/me", authHandler.GetMe)

		// ── Patients ──
		protected.GET("patients",     patientHandler.GetAllPatients)
		protected.GET("patients/:id", patientHandler.GetPatient)
		protected.POST("patients",
			middleware.RequireRole("staff", "admin"),
			patientHandler.CreatePatient,
		)

		// ── Visits ──
		// IMPORTANT: static routes must come BEFORE param routes
		// visits/parse, visits/all, visits/unconfirmed must be
		// registered before visits/:id otherwise Gin matches "all"
		// as the :id param

		// Static visit routes first
		protected.POST("visits/parse",
			middleware.RequireRole("doctor", "admin"),
			visitHandler.ParseAndSaveVisit,
		)
		protected.GET("visits/all",
			middleware.RequireRole("admin"),
			visitHandler.GetAllVisits,
		)
		protected.GET("visits/unconfirmed",
			middleware.RequireRole("staff", "admin"),
			visitHandler.GetUnconfirmedVisits,
		)

		// Param routes after
		protected.GET("visits/:id",          visitHandler.GetVisit)
		protected.POST("visits/:id/confirm",
			middleware.RequireRole("doctor", "admin"),
			visitHandler.ConfirmVisit,
		)

		// Patient visits
		protected.GET("patients/:id/visits", visitHandler.GetPatientVisits)

		// ── Billing ──
		protected.GET("billing/:visit_id", billingHandler.GetBilling)
		protected.POST("billing/:visit_id/pay",
			middleware.RequireRole("staff", "admin"),
			billingHandler.MarkAsPaid,
		)

		// ── Accuracy ──
		protected.GET("accuracy/stats",
			middleware.RequireRole("doctor", "admin"),
			accuracyHandler.GetAccuracyStats,
		)
		protected.GET("accuracy/prf",
			middleware.RequireRole("doctor", "admin"),
			accuracyHandler.GetPRFStats,
		)
		protected.GET("accuracy/confidence",
			middleware.RequireRole("doctor", "admin"),
			accuracyHandler.GetConfidenceStats,
		)

		// user creation and management routes — admin only
		protected.GET("users",
			middleware.RequireRole("admin"),
			userHandler.GetUsers,
		)
		protected.POST("users",
			middleware.RequireRole("admin"),
			userHandler.CreateUser,
		)
		protected.PUT("users/:id/toggle",
			middleware.RequireRole("admin"),
			userHandler.ToggleUserStatus,
		)
		protected.PUT("users/:id/password",
			middleware.RequireRole("admin"),
			userHandler.ResetPassword,
		)
	}

	log.Println("Server running on port", cfg.Port)
	r.Run(":" + cfg.Port)
}