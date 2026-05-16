import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!token) {
      setUser(null)
      localStorage.removeItem('token')
      return
    }
    localStorage.setItem('token', token)
  }, [token])

  const setAuth = (nextToken, nextUser) => {
    setToken(nextToken || null)
    if (nextUser) {
      setUser(nextUser)
      localStorage.setItem('user', JSON.stringify(nextUser))
    } else {
      setUser(null)
      localStorage.removeItem('user')
    }
  }

  const logout = () => {
    setAuth(null, null)
  }

  const refreshProfile = async () => {
    if (!token) return
    try {
      const { data } = await api.get('/api/user/me')
      const nextUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        defaultAddress: data.defaultAddress,
        isKycComplete: !!data.isKycComplete,
        role: data.role || (data.phone ? 'customer' : 'admin')
      }
      setUser(nextUser)
      localStorage.setItem('user', JSON.stringify(nextUser))
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, setAuth, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
