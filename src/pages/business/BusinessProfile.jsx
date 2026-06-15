import React, { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import LoadingSpinner from '../../components/LoadingSpinner'
import ImageUpload from '../../components/ImageUpload'

const Ico = ({ n, cls = 'w-5 h-5' }) => {
  const d = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    map: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    pkg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    gear: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    plus: 'M12 4v16m8-8H4',
    back: 'M10 19l-7-7m0 0l7-7m-7 7h18',
    chevL: 'M15 19l-7-7 7-7',
    chevR: 'M9 5l7 7-7 7',
    edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    close: 'M6 18L18 6M6 6l12 12',
    send: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
    check: 'M5 13l4 4L19 7'
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      {d[n]?.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  )
}

const Avatar = ({ user, size = 'md' }) => {
  const sz = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' }[size]
  if (user?.avatar)
    return <img src={user.avatar} alt={user.name} className={`${sz} rounded-2xl object-cover ring-2 ring-white shadow-md`} />
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-white ring-2 ring-white shadow-md`}>
      {user?.name?.charAt(0)?.toUpperCase() || 'S'}
    </div>
  )
}

export default function BusinessProfile() {
  const { notify } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profile, setProfile] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gstNumber: '',
    image: '',
    sellerAvatar: '',
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
    pickupPhone: ''
  })
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: '',
    useOtp: false
  })
  const [pickupPassword, setPickupPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)

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
        image: data.image?.url || '',
        sellerAvatar: data.sellerAvatar?.url || '',
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
        pickupPhone: data.pickupPhone || ''
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

  const sendOtp = async () => {
    try {
      setSendingOtp(true)
      await api.post('/api/stores/send-otp')
      setOtpSent(true)
      notify('OTP sent to your email/phone', 'success')
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to send OTP', 'error')
    } finally {
      setSendingOtp(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify('New passwords do not match', 'error')
      return
    }
    if (passwordData.newPassword.length < 6) {
      notify('Minimum 6 characters', 'error')
      return
    }
    try {
      setSavingPassword(true)
      const payload = {
        newPassword: passwordData.newPassword
      }
      if (passwordData.useOtp) {
        payload.otp = passwordData.otp
      } else {
        payload.oldPassword = passwordData.oldPassword
      }
      await api.post('/api/stores/change-password', payload)
      notify('Password changed successfully', 'success')
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '', useOtp: false })
      setShowPasswordChange(false)
      setOtpSent(false)
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to change password', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  const handlePickupSave = async (e) => {
    e.preventDefault()
    if (!pickupPassword) {
      notify('Please enter your password to save pickup address', 'error')
      return
    }
    try {
      setSaving(true)
      await api.put('/api/stores/profile', {
        ...formData,
        currentPassword: pickupPassword
      })
      notify('Pickup address updated successfully', 'success')
      setPickupPassword('')
      loadProfile()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update pickup address', 'error')
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Loading profile…" />
      </div>
    )
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'personal', label: 'Profile', icon: 'user' },
    { id: 'pickup', label: 'Pickup', icon: 'map' },
    { id: 'settings', label: 'Settings', icon: 'gear' }
  ]

  return (
    <div className="pf-root min-h-screen bg-slate-50 pb-24 lg:pb-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        .pf-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .pf-display { font-family: 'Sora', system-ui, sans-serif; }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(12px); }
          to { opacity:1; transform:translateY(0); }
        }
        .pf-panel { animation: slideUp 0.28s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Top Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Store Panel
            </p>
            <h1 className="pf-display font-black text-base leading-tight truncate">
              {profile?.name || 'Store'}
            </h1>
          </div>
          <Avatar user={profile} size="sm" />
        </div>

        {/* Mobile Nav */}
        <div className="lg:hidden pf-nav-strip flex overflow-x-auto px-4 pb-0 gap-1">
          {navItems.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all
                ${activeSection === id
                  ? 'bg-slate-50 text-violet-700'
                  : 'text-slate-400 hover:text-slate-200'}`}>
              <Ico n={icon} cls="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 lg:py-8 lg:flex lg:gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col gap-3 w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
            <Avatar user={profile} size="md" />
            <div className="flex-1 min-w-0">
              <div className="pf-display font-black text-slate-800 text-sm truncate">
                {profile?.name}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {profile?.email}
              </div>
            </div>
          </div>

          <nav className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {navItems.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-left transition-all border-l-2
                    ${activeSection === id
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                <Ico n={icon} cls="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="pf-panel space-y-4">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2"></div>
                <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-1">Welcome back</p>
                <h2 className="pf-display font-black text-2xl leading-tight mb-3">
                  {profile?.name?.split(' ')[0] || 'Seller'} 👋
                </h2>
                <p className="text-violet-200 text-sm">{profile?.email}</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="pf-display font-black text-slate-800 text-sm">Profile Info</h3>
                  <button onClick={() => setActiveSection('personal')} className="text-violet-600 text-xs font-bold hover:underline">Edit →</button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <Ico n="user" cls="w-4 h-4" />
                    </div>
                    <span className="text-slate-600 font-medium">{profile?.name}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      </div>
                      <span className="text-slate-600 font-medium">{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal / Basic Info */}
          {activeSection === 'personal' && (
            <div className="pf-panel bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="pf-display font-black text-slate-800">Basic Information</h2>
                <p className="text-slate-400 text-xs mt-0.5">Update your store details</p>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex flex-col items-center gap-3">
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Store"
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Ico n="user" cls="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <ImageUpload onUploaded={(url) => setFormData(prev => ({ ...prev, image: url }))} />
                      {formData.image && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          className="text-xs text-red-500 hover:text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    {formData.sellerAvatar ? (
                      <img
                        src={formData.sellerAvatar}
                        alt="Seller Avatar"
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Ico n="user" cls="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <ImageUpload onUploaded={(url) => setFormData(prev => ({ ...prev, sellerAvatar: url }))} />
                      {formData.sellerAvatar && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sellerAvatar: '' }))}
                          className="text-xs text-red-500 hover:text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Store Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">GSTIN</label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pickup Address Section */}
          {activeSection === 'pickup' && (
            <div className="pf-panel bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="pf-display font-black text-slate-800">Pickup Address</h2>
                <p className="text-slate-400 text-xs mt-0.5">Manage your Delhivery pickup details</p>
              </div>
              <form onSubmit={handlePickupSave} className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Pickup Name</label>
                    <input
                      type="text"
                      value={formData.pickupName}
                      onChange={(e) => handleInputChange('pickupName', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      placeholder="Warehouse / Store Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Pickup Phone</label>
                    <input
                      type="text"
                      value={formData.pickupPhone}
                      onChange={(e) => handleInputChange('pickupPhone', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Address Line 1</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.line1}
                      onChange={(e) => handleInputChange('pickupAddress.line1', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Address Line 2</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.line2}
                      onChange={(e) => handleInputChange('pickupAddress.line2', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">City</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.city}
                      onChange={(e) => handleInputChange('pickupAddress.city', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">State</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.state}
                      onChange={(e) => handleInputChange('pickupAddress.state', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Pincode</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.pincode}
                      onChange={(e) => handleInputChange('pickupAddress.pincode', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Confirm Your Password</label>
                    <input
                      type="password"
                      value={pickupPassword}
                      onChange={(e) => setPickupPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                      placeholder="Enter your password to save changes"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={saving || !pickupPassword}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="pf-panel space-y-3">
              <div>
                <h2 className="pf-display font-black text-slate-800">Settings</h2>
                <p className="text-slate-400 text-xs mt-0.5">Security & account preferences</p>
              </div>

              {!showPasswordChange ? (
                <button onClick={() => setShowPasswordChange(true)}
                  className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left flex items-center gap-4 hover:border-slate-200 hover:shadow-md active:scale-[0.98] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                    <Ico n="lock" cls="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="pf-display font-black text-slate-800 text-sm">Change Password</div>
                    <div className="text-slate-400 text-xs mt-0.5">Update your account credentials</div>
                  </div>
                  <Ico n="chevR" cls="w-4 h-4 text-slate-300" />
                </button>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <button onClick={() => { setShowPasswordChange(false); setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                      <Ico n="chevL" cls="w-4 h-4" />
                    </button>
                    <h3 className="pf-display font-black text-slate-800 text-sm">Change Password</h3>
                  </div>
                  <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
                    <div className="flex gap-2 bg-slate-50 p-2 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPasswordData(prev => ({ ...prev, useOtp: false }))}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${!passwordData.useOtp ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Use Old Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasswordData(prev => ({ ...prev, useOtp: true }))}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${passwordData.useOtp ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Use OTP
                      </button>
                    </div>

                    {!passwordData.useOtp ? (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.oldPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">OTP</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={passwordData.otp}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, otp: e.target.value }))}
                              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                              placeholder="Enter OTP"
                              required
                            />
                            <button
                              type="button"
                              onClick={sendOtp}
                              disabled={sendingOtp || otpSent}
                              className="px-4 py-3 rounded-xl text-xs font-black text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {sendingOtp ? 'Sending…' : otpSent ? 'Resend' : 'Send OTP'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Confirm Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-red-500 text-xs font-semibold">Passwords don't match</p>
                    )}
                    <div className="pt-4 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={savingPassword || passwordData.newPassword !== passwordData.confirmPassword || !passwordData.newPassword || (passwordData.useOtp && !passwordData.otp) || (!passwordData.useOtp && !passwordData.oldPassword)}
                        className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingPassword ? 'Changing…' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 z-40 safe-area-pb">
        <div className="flex">
          {navItems.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all
                  ${activeSection === id ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Ico n={icon} cls="w-5 h-5" />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
