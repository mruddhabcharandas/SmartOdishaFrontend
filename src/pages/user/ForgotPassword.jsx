import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function ForgotPassword() {
  const logo = "/logo.png"
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/customer/forgot-password', { email })
      notify('OTP sent to your email', 'success')
      navigate(`/reset-password?email=${encodeURIComponent(email)}`, { state: { from } })
    } catch (err) {
      notify(err?.response?.data?.error || 'User not found', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 rounded-3xl bg-white shadow-xl border border-gray-100 p-1 overflow-hidden mb-4">
            <img src={logo} alt="Click2Kart" className="h-full w-auto object-contain" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Recover Password</h2>
          <p className="text-sm text-gray-500 font-medium">Enter your email to receive a reset code.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="group">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="mr.uddhabcharandas@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-500 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Send Reset Code'}
          </button>

          <p className="text-center text-xs text-gray-400 font-bold mt-6 uppercase tracking-widest">
            Remember password?{' '}
            <Link to="/login" state={{ from }} className="text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
