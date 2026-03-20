import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../services/api'
import { getUser } from '../services/auth'
import toast from 'react-hot-toast'

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const navigate = useNavigate()
  const user     = getUser()

  useEffect(() => {
    getPatients()
      .then(res => setPatients(res.data || []))
      .catch(() => toast.error('Failed to load patients'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {patients.length}
          </div>
          <div className="stat-label">Total Patients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {patients.filter(p =>
              new Date(p.created_at).toDateString() === new Date().toDateString()
            ).length}
          </div>
          <div className="stat-label">New Today</div>
        </div>
      </div>

      {/* Patient search and list */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            Select Patient to Start Visit
          </h2>
          <input
            className="form-input"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '280px' }}
          />
        </div>

        {loading ? (
          <div className="spinner">
            <div className="spinner-icon">⏳</div>Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No patients found</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--gray-400)', fontSize: '13px' }}>
                    {i + 1}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar">
                        {p.name?.charAt(0).toUpperCase()}
                      </div>
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
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/patients/${p.id}/visit`)}
                      >
                        Start Visit
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
        )}
      </div>
    </div>
  )
}