import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPatient, parseVisit } from '../services/api'
import toast from 'react-hot-toast'
import api from '../services/api'

// ── Confidence Badge ──────────────────────────────────────
function ConfidenceBadge({ value }) {
  if (!value || value === 0) return (
    <span style={{
      fontSize: '11px', fontWeight: 600,
      padding: '2px 8px', borderRadius: '999px',
      background: 'var(--gray-100)', color: 'var(--gray-400)'
    }}>
      No score
    </span>
  )

  const pct = Math.round(value * 100)
  const level =
    pct >= 95 ? { bg: '#dcfce7', color: '#15803d', text: 'High',   border: '#86efac' } :
    pct >= 80 ? { bg: '#fef9c3', color: '#a16207', text: 'Medium', border: '#fde047' } :
                { bg: '#fee2e2', color: '#b91c1c', text: 'Low',    border: '#fca5a5' }

  return (
    <span style={{
      fontSize: '11px', fontWeight: 700,
      padding: '2px 10px', borderRadius: '999px',
      background: level.bg, color: level.color,
      border: `1px solid ${level.border}`,
      display: 'inline-flex', alignItems: 'center', gap: '4px'
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: level.color, display: 'inline-block'
      }} />
      {level.text} {pct}%
    </span>
  )
}

// ── Confidence Guide ──────────────────────────────────────
function ConfidenceGuide() {
  return (
    <div style={{
      display: 'flex', gap: '16px', flexWrap: 'wrap',
      padding: '12px 16px',
      background: 'var(--gray-50)',
      border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius-sm)',
      marginBottom: '16px',
      fontSize: '12px',
      color: 'var(--gray-600)'
    }}>
      <strong style={{ color: 'var(--gray-700)' }}>AI Confidence:</strong>
      {[
        { bg: '#dcfce7', color: '#15803d', label: 'High (≥95%)',    desc: 'Explicitly stated' },
        { bg: '#fef9c3', color: '#a16207', label: 'Medium (80-94%)', desc: 'Reasonably clear' },
        { bg: '#fee2e2', color: '#b91c1c', label: 'Low (<80%)',     desc: 'Verify carefully' },
      ].map(({ bg, color, label, desc }) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            padding: '1px 8px', borderRadius: '999px',
            background: bg, color, fontSize: '11px', fontWeight: 700
          }}>
            {label}
          </span>
          <span>{desc}</span>
        </span>
      ))}
    </div>
  )
}

