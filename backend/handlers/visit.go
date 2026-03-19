package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"clinic-system/backend/models"
	"clinic-system/backend/services"
)

type VisitHandler struct {
	db            *sql.DB
	openaiService *services.OpenAIService
}

func NewVisitHandler(db *sql.DB, openaiService *services.OpenAIService) *VisitHandler {
	return &VisitHandler{db: db, openaiService: openaiService}
}

// ParseAndSaveVisit - POST /api/visits/parse
func (h *VisitHandler) ParseAndSaveVisit(c *gin.Context) {
	var req models.ParseRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Check patient exists
	var patientExists bool
	err := h.db.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM patients WHERE id = $1)`,
		req.PatientID,
	).Scan(&patientExists)

	if err != nil || !patientExists {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Patient not found",
			"details": "Please create the patient first",
		})
		return
	}

	// Step 1: Call OpenAI to parse the notes
	parsedResult, err := h.openaiService.ParseClinicNotes(req.RawInput)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to parse notes: " + err.Error(),
		})
		return
	}

	// Step 2: Validate AI response
	if err := services.ValidateParsedResult(parsedResult); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Step 3: Save the visit
	var visitID int
	err = h.db.QueryRow(`
		INSERT INTO visits (patient_id, raw_input, status)
		VALUES ($1, $2, 'pending')
		RETURNING id`,
		req.PatientID,
		req.RawInput,
	).Scan(&visitID)

	if err != nil {
		log.Printf("Save visit error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save visit"})
		return
	}

	// Step 4: Save AI counts to ai_summary
	// Records what AI found BEFORE doctor review
	_, err = h.db.Exec(`
		INSERT INTO ai_summary
		(visit_id, ai_drugs_count, ai_labs_count, ai_obs_count)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (visit_id) DO UPDATE SET
			ai_drugs_count = $2,
			ai_labs_count  = $3,
			ai_obs_count   = $4,
			updated_at     = CURRENT_TIMESTAMP`,
		visitID,
		len(parsedResult.Drugs),
		len(parsedResult.LabTests),
		len(parsedResult.Observations),
	)
	if err != nil {
		log.Printf("ai_summary insert error: %v", err)
	}

	// Step 5: Save parsed drugs WITH confidence score
	for _, drug := range parsedResult.Drugs {
		h.db.Exec(`
			INSERT INTO parsed_items
			(visit_id, item_type, name, dosage,
			 frequency, duration, confidence)
			VALUES ($1, 'drug', $2, $3, $4, $5, $6)`,
			visitID, drug.Name, drug.Dosage,
			drug.Frequency, drug.Duration,
			drug.Confidence,
		)
	}

	// Step 6: Save parsed lab tests WITH confidence score
	for _, lab := range parsedResult.LabTests {
		h.db.Exec(`
			INSERT INTO parsed_items
			(visit_id, item_type, name, notes, confidence)
			VALUES ($1, 'lab_test', $2, $3, $4)`,
			visitID, lab.Name, lab.Notes,
			lab.Confidence,
		)
	}

	// Step 7: Save parsed observations WITH confidence score
	for _, obs := range parsedResult.Observations {
		h.db.Exec(`
			INSERT INTO parsed_items
			(visit_id, item_type, name, confidence)
			VALUES ($1, 'observation', $2, $3)`,
			visitID, obs.Note,
			obs.Confidence,
		)
	}

	// Step 8: Auto generate billing
	h.generateBilling(visitID, parsedResult)

	c.JSON(http.StatusCreated, gin.H{
		"visit_id":      visitID,
		"parsed_result": parsedResult,
		"message":       "Visit saved and parsed successfully",
	})
}

// ConfirmVisit - POST /api/visits/:id/confirm
// Doctor reviews and confirms AI parsed results (Human-in-the-Loop)
func (h *VisitHandler) ConfirmVisit(c *gin.Context) {
	visitID := c.Param("id")

	var req struct {
		ParsedResult models.ParsedResult `json:"parsed_result"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Validate confirmed result
	if err := services.ValidateParsedResult(&req.ParsedResult); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Delete old AI parsed items
	_, err := h.db.Exec(
		`DELETE FROM parsed_items WHERE visit_id = $1`, visitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update visit",
		})
		return
	}

	// Save confirmed drugs with RXNorm lookup
	for _, drug := range req.ParsedResult.Drugs {
		var standardName, rxnormCode string
		lookupErr := h.db.QueryRow(`
			SELECT standard_name, rxnorm_code
			FROM drug_codes
			WHERE LOWER(common_name) = LOWER($1)
			LIMIT 1`, drug.Name).
			Scan(&standardName, &rxnormCode)

		if lookupErr != nil {
			standardName = drug.Name
			rxnormCode = ""
		}

		h.db.Exec(`
			INSERT INTO parsed_items
			(visit_id, item_type, name, dosage,
			 frequency, duration, rxnorm_code, confidence)
			VALUES ($1, 'drug', $2, $3, $4, $5, $6, $7)`,
			visitID, standardName,
			drug.Dosage, drug.Frequency,
			drug.Duration, rxnormCode,
			drug.Confidence,
		)
	}

	// Save confirmed lab tests
	for _, lab := range req.ParsedResult.LabTests {
		h.db.Exec(`
			INSERT INTO parsed_items
			(visit_id, item_type, name, notes, confidence)
			VALUES ($1, 'lab_test', $2, $3, $4)`,
			visitID, lab.Name, lab.Notes,
			lab.Confidence,
		)
	}

	// Save confirmed observations
	for _, obs := range req.ParsedResult.Observations {
		h.db.Exec(`
			INSERT INTO parsed_items
			(visit_id, item_type, name, confidence)
			VALUES ($1, 'observation', $2, $3)`,
			visitID, obs.Note,
			obs.Confidence,
		)
	}

	// ── Get AI counts from ai_summary ──
	var aiDrugs, aiLabs, aiObs int
	summaryErr := h.db.QueryRow(`
		SELECT
			COALESCE(ai_drugs_count, 0),
			COALESCE(ai_labs_count, 0),
			COALESCE(ai_obs_count, 0)
		FROM ai_summary
		WHERE visit_id = $1`, visitID).
		Scan(&aiDrugs, &aiLabs, &aiObs)

	if summaryErr != nil {
		log.Printf("ai_summary read error: %v", summaryErr)
	}

	// ── Doctor confirmed counts ──
	confDrugs := len(req.ParsedResult.Drugs)
	confLabs  := len(req.ParsedResult.LabTests)
	confObs   := len(req.ParsedResult.Observations)

	// ── Calculate simple accuracy ──
	drugAcc := calcAccuracyFloat(aiDrugs, confDrugs)
	labAcc  := calcAccuracyFloat(aiLabs, confLabs)
	obsAcc  := calcAccuracyFloat(aiObs, confObs)
	overall := (drugAcc + labAcc + obsAcc) / 3

	// ── Calculate multi-label PRF ──
	drugPrec, drugRec, drugF1 := calcPRF(aiDrugs, confDrugs)
	labPrec,  labRec,  labF1  := calcPRF(aiLabs, confLabs)
	obsPrec,  obsRec,  obsF1  := calcPRF(aiObs, confObs)

	// Macro average across all 3 labels
	macroPrecision := (drugPrec + labPrec + obsPrec) / 3
	macroRecall    := (drugRec + labRec + obsRec) / 3
	macroF1        := (drugF1 + labF1 + obsF1) / 3

	// ── Save all metrics to ai_summary ──
	_, updateErr := h.db.Exec(`
		UPDATE ai_summary SET
			confirmed_drugs_count = $1,
			confirmed_labs_count  = $2,
			confirmed_obs_count   = $3,
			drug_accuracy         = $4,
			lab_accuracy          = $5,
			obs_accuracy          = $6,
			overall_accuracy      = $7,
			precision_score       = $8,
			recall_score          = $9,
			f1_score              = $10,
			updated_at            = CURRENT_TIMESTAMP
		WHERE visit_id = $11`,
		confDrugs, confLabs, confObs,
		drugAcc, labAcc, obsAcc, overall,
		macroPrecision, macroRecall, macroF1,
		visitID,
	)
	if updateErr != nil {
		log.Printf("ai_summary update error: %v", updateErr)
	}

	// ── Update visit status ──
	h.db.Exec(`
		UPDATE visits SET
			status     = 'confirmed',
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1`, visitID)

	// ── Regenerate billing with confirmed items ──
	h.generateBilling(visitID, &req.ParsedResult)

	c.JSON(http.StatusOK, gin.H{
		"message":  "Visit confirmed and saved successfully",
		"visit_id": visitID,
	})
}

