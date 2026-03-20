import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { getToken, getUser } from './services/auth'

import Navbar                from './components/Navbar'
import ProtectedRoute        from './components/ProtectedRoute'
import Login                 from './pages/Login'
import DoctorDashboard       from './pages/DoctorDashboard'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import AdminDashboard        from './pages/AdminDashboard'
import NewPatient            from './pages/NewPatient'
import VisitInput            from './pages/VisitInput'
import VisitResult           from './pages/VisitResult'
import PatientHistory        from './pages/PatientHistory'
import AccuracyDashboard     from './pages/Accuracydashboard'
import UserManagement from './pages/UserManagement'

function AppLayout({ children }) {
  return <><Navbar />{children}</>
}

// Redirect to correct dashboard based on role
function RoleRedirect() {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'doctor') return <Navigate to="/doctor" replace />
  if (user.role === 'staff')  return <Navigate to="/receptionist" replace />
  if (user.role === 'admin')  return <Navigate to="/admin" replace />
  return <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  return getToken() ? <RoleRedirect /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>

        {/* Public */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />

        {/* Root → redirect to role dashboard */}
        <Route path="/" element={
          <ProtectedRoute><RoleRedirect /></ProtectedRoute>
        } />

        {/* Doctor dashboard */}
        <Route path="/doctor" element={
          <ProtectedRoute roles={['doctor', 'admin']}>
            <AppLayout><DoctorDashboard /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Receptionist dashboard */}
        <Route path="/receptionist" element={
          <ProtectedRoute roles={['staff', 'admin']}>
            <AppLayout><ReceptionistDashboard /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Admin dashboard */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout><AdminDashboard /></AppLayout>
          </ProtectedRoute>
        } />

      <Route path="/users" element={
        <ProtectedRoute roles={['admin']}>
          <AppLayout><UserManagement /></AppLayout>
        </ProtectedRoute>
      } />

        {/* Shared routes — all roles */}
        <Route path="/patients/:id/history" element={
          <ProtectedRoute>
            <AppLayout><PatientHistory /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/visits/:id" element={
          <ProtectedRoute>
            <AppLayout><VisitResult /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Staff + Admin */}
        <Route path="/patients/new" element={
          <ProtectedRoute roles={['staff', 'admin']}>
            <AppLayout><NewPatient /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Doctor + Admin */}
        <Route path="/patients/:id/visit" element={
          <ProtectedRoute roles={['doctor', 'admin']}>
            <AppLayout><VisitInput /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/accuracy" element={
          <ProtectedRoute roles={['admin' ,'doctor']}>
            <AppLayout><AccuracyDashboard /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<RoleRedirect />} />

      </Routes>
    </BrowserRouter>
  )
}