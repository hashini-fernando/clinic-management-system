import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../services/api'

export default function Dashboard() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getPatients()
      .then(res => setPatients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  )

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Management</h1>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/patients/new')}
        >
          + New Patient
        </button>
      </div>



      {/* Table card */}
      <div className="card" style={{ padding: 0 }}>
        {/* Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
          <input
            className="form-input"
            
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
          
        </div>

        {loading ? (
          <div className="spinner">
            <div className="spinner-icon">⏳</div>
            Loading patients...
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No patients found</div>
            <div className="empty-state-sub">
              {search ? 'Try a different search term' : 'Add your first patient'}
            </div>
            {!search && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/patients/new')}
              >
                + Add Patient
              </button>
            )}
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
                <th>Address</th>
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
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                          ID #{p.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{p.age} yrs</td>
                  <td>
                    <span className={`badge ${
                      p.gender === 'male' ? 'badge-blue' :
                      p.gender === 'female' ? 'badge-pink' : 'badge-gray'
                    }`}>
                      {p.gender}
                    </span>
                  </td>
                  <td>{p.phone}</td>
                  <td style={{
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {p.address}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/patients/${p.id}/visit`)}
                      >
                        🩺 Visit
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/patients/${p.id}/history`)}
                      >
                        📋 History
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