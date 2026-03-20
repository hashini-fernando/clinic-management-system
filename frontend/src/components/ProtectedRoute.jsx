import { Navigate } from 'react-router-dom'
import { getToken, getUser, hasRole } from '../services/auth'

export default function ProtectedRoute({ children, roles }) {
  const token = getToken()
  const user = getUser()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !hasRole(...roles)) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
          <p style={{ color: 'var(--gray-500)' }}>
            You do not have permission to view this page.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
            Required: {roles.join(' or ')} | Your role: {user?.role}
          </p>
        </div>
      </div>
    )
  }

  return children
}