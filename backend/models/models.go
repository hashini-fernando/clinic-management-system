package models

import "time"

// Patient represents a clinic patient
type Patient struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Age       int       `json:"age"`
	Gender    *string    `json:"gender"`
	Phone     *string    `json:"phone"`
	Address   *string    `json:"address"`
	CreatedAt time.Time `json:"created_at"`
}

// Visit represents a doctor visit session
type Visit struct {
	ID          int       `json:"id"`
	PatientID   int       `json:"patient_id"`
	RawInput    string    `json:"raw_input"`
	VisitDate   time.Time `json:"visit_date"`
	DoctorNotes *string    `json:"doctor_notes"`
	Status      string    `json:"status"`
}

// ParsedItem represents a classified item from doctor notes
type ParsedItem struct {
	ID        int       `json:"id"`
	VisitID   int       `json:"visit_id"`
	ItemType  string    `json:"item_type"` // drug, lab_test, observation
	Name      string    `json:"name"`
	Dosage    *string    `json:"dosage"`
	Frequency *string    `json:"frequency"`
	Duration  *string    `json:"duration"`
	Notes     *string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	Confidence float64 `json:"confidence"`
}

// Billing represents the bill for a visit
type Billing struct {
	ID          int       `json:"id"`
	VisitID     int       `json:"visit_id"`
	TotalAmount float64   `json:"total_amount"`
	Status      string    `json:"status"` // unpaid, paid
	CreatedAt   time.Time `json:"created_at"`
}

// BillingItem represents a single line item in the bill
type BillingItem struct {
	ID          int       `json:"id"`
	BillingID   int       `json:"billing_id"`
	Description string    `json:"description"`
	ItemType    string    `json:"item_type"` // drug, lab_test, consultation, other
	UnitPrice   float64   `json:"unit_price"`
	Quantity    int       `json:"quantity"`
	TotalPrice  float64   `json:"total_price"`
	CreatedAt   time.Time `json:"created_at"`
}

// ParseRequest is what the frontend sends to be parsed
type ParseRequest struct {
	PatientID int    `json:"patient_id"`
	RawInput  string `json:"raw_input"`
}

// ParsedResult is the structured response from OpenAI
type ParsedResult struct {
	Drugs        []DrugItem        `json:"drugs"`
	LabTests     []LabTestItem     `json:"lab_tests"`
	Observations []ObservationItem `json:"observations"`
}

// DrugItem represents a parsed drug
type DrugItem struct {
	Name      string `json:"name"`
	Dosage    string `json:"dosage"`
	Frequency string `json:"frequency"`
	Duration  string `json:"duration"`
	Confidence float64 `json:"confidence"`
}

// LabTestItem represents a parsed lab test
type LabTestItem struct {
	Name  string `json:"name"`
	Notes string `json:"notes"`
	Confidence float64 `json:"confidence"`
}

// ObservationItem represents a parsed observation
type ObservationItem struct {
	Note string `json:"note"`
	Confidence float64 `json:"confidence"`
}