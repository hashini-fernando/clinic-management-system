package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AccuracyHandler struct {
	db *sql.DB
}

func NewAccuracyHandler(db *sql.DB) *AccuracyHandler {
	return &AccuracyHandler{db: db}
}

// GetAccuracyStats - GET /api/accuracy/stats
// Returns overall summary + per visit breakdown
func (h *AccuracyHandler) GetAccuracyStats(c *gin.Context) {

	// ── Overall summary ──
	var totalVisits int
	var totalAI, totalConf int
	var avgDrugAcc, avgLabAcc, avgObsAcc, avgOverall float64
	var avgPrecision, avgRecall, avgF1 float64
	var avgConfidence float64

	h.db.QueryRow(`
		SELECT
			COUNT(*),
			COALESCE(SUM(ai_drugs_count + ai_labs_count + ai_obs_count), 0),
			COALESCE(SUM(confirmed_drugs_count + confirmed_labs_count + confirmed_obs_count), 0),
			COALESCE(AVG(drug_accuracy), 0),
			COALESCE(AVG(lab_accuracy), 0),
			COALESCE(AVG(obs_accuracy), 0),
			COALESCE(AVG(overall_accuracy), 0),
			COALESCE(AVG(precision_score), 0),
			COALESCE(AVG(recall_score), 0),
			COALESCE(AVG(f1_score), 0)
		FROM ai_summary
		WHERE confirmed_drugs_count > 0
		   OR confirmed_labs_count  > 0
		   OR confirmed_obs_count   > 0`).
		Scan(
			&totalVisits,
			&totalAI, &totalConf,
			&avgDrugAcc, &avgLabAcc, &avgObsAcc, &avgOverall,
			&avgPrecision, &avgRecall, &avgF1,
		)

	// Average confidence from parsed_items
	h.db.QueryRow(`
		SELECT COALESCE(AVG(confidence) * 100, 0)
		FROM parsed_items
		WHERE confidence > 0`).
		Scan(&avgConfidence)

	// ── Per visit breakdown ──
	rows, err := h.db.Query(`
		SELECT
			v.id,
			v.visit_date,
			p.name AS patient_name,
			s.ai_drugs_count,
			s.ai_labs_count,
			s.ai_obs_count,
			s.confirmed_drugs_count,
			s.confirmed_labs_count,
			s.confirmed_obs_count,
			s.drug_accuracy,
			s.lab_accuracy,
			s.obs_accuracy,
			s.overall_accuracy,
			s.precision_score,
			s.recall_score,
			s.f1_score
		FROM ai_summary s
		JOIN visits v   ON v.id = s.visit_id
		JOIN patients p ON p.id = v.patient_id
		WHERE s.confirmed_drugs_count > 0
		   OR s.confirmed_labs_count  > 0
		   OR s.confirmed_obs_count   > 0
		ORDER BY v.visit_date DESC`)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch accuracy stats",
		})
		return
	}
	defer rows.Close()

	type VisitAccuracy struct {
		ID          int     `json:"id"`
		VisitDate   string  `json:"visit_date"`
		PatientName string  `json:"patient_name"`
		AIDrugs     int     `json:"ai_drugs_count"`
		AILabs      int     `json:"ai_labs_count"`
		AIObs       int     `json:"ai_obs_count"`
		ConfDrugs   int     `json:"confirmed_drugs_count"`
		ConfLabs    int     `json:"confirmed_labs_count"`
		ConfObs     int     `json:"confirmed_obs_count"`
		DrugAcc     float64 `json:"drug_accuracy"`
		LabAcc      float64 `json:"lab_accuracy"`
		ObsAcc      float64 `json:"obs_accuracy"`
		OverallAcc  float64 `json:"overall_accuracy"`
		Precision   float64 `json:"precision_score"`
		Recall      float64 `json:"recall_score"`
		F1          float64 `json:"f1_score"`
	}

	var visits []VisitAccuracy
	for rows.Next() {
		var v VisitAccuracy
		rows.Scan(
			&v.ID, &v.VisitDate, &v.PatientName,
			&v.AIDrugs, &v.AILabs, &v.AIObs,
			&v.ConfDrugs, &v.ConfLabs, &v.ConfObs,
			&v.DrugAcc, &v.LabAcc, &v.ObsAcc, &v.OverallAcc,
			&v.Precision, &v.Recall, &v.F1,
		)
		visits = append(visits, v)
	}

	if visits == nil {
		visits = []VisitAccuracy{}
	}

	c.JSON(http.StatusOK, gin.H{
		"summary": gin.H{
			// Simple accuracy
			"overall_accuracy":      avgOverall,
			"drug_accuracy":         avgDrugAcc,
			"lab_accuracy":          avgLabAcc,
			"obs_accuracy":          avgObsAcc,
			"total_visits":          totalVisits,
			"total_ai_items":        totalAI,
			"total_confirmed_items": totalConf,
			// Multi-label PRF
			"precision_score":  avgPrecision,
			"recall_score":     avgRecall,
			"f1_score":         avgF1,
			// Confidence
			"avg_confidence":   avgConfidence,
		},
		"visits": visits,
	})
}

