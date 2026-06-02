import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import PasswordInput from '../../components/PasswordInput'
import { useAuth } from '../../lib/AuthContext'

export default function Signup() {
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, refreshProfile } = useAuth()

  const [from] = useState(() => {
    const stateFrom = location.state?.from
    if (stateFrom && typeof stateFrom === 'string' && !stateFrom.includes('/login') && !stateFrom.includes('/signup')) {
      sessionStorage.setItem('login_redirect', stateFrom)
      return stateFrom
    }
    return sessionStorage.getItem('login_redirect') || '/'
  })

  const googleData = location.state?.googleData

  const [step, setStep] = useState(googleData ? 'phone' : 1) // 1: Details, 2: OTP, 'phone': google signup phone step
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: googleData?.name || '',
    phone: '',
    email: googleData?.email || '',
    password: ''
  })
  const [otp, setOtp] = useState('')

  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (response) => {
      setGoogleLoading(true)
      try {
        // Get user info from Google using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${response.access_token}`
          }
        })
        const userInfo = await userInfoResponse.json()
        
        try {
          const { data } = await api.post('/api/auth/customer/google', { 
            email: userInfo.email,
            name: userInfo.name
          })
          setAuth(data.token, { ...data.user, role: 'customer' })
          try { await refreshProfile() } catch {}
          sessionStorage.removeItem('login_redirect')
          notify('Welcome!', 'success')
          navigate(from)
        } catch (err) {
          if (err?.response?.data?.error === 'phone_required') {
            setStep('phone')
            setFormData({
              name: err.response.data.name,
              phone: '',
              email: err.response.data.email,
              password: ''
            })
          } else {
            throw err
          }
        }
      } catch (err) {
        console.error('Google signup error:', err)
        notify(err?.response?.data?.error || 'Google login failed', 'error')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => {
      notify('Google login failed', 'error')
    },
  })

  const handleGooglePhoneSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/customer/google/signup', { 
        email: formData.email,
        name: formData.name,
        phone: formData.phone 
      })
      setAuth(data.token, { ...data.user, role: 'customer' })
      try { await refreshProfile() } catch {}
      sessionStorage.removeItem('login_redirect')
      notify('Account created successfully!', 'success')
      navigate(from)
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to create account', 'error')
    } finally {
      setLoading(false)
    }
  }

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
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-blue-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-50 to-orange-50 overflow-hidden mb-4">
            <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {step === 'phone' ? 'Complete Your Account' : (step === 1 ? 'Create Account' : 'Verify Email')}
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            {step === 'phone' 
              ? 'Please provide your phone number to complete signup' 
              : (step === 1 
                ? 'Join thousands of customers shopping with SmartOdisha.' 
                : `We've sent a 6-digit code to ${formData.email}`)}
          </p>
        </div>

        {step === 1 && (
          <div className="mt-8">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl border-2 border-blue-100 bg-white hover:bg-gradient-to-br from-blue-50 to-orange-50 transition-all text-sm font-bold text-gray-700 disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[10px] font-black uppercase tracking-widest text-gray-400">Or continue with</span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSendOTP}>
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                    className="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="support@smartodisha.in"
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
                    className="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="+91 98270 58262"
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
                    inputClassName="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </button>

              <p className="text-center text-xs text-gray-400 font-bold mt-6 uppercase tracking-widest">
                Already have an account?{' '}
                <Link to="/login" state={{ from }} className="text-blue-700 hover:text-orange-600">
                  Login
                </Link>
              </p>
            </form>
          </div>
        )}

        {step === 'phone' && (
          <form className="mt-8 space-y-5" onSubmit={handleGooglePhoneSubmit}>
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Full Name</label>
              <input
                name="name"
                type="text"
                disabled
                className="w-full bg-gray-100 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-500 placeholder-gray-400 outline-none"
                value={formData.name}
              />
            </div>
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Email Address</label>
              <input
                name="email"
                type="email"
                disabled
                className="w-full bg-gray-100 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-500 placeholder-gray-400 outline-none"
                value={formData.email}
              />
            </div>
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Phone Number</label>
              <input
                name="phone"
                type="tel"
                required
                className="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="+91 98270 58262"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Complete Signup'}
            </button>

            <div className="flex flex-col gap-4 text-center">
              <button 
                type="button"
                onClick={() => { setStep(1); }}
                className="text-xs text-gray-400 font-bold uppercase tracking-widest hover:text-gray-600"
              >
                Back to signup options
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div className="group text-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Enter 6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength="6"
                className="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-6 text-3xl font-black text-center text-gray-900 tracking-[0.5em] placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
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
