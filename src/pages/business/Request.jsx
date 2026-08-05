import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

export default function BusinessRequest() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    address: { line1: '', line2: '', city: '', state: '', pincode: '' },
    message: ''
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/stores/request', formData)
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit request')
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
            <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Request submitted!</h1>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
              Thank you for your interest in joining SmartOdisha Business. We will review your request and get back to you soon.
            </p>
            <Link
              to="/"
              className="inline-block px-8 py-3.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 tracking-wide"
            >
              Back to home
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
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-brand-600/10 rounded-full blur-3xl"></div>
      </div>
      <div className="max-w-3xl w-full relative z-10">
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
          className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl px-6 py-7 md:px-8 md:py-8 shadow-2xl space-y-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Request seller access</h1>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">
              Join SmartOdisha Business and start selling your products
            </p>
          </div>
          {error && (
            <div className="text-red-600 text-xs border border-red-200 bg-red-50 rounded-xl px-4 py-3 font-semibold">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Your name</label>
              <input
                type="text"
                name="name"
                className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Business name</label>
              <input
                type="text"
                name="businessName"
                className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
                placeholder="Your business name"
                value={formData.businessName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Email</label>
              <input
                type="email"
                name="email"
                className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Phone</label>
              <input
                type="tel"
                name="phone"
                className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
                placeholder="+91 9999999999"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Address line 1</label>
            <input
              type="text"
              name="address.line1"
              className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
              placeholder="Street address"
              value={formData.address.line1}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">City</label>
              <input
                type="text"
                name="address.city"
                className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
                placeholder="City"
                value={formData.address.city}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">State</label>
              <input
                type="text"
                name="address.state"
                className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
                placeholder="State"
                value={formData.address.state}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Pincode</label>
              <input
                type="text"
                name="address.pincode"
                className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium"
                placeholder="Pincode"
                value={formData.address.pincode}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Tell us about your business</label>
            <textarea
              name="message"
              rows={4}
              className="border border-slate-200 bg-slate-50/80 text-slate-900 text-sm rounded-xl px-4 py-3 w-full outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-all font-medium resize-none"
              placeholder="What products do you sell? Where are you located?"
              value={formData.message}
              onChange={handleChange}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 active:translate-y-0 tracking-wide"
          >
            {loading ? 'Submitting...' : 'Submit request'}
          </button>
          
          <div className="text-[12px] text-slate-500 text-center pt-1 font-medium">
            Already have an account?{' '}
            <Link to="/business/login" className="text-brand-600 hover:text-brand-700 font-bold">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
