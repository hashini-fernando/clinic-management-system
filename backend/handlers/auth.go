package handlers

import (
	"database/sql"
	"net/http"
	"log"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"clinic-system/backend/models"
	"clinic-system/backend/services"
)

type AuthHandler struct {
	db *sql.DB
}

func NewAuthHandler(db *sql.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

// Login - POST /api/auth/login
// Accepts email + password, returns JWT token
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email and password are required",
		})
		return
	}

	// Find doctor by email
	var doctor models.Doctor
	var passwordHash string

	err := h.db.QueryRow(`
		SELECT id, name, email, password_hash, role,
		       specialization, is_active
		FROM doctors
		WHERE email = $1 AND is_active = true`,
		req.Email,
	).Scan(
		&doctor.ID, &doctor.Name, &doctor.Email,
		&passwordHash, &doctor.Role,
		&doctor.Specialization, &doctor.IsActive,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid email or password",
		})
		return
	}
	if err != nil {
    log.Printf("Login DB error: %v", err) 
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Login failed"})
    return
}

	// Verify password against bcrypt hash
	if err := bcrypt.CompareHashAndPassword(
		[]byte(passwordHash),
		[]byte(req.Password),
	); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid email or password",
		})
		return
	}

	// Generate JWT
	token, err := services.GenerateToken(
		doctor.ID, doctor.Email,
		doctor.Role, doctor.Name,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		Token:  token,
		Doctor: doctor,
	})
}

// GetMe - GET /api/auth/me
// Returns current authenticated user from token
func (h *AuthHandler) GetMe(c *gin.Context) {
	doctorID, _ := c.Get("doctor_id")
	role, _     := c.Get("doctor_role")
	name, _     := c.Get("doctor_name")
	email, _    := c.Get("doctor_email")

	c.JSON(http.StatusOK, gin.H{
		"id":    doctorID,
		"name":  name,
		"email": email,
		"role":  role,
	})
}