import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import NewPatient from './pages/NewPatient'
import VisitInput from './pages/VisitInput'
import VisitResult from './pages/VisitResult'
import PatientHistory from './pages/PatientHistory'
import AccuracyDashboard from './pages/Accuracydashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients/new" element={<NewPatient />} />
        <Route path="/patients/:id/visit" element={<VisitInput />} />
        <Route path="/patients/:id/history" element={<PatientHistory />} />
        <Route path="/visits/:id" element={<VisitResult />} />
        <Route path="/accuracy" element={<AccuracyDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}