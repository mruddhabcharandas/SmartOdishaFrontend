import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'
import PasswordInput from '../../components/PasswordInput'

export default function BusinessResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing token')
    }
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/stores/reset-password', { token, password })
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-white text-[11px] text-gray-600 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
              </div>
              <span>SmartOdisha Business</span>
            </div>
          </div>
          <div className="bg-white border border-orange-100 rounded-2xl px-6 py-6 md:px-8 md:py-7 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Password reset</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your password has been reset successfully
            </p>
            <Link
              to="/business/login"
              className="inline-block px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-white text-[11px] text-gray-600 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
            </div>
            <span>SmartOdisha Business</span>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="bg-white border border-orange-100 rounded-2xl px-6 py-6 md:px-8 md:py-7 shadow-lg space-y-4"
        >
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Reset password</h1>
            <p className="text-xs text-gray-500 mt-1">
              Enter your new password
            </p>
          </div>
          {error && (
            <div className="text-red-600 text-xs border border-red-200 bg-red-50 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">New password</label>
            <PasswordInput
              autoComplete="new-password"
              inputClassName="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">Confirm password</label>
            <PasswordInput
              autoComplete="new-password"
              inputClassName="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
          <div className="text-[11px] text-gray-500 text-center pt-1">
            <Link to="/business/login" className="text-orange-600 hover:text-orange-700">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
