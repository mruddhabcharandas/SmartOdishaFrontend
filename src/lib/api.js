import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('partnerToken') || localStorage.getItem('storeToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Paths where 401 means "wrong email/password" (or similar), not "session expired" — never redirect or clear storage. */
function isCredentialAuthRequest(config) {
  const raw = String(config?.url || '')
  const path = (typeof raw === 'string' && raw.includes('://') ? new URL(raw).pathname : raw.split('?')[0]) || ''
  const p = path.startsWith('/') ? path : `/${path}`
  const suffixes = [
    '/api/auth/login',
    '/api/auth/customer/login',
    '/api/auth/customer/login-otp/send',
    '/api/auth/customer/login-otp/verify',
    '/api/auth/customer/signup',
    '/api/auth/customer/verify-otp',
    '/api/auth/customer/forgot-password',
    '/api/auth/customer/reset-password',
    '/api/public/partner/login',
    '/api/stores/login'
  ]
  return suffixes.some((s) => p === s || p.endsWith(s))
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const s = err?.response?.status
    const code = err?.response?.data?.error
    const skipLogout = isCredentialAuthRequest(err.config)
    if ((s === 401 || code === 'invalid_token') && !skipLogout) {
      try { sessionStorage.setItem('postLoginRedirect', location.pathname + location.search) } catch {}
      
      const isPartner = localStorage.getItem('partnerToken') || location.pathname.startsWith('/partner')
      const isBusiness = localStorage.getItem('storeToken') || location.pathname.startsWith('/business')
      
      // Clear only irrelevant tokens based on role
      if (!isPartner && !isBusiness) {
        // User role - clear all except maybe nothing?
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('userPhone')
      }
      if (!isPartner) {
        localStorage.removeItem('partnerToken')
        localStorage.removeItem('partnerData')
      }
      if (!isBusiness) {
        localStorage.removeItem('storeToken')
        localStorage.removeItem('storeName')
      }

      if (location.pathname.startsWith('/admin')) location.href = '/admin/login'
      else if (isPartner) location.href = '/partner'
      else if (isBusiness) location.href = '/business/login'
      else location.href = '/login'
    }
    // For 403, do not force logout. Let pages handle access errors gracefully.
    return Promise.reject(err)
  }
)

export default api
