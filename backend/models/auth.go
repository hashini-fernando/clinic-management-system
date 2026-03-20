package models

import "time"

// Doctor represents a clinic staff member
type Doctor struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Role           string    `json:"role"`
	Specialization *string   `json:"specialization"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
}

// LoginRequest is the login payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is returned on successful login
type LoginResponse struct {
	Token  string `json:"token"`
	Doctor Doctor `json:"doctor"`
}

// Role constants
const (
	RoleDoctor = "doctor"
	RoleStaff  = "staff"
	RoleAdmin  = "admin"
)