// GetVisit - GET /api/visits/:id
func (h *VisitHandler) GetVisit(c *gin.Context) {
	id := c.Param("id")

	// Get visit
	var visit models.Visit
	err := h.db.QueryRow(`
		SELECT id, patient_id, raw_input, visit_date, status
		FROM visits WHERE id = $1`, id).
		Scan(
			&visit.ID, &visit.PatientID,
			&visit.RawInput, &visit.VisitDate, &visit.Status,
		)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit not found"})
		return
	}
	if err != nil {
		log.Printf("GetVisit error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch visit"})
		return
	}

	// Get parsed items WITH confidence
	rows, err := h.db.Query(`
		SELECT id, item_type, name,
		COALESCE(dosage,''),
		COALESCE(frequency,''),
		COALESCE(duration,''),
		COALESCE(notes,''),
		COALESCE(confidence, 0)
		FROM parsed_items
		WHERE visit_id = $1
		ORDER BY item_type, id`, id)

	if err != nil {
		log.Printf("GetVisit parsed_items error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch parsed items",
		})
		return
	}
	defer rows.Close()

	var items []models.ParsedItem
	for rows.Next() {
		var item models.ParsedItem
		rows.Scan(
			&item.ID, &item.ItemType, &item.Name,
			&item.Dosage, &item.Frequency,
			&item.Duration, &item.Notes,
			&item.Confidence,
		)
		items = append(items, item)
	}

	if items == nil {
		items = []models.ParsedItem{}
	}

	// Get accuracy from ai_summary
	// Use _ to ignore error — visit loads fine without accuracy data
	var aiDrugs, aiLabs, aiObs int
	var confDrugs, confLabs, confObs int
	var drugAcc, labAcc, obsAcc, overallAcc float64
	var precisionScore, recallScore, f1Score float64

	_ = h.db.QueryRow(`
		SELECT
			COALESCE(ai_drugs_count, 0),
			COALESCE(ai_labs_count, 0),
			COALESCE(ai_obs_count, 0),
			COALESCE(confirmed_drugs_count, 0),
			COALESCE(confirmed_labs_count, 0),
			COALESCE(confirmed_obs_count, 0),
			COALESCE(drug_accuracy, 0),
			COALESCE(lab_accuracy, 0),
			COALESCE(obs_accuracy, 0),
			COALESCE(overall_accuracy, 0),
			COALESCE(precision_score, 0),
			COALESCE(recall_score, 0),
			COALESCE(f1_score, 0)
		FROM ai_summary
		WHERE visit_id = $1`, id).
		Scan(
			&aiDrugs, &aiLabs, &aiObs,
			&confDrugs, &confLabs, &confObs,
			&drugAcc, &labAcc, &obsAcc, &overallAcc,
			&precisionScore, &recallScore, &f1Score,
		)

	// Only include accuracy if visit is confirmed
	var accuracy gin.H
	if visit.Status == "confirmed" {
		accuracy = gin.H{
			"overall":      overallAcc,
			"drugs":        drugAcc,
			"labs":         labAcc,
			"observations": obsAcc,
			"precision":    precisionScore,
			"recall":       recallScore,
			"f1":           f1Score,
			"ai_found": gin.H{
				"drugs":        aiDrugs,
				"labs":         aiLabs,
				"observations": aiObs,
			},
			"doctor_confirmed": gin.H{
				"drugs":        confDrugs,
				"labs":         confLabs,
				"observations": confObs,
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"visit":    visit,
		"items":    items,
		"accuracy": accuracy,
	})
}

