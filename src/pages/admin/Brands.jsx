import { useEffect, useState } from 'react'
import api from '../../lib/api'
import ImageUpload from '../../components/ImageUpload'
import ConfirmModal from '../../components/ConfirmModal'

export default function Brands() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', slug: '', logo: '' })
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const load = async () => {
    const { data } = await api.get('/api/brands')
    setItems(data)
  }

  const confirmDelete = async (password) => {
    if (!toDelete) return
    try {
      await api.delete(`/api/brands/${toDelete._id}`, {
        headers: { 'X-Action-Password': password },
        data: { password }
      })
      setToDelete(null)
      load()
    } catch (err) {
      throw err
    }
  }

  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    await api.post('/api/brands', form)
    setForm({ name: '', slug: '', logo: '' })
    load()
  }

  const toggle = async (b) => {
    await api.put(`/api/brands/${b._id}`, { isActive: !b.isActive })
    load()
  }

  const update = async (e) => {
    e.preventDefault()
    if (!editing) return
    await api.put(`/api/brands/${editing._id}`, { name: editing.name, slug: editing.slug, logo: editing.logo, isActive: editing.isActive })
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Brands</h1>
          <p className="text-sm text-gray-500 font-medium">Manage product brands for better filtering and SEO.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Add New Brand</h3>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Brand Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. OPPO" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Slug (SEO)</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. oppo" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Logo URL (Optional)</label>
                <div className="flex items-center gap-2">
                  <input className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} />
                  <ImageUpload onUploaded={(url) => setForm(f => ({ ...f, logo: url }))} />
                </div>
              </div>
              <button className="w-full bg-gray-900 text-white py-4 rounded-2xl text-sm font-black shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest">Create Brand</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Active Brands</h3>
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-50">
              {items.map(b => (
                <div key={b._id} className="p-6 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setEditing({ ...b })}>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                      {b.logo ? <img src={b.logo} alt={b.name} className="h-full w-full object-contain p-2" /> : <span className="text-xl">🏭</span>}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 capitalize">{b.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Slug: {b.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggle(b); }} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${b.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                      {b.isActive ? 'Active' : 'Hidden'}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setToDelete(b); }}
                      className="p-2 rounded-xl transition-all text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete Brand"
                    >
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <form onSubmit={update} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Edit Brand</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Slug</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Logo URL</label>
                <div className="flex items-center gap-2">
                  <input className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium outline-none" value={editing.logo} onChange={e => setEditing({ ...editing, logo: e.target.value })} />
                  <ImageUpload onUploaded={(url) => setEditing(f => ({ ...f, logo: url }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">Cancel</button>
              <button className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {toDelete && (
        <ConfirmModal
          open={!!toDelete}
          title="Delete Brand?"
          message={`Are you sure you want to delete brand "${toDelete.name}"? Products under this brand will be unlinked.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}
