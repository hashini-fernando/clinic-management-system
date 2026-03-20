import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getVisit, getBilling, markAsPaid } from '../services/api'
import { getUser, hasRole } from '../services/auth'
import toast from 'react-hot-toast'

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    completed:   { bg: '#dcfce7', color: '#15803d', border: '#86efac', label: 'Completed' },
    unconfirmed: { bg: '#fef3c7', color: '#d97706', border: '#fcd34d', label: ' Awaiting Payment' },
    pending:     { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', label: 'Pending Review' },
    cancelled:   { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', label: 'Cancelled' },
  }
  const s = styles[status] || styles.pending
  return (
    <span style={{
      padding: '4px 14px', borderRadius: '999px',
      fontSize: '13px', fontWeight: 700,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`
    }}>
      {s.label}
    </span>
  )
}

// Payment badge component
function PaymentBadge({ status }) {
  const styles = {
    paid:   { bg: '#dcfce7', color: '#15803d', border: '#86efac', label: ' PAID' },
    unpaid: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: ' UNPAID' },
    waived: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', label: ' WAIVED' },
  }
  const s = styles[status] || styles.unpaid
  return (
    <span style={{
      padding: '4px 14px', borderRadius: '999px',
      fontSize: '13px', fontWeight: 700,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`
    }}>
      {s.label}
    </span>
  )
}

