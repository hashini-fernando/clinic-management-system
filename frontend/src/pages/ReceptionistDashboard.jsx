import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, createPatient } from '../services/api'
import { getUser } from '../services/auth'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function ReceptionistDashboard() {
  const [activeTab, setActiveTab]       = useState('queue')
  const [unconfirmed, setUnconfirmed]   = useState([])
  const [patients, setPatients]         = useState([])
  const [loadingQ, setLoadingQ]         = useState(true)
  const [loadingP, setLoadingP]         = useState(true)
  const [search, setSearch]             = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const navigate = useNavigate()
  const user = getUser()

  // New patient form
  const [form, setForm] = useState({
    name: '', age: '', gender: 'male', phone: '', address: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Load unconfirmed visits queue
    api.get('/visits/unconfirmed')
      .then(res => setUnconfirmed(res.data || []))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoadingQ(false))

    // Load patients
    getPatients()
      .then(res => setPatients(res.data || []))
      .catch(console.error)
      .finally(() => setLoadingP(false))
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!form.name || !form.age) {
      toast.error('Name and age are required')
      return
    }
    setSaving(true)
    try {
      await createPatient({
        ...form,
        age: parseInt(form.age)
      })
      toast.success('Patient registered successfully')
      setForm({ name: '', age: '', gender: 'male', phone: '', address: '' })
      setShowRegister(false)
      // Refresh patient list
      const res = await getPatients()
      setPatients(res.data || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register patient')
    } finally {
      setSaving(false)
    }
  }

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  )

  const tabs = [
    { id: 'queue',    label: `Unconfirmed Visits (${unconfirmed.length})` },
    { id: 'patients', label: 'Patients' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Receptionist Dashboard</h1>
          <p className="page-subtitle">Welcome, {user?.name}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowRegister(!showRegister)}
        >
          {showRegister ? '✕ Cancel' : '+ Register Patient'}
        </button>
      </div>

      {/* Register patient form */}
      {showRegister && (
        <div className="card" style={{
          border: '2px solid var(--primary)',
          marginBottom: '20px'
        }}>
          <h2>Register New Patient</h2>
          <form onSubmit={handleRegister}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  placeholder="Patient full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Age *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Age"
                  value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  min="1" max="150"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-input"
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address</label>
                <input
                  className="form-input"
                  placeholder="Address"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Registering...' : 'Register Patient'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowRegister(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px',
        marginBottom: '20px',
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

      {/* ── Unconfirmed Visits Queue ── */}
      {activeTab === 'queue' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--gray-100)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
              Visits Awaiting Payment
            </h2>
            {unconfirmed.length > 0 && (
              <span style={{
                background: '#fef3c7',
                color: '#d97706',
                border: '1px solid #fcd34d',
                borderRadius: '999px',
                padding: '2px 10px',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {unconfirmed.length} pending
              </span>
            )}
          </div>

          {loadingQ ? (
            <div className="spinner">
              <div className="spinner-icon">⏳</div>Loading...
            </div>
          ) : unconfirmed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">No pending visits</div>
              <div className="empty-state-sub">
                All visits have been processed
              </div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Visit #</th>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Visit Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unconfirmed.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>#{v.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.patient_name}</div>
                    </td>
                    <td>{v.phone || '—'}</td>
                    <td style={{ fontSize: '13px' }}>
                      {new Date(v.visit_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: '#fef3c7',
                        color: '#d97706',
                        border: '1px solid #fcd34d'
                      }}>
                        Awaiting Payment
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/visits/${v.id}`)}
                      >
                        Process Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Patients Tab ── */}
      {activeTab === 'patients' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--gray-100)'
          }}>
            <input
              className="form-input"
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: '320px' }}
            />
          </div>

          {loadingP ? (
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
                    <td style={{
                      color: 'var(--gray-400)', fontSize: '13px'
                    }}>
                      {i + 1}
                    </td>
                    <td>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}>
                        <div className="avatar">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{
                            fontSize: '12px', color: 'var(--gray-400)'
                          }}>
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
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/patients/${p.id}/history`)}
                      >
                        History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}