// GetPatientVisits - GET /api/patients/:id/visits
func (h *VisitHandler) GetPatientVisits(c *gin.Context) {
	patientID := c.Param("id")

	rows, err := h.db.Query(`
		SELECT id, patient_id, raw_input, visit_date, status
		FROM visits WHERE patient_id = $1
		ORDER BY visit_date DESC`, patientID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch visits",
		})
		return
	}
	defer rows.Close()

	var visits []models.Visit
	for rows.Next() {
		var v models.Visit
		rows.Scan(
			&v.ID, &v.PatientID,
			&v.RawInput, &v.VisitDate, &v.Status,
		)
		visits = append(visits, v)
	}

	if visits == nil {
		visits = []models.Visit{}
	}

	c.JSON(http.StatusOK, visits)
}

// ── BILLING ──────────────────────────────────────────────

func (h *VisitHandler) generateBilling(
	visitID interface{},
	result *models.ParsedResult,
) {
	vid := fmt.Sprintf("%v", visitID)

	h.db.Exec(`
		DELETE FROM billing_items WHERE billing_id IN
		(SELECT id FROM billing WHERE visit_id = $1)`, vid)
	h.db.Exec(`DELETE FROM billing WHERE visit_id = $1`, vid)

	var consultationFee float64
	err := h.db.QueryRow(`
		SELECT price FROM consultation_types
		WHERE name = 'General Consultation'
		LIMIT 1`).Scan(&consultationFee)
	if err != nil {
		consultationFee = 30.00
	}

	var totalAmount float64

	var billingID int
	err = h.db.QueryRow(`
		INSERT INTO billing (visit_id, total_amount, status)
		VALUES ($1, 0, 'unpaid') RETURNING id`, vid).
		Scan(&billingID)
	if err != nil {
		return
	}

	h.db.Exec(`
		INSERT INTO billing_items
		(billing_id, description, item_type,
		 unit_price, quantity, total_price)
		VALUES ($1, 'General Consultation',
		'consultation', $2, 1, $2)`,
		billingID, consultationFee)
	totalAmount += consultationFee

	for _, drug := range result.Drugs {
		var price float64
		err := h.db.QueryRow(`
			SELECT unit_price FROM drug_price_list
			WHERE LOWER(drug_name) = LOWER($1)
			LIMIT 1`, drug.Name).Scan(&price)
		if err != nil {
			price = 5.00
		}
		h.db.Exec(`
			INSERT INTO billing_items
			(billing_id, description, item_type,
			 unit_price, quantity, total_price)
			VALUES ($1, $2, 'drug', $3, 1, $3)`,
			billingID, drug.Name, price)
		totalAmount += price
	}

	for _, lab := range result.LabTests {
		var price float64
		err := h.db.QueryRow(`
			SELECT unit_price FROM lab_price_list
			WHERE LOWER(test_name) = LOWER($1)
			LIMIT 1`, lab.Name).Scan(&price)
		if err != nil {
			price = 20.00
		}
		h.db.Exec(`
			INSERT INTO billing_items
			(billing_id, description, item_type,
			 unit_price, quantity, total_price)
			VALUES ($1, $2, 'lab_test', $3, 1, $3)`,
			billingID, lab.Name, price)
		totalAmount += price
	}

	h.db.Exec(`
		UPDATE billing SET total_amount = $1 WHERE id = $2`,
		totalAmount, billingID)
}

