import { useNavigate, useLocation } from 'react-router-dom'
import { getUser, clearAuth, hasRole } from '../services/auth'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user     = getUser()
  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const roleColors = {
    doctor: { bg: '#dbeafe', color: '#1d4ed8' },
    staff:  { bg: '#e0f2fe', color: '#0369a1' },
    admin:  { bg: '#dcfce7', color: '#15803d' },
  }

  const rc = roleColors[user?.role] || roleColors.staff

  return (
    <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100 }}>

      {/* Accent bar */}
      <div className="navbar-accent" />

      {/* Main navbar */}
      <nav className="navbar">

        {/* Brand */}
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <div className="navbar-logo">🏥</div>
          <div>
            <span className="navbar-brand-title">ABC Health Clinic</span>
            <span className="navbar-brand-sub">Clinical Management System</span>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          <div className="navbar-links">

            {/* Dashboard — all roles */}
            <button
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              Dashboard
            </button>

            {/* New Patient — staff + admin only */}
            {hasRole('staff', 'admin') && (
              <button
                className={`nav-link ${isActive('/patients/new') ? 'active' : ''}`}
                onClick={() => navigate('/patients/new')}
              >
                New Patient
              </button>
            )}

            {/* AI Accuracy — doctor + admin only */}
            {hasRole('doctor', 'admin') && (
              <button
                className={`nav-link ${isActive('/accuracy') ? 'active' : ''}`}
                onClick={() => navigate('/accuracy')}
              >
                AI Accuracy
              </button>
            )}

            {hasRole('admin') && (
              <button
                className={`nav-link ${isActive('/users') ? 'active' : ''}`}
                onClick={() => navigate('/users')}
              >
                Staff
              </button>
            )}
          </div>

          <div className="nav-divider" />

          {/* User info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 12px',
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: rc.bg, color: rc.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, flexShrink: 0
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{
                fontSize: '13px', fontWeight: 600,
                color: 'var(--gray-800)', lineHeight: 1.2,
                fontFamily: 'var(--font-sans)'
              }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: '11px', fontWeight: 600,
                color: rc.color, textTransform: 'capitalize',
                fontFamily: 'var(--font-sans)'
              }}>
                {user?.role}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            className="btn btn-outline"
            onClick={handleLogout}
            style={{ fontSize: '13px' }}
          >
            Sign Out
          </button>

          {/* Staff + Admin: New Patient CTA */}
          {hasRole('staff', 'admin') && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/patients/new')}
            >
              + New Patient
            </button>
          )}
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="navbar-subnav">
        <button className="subnav-item" onClick={() => navigate('/')}>Home</button>
        <span style={{ color: '#d1d5db' }}>/</span>
        <button
          className={`subnav-item ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          Patients
        </button>
        {isActive('/patients/new') && (
          <><span style={{ color: '#d1d5db' }}>/</span><span className="subnav-item active">New Patient</span></>
        )}
        {isActive('/accuracy') && (
          <><span style={{ color: '#d1d5db' }}>/</span><span className="subnav-item active">AI Accuracy</span></>
        )}
        {location.pathname.includes('/visit') && !location.pathname.includes('/history') && (
          <><span style={{ color: '#d1d5db' }}>/</span><span className="subnav-item active">Visit</span></>
        )}
        {location.pathname.includes('/history') && (
          <><span style={{ color: '#d1d5db' }}>/</span><span className="subnav-item active">History</span></>
        )}
      </div>
    </div>
  )
}