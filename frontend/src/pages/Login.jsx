import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import { saveAuth, isLoggedIn, getUser } from '../services/auth'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn()) {
      const user = getUser()

      if (user?.role === 'doctor') navigate('/doctor', { replace: true })
      else if (user?.role === 'staff') navigate('/receptionist', { replace: true })
      else if (user?.role === 'admin') navigate('/admin', { replace: true })
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)

    try {
      const res = await login({ email: email.trim(), password })
      const { token, doctor } = res.data

      saveAuth(token, doctor)
      toast.success(`Welcome, ${doctor.name}`)

      if (doctor.role === 'doctor') navigate('/doctor', { replace: true })
      else if (doctor.role === 'staff') navigate('/receptionist', { replace: true })
      else if (doctor.role === 'admin') navigate('/admin', { replace: true })
      else navigate('/', { replace: true })

    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid email or password')
      setLoading(false)
    }
  }

  const demoAccounts = [
    {
      role: 'Doctor',
      email: 'doctor@clinic.com',
      password: 'clinic123',
      color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
      desc: 'Enter notes · AI parse · Prescriptions'
    },
    {
      role: 'Staff / Receptionist',
      email: 'staff@clinic.com',
      password: 'clinic123',
      color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd',
      desc: 'Register patients · Process payments'
    },
    {
      role: 'Admin',
      email: 'admin@clinic.com',
      password: 'clinic123',
      color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
      desc: 'Full access · Reports · AI accuracy'
    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      background: '#f1f5f9', padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>🏥</div>
          <h1 style={{
            fontSize: '26px', fontWeight: 800,
            color: 'var(--gray-900)', margin: '0 0 4px',
            fontFamily: 'var(--font-sans)'
          }}>
            ABC Health Clinic
          </h1>
          <p style={{
            fontSize: '14px', color: 'var(--gray-500)',
            margin: 0, fontFamily: 'var(--font-sans)'
          }}>
            Clinical Management System
          </p>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Sign In</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="card" style={{ marginTop: '16px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700,
            color: 'var(--gray-400)', textTransform: 'uppercase',
            letterSpacing: '0.6px', margin: '0 0 12px',
            fontFamily: 'var(--font-sans)'
          }}>
            Demo Accounts — password: clinic123
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {demoAccounts.map(acc => (
              <button
                key={acc.role}
                type="button"
                onClick={() => {
                  setEmail(acc.email)
                  setPassword(acc.password)
                }}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 14px',
                  background: acc.bg, border: `1px solid ${acc.border}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', textAlign: 'left',
                  width: '100%', fontFamily: 'var(--font-sans)'
                }}
              >
                <div>
                  <div style={{
                    fontSize: '13px', fontWeight: 700, color: acc.color
                  }}>
                    {acc.role}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    {acc.email}
                  </div>
                  <div style={{
                    fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px'
                  }}>
                    {acc.desc}
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: acc.color }}>
                  Fill →
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}