import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

export default function BusinessProtectedRoute({ children }) {
  const storeToken = localStorage.getItem('storeToken')
  const navigate = useNavigate()

  useEffect(() => {
    if (!storeToken) {
      navigate('/business/login', { replace: true })
    }
  }, [storeToken, navigate])

  if (!storeToken) {
    return <Navigate to="/business/login" replace />
  }

  return children
}
