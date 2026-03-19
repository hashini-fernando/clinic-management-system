import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPatient, getPatientVisits } from '../services/api'

export default function PatientHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getPatient(id), getPatientVisits(id)])
      .then(([patientRes, visitsRes]) => {
        setPatient(patientRes.data)
        setVisits(visitsRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="spinner">
      <div className="spinner-icon">⏳</div>
      Loading history...
    </div>
  )

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Visit History</h1>
          <p className="page-subtitle">
            All past visits for this patient
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>

      {/* Patient info card */}
      {patient && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--primary-light), #e0f2fe)',
          border: '1px solid var(--primary-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {patient.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gray-900)' }}>
                {patient.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
                {patient.age} yrs &nbsp;·&nbsp;
                <span style={{ textTransform: 'capitalize' }}>{patient.gender}</span>
                &nbsp;·&nbsp; {patient.phone}
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/patients/${id}/visit`)}
          >
            + New Visit
          </button>
        </div>
      )}

      {/* Visits list */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0, border: 'none',
            paddingBottom: 0, fontSize: '15px'
          }}>
            Past Visits
          </h2>
          <span className="badge badge-blue">{visits.length} visits</span>
        </div>

        {visits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No visits yet</div>
            <div className="empty-state-sub">
              Start the first visit for this patient
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/patients/${id}/visit`)}
            >
              + Start Visit
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Visit #</th>
                <th>Date & Time</th>
                <th>Notes Preview</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(v => (
                <tr key={v.id}>
                  <td>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--primary)'
                    }}>
                      #{v.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {new Date(v.visit_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                      {new Date(v.visit_date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td style={{ maxWidth: '320px' }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '13px',
                      color: 'var(--gray-500)'
                    }}>
                      {v.raw_input}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      v.status === 'confirmed' ? 'badge-green' :
                      v.status === 'pending' ? 'badge-yellow' :
                      'badge-gray'
                    }`}>
                      {v.status === 'confirmed' ? ' Confirmed' :
                       v.status === 'pending' ? '⏳ Pending' : v.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate(`/visits/${v.id}`)}
                    >
                      👁️ View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}