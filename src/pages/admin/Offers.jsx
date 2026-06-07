import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function Offers(){
  const [items, setItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    title: '', bannerImage: '', discountPercent: '', products: '', startDate: '', endDate: '', isActive: true
  })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/offers')
      setItems(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setForm({ title: '', bannerImage: '', discountPercent: '', products: '', startDate: '', endDate: '', isActive: true })
    setEditingId(null)
  }

  const startEdit = (o) => {
    setEditingId(o._id)
    setForm({
      title: o.title,
      bannerImage: o.bannerImage,
      discountPercent: o.discountPercent,
      products: (o.products || []).map(p => p._id || p).join(', '),
      startDate: o.startDate ? new Date(o.startDate).toISOString().split('T')[0] : '',
      endDate: o.endDate ? new Date(o.endDate).toISOString().split('T')[0] : '',
      isActive: o.isActive
    })
  }

  const save = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      discountPercent: Number(form.discountPercent),
      products: form.products.split(',').map(s => s.trim()).filter(s => s.length === 24),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined
    }

    try {
      if (editingId) {
        await api.put(`/api/offers/${editingId}`, payload)
      } else {
        await api.post('/api/offers', payload)
      }
      resetForm()
      load()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save offer')
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this offer?')) return
    await api.delete(`/api/offers/${id}`)
    load()
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Marketing Offers & Banners</h1>
          <p className="text-sm text-gray-500 font-medium">Create promotional banners and discounts for the homepage.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm sticky top-24">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">
              {editingId ? 'Edit Offer' : 'Create New Offer'}
            </h3>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Offer Title</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Summer Sale" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Banner Image URL</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." value={form.bannerImage} onChange={e => setForm({ ...form, bannerImage: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Discount %</label>
                  <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="10" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Status</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" value={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Start Date</label>
                  <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">End Date</label>
                  <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Linked Product IDs (comma separated)</label>
                <textarea className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 h-20" placeholder="65af..." value={form.products} onChange={e => setForm({ ...form, products: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 bg-gray-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:-translate-y-0.5 transition-all">
                  {editingId ? 'Update Offer' : 'Create Offer'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-600 px-6 rounded-2xl text-xs font-black uppercase">Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 ml-2">Live Offers</h3>
          <div className="grid grid-cols-1 gap-4">
            {loading && <div className="text-center py-12 text-gray-400 font-bold">Loading...</div>}
            {!loading && items.length === 0 && <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 font-bold">No offers found</div>}
            {items.map(o => (
              <div key={o._id} className={`group bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex gap-6 items-center ${!o.isActive ? 'opacity-50 grayscale' : ''}`}>
                <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                  <img src={o.bannerImage} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold text-gray-900">{o.title}</h4>
                    {o.isActive ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-md border border-emerald-100">Live</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[8px] font-black uppercase rounded-md border border-gray-100">Paused</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    {o.discountPercent}% OFF • {o.products?.length || 0} Products
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {o.startDate ? new Date(o.startDate).toLocaleDateString() : 'Now'} — {o.endDate ? new Date(o.endDate).toLocaleDateString() : 'Forever'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(o)} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button onClick={() => remove(o._id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
