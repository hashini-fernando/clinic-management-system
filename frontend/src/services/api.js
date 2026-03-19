import axios  from 'axios';

const api = axios.create({
    baseURL:'http://localhost:8000/api',
    headers:{'content-Type':'application/json'}
})

// Patients
export const getPatients = () => api.get('/patients')
export const getPatient = (id) => api.get(`/patients/${id}`)
export const createPatient = (data) => api.post('/patients', data)
export const getPatientVisits = (id) => api.get(`/patients/${id}/visits`)

// Visits
export const parseVisit = (data) => api.post('/visits/parse', data)
export const getVisit = (id) => api.get(`/visits/${id}`)

// Billing
export const getBilling = (visitId) => api.get(`/billing/${visitId}`)
export const markAsPaid = (visitId) => api.post(`/billing/${visitId}/pay`)

export default api