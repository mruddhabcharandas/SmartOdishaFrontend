import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

export default function BusinessProtectedRoute({ children }) {
  const storeToken = localStorage.getItem('storeToken')

  useEffect(() => {
    if (!storeToken) {
      location.href = '/business/login'
    }
  }, [storeToken])

  if (!storeToken) {
    return <Navigate to="/business/login" replace />
  }

  return children
}
