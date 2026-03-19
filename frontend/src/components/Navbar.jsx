import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path) => location.pathname === path

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div className="navbar-links">
            <button
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
               Dashboard
            </button>
            <button
          className={`nav-link ${isActive('/accuracy') ? 'active' : ''}`}
          onClick={() => navigate('/accuracy')}
      >
           AI Accuracy
      </button>
          </div>

          <div className="nav-divider" />

          <div className="navbar-status">
            <div className="status-dot" />
            System Online
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/patients/new')}
          >
            + New Patient
          </button>
        </div>
      </nav>

      {/* Sub navbar */}
      <div className="navbar-subnav">
        <button className="subnav-item" onClick={() => navigate('/')}>
          🏥 Home
        </button>
        <span style={{ color: '#d1d5db' }}>/</span>
        <button
          className={`subnav-item ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          Patients
        </button>
        
        {isActive('/patients/new') && (
          <>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span className="subnav-item active">New Patient</span>
          </>
        )}
       
        {location.pathname.includes('/visit') && (
          <>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span className="subnav-item active">Visit</span>
          </>
        )}
        {location.pathname.includes('/history') && (
          <>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span className="subnav-item active">History</span>
          </>
        )}
      </div>
    </div>
  )
}