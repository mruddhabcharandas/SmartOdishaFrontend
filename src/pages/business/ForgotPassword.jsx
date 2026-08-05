import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

export default function BusinessForgotPassword() {
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/stores/forgot-password', { email })
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-accent-900 flex items-center justify-center px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-md w-full relative z-10">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-brand-400/30 bg-white/5 backdrop-blur-xl text-[11px] text-brand-200 shadow-xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center overflow-hidden shadow-lg shadow-brand-500/30">
                <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
              </div>
              <span className="font-semibold tracking-wide">SmartOdisha Business</span>
            </div>
          </div>
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl px-6 py-8 md:px-8 md:py-10 shadow-2xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200/50">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Reset link sent</h1>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
              Check your email {email} for a password reset link
            </p>
            <Link
              to="/business/login"
              className="inline-block px-8 py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 tracking-wide"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-accent-900 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-3xl"></div>
      </div>
      <div className="max-w-md w-full relative z-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-brand-400/30 bg-white/5 backdrop-blur-xl text-[11px] text-brand-200 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center overflow-hidden shadow-lg shadow-brand-500/30">
              <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
            </div>
            <span className="font-semibold tracking-wide">SmartOdisha Business</span>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl px-6 py-7 md:px-8 md:py-8 shadow-2xl space-y-5"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot password</h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              Enter your email to receive a reset link
            </p>
          </div>
          {error && (
            <div className="text-red-600 text-xs border border-red-200 bg-red-50 rounded-xl px-4 py-3 font-semibold">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
            <input
              type="email"
              className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
              placeholder="store@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 active:translate-y-0 tracking-wide"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
          <div className="text-[12px] text-slate-500 text-center pt-2 font-medium">
            <Link to="/business/login" className="text-brand-600 hover:text-brand-700 font-bold">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
