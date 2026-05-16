import { Navigate } from 'react-router-dom'

export default function PartnerProtectedRoute({ children }) {
  const token = localStorage.getItem('partnerToken')
  if (!token) return <Navigate to="/partner" replace />
  
  // Basic role check
  try {
    const part = (token.split('.')[1] || '')
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const payload = JSON.parse(atob(b64))
    if (payload?.role !== 'partner') {
      localStorage.removeItem('partnerToken')
      return <Navigate to="/partner" replace />
    }
  } catch (e) {
    // If invalid token, redirect
    localStorage.removeItem('partnerToken')
    return <Navigate to="/partner" replace />
  }

  return children
}
