import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function SubCategories() {
  const [items, setItems] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', categoryId: '' })
  const [editing, setEditing] = useState(null)

  const load = async () => {
    const { data } = await api.get('/api/subcategories')
    setItems(data)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    api.get('/api/brands', { params: { active: true } }).then(({ data }) => setBrands(data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const params = { active: true };
    if (selectedBrand) params.brand = selectedBrand;
    api.get('/api/categories', { params }).then(({ data }) => setCategories(data || [])).catch(() => {})
  }, [selectedBrand])

  const create = async (e) => {
    e.preventDefault()
    await api.post('/api/subcategories', form)
    setForm({ name: '', slug: '', categoryId: '' })
    load()
  }

  const toggle = async (s) => {
    await api.put(`/api/subcategories/${s._id}`, { isActive: !s.isActive })
    load()
  }

  const update = async (e) => {
    e.preventDefault()
    if (!editing) return
    await api.put(`/api/subcategories/${editing._id}`, { name: editing.name, slug: editing.slug, categoryId: editing.categoryId, isActive: editing.isActive })
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Subcategories</h1>
          <p className="text-sm text-gray-500 font-medium">Define granular sub-groups for your categories.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Add New Subcategory</h3>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Filter by Brand (Optional)</label>
                <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                  <option value="">All Brands / No Brand</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Category</label>
                <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Subcategory Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 20W" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Slug</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 20w" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required />
              </div>
              <button className="w-full bg-gray-900 text-white py-4 rounded-2xl text-sm font-black shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest">Create Subcategory</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Active Subcategories</h3>
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-50">
              {items.map(s => (
                <div key={s._id} className="p-6 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setEditing({ ...s })}>
                  <div>
                    <div className="font-bold text-gray-900 capitalize">{s.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Category: {s.category?.name || '-'} | Slug: {s.slug}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggle(s); }} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${s.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                    {s.isActive ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <form onSubmit={update} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Edit Subcategory</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Slug</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} required />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">Cancel</button>
              <button className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
