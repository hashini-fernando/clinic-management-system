package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"clinic-system/backend/models"
)

type UserHandler struct {
	db *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{db: db}
}

// GetUsers - GET /api/users
// Admin only — list all staff accounts
func (h *UserHandler) GetUsers(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT id, name, email, role,
		       COALESCE(specialization, ''),
		       is_active, created_at
		FROM doctors
		ORDER BY role, name`)

	if err != nil {
		log.Printf("GetUsers error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch users",
		})
		return
	}
	defer rows.Close()

	type UserRow struct {
		ID             int    `json:"id"`
		Name           string `json:"name"`
		Email          string `json:"email"`
		Role           string `json:"role"`
		Specialization string `json:"specialization"`
		IsActive       bool   `json:"is_active"`
		CreatedAt      string `json:"created_at"`
	}

	var users []UserRow
	for rows.Next() {
		var u UserRow
		rows.Scan(
			&u.ID, &u.Name, &u.Email,
			&u.Role, &u.Specialization,
			&u.IsActive, &u.CreatedAt,
		)
		users = append(users, u)
	}

	if users == nil {
		users = []UserRow{}
	}

	c.JSON(http.StatusOK, users)
}

// CreateUser - POST /api/users
// Admin only — enroll new staff member
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req struct {
		Name           string `json:"name"`
		Email          string `json:"email"`
		Password       string `json:"password"`
		Role           string `json:"role"`
		Specialization string `json:"specialization"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request",
		})
		return
	}

	// Validate required fields
	if req.Name == "" || req.Email == "" || req.Password == "" || req.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Name, email, password and role are required",
		})
		return
	}

	// Validate role
	if req.Role != models.RoleDoctor &&
		req.Role != models.RoleStaff &&
		req.Role != models.RoleAdmin {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Role must be doctor, staff or admin",
		})
		return
	}

	// Validate password length
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Password must be at least 6 characters",
		})
		return
	}

	// Check email not already taken
	var exists bool
	h.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM doctors WHERE email = $1)`,
		req.Email,
	).Scan(&exists)

	if exists {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Email already registered",
		})
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password), 10,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process password",
		})
		return
	}

	// Insert new user
	var id int
	err = h.db.QueryRow(`
		INSERT INTO doctors
		(name, email, password_hash, role, specialization, is_active)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id`,
		req.Name, req.Email,
		string(hash), req.Role,
		req.Specialization,
	).Scan(&id)

	if err != nil {
		log.Printf("CreateUser error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"id":      id,
		"name":    req.Name,
		"email":   req.Email,
		"role":    req.Role,
	})
}

// ToggleUserStatus - PUT /api/users/:id/toggle
// Admin only — activate or deactivate account
func (h *UserHandler) ToggleUserStatus(c *gin.Context) {
	id := c.Param("id")

	// Get current status
	var isActive bool
	err := h.db.QueryRow(`
		SELECT is_active FROM doctors WHERE id = $1`, id,
	).Scan(&isActive)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
		})
		return
	}

	// Toggle
	newStatus := !isActive
	h.db.Exec(`
		UPDATE doctors SET
			is_active  = $1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2`, newStatus, id)

	msg := "User activated successfully"
	if !newStatus {
		msg = "User deactivated successfully"
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   msg,
		"is_active": newStatus,
	})
}

// ResetPassword - PUT /api/users/:id/password
// Admin only — reset a user's password
func (h *UserHandler) ResetPassword(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "New password is required",
		})
		return
	}

	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Password must be at least 6 characters",
		})
		return
	}

	hash, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password), 10,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process password",
		})
		return
	}

	result, err := h.db.Exec(`
		UPDATE doctors SET
			password_hash = $1,
			updated_at    = CURRENT_TIMESTAMP
		WHERE id = $2`, string(hash), id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to reset password",
		})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successfully",
	})
}