// ── ACCURACY HELPERS ─────────────────────────────────────

func calcAccuracyFloat(aiCount, confirmedCount int) float64 {
	if aiCount == 0 && confirmedCount == 0 {
		return 100.0
	}
	if aiCount == 0 {
		return 0.0
	}
	kept := confirmedCount
	if kept > aiCount {
		kept = aiCount
	}
	return (float64(kept) / float64(aiCount)) * 100
}

func calcPRF(aiCount, confirmedCount int) (precision, recall, f1 float64) {
	tp := float64(minInt(aiCount, confirmedCount))
	fp := float64(maxInt(0, aiCount-confirmedCount))
	fn := float64(maxInt(0, confirmedCount-aiCount))

	if tp+fp > 0 {
		precision = (tp / (tp + fp)) * 100
	} else {
		precision = 100
	}

	if tp+fn > 0 {
		recall = (tp / (tp + fn)) * 100
	} else {
		recall = 100
	}

	if precision+recall > 0 {
		f1 = 2 * precision * recall / (precision + recall)
	}

	return precision, recall, f1
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func validateParsedResult(result *models.ParsedResult) error {
	if len(result.Drugs) == 0 &&
		len(result.LabTests) == 0 &&
		len(result.Observations) == 0 {
		return fmt.Errorf("AI could not extract any medical information")
	}

	validDrugs := []models.DrugItem{}
	for _, drug := range result.Drugs {
		if strings.TrimSpace(drug.Name) == "" {
			continue
		}
		drug.Name      = strings.TrimSpace(drug.Name)
		drug.Dosage    = strings.TrimSpace(drug.Dosage)
		drug.Frequency = strings.TrimSpace(drug.Frequency)
		drug.Duration  = strings.TrimSpace(drug.Duration)
		validDrugs = append(validDrugs, drug)
	}
	result.Drugs = validDrugs

	validLabs := []models.LabTestItem{}
	for _, lab := range result.LabTests {
		if strings.TrimSpace(lab.Name) == "" {
			continue
		}
		lab.Name  = strings.TrimSpace(lab.Name)
		lab.Notes = strings.TrimSpace(lab.Notes)
		validLabs = append(validLabs, lab)
	}
	result.LabTests = validLabs

	validObs := []models.ObservationItem{}
	for _, obs := range result.Observations {
		if strings.TrimSpace(obs.Note) == "" {
			continue
		}
		obs.Note = strings.TrimSpace(obs.Note)
		validObs = append(validObs, obs)
	}
	result.Observations = validObs

	return nil
}