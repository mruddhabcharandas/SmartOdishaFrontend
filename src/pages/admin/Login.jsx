import { useState } from 'react'
import api from '../../lib/api'
import PasswordInput from '../../components/PasswordInput'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      const target = sessionStorage.getItem('postLoginRedirect')
      if (target && target.startsWith('/admin')) {
        sessionStorage.removeItem('postLoginRedirect')
        location.href = target
      } else {
        location.href = '/admin'
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'login_failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white text-[11px] text-gray-600 shadow-sm">
            <span className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-semibold text-white">
              C2K
            </span>
            <span>Click2Kart Admin Console</span>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-2xl px-6 py-6 md:px-8 md:py-7 shadow-lg space-y-4"
        >
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
            <p className="text-xs text-gray-500 mt-1">
              Use your admin credentials to manage inventory, orders and billing.
            </p>
          </div>
          {error && (
            <div className="text-red-600 text-xs border border-red-200 bg-red-50 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">Email</label>
            <input
              className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">Password</label>
            <PasswordInput
              autoComplete="current-password"
              inputClassName="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
            Login
          </button>
          <div className="text-[11px] text-gray-500 text-center pt-1">
            Protected area • For Click2Kart staff only.
          </div>
        </form>
      </div>
    </div>
  )
}
