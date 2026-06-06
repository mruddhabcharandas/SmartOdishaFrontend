import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import PasswordInput from '../../components/PasswordInput'

export default function BusinessLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('storeToken')) {
      navigate('/business/dashboard', { replace: true })
    }
  }, [navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/stores/login', { email, password })
      localStorage.setItem('storeToken', data.token)
      localStorage.setItem('storeName', data.name)
      navigate('/business/dashboard', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-white text-[11px] text-gray-600 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
            </div>
            <span>SmartOdisha Seller Panel</span>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="bg-white border border-orange-100 rounded-2xl px-6 py-6 md:px-8 md:py-7 shadow-lg space-y-4"
        >
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Sign in as Seller</h1>
            <p className="text-xs text-gray-500 mt-1">
              Manage your products, inventory, and orders
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
              type="email"
              className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="seller@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">Password</label>
            <PasswordInput
              autoComplete="current-password"
              inputClassName="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="text-[11px] text-gray-500 text-center pt-1 space-y-2">
            <Link to="/business/forgot-password" className="text-orange-600 hover:text-orange-700">
              Forgot password?
            </Link>
            <div className="border-t border-gray-200 pt-2 mt-2">
              Want to join as a seller?{' '}
              <Link to="/business/request" className="text-orange-600 hover:text-orange-700 font-medium">
                Request seller access
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
