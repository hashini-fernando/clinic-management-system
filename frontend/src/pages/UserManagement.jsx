import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [resetId, setResetId]       = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'doctor', specialization: ''
  })

  const loadUsers = () => {
    api.get('/users')
      .then(res => setUsers(res.data || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email and password are required')
      return
    }
    setSaving(true)
    try {
      await api.post('/users', form)
      toast.success(`${form.name} enrolled successfully`)
      setForm({ name: '', email: '', password: '', role: 'doctor', specialization: '' })
      setShowForm(false)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (user) => {
    try {
      const res = await api.put(`/users/${user.id}/toggle`)
      toast.success(res.data.message)
      loadUsers()
    } catch {
      toast.error('Failed to update user status')
    }
  }

  const handleResetPassword = async (id) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      await api.put(`/users/${id}/password`, { password: newPassword })
      toast.success('Password reset successfully')
      setResetId(null)
      setNewPassword('')
    } catch {
      toast.error('Failed to reset password')
    }
  }

  const roleColors = {
    doctor: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    staff:  { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    admin:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            Enroll new staff and manage access
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Enroll New Staff'}
        </button>
      </div>

      {/* Enroll form */}
      {showForm && (
        <div className="card" style={{
          border: '2px solid var(--primary)',
          marginBottom: '24px'
        }}>
          <h2>Enroll New Staff Member</h2>
          <form onSubmit={handleCreate}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  placeholder="Dr. John Silva"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="john@clinic.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role *</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="doctor">Doctor</option>
                  <option value="staff">Staff / Receptionist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Specialization
                  <span style={{
                    fontSize: '11px', color: 'var(--gray-400)',
                    marginLeft: '6px'
                  }}>
                    (optional — for doctors)
                  </span>
                </label>
                <input
                  className="form-input"
                  placeholder="General Practitioner"
                  value={form.specialization}
                  onChange={e => setForm({ ...form, specialization: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Temporary Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <p style={{
                  fontSize: '12px', color: 'var(--gray-400)',
                  marginTop: '4px'
                }}>
                  Give this password to the staff member — they can use it to log in
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Enrolling...' : 'Enroll Staff Member'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        {[
          { label: 'Total Staff',   count: users.length,                                  color: 'var(--primary)' },
          { label: 'Doctors',       count: users.filter(u => u.role === 'doctor').length,  color: '#1d4ed8' },
          { label: 'Receptionists', count: users.filter(u => u.role === 'staff').length,   color: '#0369a1' },
          { label: 'Active',        count: users.filter(u => u.is_active).length,          color: 'var(--success)' },
        ].map(({ label, count, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-value" style={{ color }}>{count}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--gray-100)'
        }}>
          <h2 style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            All Staff Accounts
          </h2>
        </div>

        {loading ? (
          <div className="spinner">
            <div className="spinner-icon">⏳</div>Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No staff enrolled yet</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Specialization</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const rc = roleColors[user.role] || roleColors.staff
                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}>
                        <div style={{
                          width: '32px', height: '32px',
                          borderRadius: '50%',
                          background: rc.bg, color: rc.color,
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700,
                          border: `1px solid ${rc.border}`,
                          flexShrink: 0
                        }}>
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '13px' }}>
                      {user.email}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '999px',
                        fontSize: '12px', fontWeight: 700,
                        background: rc.bg, color: rc.color,
                        border: `1px solid ${rc.border}`,
                        textTransform: 'capitalize'
                      }}>
                        {user.role === 'staff' ? 'Receptionist' : user.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '13px' }}>
                      {user.specialization || '—'}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '999px',
                        fontSize: '12px', fontWeight: 700,
                        background: user.is_active ? '#dcfce7' : '#fee2e2',
                        color: user.is_active ? '#15803d' : '#b91c1c',
                        border: `1px solid ${user.is_active ? '#86efac' : '#fca5a5'}`
                      }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>

                        {/* Toggle active/inactive */}
                        <button
                          className={`btn btn-sm ${user.is_active ? 'btn-outline' : 'btn-primary'}`}
                          onClick={() => handleToggle(user)}
                          style={{
                            fontSize: '12px',
                            ...(user.is_active ? {
                              color: '#b91c1c',
                              borderColor: '#fca5a5'
                            } : {})
                          }}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>

                        {/* Reset password */}
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '12px' }}
                          onClick={() => {
                            setResetId(resetId === user.id ? null : user.id)
                            setNewPassword('')
                          }}
                        >
                          Reset Password
                        </button>
                      </div>

                      {/* Inline password reset */}
                      {resetId === user.id && (
                        <div style={{
                          marginTop: '8px', display: 'flex',
                          gap: '6px', alignItems: 'center'
                        }}>
                          <input
                            type="password"
                            className="form-input"
                            placeholder="New password (min 6)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            style={{ fontSize: '12px', maxWidth: '180px' }}
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '12px' }}
                            onClick={() => handleResetPassword(user.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '12px' }}
                            onClick={() => { setResetId(null); setNewPassword('') }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}