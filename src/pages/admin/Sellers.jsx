import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ImageUpload from '../../components/ImageUpload'


export default function Sellers() {
  const { notify } = useToast()
  const [stores, setStores] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingStore, setEditingStore] = useState(null)
  const [reviewingPickupStore, setReviewingPickupStore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: ''
    },
    gstNumber: '',
    image: null,
    storePercentage: 0,
    adminCutPercentage: 5,
    isActive: true,
    isPopular: false
  })

  // Load stores on initial render
  const loadStores = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/admin/stores')
      setStores(data)
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to load sellers', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadStores() }, [])

  const handleApprovePickup = async (storeId) => {
    try {
      setActionLoading(true)
      const { data } = await api.put(`/api/admin/stores/${storeId}/approve-pickup`)
      notify(data.message || 'Pickup address approved successfully', 'success')
      setReviewingPickupStore(null)
      loadStores()
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to approve pickup address', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectPickup = async (storeId) => {
    const reason = window.prompt('Reason for rejecting pickup address update (optional):')
    if (reason === null) return
    try {
      setActionLoading(true)
      const { data } = await api.put(`/api/admin/stores/${storeId}/reject-pickup`, { reason })
      notify(data.message || 'Pickup address update rejected', 'info')
      setReviewingPickupStore(null)
      loadStores()
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to reject pickup address', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingStore) {
        await api.put(`/api/admin/stores/${editingStore._id}`, formData)
        notify('Seller updated successfully', 'success')
      } else {
        await api.post('/api/admin/stores', formData)
        notify('Seller added successfully', 'success')
      }
      setShowModal(false)
      resetForm()
      loadStores()
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to save seller', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingStore(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: ''
      },
      gstNumber: '',
      image: null,
      storePercentage: 0,
      adminCutPercentage: 5,
      isActive: true,
      isPopular: false
    })
  }

  const togglePopular = async (store) => {
    try {
      const updatedStore = { ...store, isPopular: !store.isPopular }
      await api.put(`/api/admin/stores/${store._id}`, updatedStore)
      setStores(prev => prev.map(s => s._id === store._id ? updatedStore : s))
      notify(`Seller ${updatedStore.isPopular ? 'marked as popular' : 'removed from popular'}`, 'success')
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to update seller', 'error')
    }
  }

  const openEditModal = (store) => {
    setEditingStore(store)
    setFormData({
      ...store,
      password: ''
    })
    setShowModal(true)
  }

  const deleteStore = async (storeId) => {
    if (!window.confirm('Are you sure you want to delete this seller?')) return
    try {
      await api.delete(`/api/admin/stores/${storeId}`)
      notify('Seller deleted successfully', 'success')
      loadStores()
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to delete seller', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sellers</h1>
          <p className="text-sm text-gray-500">Manage your sellers and their store details</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
        >
          Add Seller
        </button>
      </div>

      {stores.filter(s => s.pickupAddressStatus === 'PENDING_APPROVAL' && s.pendingPickupAddress?.line1).length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg">
              📍
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {stores.filter(s => s.pickupAddressStatus === 'PENDING_APPROVAL' && s.pendingPickupAddress?.line1).length} Seller(s) requested pickup location changes
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Review their updated pickup warehouses and approve or reject before shipments use the new location.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => (
            <div key={store._id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {store.image?.url ? (
                    <img src={store.image.url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">{store.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 truncate">{store.name}</h3>
                    {store.isPopular && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 text-xs font-bold rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{store.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium text-gray-900">{store.phone}</span>
                </div>
                {store.gstNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">GST:</span>
                    <span className="font-medium text-gray-900">{store.gstNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${store.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {store.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {store.pickupAddressStatus === 'PENDING_APPROVAL' && store.pendingPickupAddress?.line1 && (
                <div className="mt-4 p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black uppercase tracking-wider text-[10px] text-amber-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Pending Pickup Approval
                    </span>
                    <button
                      onClick={() => setReviewingPickupStore(store)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Compare
                    </button>
                  </div>
                  <p className="text-slate-700 line-clamp-1">
                    <strong className="text-slate-900">New:</strong> {store.pendingPickupAddress.line1}, {store.pendingPickupAddress.city} ({store.pendingPickupAddress.pincode})
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => handleApprovePickup(store._id)}
                      disabled={actionLoading}
                      className="flex-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectPickup(store._id)}
                      disabled={actionLoading}
                      className="py-1 px-2.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => togglePopular(store)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    store.isPopular
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {store.isPopular ? 'Unmark Popular' : 'Mark Popular'}
                </button>
                <button
                  onClick={() => openEditModal(store)}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteStore(store._id)}
                  className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {stores.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No sellers added yet. Click "Add Seller" to get started!
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Seller Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingStore ? 'Edit Seller' : 'Add New Seller'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Store Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required={!editingStore}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Password {!editingStore && '*'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    required={!editingStore}
                    placeholder={editingStore ? 'Leave blank to keep current' : ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">GST Number</label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">GST Percentage</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[5, 12, 18, 28].map(percent => (
                      <button
                        key={percent}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, gstPercentage: percent }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          formData.gstPercentage === percent
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    name="gstPercentage"
                    value={formData.gstPercentage}
                    onChange={handleFormChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">Store Image</label>
                  <div className="flex items-center gap-3">
                    <ImageUpload
                      onUploaded={(url, key) => setFormData(prev => ({
                        ...prev,
                        image: { url, publicId: key }
                      }))}
                    />
                    {formData.image?.url && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {formData.image?.url && (
                    <div className="mt-2">
                      <img
                        src={formData.image.url}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Store Percentage (%)</label>
                  <input
                    type="number"
                    name="storePercentage"
                    value={formData.storePercentage}
                    onChange={handleFormChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Admin Cut (%)</label>
                  <input
                    type="number"
                    name="adminCutPercentage"
                    value={formData.adminCutPercentage}
                    onChange={handleFormChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Address Details</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Address Line 1</label>
                    <input
                      type="text"
                      name="address.line1"
                      value={formData.address.line1}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Address Line 2</label>
                    <input
                      type="text"
                      name="address.line2"
                      value={formData.address.line2}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Pincode</label>
                      <input
                        type="text"
                        name="address.pincode"
                        value={formData.address.pincode}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleFormChange}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Store is active
                </label>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  name="isPopular"
                  checked={formData.isPopular}
                  onChange={handleFormChange}
                  className="w-4 h-4 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                />
                <label htmlFor="isPopular" className="text-sm font-medium text-gray-700">
                  Mark as popular seller
                </label>
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingStore ? 'Update Seller' : 'Add Seller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Pickup Modal */}
      {reviewingPickupStore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Pickup Address Verification</span>
                <h2 className="text-base font-bold text-gray-900">{reviewingPickupStore.name}</h2>
              </div>
              <button
                onClick={() => setReviewingPickupStore(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Current Active Pickup Location</span>
                  {reviewingPickupStore.pickupAddress?.line1 ? (
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-800">{reviewingPickupStore.pickupName || reviewingPickupStore.name}</p>
                      <p className="text-slate-600">{reviewingPickupStore.pickupPhone || reviewingPickupStore.phone}</p>
                      <p className="text-slate-700">{reviewingPickupStore.pickupAddress?.line1}</p>
                      {reviewingPickupStore.pickupAddress?.line2 && <p className="text-slate-700">{reviewingPickupStore.pickupAddress?.line2}</p>}
                      <p className="text-slate-700">{reviewingPickupStore.pickupAddress?.city}, {reviewingPickupStore.pickupAddress?.state} - {reviewingPickupStore.pickupAddress?.pincode}</p>
                      {reviewingPickupStore.delhiveryPickupLocation && (
                        <p className="pt-2 text-[11px] text-slate-500 border-t border-slate-200">
                          Warehouse: <strong>{reviewingPickupStore.delhiveryPickupLocation}</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No previous pickup address recorded</p>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block mb-2">Requested New Pickup Location</span>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-amber-950">{reviewingPickupStore.pendingPickupAddress?.pickupName || reviewingPickupStore.pickupName || reviewingPickupStore.name}</p>
                    <p className="text-amber-800">{reviewingPickupStore.pendingPickupAddress?.pickupPhone || reviewingPickupStore.pickupPhone || reviewingPickupStore.phone}</p>
                    <p className="text-amber-900">{reviewingPickupStore.pendingPickupAddress?.line1}</p>
                    {reviewingPickupStore.pendingPickupAddress?.line2 && <p className="text-amber-900">{reviewingPickupStore.pendingPickupAddress?.line2}</p>}
                    <p className="text-amber-900 font-semibold">{reviewingPickupStore.pendingPickupAddress?.city}, {reviewingPickupStore.pendingPickupAddress?.state} - {reviewingPickupStore.pendingPickupAddress?.pincode}</p>
                    {reviewingPickupStore.pickupAddressRequestedAt && (
                      <p className="pt-2 text-[10px] text-amber-600 border-t border-amber-200">
                        Requested: {new Date(reviewingPickupStore.pickupAddressRequestedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleRejectPickup(reviewingPickupStore._id)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition disabled:opacity-50"
                >
                  Reject Change
                </button>
                <button
                  onClick={() => handleApprovePickup(reviewingPickupStore._id)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Updating…' : 'Approve & Activate New Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
