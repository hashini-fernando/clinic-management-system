package main

import (
	"bytes"
	"io"
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"clinic-system/backend/config"
	"clinic-system/backend/db"
	"clinic-system/backend/handlers"
	"clinic-system/backend/middleware"
	"clinic-system/backend/services"
)

func main() {
	// Load config
	cfg := config.Load()

	// Connect to DB
	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Init services
	openaiService := services.NewOpenAIService(cfg.OpenAIKey)

	// Init handlers
	patientHandler := handlers.NewPatientHandler(database)
	visitHandler := handlers.NewVisitHandler(database, openaiService)
	billingHandler := handlers.NewBillingHandler(database)
	accuracyHandler := handlers.NewAccuracyHandler(database)
	// Setup router
	r := gin.Default()

	// Global middleware
	r.Use(middleware.ErrorHandler())
	r.NoRoute(middleware.NotFound())

	// CORS — must be before routes
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// bodyPreserver is a helper that reads body
	// and puts it back so middleware AND handler can both read it
	bodyPreserver := func(c *gin.Context) {
		// Read the body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(400, gin.H{"error": "Failed to read request"})
			c.Abort()
			return
		}

		// Put body back for next reader
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		// Store body in context so middleware can use it
		c.Set("rawBody", body)

		c.Next()

		// Put body back AGAIN for handler
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Patient routes
		api.POST("/patients",
			bodyPreserver,
			middleware.ValidateCreatePatient(),
			patientHandler.CreatePatient,
		)
		api.GET("/patients", patientHandler.GetAllPatients)
		api.GET("/patients/:id", patientHandler.GetPatient)
		api.GET("/patients/:id/visits", visitHandler.GetPatientVisits)

		// Visit routes — with rate limit and validation
		api.POST("/visits/parse",
			bodyPreserver,
			middleware.RateLimit(10, time.Minute),
			middleware.ValidateParseRequest(),
			visitHandler.ParseAndSaveVisit,
		)
		api.GET("/visits/:id", visitHandler.GetVisit)
		api.POST("/visits/:id/confirm", visitHandler.ConfirmVisit)

		// Billing routes
		api.GET("/billing/:visit_id", billingHandler.GetBilling)
		api.POST("/billing/:visit_id/pay", billingHandler.MarkAsPaid)
	}

	// Accuracy routes
	api.GET("/accuracy/stats",      accuracyHandler.GetAccuracyStats)
	api.GET("/accuracy/prf",        accuracyHandler.GetPRFStats)
	api.GET("/accuracy/confidence", accuracyHandler.GetConfidenceStats)
	log.Printf("Server running on port %s", cfg.Port)
	r.Run(":" + cfg.Port)
}