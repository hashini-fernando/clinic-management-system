import axios from 'axios'
import { getToken, clearAuth, isLoggedIn } from './auth'

const api = axios.create({
  // Uses VITE_API_URL in production, localhost in development
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto logout on 401 — only once, no loop
let isRedirecting = false

api.interceptors.response.use(
  res => res,
  err => {
    if (
      err.response?.status === 401 &&
      !isRedirecting &&
      isLoggedIn()
    ) {
      isRedirecting = true
      clearAuth()
      window.location.replace('/login')
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────
export const login  = (data) => api.post('/auth/login', data)
export const getMe  = ()     => api.get('/auth/me')

// ── Patients ──────────────────────────────────────
export const getPatients   = ()     => api.get('/patients')
export const getPatient    = (id)   => api.get(`/patients/${id}`)
export const createPatient = (data) => api.post('/patients', data)

// ── Visits ────────────────────────────────────────
export const getPatientVisits = (id)       => api.get(`/patients/${id}/visits`)
export const getVisit         = (id)       => api.get(`/visits/${id}`)
export const parseVisit       = (data)     => api.post('/visits/parse', data)
export const confirmVisit     = (id, data) => api.post(`/visits/${id}/confirm`, data)

// ── Billing ───────────────────────────────────────
export const getBilling = (visitId) => api.get(`/billing/${visitId}`)
export const markAsPaid = (visitId) => api.post(`/billing/${visitId}/pay`)

// ── Accuracy ──────────────────────────────────────
export const getAccuracyStats = () => api.get('/accuracy/stats')
export const getPRFStats      = () => api.get('/accuracy/prf')
export const getConfidence    = () => api.get('/accuracy/confidence')

export default api