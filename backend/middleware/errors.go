package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorHandler catches any unhandled errors globally
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there are any errors
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			log.Printf("Unhandled error: %v", err)

			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Something went wrong",
				"details": err.Error(),
			})
		}
	}
}

// NotFound handles 404 routes
func NotFound() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Route not found",
		})
	}
}