// GetPRFStats - GET /api/accuracy/prf
// Returns dedicated precision recall f1 per label
func (h *AccuracyHandler) GetPRFStats(c *gin.Context) {
	var count int
	var macroPrec, macroRec, macroF1 float64

	// Per label precision from DB
	var drugPrecSum, labPrecSum, obsPrecSum float64
	var drugRecSum, labRecSum, obsRecSum float64
	var drugF1Sum, labF1Sum, obsF1Sum float64

	rows, err := h.db.Query(`
		SELECT
			ai_drugs_count, confirmed_drugs_count,
			ai_labs_count,  confirmed_labs_count,
			ai_obs_count,   confirmed_obs_count,
			precision_score, recall_score, f1_score
		FROM ai_summary
		WHERE f1_score > 0`)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch PRF stats",
		})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var aiD, confD, aiL, confL, aiO, confO int
		var prec, rec, f1 float64

		rows.Scan(
			&aiD, &confD,
			&aiL, &confL,
			&aiO, &confO,
			&prec, &rec, &f1,
		)

		// Per label calculations
		dp, dr, df := calcPRF(aiD, confD)
		lp, lr, lf := calcPRF(aiL, confL)
		op, or_, of := calcPRF(aiO, confO)

		drugPrecSum += dp
		labPrecSum  += lp
		obsPrecSum  += op

		drugRecSum += dr
		labRecSum  += lr
		obsRecSum  += or_

		drugF1Sum += df
		labF1Sum  += lf
		obsF1Sum  += of

		macroPrec += prec
		macroRec  += rec
		macroF1   += f1

		count++
	}

	drugPrec, labPrec, obsPrec := 0.0, 0.0, 0.0
	drugRec, labRec, obsRec   := 0.0, 0.0, 0.0
	drugF1, labF1, obsF1      := 0.0, 0.0, 0.0

	if count > 0 {
		drugPrec = drugPrecSum / float64(count)
		labPrec  = labPrecSum  / float64(count)
		obsPrec  = obsPrecSum  / float64(count)

		drugRec = drugRecSum / float64(count)
		labRec  = labRecSum  / float64(count)
		obsRec  = obsRecSum  / float64(count)

		drugF1 = drugF1Sum / float64(count)
		labF1  = labF1Sum  / float64(count)
		obsF1  = obsF1Sum  / float64(count)

		macroPrec /= float64(count)
		macroRec  /= float64(count)
		macroF1   /= float64(count)
	}

	c.JSON(http.StatusOK, gin.H{
		"total_visits": count,
		"macro": gin.H{
			"precision": macroPrec,
			"recall":    macroRec,
			"f1":        macroF1,
		},
		"per_label": gin.H{
			"drugs": gin.H{
				"precision": drugPrec,
				"recall":    drugRec,
				"f1":        drugF1,
			},
			"labs": gin.H{
				"precision": labPrec,
				"recall":    labRec,
				"f1":        labF1,
			},
			"observations": gin.H{
				"precision": obsPrec,
				"recall":    obsRec,
				"f1":        obsF1,
			},
		},
	})
}

// GetConfidenceStats - GET /api/accuracy/confidence
// Returns confidence score breakdown
func (h *AccuracyHandler) GetConfidenceStats(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT
			item_type,
			COUNT(*) as total,
			ROUND(AVG(confidence) * 100, 2) as avg_confidence,
			ROUND(MIN(confidence) * 100, 2) as min_confidence,
			ROUND(MAX(confidence) * 100, 2) as max_confidence,
			COUNT(CASE WHEN confidence >= 0.95 THEN 1 END) as high_count,
			COUNT(CASE WHEN confidence >= 0.80
				AND confidence < 0.95 THEN 1 END) as medium_count,
			COUNT(CASE WHEN confidence < 0.80 THEN 1 END) as low_count
		FROM parsed_items
		WHERE confidence > 0
		GROUP BY item_type
		ORDER BY item_type`)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch confidence stats",
		})
		return
	}
	defer rows.Close()

	type ConfidenceStat struct {
		ItemType      string  `json:"item_type"`
		Total         int     `json:"total"`
		AvgConfidence float64 `json:"avg_confidence"`
		MinConfidence float64 `json:"min_confidence"`
		MaxConfidence float64 `json:"max_confidence"`
		HighCount     int     `json:"high_count"`
		MediumCount   int     `json:"medium_count"`
		LowCount      int     `json:"low_count"`
	}

	var stats []ConfidenceStat
	for rows.Next() {
		var s ConfidenceStat
		rows.Scan(
			&s.ItemType, &s.Total,
			&s.AvgConfidence, &s.MinConfidence, &s.MaxConfidence,
			&s.HighCount, &s.MediumCount, &s.LowCount,
		)
		stats = append(stats, s)
	}

	if stats == nil {
		stats = []ConfidenceStat{}
	}

	// Also get low confidence items for review
	lowRows, err := h.db.Query(`
		SELECT
			pi.name,
			pi.item_type,
			ROUND(pi.confidence * 100, 0) as confidence_pct,
			v.id as visit_id
		FROM parsed_items pi
		JOIN visits v ON v.id = pi.visit_id
		WHERE pi.confidence > 0
		AND pi.confidence < 0.80
		ORDER BY pi.confidence ASC
		LIMIT 10`)

	type LowConfItem struct {
		Name          string  `json:"name"`
		ItemType      string  `json:"item_type"`
		ConfidencePct float64 `json:"confidence_pct"`
		VisitID       int     `json:"visit_id"`
	}

	var lowItems []LowConfItem
	if err == nil {
		defer lowRows.Close()
		for lowRows.Next() {
			var item LowConfItem
			lowRows.Scan(
				&item.Name, &item.ItemType,
				&item.ConfidencePct, &item.VisitID,
			)
			lowItems = append(lowItems, item)
		}
	}

	if lowItems == nil {
		lowItems = []LowConfItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"by_category":        stats,
		"low_confidence_items": lowItems,
	})
}