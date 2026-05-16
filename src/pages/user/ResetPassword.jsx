import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import PasswordInput from '../../components/PasswordInput'

export default function ResetPassword() {
  const logo = "/logo.png"
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const query = new URLSearchParams(location.search)
  const email = query.get('email') || ''

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email,
    otp: '',
    newPassword: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/customer/reset-password', formData)
      notify('Password reset successfully!', 'success')
      navigate('/login', { state: { from } })
    } catch (err) {
      notify(err?.response?.data?.error || 'Invalid OTP or details', 'error')
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
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">New Password</h2>
          <p className="text-sm text-gray-500 font-medium">Verify your OTP and set a new password.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Verification OTP</label>
              <input
                type="text"
                required
                maxLength={4}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-center text-xl font-black tracking-widest text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="0000"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="group">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">New Password</label>
              <PasswordInput
                autoComplete="new-password"
                required
                minLength={6}
                inputClassName="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || formData.otp.length < 4}
            className="w-full bg-blue-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-500 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
