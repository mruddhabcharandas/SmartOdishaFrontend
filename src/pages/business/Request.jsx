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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-8">
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
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Request submitted!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Thank you for your interest in joining SmartOdisha Business. We will review your request and get back to you soon.
            </p>
            <Link
              to="/"
              className="inline-block px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-sm font-semibold transition-all"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
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
            <h1 className="text-xl font-semibold text-gray-900">Request seller access</h1>
            <p className="text-xs text-gray-500 mt-1">
              Join SmartOdisha Business and start selling your products
            </p>
          </div>
          {error && (
            <div className="text-red-600 text-xs border border-red-200 bg-red-50 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-700">Your name</label>
              <input
                type="text"
                name="name"
                className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-700">Business name</label>
              <input
                type="text"
                name="businessName"
                className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Your business name"
                value={formData.businessName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="+91 9999999999"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">Address line 1</label>
            <input
              type="text"
              name="address.line1"
              className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Street address"
              value={formData.address.line1}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-700">City</label>
              <input
                type="text"
                name="address.city"
                className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="City"
                value={formData.address.city}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-700">State</label>
              <input
                type="text"
                name="address.state"
                className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="State"
                value={formData.address.state}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-700">Pincode</label>
              <input
                type="text"
                name="address.pincode"
                className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Pincode"
                value={formData.address.pincode}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">Tell us about your business</label>
            <textarea
              name="message"
              rows={4}
              className="border border-gray-300 bg-white text-gray-900 text-sm rounded-lg px-3 py-2 w-full outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              placeholder="What products do you sell? Where are you located?"
              value={formData.message}
              onChange={handleChange}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit request'}
          </button>
          
          <div className="text-[11px] text-gray-500 text-center pt-1">
            Already have an account?{' '}
            <Link to="/business/login" className="text-orange-600 hover:text-orange-700 font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