export default function VisitInput() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [patient, setPatient]           = useState(null)
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [listening, setListening]       = useState(false)
  const [parsedResult, setParsedResult] = useState(null)
  const [visitId, setVisitId]           = useState(null)
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    getPatient(id).then(res => setPatient(res.data)).catch(console.error)
  }, [id])

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Speech not supported in this browser'); return }
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    r.onstart  = () => setListening(true)
    r.onend    = () => setListening(false)
    r.onresult = (e) => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      setInput(t)
    }
    r.start()
    setTimeout(() => r.stop(), 10000)
  }

  const handleParse = async () => {
    if (!input.trim())            { toast.error('Please enter clinic notes'); return }
    if (input.trim().length < 10) { toast.error('Notes too short'); return }
    setLoading(true)
    try {
      const res = await parseVisit({ patient_id: parseInt(id), raw_input: input })
      setParsedResult(res.data.parsed_result)
      setVisitId(res.data.visit_id)
      toast.success('AI parsed! Review results below before saving.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to parse notes')
    } finally {
      setLoading(false)
    }
  }

  // Edit helpers
  const updateDrug = (i, f, v) => { const u = { ...parsedResult }; u.drugs[i][f] = v; setParsedResult(u) }
  const updateLab  = (i, f, v) => { const u = { ...parsedResult }; u.lab_tests[i][f] = v; setParsedResult(u) }
  const updateObs  = (i, v)    => { const u = { ...parsedResult }; u.observations[i].note = v; setParsedResult(u) }
  const removeDrug = (i) => { const u = { ...parsedResult }; u.drugs.splice(i, 1); setParsedResult({ ...u }) }
  const removeLab  = (i) => { const u = { ...parsedResult }; u.lab_tests.splice(i, 1); setParsedResult({ ...u }) }
  const removeObs  = (i) => { const u = { ...parsedResult }; u.observations.splice(i, 1); setParsedResult({ ...u }) }
  const addDrug = () => { const u = { ...parsedResult }; u.drugs.push({ name: '', dosage: '', frequency: '', duration: '', confidence: 0 }); setParsedResult({ ...u }) }
  const addLab  = () => { const u = { ...parsedResult }; u.lab_tests.push({ name: '', notes: '', confidence: 0 }); setParsedResult({ ...u }) }
  const addObs  = () => { const u = { ...parsedResult }; u.observations.push({ note: '', confidence: 0 }); setParsedResult({ ...u }) }

  const handleSaveConfirmed = async () => {
    if (parsedResult.drugs.find(d => !d.name.trim()))     { toast.error('Fill in all drug names'); return }
    if (parsedResult.lab_tests.find(l => !l.name.trim())) { toast.error('Fill in all lab test names'); return }
    setSaving(true)
    try {
      await api.post(`/visits/${visitId}/confirm`, { parsed_result: parsedResult })
      toast.success('Visit confirmed and saved!')
      navigate(`/visits/${visitId}`)
    } catch {
      toast.error('Failed to save visit')
    } finally {
      setSaving(false)
    }
  }

  const sampleText = `Patient presents with fever (38.5°C) and sore throat for 3 days.
BP 120/80, Pulse 88bpm. Throat appears inflamed.
Prescribe Amoxicillin 500mg TDS for 7 days.
Paracetamol 500mg BD PRN for fever.
Order CBC and throat swab culture.
Impression: Acute tonsillitis. Follow up in 1 week.`

  const itemCard = (lowConf) => ({
    background: lowConf ? '#fff7f7' : 'var(--gray-50)',
    border: lowConf ? '1px solid #fca5a5' : '1px solid var(--gray-200)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    marginBottom: '8px'
  })

  const isLowConf = (val) => val > 0 && val < 0.80

  const countBadge = {
    marginLeft: '8px', fontSize: '11px',
    background: 'var(--gray-100)', color: 'var(--gray-600)',
    padding: '2px 8px', borderRadius: '999px', fontWeight: 600
  }

  const removeBtn = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--danger)', fontSize: '12px', fontWeight: 600
  }

  const lowConfWarning = (msg) => (
    <div style={{
      fontSize: '11px', color: '#b91c1c',
      background: '#fee2e2', padding: '4px 8px',
      borderRadius: '4px', marginBottom: '8px', fontWeight: 500
    }}>
      Low confidence — {msg}
    </div>
  )

  return (
    <div className="page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinic Notes</h1>
          <p className="page-subtitle">
            Enter notes — AI will classify automatically
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/')}>← Back</button>
      </div>

      {/* Patient banner */}
      {patient && (
        <div style={{
          background: 'linear-gradient(135deg, var(--primary-light), #e0f2fe)',
          border: '1px solid var(--primary-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
            {patient.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gray-900)' }}>
              {patient.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
              {patient.age} yrs
              {patient.gender && <> · <span style={{ textTransform: 'capitalize' }}>{patient.gender}</span></>}
              {patient.phone  && <> · {patient.phone}</>}
            </div>
          </div>
        </div>
      )}

      {/* Notes input */}
      <div className="card">
        <h2>Doctor Notes</h2>
        <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px', marginTop: '-8px' }}>
          Type everything together — AI classifies drugs, lab tests and observations automatically
        </p>

        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={7}
            placeholder={`e.g. Patient has fever 38.5°C and sore throat.\nPrescribe Paracetamol 500mg twice daily.\nOrder CBC blood test.\nFollow up in 3 days.`}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!!parsedResult}
            style={{ fontSize: '14px', lineHeight: '1.7', resize: 'vertical' }}
          />
        </div>

        <div style={{
          fontSize: '12px', textAlign: 'right', marginBottom: '16px',
          color: input.length > 4500 ? 'var(--danger)' : 'var(--gray-400)'
        }}>
          {input.length} / 5000
        </div>

        {!parsedResult ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleParse} disabled={loading}>
              {loading ? 'Analyzing...' : 'Parse with AI'}
            </button>
            <button
              className={`btn ${listening ? 'btn-danger' : 'btn-outline'}`}
              onClick={startListening} disabled={listening}
            >
              {listening ? 'Listening...' : 'Speak Notes'}
            </button>
            <button className="btn btn-outline" onClick={() => setInput(sampleText)}>
              Load Sample
            </button>
            <button className="btn btn-ghost" onClick={() => setInput('')} disabled={!input}>
              Clear
            </button>
          </div>
        ) : (
          <button className="btn btn-outline"
            onClick={() => { setParsedResult(null); setVisitId(null) }}>
            Re-enter Notes
          </button>
        )}
      </div>

      {/* Human-in-the-Loop Review */}
      {parsedResult && (
        <>
          <div className="alert alert-warning">
            <strong>Doctor Review Required</strong>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Review all AI results below. Items with <strong>Low confidence</strong> are
              highlighted — verify these carefully before confirming.
            </p>
          </div>

          <ConfidenceGuide />

          {/* 3 column grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>

            {/* Drugs */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <span className="card-title">
                  Drugs & Dosages
                  <span style={countBadge}>{parsedResult.drugs.length}</span>
                </span>
                <button className="btn btn-outline btn-sm" onClick={addDrug}>+ Add</button>
              </div>

              {parsedResult.drugs.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>No drugs found. Add if needed.</p>
              ) : parsedResult.drugs.map((drug, i) => (
                <div key={i} style={itemCard(isLowConf(drug.confidence))}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600 }}>AI Confidence:</span>
                      <ConfidenceBadge value={drug.confidence} />
                    </div>
                    <button style={removeBtn} onClick={() => removeDrug(i)}>Remove</button>
                  </div>
                  {isLowConf(drug.confidence) && lowConfWarning('please verify this drug name')}
                  <input placeholder="Drug name *" value={drug.name} onChange={e => updateDrug(i, 'name', e.target.value)} className="form-input" style={{ marginBottom: '6px', fontSize: '13px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                    <input placeholder="Dosage"    value={drug.dosage}    onChange={e => updateDrug(i, 'dosage', e.target.value)}    className="form-input" style={{ fontSize: '12px' }} />
                    <input placeholder="Frequency" value={drug.frequency} onChange={e => updateDrug(i, 'frequency', e.target.value)} className="form-input" style={{ fontSize: '12px' }} />
                  </div>
                  <input placeholder="Duration" value={drug.duration} onChange={e => updateDrug(i, 'duration', e.target.value)} className="form-input" style={{ fontSize: '12px' }} />
                </div>
              ))}
            </div>

            {/* Lab Tests */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <span className="card-title">
                  Lab Tests
                  <span style={countBadge}>{parsedResult.lab_tests.length}</span>
                </span>
                <button className="btn btn-outline btn-sm" onClick={addLab}>+ Add</button>
              </div>

              {parsedResult.lab_tests.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>No lab tests found. Add if needed.</p>
              ) : parsedResult.lab_tests.map((lab, i) => (
                <div key={i} style={itemCard(isLowConf(lab.confidence))}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600 }}>AI Confidence:</span>
                      <ConfidenceBadge value={lab.confidence} />
                    </div>
                    <button style={removeBtn} onClick={() => removeLab(i)}>Remove</button>
                  </div>
                  {isLowConf(lab.confidence) && lowConfWarning('please verify this test')}
                  <input placeholder="Test name *" value={lab.name} onChange={e => updateLab(i, 'name', e.target.value)} className="form-input" style={{ marginBottom: '6px', fontSize: '13px' }} />
                  <input placeholder="Special instructions" value={lab.notes} onChange={e => updateLab(i, 'notes', e.target.value)} className="form-input" style={{ fontSize: '12px' }} />
                </div>
              ))}
            </div>

            {/* Observations */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <span className="card-title">
                  Observations
                  <span style={countBadge}>{parsedResult.observations.length}</span>
                </span>
                <button className="btn btn-outline btn-sm" onClick={addObs}>+ Add</button>
              </div>

              {parsedResult.observations.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>No observations found. Add if needed.</p>
              ) : parsedResult.observations.map((obs, i) => (
                <div key={i} style={itemCard(isLowConf(obs.confidence))}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600 }}>AI Confidence:</span>
                      <ConfidenceBadge value={obs.confidence} />
                    </div>
                    <button style={removeBtn} onClick={() => removeObs(i)}>Remove</button>
                  </div>
                  {isLowConf(obs.confidence) && lowConfWarning('please verify this observation')}
                  <input placeholder="Observation note *" value={obs.note} onChange={e => updateObs(i, e.target.value)} className="form-input" style={{ fontSize: '13px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Confirm & Save */}
          <div className="card" style={{
            background: 'var(--success-light)',
            border: '1px solid var(--success-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gray-800)' }}>
                  Doctor Confirmation
                </div>
                <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                  I have reviewed all AI results and verified low confidence items
                </div>
              </div>
              <button className="btn btn-success btn-lg" onClick={handleSaveConfirmed} disabled={saving}>
                {saving ? 'Saving...' : 'Confirm & Save Visit'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}