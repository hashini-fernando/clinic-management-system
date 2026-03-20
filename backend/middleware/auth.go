package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"clinic-system/backend/services"
)

// AuthMiddleware validates JWT token on every protected route
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			c.Abort()
			return
		}

		// Expect "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization format. Use: Bearer <token>",
			})
			c.Abort()
			return
		}

		claims, err := services.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Attach claims to context for use in handlers
		c.Set("doctor_id", claims.DoctorID)
		c.Set("doctor_email", claims.Email)
		c.Set("doctor_role", claims.Role)
		c.Set("doctor_name", claims.Name)

		c.Next()
	}
}

// RequireRole blocks access if user does not have one of the allowed roles
// Usage: RequireRole("admin") or RequireRole("doctor", "admin")
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("doctor_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Not authenticated",
			})
			c.Abort()
			return
		}

		userRole := role.(string)
		for _, allowed := range roles {
			if userRole == allowed {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error":    "Access denied",
			"message":  "You do not have permission to perform this action",
			"your_role": userRole,
			"required": roles,
		})
		c.Abort()
	}
}
