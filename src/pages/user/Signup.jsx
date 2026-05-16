import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import PasswordInput from '../../components/PasswordInput'
import { useAuth } from '../../lib/AuthContext'

export default function Signup() {
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, refreshProfile } = useAuth()

  // Use state if available, otherwise fallback to session storage, then home
  const [from] = useState(() => {
    const stateFrom = location.state?.from
    if (stateFrom && typeof stateFrom === 'string' && !stateFrom.includes('/login') && !stateFrom.includes('/signup')) {
      sessionStorage.setItem('login_redirect', stateFrom)
      return stateFrom
    }
    return sessionStorage.getItem('login_redirect') || '/'
  })

  const [step, setStep] = useState(1) // 1: Details, 2: OTP
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  })
  const [otp, setOtp] = useState('')

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/customer/signup', formData)
      notify('OTP sent to your email', 'success')
      setStep(2)
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to send OTP', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/customer/verify-otp', {
        email: formData.email,
        otp
      })
      setAuth(data.token, { ...data.user, role: 'customer' })
      try { await refreshProfile() } catch {}
      sessionStorage.removeItem('login_redirect')
      notify('Account created successfully!', 'success')
      navigate(from)
    } catch (err) {
      notify(err?.response?.data?.error || 'Invalid OTP', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-blue-600 text-white text-2xl font-black shadow-xl shadow-blue-100 mb-4">
            C2K
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {step === 1 ? 'Create Business Account' : 'Verify Email'}
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            {step === 1 
              ? 'Join 500+ businesses sourcing premium tech.' 
              : `We've sent a 6-digit code to ${formData.email}`}
          </p>
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-5" onSubmit={handleSendOTP}>
            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Full Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Uddhab Das"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Email Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="mr.uddhabcharandas@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="+91 9348412765"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="group">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Create Password</label>
                <PasswordInput
                  name="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  inputClassName="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-500 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send Verification Code'}
            </button>

            <p className="text-center text-xs text-gray-400 font-bold mt-6 uppercase tracking-widest">
              Already have an account?{' '}
              <Link to="/login" state={{ from }} className="text-blue-600 hover:text-blue-700">
                Login
              </Link>
            </p>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div className="group text-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Enter 6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-6 text-3xl font-black text-center text-gray-900 tracking-[0.5em] placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-500 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Complete Registration'}
            </button>

            <div className="flex flex-col gap-4 text-center">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-gray-400 font-bold uppercase tracking-widest hover:text-gray-600"
              >
                Change Details
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
