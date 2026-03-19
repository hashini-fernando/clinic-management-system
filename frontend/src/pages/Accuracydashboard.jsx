import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function AccuracyDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]         = useState(null)
  const [prf, setPrf]             = useState(null)
  const [conf, setConf]           = useState(null)
  const [visits, setVisits]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    Promise.all([
      api.get('/accuracy/stats'),
      api.get('/accuracy/prf'),
      api.get('/accuracy/confidence'),
    ])
      .then(([s, p, c]) => {
        setStats(s.data.summary)
        setVisits(s.data.visits)
        setPrf(p.data)
        setConf(c.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const tabs = [
    { id: 'overview',    label: 'Overview' },
    { id: 'prf',         label: 'Precision · Recall · F1' },
    { id: 'confidence',  label: 'Confidence Scores' },
    { id: 'per_visit',   label: 'Per Visit' },
    { id: 'methodology', label: 'Methodology' },
  ]

  // Shared styles
  const metricCard = {
    background: 'white',
    border: '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    textAlign: 'center'
  }

  const metricValue = {
    fontSize: '36px',
    fontWeight: 800,
    color: 'var(--gray-900)',
    lineHeight: 1,
    marginBottom: '6px'
  }

  const metricLabel = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--gray-500)'
  }

  const formulaBox = {
    fontFamily: 'monospace',
    fontSize: '12px',
    background: 'var(--gray-100)',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'var(--gray-600)',
    marginTop: '6px',
    display: 'inline-block'
  }

  if (loading) return (
    <div className="spinner">
      <div className="spinner-icon">⏳</div>
      Loading accuracy data...
    </div>
  )

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Accuracy Dashboard</h1>
          <p className="page-subtitle">
            Multi-label classification evaluation — Drugs · Lab Tests · Observations
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>

      {/* No data */}
      {visits.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No accuracy data yet</div>
            <div className="empty-state-sub">
              Complete a visit and confirm AI results to see metrics
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Go to Patients
            </button>
          </div>
        </div>
      )}

      {visits.length > 0 && (
        <>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: '2px',
            marginBottom: '24px',
            borderBottom: '2px solid var(--gray-200)'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 18px',
                  border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: '14px',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--gray-500)',
                  borderBottom: activeTab === tab.id
                    ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: '-2px',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              {/* 4 stat cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px', marginBottom: '24px'
              }}>
                {[
                  { label: 'Overall Accuracy', val: stats?.overall_accuracy },
                  { label: 'F1 Score',         val: stats?.f1_score },
                  { label: 'Visits Analyzed',  val: stats?.total_visits, isInt: true },
                  { label: 'Avg Confidence',   val: stats?.avg_confidence },
                ].map(({ label, val, isInt }) => (
                  <div key={label} style={metricCard}>
                    <div style={metricValue}>
                      {isInt ? val : `${val?.toFixed(1)}%`}
                    </div>
                    <div style={metricLabel}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Accuracy bars */}
              <div className="card">
                <h2>Accuracy by Category</h2>
                {[
                  { label: 'Drugs & Dosages', val: stats?.drug_accuracy },
                  { label: 'Lab Tests',       val: stats?.lab_accuracy },
                  { label: 'Observations',    val: stats?.obs_accuracy },
                  { label: 'Overall',         val: stats?.overall_accuracy },
                ].map(({ label, val }) => (
                  <div key={label} style={{ marginBottom: '18px' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: '6px', fontSize: '14px'
                    }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <strong>{val?.toFixed(1)}%</strong>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill progress-green"
                        style={{ width: `${val || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* PRF summary */}
              <div className="card">
                <h2>Multi-Label Classification Metrics</h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '16px'
                }}>
                  {[
                    { label: 'Precision', val: stats?.precision_score, formula: 'TP / (TP + FP)' },
                    { label: 'Recall',    val: stats?.recall_score,    formula: 'TP / (TP + FN)' },
                    { label: 'F1 Score',  val: stats?.f1_score,        formula: '2 × P × R / (P + R)' },
                  ].map(({ label, val, formula }) => (
                    <div key={label} style={{ ...metricCard, padding: '24px' }}>
                      <div style={{ ...metricValue, fontSize: '40px' }}>
                        {val?.toFixed(1)}%
                      </div>
                      <div style={{ ...metricLabel, marginBottom: '6px' }}>
                        {label}
                      </div>
                      <div style={formulaBox}>{formula}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── PRF ── */}
          {activeTab === 'prf' && (
            <>
              {/* Macro cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px', marginBottom: '24px'
              }}>
                {[
                  {
                    label: 'Macro Precision',
                    val: prf?.macro?.precision,
                    desc: 'Of AI found — how many correct',
                    formula: 'TP / (TP + FP)'
                  },
                  {
                    label: 'Macro Recall',
                    val: prf?.macro?.recall,
                    desc: 'Of all real items — how many AI found',
                    formula: 'TP / (TP + FN)'
                  },
                  {
                    label: 'Macro F1 Score',
                    val: prf?.macro?.f1,
                    desc: 'Harmonic mean of Precision and Recall',
                    formula: '2 × P × R / (P + R)'
                  },
                ].map(({ label, val, desc, formula }) => (
                  <div key={label} className="card" style={{ marginBottom: 0, textAlign: 'center' }}>
                    <div style={{ ...metricValue, fontSize: '44px', marginTop: '8px' }}>
                      {val?.toFixed(1)}%
                    </div>
                    <div style={{ ...metricLabel, fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '8px' }}>
                      {desc}
                    </div>
                    <div style={formulaBox}>{formula}</div>
                    <div className="progress-bar" style={{ marginTop: '16px' }}>
                      <div className="progress-fill progress-green" style={{ width: `${val || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Per label table */}
              <div className="card">
                <h2>Per Label Breakdown</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1 Score</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Drugs & Dosages', prec: prf?.per_label?.drugs?.precision,        rec: prf?.per_label?.drugs?.recall,        f1: prf?.per_label?.drugs?.f1 },
                      { label: 'Lab Tests',       prec: prf?.per_label?.labs?.precision,         rec: prf?.per_label?.labs?.recall,         f1: prf?.per_label?.labs?.f1 },
                      { label: 'Observations',    prec: prf?.per_label?.observations?.precision, rec: prf?.per_label?.observations?.recall, f1: prf?.per_label?.observations?.f1 },
                    ].map(({ label, prec, rec, f1 }) => (
                      <tr key={label}>
                        <td style={{ fontWeight: 600 }}>{label}</td>
                        <td style={{ fontWeight: 600 }}>{prec?.toFixed(1)}%</td>
                        <td style={{ fontWeight: 600 }}>{rec?.toFixed(1)}%</td>
                        <td style={{ fontWeight: 600 }}>{f1?.toFixed(1)}%</td>
                        <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                          {f1 >= 90 ? 'Excellent' : f1 >= 80 ? 'Good' : f1 >= 70 ? 'Fair' : 'Needs improvement'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                      <td style={{ fontWeight: 700 }}>Macro Average</td>
                      <td style={{ fontWeight: 700 }}>{prf?.macro?.precision?.toFixed(1)}%</td>
                      <td style={{ fontWeight: 700 }}>{prf?.macro?.recall?.toFixed(1)}%</td>
                      <td style={{ fontWeight: 700 }}>{prf?.macro?.f1?.toFixed(1)}%</td>
                      <td style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Averaged across all labels</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── CONFIDENCE ── */}
          {activeTab === 'confidence' && (
            <>
              <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                <strong>About Confidence Scores</strong>
                <p style={{ marginTop: '4px', fontSize: '13px' }}>
                  Confidence scores are stored in the database for analysis only.
                  They are not shown on patient-facing documents (prescriptions, lab requests).
                </p>
              </div>

              {/* Scale */}
              <div className="card">
                <h2>Confidence Scale</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Range</th>
                      <th>Level</th>
                      <th>Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { range: '95% – 100%', level: 'High',     meaning: 'Explicitly stated in notes' },
                      { range: '80% – 94%',  level: 'Medium',   meaning: 'Reasonably clear' },
                      { range: '60% – 79%',  level: 'Low',      meaning: 'Implied or inferred' },
                      { range: 'Below 60%',  level: 'Very Low', meaning: 'Uncertain — verify manually' },
                    ].map(({ range, level, meaning }) => (
                      <tr key={range}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{range}</td>
                        <td style={{ fontWeight: 600 }}>{level}</td>
                        <td style={{ color: 'var(--gray-500)' }}>{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* By category */}
              <div className="card">
                <h2>Confidence by Category</h2>
                {!conf?.by_category?.length ? (
                  <p style={{ color: 'var(--gray-400)' }}>No data yet</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Total</th>
                        <th>Avg</th>
                        <th>High (≥95%)</th>
                        <th>Medium (80-94%)</th>
                        <th>Low (&lt;80%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conf.by_category.map(s => (
                        <tr key={s.item_type}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {s.item_type === 'drug' ? 'Drugs' :
                             s.item_type === 'lab_test' ? 'Lab Tests' : 'Observations'}
                          </td>
                          <td>{s.total}</td>
                          <td style={{ fontWeight: 600 }}>{s.avg_confidence?.toFixed(1)}%</td>
                          <td>{s.high_count}</td>
                          <td>{s.medium_count}</td>
                          <td>{s.low_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Low confidence items */}
              {conf?.low_confidence_items?.length > 0 && (
                <div className="card">
                  <h2>Low Confidence Items</h2>
                  <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px' }}>
                    These items need manual verification.
                  </p>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Type</th>
                        <th>Confidence</th>
                        <th>Visit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conf.low_confidence_items.map((item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{item.name}</td>
                          <td style={{ textTransform: 'capitalize' }}>{item.item_type}</td>
                          <td style={{ fontWeight: 600 }}>{item.confidence_pct}%</td>
                          <td>#{item.visit_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── PER VISIT ── */}
          {activeTab === 'per_visit' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-100)' }}>
                <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>Per Visit Accuracy</h2>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Visit</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Drugs</th>
                    <th>Labs</th>
                    <th>Obs</th>
                    <th>Overall</th>
                    <th>F1</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>#{v.id}</td>
                      <td>{v.patient_name}</td>
                      <td style={{ fontSize: '13px' }}>
                        {new Date(v.visit_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td>
                        {v.drug_accuracy?.toFixed(0)}%
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginLeft: '4px' }}>
                          {v.ai_drugs_count}→{v.confirmed_drugs_count}
                        </span>
                      </td>
                      <td>
                        {v.lab_accuracy?.toFixed(0)}%
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginLeft: '4px' }}>
                          {v.ai_labs_count}→{v.confirmed_labs_count}
                        </span>
                      </td>
                      <td>
                        {v.obs_accuracy?.toFixed(0)}%
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginLeft: '4px' }}>
                          {v.ai_obs_count}→{v.confirmed_obs_count}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{v.overall_accuracy?.toFixed(1)}%</td>
                      <td style={{ fontWeight: 700 }}>{v.f1_score?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── METHODOLOGY ── */}
          {activeTab === 'methodology' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              <div className="card">
                <h2>Multi-Label Classification</h2>
                <p style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--gray-600)' }}>
                  This system performs <strong>multi-label classification</strong> — a single clinical
                  text is simultaneously classified into multiple categories:
                </p>
                <ul style={{ marginTop: '12px', paddingLeft: '20px', fontSize: '14px', lineHeight: '2', color: 'var(--gray-600)' }}>
                  <li><strong>Label 1:</strong> Drugs & Dosages</li>
                  <li><strong>Label 2:</strong> Lab Tests & Investigations</li>
                  <li><strong>Label 3:</strong> Clinical Observations</li>
                </ul>
                <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                  Standard accuracy alone is insufficient for multi-label tasks.
                  Precision, Recall and F1 are the correct evaluation metrics.
                </p>
              </div>

              <div className="card">
                <h2>Metric Definitions</h2>
                {[
                  { term: 'True Positive (TP)',  def: 'AI classified an item AND doctor confirmed it' },
                  { term: 'False Positive (FP)', def: 'AI classified an item BUT doctor removed it' },
                  { term: 'False Negative (FN)', def: 'Doctor added an item that AI missed' },
                ].map(({ term, def }) => (
                  <div key={term} style={{
                    marginBottom: '14px', paddingLeft: '12px',
                    borderLeft: '3px solid var(--gray-300)'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gray-700)' }}>{term}</div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{def}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h2>Formula Reference</h2>
                {[
                  { name: 'Precision',     formula: 'TP / (TP + FP)',     meaning: 'Of what AI found, how many were correct?' },
                  { name: 'Recall',        formula: 'TP / (TP + FN)',     meaning: 'Of all real items, how many did AI find?' },
                  { name: 'F1 Score',      formula: '2 × (P × R) / (P + R)', meaning: 'Harmonic mean — balanced score of P and R' },
                  { name: 'Macro Average', formula: 'Avg P/R/F1 across 3 labels', meaning: 'Standard for imbalanced multi-label tasks' },
                ].map(({ name, formula, meaning }) => (
                  <div key={name} style={{
                    marginBottom: '12px', padding: '12px',
                    background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--gray-200)'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--primary)', marginBottom: '4px' }}>
                      {formula}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{meaning}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h2>Ground Truth Method</h2>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: '1.8', marginBottom: '16px' }}>
                  Ground truth is established via <strong>Human-in-the-Loop validation</strong> —
                  a doctor reviews every AI classification before saving.
                </p>
                {[
                  { step: '1', text: 'AI classifies clinical notes into 3 labels' },
                  { step: '2', text: 'Doctor reviews — edits, adds or removes items' },
                  { step: '3', text: 'Doctor confirms — final data saved as ground truth' },
                  { step: '4', text: 'System compares AI output vs confirmed data and calculates P/R/F1' },
                ].map(({ step, text }) => (
                  <div key={step} style={{
                    display: 'flex', gap: '12px',
                    marginBottom: '12px', alignItems: 'flex-start'
                  }}>
                    <div style={{
                      width: '24px', height: '24px',
                      borderRadius: '50%',
                      background: 'var(--gray-200)',
                      color: 'var(--gray-700)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, flexShrink: 0
                    }}>
                      {step}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-600)', paddingTop: '3px' }}>
                      {text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}