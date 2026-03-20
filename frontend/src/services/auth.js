const TOKEN_KEY = 'clinic_token'
const USER_KEY = 'clinic_user'

export function saveAuth(token, user) {
  const normalizedUser = {
    ...user,
    role: user?.role?.toLowerCase()
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser))
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  try {
    const u = localStorage.getItem(USER_KEY)
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token !== null && token !== undefined && token !== ''
}

export function isDoctor() {
  return getUser()?.role === 'doctor'
}

export function isStaff() {
  return getUser()?.role === 'staff'
}

export function isAdmin() {
  return getUser()?.role === 'admin'
}

export function hasRole(...roles) {
  const user = getUser()
  if (!user) return false
  return roles.map(r => r.toLowerCase()).includes(user.role?.toLowerCase())
}