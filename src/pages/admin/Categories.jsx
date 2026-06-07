import { useEffect, useState } from 'react'
import api from '../../lib/api'
import ImageUpload from '../../components/ImageUpload'

export default function Categories(){
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name:'', slug:'', image:'' })
  const [editing, setEditing] = useState(null)
  
  const load = async () => { 
    const {data} = await api.get('/api/categories')
    setItems(data)
  }
  useEffect(()=>{ load() }, [])

  const create = async (e) => { 
    e.preventDefault(); 
    await api.post('/api/categories', form); 
    setForm({ name:'', slug:'', image:'' }); 
    load() 
  }
  const toggle = async (c) => { await api.put(`/api/categories/${c._id}`, { isActive: !c.isActive }); load() }
  const remove = async (id) => { 
    if(window.confirm('Are you sure you want to delete this category?')) {
      await api.delete(`/api/categories/${id}`); 
      load();
    }
  }
  const update = async (e) => {
    e.preventDefault()
    if (!editing) return
    await api.put(`/api/categories/${editing._id}`, { 
      name: editing.name, 
      slug: editing.slug, 
      image: editing.image || '', 
      isActive: editing.isActive
    })
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Product Categories</h1>
          <p className="text-sm text-gray-500 font-medium">Organize your products into logical groups for better browsing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Add New Category</h3>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Category Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Chargers" value={form.name} onChange={e=>setForm({...form, name:e.target.value, slug:e.target.value.toLowerCase().replace(/\s+/g, '-')})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Slug</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. chargers" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Image (Optional)</label>
                <div className="flex items-center gap-2">
                  <input className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={form.image} onChange={e=>setForm({...form, image:e.target.value})} />
                  <ImageUpload onUploaded={(url)=>setForm(f=>({...f, image:url}))} />
                </div>
                {form.image && (
                  <div className="mt-2 h-20 w-20 rounded-xl border border-gray-100 bg-white overflow-hidden flex items-center justify-center">
                    <img src={form.image} alt="Preview" className="h-full w-full object-contain p-2" />
                  </div>
                )}
              </div>
              <button className="w-full bg-gray-900 text-white py-4 rounded-2xl text-sm font-black shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest">Create Category</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Active Categories</h3>
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-50">
              {items.map(c => (
                <div key={c._id} className="p-6 flex justify-between items-center hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={()=>setEditing({...c})}>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                      {c.image ? <img src={c.image} alt={c.name} className="h-full w-full object-contain p-1" /> : <span className="text-[10px] text-gray-400">No Img</span>}
                    </div>
                    <div className="space-y-1">
                    <div className="font-bold text-gray-900 capitalize text-lg tracking-tight">{c.name}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Slug: {c.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      {c.isActive ? 'ACTIVE' : 'DISABLED'}
                    </div>
                    <button 
                      onClick={()=>toggle(c)} 
                      className={`p-2 rounded-xl transition-all ${c.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      title={c.isActive ? 'Disable Category' : 'Enable Category'}
                    >
                      {c.isActive ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                    <button 
                      onClick={(e)=>{ e.stopPropagation(); remove(c._id); }} 
                      className="p-2 rounded-xl transition-all text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete Category"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="p-12 text-center text-gray-400 italic font-medium">No categories found. Start by creating one.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setEditing(null)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={update} className="bg-white rounded-3xl p-6 w-full max-w-md border border-gray-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Edit Category</h3>
              <button type="button" className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100" onClick={()=>setEditing(null)}>
                <svg className="w-4 h-4 m-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Name</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Slug</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={editing.slug} onChange={e=>setEditing({...editing, slug: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Image</label>
                <div className="flex items-center gap-2">
                  <input className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={editing.image || ''} onChange={e=>setEditing({...editing, image: e.target.value})} />
                  <ImageUpload onUploaded={(url)=>setEditing(ed=>({...ed, image:url}))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={()=>setEditing(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
