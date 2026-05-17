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

  const [from] = useState(() => {
    const stateFrom = location.state?.from
    if (stateFrom && typeof stateFrom === 'string' && !stateFrom.includes('/login') && !stateFrom.includes('/signup')) {
      sessionStorage.setItem('login_redirect', stateFrom)
      return stateFrom
    }
    return sessionStorage.getItem('login_redirect') || '/'
  })

  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('password')
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
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl border border-blue-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-50 to-orange-50 overflow-hidden mb-4">
            <img src={logo} alt="SmartOdisha" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
          <p className="text-sm text-gray-500 font-medium">Access your SmartOdisha account.</p>
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl border-2 border-blue-100 bg-white hover:bg-gradient-to-br from-blue-50 to-orange-50 transition-all text-sm font-bold text-gray-700"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
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

        <div className="flex gap-2 bg-gradient-to-br from-blue-50 to-orange-50 p-1.5 rounded-2xl border border-blue-100">
          <button onClick={()=>{setMode('password'); setOtpSent(false);}} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode==='password'?'bg-white shadow-md border border-blue-200 text-blue-700':'text-gray-400 hover:text-gray-600'}`} type="button">Password Login</button>
          <button onClick={()=>{setMode('otp');}} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode==='otp'?'bg-white shadow-md border border-orange-200 text-orange-600':'text-gray-400 hover:text-gray-600'}`} type="button">OTP Login</button>
        </div>

        <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
            {mode==='password' ? (
              <div className="group">
                <div className="flex items-center justify-between ml-1 mb-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Password</label>
                  <Link to="/forgot-password" size="sm" className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700">
                    Forgot?
                  </Link>
                </div>
                <PasswordInput
                  name="password"
                  required
                  autoComplete="current-password"
                  inputClassName="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                    className="w-full bg-gradient-to-br from-blue-50 to-orange-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                  className="h-12 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-blue-200"
                >
                  {otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : (mode==='password' ? 'Sign In' : (otpSent ? 'Verify & Sign In' : 'Send OTP'))}
          </button>

          <p className="text-center text-xs text-gray-400 font-bold mt-6 uppercase tracking-widest">
            New to SmartOdisha?{' '}
            <Link to="/signup" state={{ from }} className="text-blue-700 hover:text-orange-600">
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
