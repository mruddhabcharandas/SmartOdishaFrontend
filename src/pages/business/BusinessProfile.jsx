import React, { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function BusinessProfile() {
  const { notify } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gstNumber: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: ''
    },
    pickupAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: ''
    },
    pickupName: '',
    pickupPhone: '',
    shiprocketEmail: '',
    shiprocketPassword: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/stores/profile')
      setProfile(data)
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        gstNumber: data.gstNumber || '',
        address: {
          line1: data.address?.line1 || '',
          line2: data.address?.line2 || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          pincode: data.address?.pincode || ''
        },
        pickupAddress: {
          line1: data.pickupAddress?.line1 || '',
          line2: data.pickupAddress?.line2 || '',
          city: data.pickupAddress?.city || '',
          state: data.pickupAddress?.state || '',
          pincode: data.pickupAddress?.pincode || ''
        },
        pickupName: data.pickupName || '',
        pickupPhone: data.pickupPhone || '',
        shiprocketEmail: data.shiprocketEmail || '',
        shiprocketPassword: data.shiprocketPassword || ''
      })
    } catch (err) {
      notify('Failed to load profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.put('/api/stores/profile', formData)
      notify('Profile updated successfully', 'success')
      loadProfile()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (path, value) => {
    const keys = path.split('.')
    setFormData(prev => {
      const newData = { ...prev }
      let current = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner text="Loading profile..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Store Profile</h2>
            <p className="text-xs text-gray-500 mt-1">Manage your store details, pickup address, and shipping settings</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Basic Store Info */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Store Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">GSTIN</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Store Address */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Store Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Address Line 1</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address.line1}
                  onChange={(e) => handleInputChange('address.line1', e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Address Line 2</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address.line2}
                  onChange={(e) => handleInputChange('address.line2', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">City</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">State</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pincode</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address.pincode}
                  onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Pickup Address */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Pickup Address (Shiprocket)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pickup Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pickupName}
                  onChange={(e) => handleInputChange('pickupName', e.target.value)}
                  placeholder="Warehouse / Store Name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pickup Phone</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pickupPhone}
                  onChange={(e) => handleInputChange('pickupPhone', e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pickup Address Line 1</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pickupAddress.line1}
                  onChange={(e) => handleInputChange('pickupAddress.line1', e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pickup Address Line 2</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pickupAddress.line2}
                  onChange={(e) => handleInputChange('pickupAddress.line2', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pickup City</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pickupAddress.city}
                  onChange={(e) => handleInputChange('pickupAddress.city', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pickup State</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pickupAddress.state}
                  onChange={(e) => handleInputChange('pickupAddress.state', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pickup Pincode</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.pickupAddress.pincode}
                  onChange={(e) => handleInputChange('pickupAddress.pincode', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Shiprocket Credentials */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Shiprocket Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Shiprocket Email</label>
                <input
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.shiprocketEmail}
                  onChange={(e) => handleInputChange('shiprocketEmail', e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Shiprocket Password</label>
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.shiprocketPassword}
                  onChange={(e) => handleInputChange('shiprocketPassword', e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
