package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"clinic-system/backend/models"
)

type BillingHandler struct {
	db *sql.DB
}

func NewBillingHandler(db *sql.DB) *BillingHandler {
	return &BillingHandler{db: db}
}

// GetBilling - GET /api/billing/:visit_id
func (h *BillingHandler) GetBilling(c *gin.Context) {
	visitID := c.Param("visit_id")

	// Get billing summary
	var billing models.Billing
	err := h.db.QueryRow(`
		SELECT id, visit_id, total_amount, status, created_at
		FROM billing WHERE visit_id = $1`, visitID).
		Scan(&billing.ID, &billing.VisitID,
			&billing.TotalAmount, &billing.Status, &billing.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Billing not found"})
		return
	}

	// Get billing items
	rows, err := h.db.Query(`
		SELECT id, billing_id, description, item_type, unit_price, quantity, total_price
		FROM billing_items WHERE billing_id = $1`, billing.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch billing items"})
		return
	}
	defer rows.Close()

	var items []models.BillingItem
	for rows.Next() {
		var item models.BillingItem
		rows.Scan(
			&item.ID, &item.BillingID, &item.Description,
			&item.ItemType, &item.UnitPrice, &item.Quantity, &item.TotalPrice,
		)
		items = append(items, item)
	}

	if items == nil {
		items = []models.BillingItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"billing": billing,
		"items":   items,
	})
}

// MarkAsPaid - POST /api/billing/:visit_id/pay
func (h *BillingHandler) MarkAsPaid(c *gin.Context) {
	visitID := c.Param("visit_id")

	_, err := h.db.Exec(`
		UPDATE billing SET 
			status = 'paid',
			payment_status = 'paid' ,
			paid_at        = CURRENT_TIMESTAMP,
            updated_at     = CURRENT_TIMESTAMP
		WHERE visit_id = $1`, visitID)

		// Set visit as completed
    h.db.Exec(`
        UPDATE visits SET
            status     = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`, visitID)


	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update billing"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Payment recorded successfully"})
}