export default function VisitResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()

  const [visit, setVisit]               = useState(null)
  const [items, setItems]               = useState([])
  const [billing, setBilling]           = useState(null)
  const [billingItems, setBillingItems] = useState([])
  const [accuracy, setAccuracy]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [paying, setPaying]             = useState(false)

  const countBadge = {
    marginLeft: '8px',
    fontSize: '11px',
    background: 'var(--gray-100)',
    color: 'var(--gray-600)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600
  }

  useEffect(() => {
    Promise.all([getVisit(id), getBilling(id)])
      .then(([visitRes, billingRes]) => {
        setVisit(visitRes.data.visit)
        setItems(visitRes.data.items || [])
        setAccuracy(visitRes.data.accuracy)
        setBilling(billingRes.data.billing)
        setBillingItems(billingRes.data.items || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handlePay = async () => {
    setPaying(true)
    try {
      await markAsPaid(id)
      toast.success('Payment completed successfully')
      setBilling(prev => ({ ...prev, status: 'paid' }))
      setVisit(prev => ({ ...prev, status: 'completed' }))
    } catch {
      toast.error('Failed to process payment')
    } finally {
      setPaying(false)
    }
  }

  const handlePrint = () => window.print()

  const drugs        = items.filter(i => i.item_type === 'drug')
  const labs         = items.filter(i => i.item_type === 'lab_test')
  const observations = items.filter(i => i.item_type === 'observation')

  const thStyle = {
    textAlign: 'left', fontSize: '11px', fontWeight: 600,
    color: 'var(--gray-400)', textTransform: 'uppercase',
    letterSpacing: '0.6px', padding: '0 0 10px 0'
  }

  const tdStyle = (i, total) => ({
    padding: '10px 0', fontSize: '13px', color: 'var(--gray-600)',
    borderBottom: i < total - 1 ? '1px solid var(--gray-100)' : 'none'
  })

  const tdBold = (i, total) => ({
    padding: '10px 0', fontSize: '13px', fontWeight: 600,
    color: 'var(--gray-800)',
    borderBottom: i < total - 1 ? '1px solid var(--gray-100)' : 'none'
  })

  if (loading) return (
    <div className="spinner">
      <div className="spinner-icon">⏳</div>Loading visit...
    </div>
  )

  const canPay = hasRole('staff', 'admin') && billing?.status === 'unpaid'

  return (
    <div className="page">

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page { padding: 0 !important; }
          .card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            break-inside: avoid;
          }
          body { background: white !important; }
          .print-header { display: block !important; }
        }
        .print-header { display: none; }
      `}</style>

      {/* ── Print header ── */}
      <div className="print-header" style={{
        textAlign: 'center', marginBottom: '24px',
        paddingBottom: '16px', borderBottom: '2px solid #1F4E79'
      }}>
        <h1 style={{ margin: 0, fontSize: '22px', color: '#1F4E79' }}>
          ABC Health Clinic
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
          Clinical Visit Report
        </p>
      </div>

      {/* ── Header ── */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Visit Report</h1>
          <p className="page-subtitle">
            Visit #{id} &nbsp;·&nbsp;
            {visit && new Date(visit.visit_date).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }} className="no-print">
          <button className="btn btn-outline" onClick={handlePrint}>
            🖨️ Print
          </button>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>

      {/* ── Visit info bar ── */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'center',
        padding: '14px 20px', marginBottom: '20px',
        background: 'white',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px', color: 'var(--gray-400)',
            marginBottom: '4px'
          }}>
            Visit Date
          </div>
          <div style={{ fontWeight: 600 }}>
            {visit && new Date(visit.visit_date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px', color: 'var(--gray-400)',
            marginBottom: '4px'
          }}>
            Visit Status
          </div>
          <StatusBadge status={visit?.status} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px', color: 'var(--gray-400)',
            marginBottom: '4px'
          }}>
            Payment Status
          </div>
          <PaymentBadge status={billing?.status} />
        </div>
        {billing?.paid_at && (
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '13px', color: 'var(--gray-400)',
              marginBottom: '4px'
            }}>
              Paid At
            </div>
            <div style={{ fontWeight: 600, color: '#15803d' }}>
              {new Date(billing.paid_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric',
                year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Original Notes ── */}
      <div className="card">
        <h2>Doctor Notes</h2>
        <div style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px', fontSize: '14px',
          lineHeight: '1.8', color: 'var(--gray-600)',
          whiteSpace: 'pre-wrap'
        }}>
          {visit?.raw_input}
        </div>
      </div>

            {/* ── AI Classification Results ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '16px',
        marginBottom: '20px'
      }}>

        {/* Drugs */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>
            💊 Drugs & Dosages
            <span style={countBadge}>{drugs.length}</span>
          </h2>
          {drugs.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>
              No drugs found
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Dosage</th>
                  <th style={thStyle}>Frequency</th>
                </tr>
              </thead>
              <tbody>
                {drugs.map((d, i) => (
                  <tr key={d.id}>
                    <td style={tdBold(i, drugs.length)}>{d.name}</td>
                    <td style={tdStyle(i, drugs.length)}>
                      {d.dosage || '—'}
                    </td>
                    <td style={tdStyle(i, drugs.length)}>
                      {d.frequency || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Duration if any */}
          {drugs.some(d => d.duration) && (
            <div style={{ marginTop: '12px', paddingTop: '12px',
              borderTop: '1px solid var(--gray-100)' }}>
              {drugs.filter(d => d.duration).map((d, i) => (
                <div key={i} style={{
                  fontSize: '12px', color: 'var(--gray-500)',
                  marginBottom: '4px'
                }}>
                  <strong>{d.name}</strong>: {d.duration}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labs */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>
            🧪 Lab Tests
            <span style={countBadge}>{labs.length}</span>
          </h2>
          {labs.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>
              No lab tests found
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={thStyle}>Test Name</th>
                  <th style={thStyle}>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((l, i) => (
                  <tr key={l.id}>
                    <td style={tdBold(i, labs.length)}>{l.name}</td>
                    <td style={tdStyle(i, labs.length)}>
                      {l.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Observations */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>
            🔍 Observations
            <span style={countBadge}>{observations.length}</span>
          </h2>
          {observations.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>
              No observations found
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {observations.map((o, i) => (
                <li key={o.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 0',
                  borderBottom: i < observations.length - 1
                    ? '1px solid var(--gray-100)' : 'none',
                  fontSize: '13px',
                  color: 'var(--gray-700)'
                }}>
                  <span style={{
                    color: 'var(--gray-400)',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>·</span>
                  {o.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>


      {/* ── Billing ── */}
      {billing && (
        <div className="card">
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--gray-100)'
          }}>
            <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
              Bill Summary
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <PaymentBadge status={billing.status} />
              <button
                className="btn btn-outline btn-sm no-print"
                onClick={handlePrint}
              >
                🖨️ Print Bill
              </button>
            </div>
          </div>

          <table className="table" style={{ marginBottom: '16px' }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {billingItems.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.description}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px', fontWeight: 600,
                      background: item.item_type === 'consultation'
                        ? '#eff6ff' : item.item_type === 'drug'
                        ? '#f0fdf4' : '#fdf4ff',
                      color: item.item_type === 'consultation'
                        ? '#1d4ed8' : item.item_type === 'drug'
                        ? '#15803d' : '#7e22ce'
                    }}>
                      {item.item_type}
                    </span>
                  </td>
                  <td>${item.unit_price?.toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td style={{ fontWeight: 600 }}>
                    ${item.total_price?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--gray-200)' }}>
                <td colSpan={4} style={{
                  textAlign: 'right', fontWeight: 700,
                  fontSize: '16px', padding: '14px 20px'
                }}>
                  Total Amount
                </td>
                <td style={{
                  fontWeight: 800, fontSize: '20px',
                  color: 'var(--gray-900)', padding: '14px 20px'
                }}>
                  ${billing.total_amount?.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Payment section */}
          {billing.status === 'paid' ? (
            <div style={{
              background: '#dcfce7', border: '1px solid #86efac',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <span style={{ fontSize: '24px' }}>✅</span>
              <div>
                <div style={{
                  fontWeight: 700, color: '#15803d', fontSize: '15px'
                }}>
                  Payment Completed Successfully
                </div>
                {billing.paid_at && (
                  <div style={{ fontSize: '13px', color: '#166534' }}>
                    Paid on {new Date(billing.paid_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : canPay ? (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '16px 20px',
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: 'var(--radius-md)'
            }}>
              <div>
                <div style={{ fontWeight: 700, color: '#c2410c' }}>
                  Payment Pending
                </div>
                <div style={{ fontSize: '13px', color: '#9a3412' }}>
                  Total: ${billing.total_amount?.toFixed(2)}
                </div>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={handlePay}
                disabled={paying}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
              >
                {paying ? 'Processing...' : '💳 Mark as Paid'}
              </button>
            </div>
          ) : billing.status === 'unpaid' ? (
            <div style={{
              padding: '12px 16px',
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px', color: '#9a3412'
            }}>
              Payment pending — receptionist will process payment
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}