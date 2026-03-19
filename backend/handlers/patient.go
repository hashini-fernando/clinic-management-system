package handlers

import (
	"database/sql"
	"net/http"
	"log"

	"github.com/gin-gonic/gin"

	"clinic-system/backend/models"
)

type PatientHandler struct {
	db *sql.DB
}

func NewPatientHandler(db *sql.DB) *PatientHandler {
	return &PatientHandler{db: db}
}

// CreatePatient - POST /api/patients
func (h *PatientHandler) CreatePatient(c *gin.Context) {
    var patient models.Patient

    if err := c.ShouldBindJSON(&patient); err != nil {
        log.Printf("Bind error: %v", err) 
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
        return
    }

    query := `
        INSERT INTO patients (name, age, gender, phone, address)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at`

    err := h.db.QueryRow(
        query,
        patient.Name,
        patient.Age,
        patient.Gender,
        patient.Phone,
        patient.Address,
    ).Scan(&patient.ID, &patient.CreatedAt)

    if err != nil {
        log.Printf("DB error: %v", err) 
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create patient"})
        return
    }

    c.JSON(http.StatusCreated, patient)
}

// GetAllPatients - GET /api/patients
func (h *PatientHandler) GetAllPatients(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT id, name, age, gender, phone, address, created_at 
		FROM patients 
		ORDER BY created_at DESC`)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch patients"})
		return
	}
	defer rows.Close()

	var patients []models.Patient
	for rows.Next() {
		var p models.Patient
		err := rows.Scan(
			&p.ID, &p.Name, &p.Age,
			&p.Gender, &p.Phone, &p.Address, &p.CreatedAt,
		)
		if err != nil {
			continue
		}
		patients = append(patients, p)
	}

	if patients == nil {
		patients = []models.Patient{}
	}

	c.JSON(http.StatusOK, patients)
}

// GetPatient - GET /api/patients/:id
func (h *PatientHandler) GetPatient(c *gin.Context) {
	id := c.Param("id")

	var p models.Patient
	err := h.db.QueryRow(`
		SELECT id, name, age, gender, phone, address, created_at 
		FROM patients WHERE id = $1`, id).
		Scan(&p.ID, &p.Name, &p.Age, &p.Gender, &p.Phone, &p.Address, &p.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Patient not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch patient"})
		return
	}

	c.JSON(http.StatusOK, p)
}