// package handlers

// func (h *PatientHandler) GetPatientCount( c *gin.Context) {
// 	var count int

// 	err := h.db.QueryRow(`SELECT COUNT(*) FROM patients`).Scan(&count)
// 	if err != nil {
// 		c.JSON(500, gin.H{"error": "Failed to fetch patient count"})
// 		return
// 	}

// 	c.JSON(200, gin.H{"count": count})
// }

// func isValidPhone(phone string) bool{
// 	//remove spaces and dashes
// 	normalized := strings.ReplaceAll(phone, " ", "")
// 	normalized = strings.ReplaceAll(normalized, "-", "")
	
// 	if len(normalized) < 7 || len(normalized) > 15 {
// 		c.JSON(400 , gin.H{"error": "Phone number is out of the valid range"})
// 		return false
// 	}
// 	c.JSON(200,gin.H{"message": "Phone number is valid"})
// 	return true
// }

// func (h *PatientHandler) GetPatientId( c *gin.Context) {
// 	id :=c.Param("id")

// 	var patientId int
// 	err := h.db.QueryRow(`SELECT id from patients WHERE  id = $1`, id).Scan(&patientId)
// 	if err != nil {
// 		c.JSON(404, gin.H{"error": "Patient not found"})
// 		return
// 	}
// 	c.JSON(200, gin.H{"id": patientId})

// }

// func (h *VisitHandler) CreateVisit(c *gin.Context) {
//     // Step 1 — read body into models.ParseRequest struct
    
// 	var req models.ParseRequest


	
// 	 // Step 2 — validate patient_id and raw_input are not empty
    
// 	if len(req.PatientID) == 0 || len(req.RawInput) == 0 {{
// 		c.JSON(400, gin.H{"error": "patient_id and raw_input are required"})
// 		return
// 	}

// 	 // Step 3 — insert into visits table
//     err := h.db.QueryRow(
// 		`INSERT into visits (patient_id, raw_input) VALUES ($1, $2) RETURNING id`,
// 		req.PatientID, req.RawInput,
// 	).Scan(&visitID)
// 	if err != nil {
// 		c.JSON(500, gin.H{"error": "Failed to create visit"})
// 		return
// 	}

// 	c.JSON(200, gin.H{"visit_id": visitID})
//     // Step 4 — return the new visit id
// }


// //get all visits for a patient

// func (h*VisitHandler) GetPatientVisits(c*gin.Context){
// 	patientId := c.Param("id")
// 	rows,err := h.db.Query(`
// 	SELECT id, patient_id, raw_input, visit_date, status
//     FROM visits WHERE patient_id = $1
//     ORDER BY visit_date DESC`, patientId)

// 	if err != nil{
// 		c.JSON(500, gin.H{"error": "Failed to fetch visits"})
// 		return
// 	}
// 	defer rows.Close()

// 	var visits []models.Visit
// 	for rows.Next(){
// 		var v models.Visit
// 		rows.Scan(&v.ID , &v.PatientID, &v.RawInput, &v.VisitDate, &v.Status)

// 		visits = append(visits, v)
// 	}
// 	c.JSON(200, gin.H{"visits": visits})
// 	return
// }


package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	hash, err := bcrypt.GenerateFromPassword([]byte("clinic123"), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(hash))
}