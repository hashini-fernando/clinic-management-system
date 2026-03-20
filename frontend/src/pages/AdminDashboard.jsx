import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../services/api'
import { getUser } from '../services/auth'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [patients, setPatients]     = useState([])
  const [visits, setVisits]         = useState([])
  const [accuracyStats, setAccuracy]= useState(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('overview')
  const [search, setSearch]         = useState('')
  const navigate = useNavigate()
  const user = getUser()

  useEffect(() => {
     console.log('AdminDashboard mounted')
    Promise.all([
      getPatients(),
      api.get('/visits/all').catch(() => ({ data: [] })),
      api.get('/accuracy/stats').catch(() => ({ data: { summary: null } }))
    ])
      .then(([pRes, vRes, aRes]) => {
        setPatients(pRes.data || [])
        setVisits(vRes.data || [])
        setAccuracy(aRes.data?.summary || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
      return () => console.log('AdminDashboard unmounted')
  }, [])

  const statusColor = (status) => {
    switch (status) {
      case 'completed':    return { bg: '#dcfce7', color: '#15803d', border: '#86efac' }
      case 'unconfirmed':  return { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' }
      case 'pending':      return { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' }
      case 'cancelled':    return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' }
      default:             return { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' }
    }
  }

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  )

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'patients',  label: `Patients (${patients.length})` },
    { id: 'visits',    label: `Visits (${visits.length})` },
    { id: 'accuracy',  label: 'AI Accuracy' },
    { id: 'managestaff',  label: 'Manage Staff' },
  ]

  if (loading) return (
    <div className="spinner">
      <div className="spinner-icon">⏳</div>Loading...
    </div>
  )

  const completedVisits   = visits.filter(v => v.status === 'completed').length
  const unconfirmedVisits = visits.filter(v => v.status === 'unconfirmed').length
  const pendingVisits     = visits.filter(v => v.status === 'pending').length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.name} — Full system overview</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--gray-200)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none', background: 'none',
              cursor: 'pointer', fontSize: '14px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--gray-500)',
              borderBottom: activeTab === tab.id
                ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-2px',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <>
          <div className="stats-grid" style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            marginBottom: '24px'
          }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--primary)' }}>
                {patients.length}
              </div>
              <div className="stat-label">Total Patients</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#15803d' }}>
                {completedVisits}
              </div>
              <div className="stat-label">Completed Visits</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#d97706' }}>
                {unconfirmedVisits}
              </div>
              <div className="stat-label">Awaiting Payment</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#0369a1' }}>
                {pendingVisits}
              </div>
              <div className="stat-label">Pending (Doctor)</div>
            </div>
          </div>

          {/* Visit status breakdown */}
          <div className="card">
            <h2>Visit Status Breakdown</h2>
            {[
              { label: 'Completed (Paid)',       count: completedVisits,   ...statusColor('completed') },
              { label: 'Awaiting Payment',        count: unconfirmedVisits, ...statusColor('unconfirmed') },
              { label: 'Pending Doctor Review',   count: pendingVisits,     ...statusColor('pending') },
              { label: 'Cancelled',               count: visits.filter(v => v.status === 'cancelled').length, ...statusColor('cancelled') },
            ].map(({ label, count, bg, color, border }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '12px 16px',
                background: bg, borderRadius: 'var(--radius-sm)',
                border: `1px solid ${border}`, marginBottom: '8px'
              }}>
                <span style={{ fontWeight: 600, color }}>
                  {label}
                </span>
                <span style={{
                  fontWeight: 800, fontSize: '20px', color
                }}>
                  {count}
                </span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="card">
            <h2>Quick Actions</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/patients/new')}
              >
                + Register Patient
              </button>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/accuracy')}
              >
               <button
              className="btn btn-outline"
              onClick={() => navigate('/users')}
            >
              Manage Staff
            </button>
                View AI Accuracy
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setActiveTab('visits')}
              >
                View All Visits
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Patients ── */}
      {activeTab === 'patients' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--gray-100)',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <input
              className="form-input"
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: '320px' }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/patients/new')}
            >
              + Register Patient
            </button>
           
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--gray-400)' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar">{p.name?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                          ID #{p.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{p.age} yrs</td>
                  <td>
                    <span className={`badge ${
                      p.gender === 'male'   ? 'badge-blue' :
                      p.gender === 'female' ? 'badge-pink' : 'badge-gray'
                    }`}>{p.gender}</span>
                  </td>
                  <td>{p.phone || '—'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/patients/${p.id}/visit`)}
                      >
                        New Visit
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/patients/${p.id}/history`)}
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Visits ── */}
      {activeTab === 'visits' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
              All Visits
            </h2>
          </div>
          {visits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No visits yet</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Visit #</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => {
                  const sc = statusColor(v.status)
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>#{v.id}</td>
                      <td>{v.patient_name || `Patient #${v.patient_id}`}</td>
                      <td style={{ fontSize: '13px' }}>
                        {new Date(v.visit_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize'
                        }}>
                          {v.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/visits/${v.id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

       {/* ── ManageStaff ── */}
      {activeTab === 'visits' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-100)' }}>
            <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
              All Visits
            </h2>
          </div>
          {visits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No visits yet</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Visit #</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => {
                  const sc = statusColor(v.status)
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600 }}>#{v.id}</td>
                      <td>{v.patient_name || `Patient #${v.patient_id}`}</td>
                      <td style={{ fontSize: '13px' }}>
                        {new Date(v.visit_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize'
                        }}>
                          {v.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/visits/${v.id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Accuracy ── */}
      {activeTab === 'accuracy' && (
        <div>
          {accuracyStats ? (
            <>
              <div className="stats-grid" style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                marginBottom: '20px'
              }}>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--primary)' }}>
                    {accuracyStats.overall_accuracy?.toFixed(1)}%
                  </div>
                  <div className="stat-label">Overall Accuracy</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--success)' }}>
                    {accuracyStats.f1_score?.toFixed(1)}%
                  </div>
                  <div className="stat-label">F1 Score</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--gray-700)' }}>
                    {accuracyStats.total_visits}
                  </div>
                  <div className="stat-label">Visits Analyzed</div>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/accuracy')}
              >
                View Full Accuracy Dashboard
              </button>
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-title">No accuracy data yet</div>
                <div className="empty-state-sub">
                  Complete visits to see AI accuracy metrics
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}