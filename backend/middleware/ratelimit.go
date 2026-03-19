package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
}

var limiter = &rateLimiter{
	requests: make(map[string][]time.Time),
}

// RateLimit limits requests per IP
// maxRequests per window duration
func RateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		limiter.mu.Lock()
		defer limiter.mu.Unlock()

		now := time.Now()
		windowStart := now.Add(-window)

		// Clean old requests
		var recent []time.Time
		for _, t := range limiter.requests[ip] {
			if t.After(windowStart) {
				recent = append(recent, t)
			}
		}

		// Check limit
		if len(recent) >= maxRequests {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests, please slow down",
			})
			c.Abort()
			return
		}

		// Add current request
		limiter.requests[ip] = append(recent, now)
		c.Next()
	}
}