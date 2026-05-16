import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/AuthContext'
import PasswordInput from '../../components/PasswordInput'

export default function Login() {
  const logo = "/logo.png"
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

  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('password') // 'password' | 'otp'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mode === 'password') {
      setLoading(true)
      try {
        const { data } = await api.post('/api/auth/customer/login', formData)
        setAuth(data.token, { ...data.user, role: 'customer' })
        try { await refreshProfile() } catch {}
        sessionStorage.removeItem('login_redirect')
        notify('Welcome back!', 'success')
        navigate(from)
      } catch (err) {
        const code = err?.response?.data?.error
        const msg = code === 'account_pending_approval'
          ? 'Your account is pending approval by admin'
          : (code === 'user_not_found' ? 'No account found for this email' : (err?.response?.data?.error || 'Invalid email or password'))
        notify(msg, 'error')
      } finally {
        setLoading(false)
      }
    } else {
      if (!otpSent) {
        setLoading(true)
        try {
          await api.post('/api/auth/customer/login-otp/send', { email: formData.email })
          setOtpSent(true)
          notify('OTP sent to your email', 'success')
        } catch (err) {
          notify(err?.response?.data?.error || 'Failed to send OTP', 'error')
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(true)
        try {
          const { data } = await api.post('/api/auth/customer/login-otp/verify', { email: formData.email, otp })
          setAuth(data.token, { ...data.user, role: 'customer' })
          try { await refreshProfile() } catch {}
          sessionStorage.removeItem('login_redirect')
          notify('Logged in successfully', 'success')
          navigate(from)
        } catch (err) {
          const code = err?.response?.data?.error
          const msg = code === 'account_pending_approval'
            ? 'Your account is pending approval by admin'
            : (code === 'user_not_found' ? 'No account found for this email' : (err?.response?.data?.error || 'Invalid OTP'))
          notify(msg, 'error')
        } finally {
          setLoading(false)
        }
      }
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 rounded-3xl bg-white shadow-xl border border-gray-100 p-1 overflow-hidden mb-4">
            <img src={logo} alt="Click2Kart" className="h-full w-auto object-contain" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
          <p className="text-sm text-gray-500 font-medium">Access your B2B dashboard and inventory.</p>
        </div>

        <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
          <button onClick={()=>{setMode('password'); setOtpSent(false);}} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode==='password'?'bg-white shadow-md border border-blue-100 text-blue-600':'text-gray-400 hover:text-gray-600'}`} type="button">Password Login</button>
          <button onClick={()=>{setMode('otp');}} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode==='otp'?'bg-white shadow-md border border-blue-100 text-blue-600':'text-gray-400 hover:text-gray-600'}`} type="button">OTP Login</button>
        </div>

        <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
            {mode==='password' ? (
              <div className="group">
                <div className="flex items-center justify-between ml-1 mb-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Password</label>
                  <Link to="/forgot-password" size="sm" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
                    Forgot?
                  </Link>
                </div>
                <PasswordInput
                  name="password"
                  required
                  autoComplete="current-password"
                  inputClassName="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">{otpSent ? 'Enter OTP' : 'One-Time Password'}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder={otpSent ? "123456" : "Will be sent to email"}
                    value={otp}
                    onChange={(e)=>setOtp(e.target.value)}
                    disabled={!otpSent}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={async ()=>{
                    setLoading(true)
                    try {
                      await api.post('/api/auth/customer/login-otp/send', { email: formData.email })
                      setOtpSent(true)
                      notify('OTP sent to your email', 'success')
                    } catch (err) {
                      notify(err?.response?.data?.error || 'Failed to send OTP', 'error')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !formData.email}
                  className="h-12 px-4 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                >
                  {otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-500 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : (mode==='password' ? 'Sign In' : (otpSent ? 'Verify & Sign In' : 'Send OTP'))}
          </button>

          <p className="text-center text-xs text-gray-400 font-bold mt-6 uppercase tracking-widest">
            New to Click2Kart?{' '}
            <Link to="/signup" state={{ from }} className="text-blue-600 hover:text-blue-700">
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
