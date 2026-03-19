import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPatient } from '../services/api'
import toast from 'react-hot-toast'

export default function NewPatient() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', age: '', gender: '', phone: '', address: ''
  })

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

const handleSubmit = async () => {
  const errors = []

  const isAllEmpty =
    !form.name.trim() &&
    !form.age &&
    !form.gender &&
    !form.phone.trim() &&
    !form.address.trim()

  // If all empty → show one message
  if (isAllEmpty) {
    toast.error('Please fill in the patient details')
    return
  }

  // Individual validations
  if (!form.name.trim()) errors.push('Full name is required')
  else if (form.name.trim().length < 2) errors.push('Name too short')

  if (!form.age) errors.push('Age is required')
  else if (form.age < 0 || form.age > 150) errors.push('Invalid age')

  if (!form.gender) errors.push('Gender is required')

  if (!form.phone.trim()) errors.push('Phone is required')
  else if (form.phone.replace(/\D/g, '').length < 7)
    errors.push('Invalid phone')

  if (!form.address.trim()) errors.push('Address is required')

  if (errors.length > 0) {
    errors.forEach(e => toast.error(e))
    return
  }

    setLoading(true)
    try {
      const res = await createPatient({ ...form, age: parseInt(form.age) || 0 })
      toast.success('Patient created successfully!')
      navigate(`/patients/${res.data.id}/visit`)
    } catch (err) {
      const detail = err.response?.data?.details
      if (Array.isArray(detail)) detail.forEach(e => toast.error(e))
      else toast.error(err.response?.data?.error || 'Failed to create patient')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Patient</h1>
          <p className="page-subtitle">
            Register a new patient to start a clinic visit
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>

      <div className="card" style={{ maxWidth: '640px', margin: '0 auto', padding: 0 }}>
        {/* Card header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--gray-100)',
          background: 'linear-gradient(to right, var(--primary-light), #e0f2fe)'
        }}>
          <h2 style={{
            fontSize: '16px', fontWeight: 600,
            color: 'var(--gray-800)', marginBottom: 0,
            border: 'none', paddingBottom: 0
          }}>
            Patient Information
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
            All fields marked * are required
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '28px' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                name="name"
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Age *</label>
              <input
                className="form-input"
                name="age"
                type="number"
                placeholder="e.g. 35"
                value={form.age}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                className="form-select"
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                className="form-input"
                name="phone"
                placeholder="e.g. 0771234567"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address *</label>
            <input
              className="form-input"
              name="address"
              placeholder="Patient's home address"
              value={form.address}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid var(--gray-100)',
          background: 'var(--gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
            Patient will be redirected to a new visit after saving
          </p>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : ' Save & Start Visit'}
          </button>
        </div>
      </div>
    </div>
  )
}