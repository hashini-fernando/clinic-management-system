import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getVisit, getBilling, markAsPaid } from '../services/api'
import toast from 'react-hot-toast'

export default function VisitResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visit, setVisit]           = useState(null)
  const [items, setItems]           = useState([])
  const [billing, setBilling]       = useState(null)
  const [billingItems, setBillingItems] = useState([])
  const [accuracy, setAccuracy]     = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([getVisit(id), getBilling(id)])
      .then(([visitRes, billingRes]) => {
        setVisit(visitRes.data.visit)
        setItems(visitRes.data.items)
        setAccuracy(visitRes.data.accuracy)
        setBilling(billingRes.data.billing)
        setBillingItems(billingRes.data.items)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handlePay = async () => {
    try {
      await markAsPaid(id)
      toast.success('Payment recorded!')
      setBilling(prev => ({ ...prev, status: 'paid' }))
    } catch {
      toast.error('Failed to update payment')
    }
  }

  const drugs       = items.filter(i => i.item_type === 'drug')
  const labs        = items.filter(i => i.item_type === 'lab_test')
  const observations = items.filter(i => i.item_type === 'observation')

  // Reusable styles
  const thStyle = {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--gray-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    padding: '0 0 8px 0'
  }

  const tdStyle = (i, total) => ({
    padding: '10px 0',
    fontSize: '13px',
    color: 'var(--gray-500)',
    borderBottom: i < total - 1 ? '1px solid var(--gray-100)' : 'none'
  })

  const tdBold = (i, total) => ({
    padding: '10px 0',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--gray-800)',
    borderBottom: i < total - 1 ? '1px solid var(--gray-100)' : 'none'
  })

  const countBadge = {
    marginLeft: '8px',
    fontSize: '11px',
    background: 'var(--gray-100)',
    color: 'var(--gray-600)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600
  }

  if (loading) return (
    <div className="spinner">
      <div className="spinner-icon">⏳</div>
      Loading visit details...
    </div>
  )

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Visit Results</h1>
          <p className="page-subtitle">
            Visit #{id}
            {visit && (
              <> · {new Date(visit.visit_date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric',
                month: 'long', day: 'numeric'
              })}</>
            )}
            {visit?.status && (
              <span style={{
                marginLeft: '10px',
                padding: '2px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                background: visit.status === 'confirmed'
                  ? 'var(--success-light)' : 'var(--warning-light)',
                color: visit.status === 'confirmed'
                  ? 'var(--success)' : 'var(--warning)',
                border: `1px solid ${visit.status === 'confirmed'
                  ? 'var(--success-border)' : 'var(--warning-border)'}`
              }}>
                {visit.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-outline no-print"
            onClick={() => window.print()}
          >
            🖨️ Print Report
          </button>
          <button
            className="btn btn-outline no-print"
            onClick={() => navigate('/')}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── Original Notes ── */}
      <div className="card">
        <h2>📝 Original Doctor Notes</h2>
        <div style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          fontSize: '14px',
          lineHeight: '1.8',
          color: 'var(--gray-600)',
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--gray-100)'
          }}>
            <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
              💰 Bill Summary
            </h2>
            <span style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 700,
              background: billing.status === 'paid'
                ? 'var(--success-light)' : '#fff7ed',
              color: billing.status === 'paid'
                ? 'var(--success)' : '#c2410c',
              border: `1px solid ${billing.status === 'paid'
                ? 'var(--success-border)' : '#fed7aa'}`
            }}>
              {billing.status === 'paid' ? '✅ PAID' : '⏳ UNPAID'}
            </span>
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
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'var(--gray-100)',
                      color: 'var(--gray-600)'
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
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '16px',
                  padding: '14px 20px'
                }}>
                  Total Amount
                </td>
                <td style={{
                  fontWeight: 800,
                  fontSize: '18px',
                  color: 'var(--gray-900)',
                  padding: '14px 20px'
                }}>
                  ${billing.total_amount?.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {billing.status === 'unpaid' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handlePay}
              >
                💳 Mark as Paid
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}