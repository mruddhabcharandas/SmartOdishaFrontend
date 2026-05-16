import { useEffect, useState } from 'react'
import api from '../../lib/api'

const COMPONENTS = [
  { id: 'products', label: 'Products' },
  { id: 'brands', label: 'Brands' },
  { id: 'categories', label: 'Categories' },
  { id: 'subcategories', label: 'Subcategories' },
  { id: 'billing', label: 'Billing' },
  { id: 'orders', label: 'Orders' },
  { id: 'payment-verification', label: 'Payment Verification' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'offers', label: 'Offers' },
  { id: 'partners', label: 'Partners' },
  { id: 'customers', label: 'Customers' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'stores', label: 'Stores' },
  { id: 'settings', label: 'Settings' }
]

export default function StaffManagement() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', permissions: [] })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const { data } = await api.get('/api/admin/staff')
      setItems(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/admin/staff', form)
      setForm({ name: '', email: '', password: '', permissions: [] })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create staff')
    } finally {
      setLoading(false)
    }
  }

  const update = async (e) => {
    e.preventDefault()
    if (!editing) return
    setLoading(true)
    try {
      await api.put(`/api/admin/staff/${editing._id}`, editing)
      setEditing(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update staff')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Are you sure?')) return
    try {
      await api.delete(`/api/admin/staff/${id}`)
      load()
    } catch (err) {
      alert('Failed to delete staff')
    }
  }

  const togglePermission = (id, isEditing = false) => {
    if (isEditing) {
      const perms = editing.permissions.includes(id)
        ? editing.permissions.filter(p => p !== id)
        : [...editing.permissions, id]
      setEditing({ ...editing, permissions: perms })
    } else {
      const perms = form.permissions.includes(id)
        ? form.permissions.filter(p => p !== id)
        : [...form.permissions, id]
      setForm({ ...form, permissions: perms })
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff Management</h1>
        <p className="text-sm text-gray-500 font-medium">Create and manage staff accounts with specific permissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6 sticky top-24">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Add New Staff</h3>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Staff Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email</label>
                <input type="email" className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email Address" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Password</label>
                <input type="password" title="At least 6 characters" className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block">Permissions (Access to:)</label>
                <div className="grid grid-cols-2 gap-2">
                  {COMPONENTS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePermission(c.id)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        form.permissions.includes(c.id)
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button disabled={loading} className="w-full bg-gray-900 text-white py-4 rounded-2xl text-sm font-black shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Staff Member'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Active Staff Members</h3>
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-50">
              {items.length === 0 && <div className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No staff members found</div>}
              {items.map(s => (
                <div key={s._id} className="p-6 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{s.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">{s.email}</div>
                    <div className="flex flex-wrap gap-1">
                      {s.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 rounded-md uppercase tracking-tighter">
                          {COMPONENTS.find(c => c.id === p)?.label || p}
                        </span>
                      ))}
                      {s.permissions.length === 0 && <span className="text-[8px] text-gray-300 font-bold italic uppercase">No Permissions</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditing({ ...s })} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => remove(s._id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setEditing(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Edit Staff Member</h3>
            <form onSubmit={update} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold opacity-50 cursor-not-allowed" value={editing.email} readOnly />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">New Password (Optional)</label>
                <input type="password" className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Leave blank to keep current" value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} minLength={6} />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 block">Update Permissions</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {COMPONENTS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePermission(c.id, true)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        editing.permissions.includes(c.id)
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 px-2 py-4 bg-gray-50 rounded-2xl">
                <input type="checkbox" id="edit-active" checked={editing.isActive} onChange={e => setEditing({...editing, isActive: e.target.checked})} className="w-4 h-4 rounded text-gray-900 focus:ring-gray-900 border-gray-200" />
                <label htmlFor="edit-active" className="text-xs font-bold text-gray-600 uppercase tracking-widest">Account Active</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-4 rounded-2xl text-sm font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-colors">Cancel</button>
                <button disabled={loading} className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl text-sm font-black shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest disabled:opacity-50">
                  {loading ? 'Saving...' : 'Update Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
