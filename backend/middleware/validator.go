package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func ValidateCreatePatient() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get body from context (set by bodyPreserver)
		rawBody, exists := c.Get("rawBody")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No request body"})
			c.Abort()
			return
		}

		// Parse JSON
		var body map[string]interface{}
		if err := json.Unmarshal(rawBody.([]byte), &body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
			c.Abort()
			return
		}

		errors := []string{}

		// Name is required
		name, ok := body["name"].(string)
		if !ok || strings.TrimSpace(name) == "" {
			errors = append(errors, "name is required")
		} else if len(strings.TrimSpace(name)) < 2 {
			errors = append(errors, "name must be at least 2 characters")
		}

		// Age is required
		age, ok := body["age"].(float64)
		if !ok || age == 0 {
			errors = append(errors, "age is required")
		} else if age < 0 || age > 150 {
			errors = append(errors, "age must be between 0 and 150")
		}


		// Gender is required
	gender, ok := body["gender"].(string)
	if !ok || strings.TrimSpace(gender) == "" {
		errors = append(errors, "gender is required")
	} else {
		validGenders := map[string]bool{
			"male": true, "female": true, "other": true,
		}
		if !validGenders[strings.ToLower(gender)] {
			errors = append(errors, "gender must be male, female, or other")
		}
	}

	// Phone is required
	phone, ok := body["phone"].(string)
	if !ok || strings.TrimSpace(phone) == "" {
		errors = append(errors, "phone is required")
	} else {
		cleaned := strings.ReplaceAll(phone, " ", "")
		cleaned = strings.ReplaceAll(cleaned, "-", "")
		if len(cleaned) < 7 || len(cleaned) > 15 {
			errors = append(errors, "phone must be between 7 and 15 digits")
		}
	}



		if len(errors) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": errors,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func ValidateParseRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get body from context
		rawBody, exists := c.Get("rawBody")
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No request body"})
			c.Abort()
			return
		}

		var body map[string]interface{}
		if err := json.Unmarshal(rawBody.([]byte), &body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
			c.Abort()
			return
		}

		errors := []string{}

		// patient_id required
		patientID, ok := body["patient_id"].(float64)
		if !ok || patientID <= 0 {
			errors = append(errors, "patient_id is required")
		}

		// raw_input required
		rawInput, ok := body["raw_input"].(string)
		if !ok || strings.TrimSpace(rawInput) == "" {
			errors = append(errors, "raw_input is required")
		} else if len(strings.TrimSpace(rawInput)) < 10 {
			errors = append(errors, "clinic notes are too short")
		} else if len(rawInput) > 5000 {
			errors = append(errors, "clinic notes too long, max 5000 characters")
		}

		if len(errors) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": errors,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
