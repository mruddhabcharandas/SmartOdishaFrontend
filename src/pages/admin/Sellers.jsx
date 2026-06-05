import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function Sellers() {
  const { notify } = useToast()
  const [stores, setStores] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingStore, setEditingStore] = useState(null)
  const [loading, setLoading] = useState(false)
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
    isActive: true
  })

  // Load stores on initial render
  const loadStores = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/admin/stores')
      setStores(data)
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to load sellers', 'error')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadStores() }, [])

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

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          image: { url: event.target.result }
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingStore) {
        await api.put(`/admin/stores/${editingStore._id}`, formData)
        notify('Seller updated successfully', 'success')
      } else {
        await api.post('/admin/stores', formData)
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
      isActive: true
    })
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
      await api.delete(`/admin/stores/${storeId}`)
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
                  <h3 className="font-bold text-gray-900 truncate">{store.name}</h3>
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
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => openEditModal(store)}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
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
                  <label className="text-sm font-medium text-gray-700">Store Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
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
    </div>
  )
}
