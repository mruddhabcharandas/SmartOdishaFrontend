import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function Stores() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [section, setSection] = useState('')
  const [activeId, setActiveId] = useState('')
  const [browseStore, setBrowseStore] = useState('')
  const [browseSection, setBrowseSection] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const { data } = await api.get('/api/stores')
    setItems(data || [])
  }
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try { await api.post('/api/stores', { name }); setName(''); load(); notify('Store added','success') }
    catch (e) { notify(e?.response?.data?.error || 'Failed','error') }
  }
  const addSection = async (storeId) => {
    if (!section.trim() || !activeId) return
    try { await api.post(`/api/stores/${storeId}/sections`, { name: section }); setSection(''); load(); notify('Section added','success') }
    catch { notify('Failed','error') }
  }

  const loadProducts = async (storeName, sectionName='') => {
    if (!storeName) { setProducts([]); return }
    setLoading(true)
    try {
      const params = { store: storeName, limit: 100 }
      if (sectionName) params.section = sectionName
      const { data } = await api.get('/api/products', { params })
      setProducts(data.items || [])
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stores & Sections</h1>
        <p className="text-sm text-gray-500">Manage physical locations and sections for your inventory.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <form onSubmit={create} className="bg-white border rounded-2xl p-5 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add Store</div>
          <input className="w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm font-bold" placeholder="Store name (e.g., Warehouse A)" value={name} onChange={e=>setName(e.target.value)} />
          <button className="px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold">Add Store</button>
        </form>

        <div className="bg-white border rounded-2xl p-5 space-y-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stores</div>
          <div className="divide-y">
            {items.map(s => (
              <div key={s._id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">{s.name}</div>
                  <button onClick={()=>setActiveId(activeId===s._id?'':s._id)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold">{activeId===s._id?'Close':'Manage'}</button>
                </div>
                {activeId===s._id && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <input className="flex-1 bg-gray-50 border rounded-xl px-3 py-2 text-sm" placeholder="New section (e.g., Rack B2)" value={section} onChange={e=>setSection(e.target.value)} />
                      <button onClick={()=>addSection(s._id)} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold">Add Section</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(s.sections || []).map(sec => (
                        <span key={sec} className="px-2 py-1 rounded-lg bg-gray-50 border text-[11px] font-bold">{sec}</span>
                      ))}
                      {(s.sections || []).length === 0 && (
                        <div className="text-xs text-gray-500">No sections added yet</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && <div className="py-6 text-sm text-gray-500">No stores yet</div>}
          </div>
        </div>
      </div>
      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Browse Inventory by Location</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Store</label>
            <select className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm font-bold"
              value={browseStore}
              onChange={e => { 
                const val = e.target.value; 
                setBrowseStore(val); 
                setBrowseSection(''); 
                loadProducts(val, '') 
              }}>
              <option value="">Select store</option>
              {items.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Section</label>
            <select className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm font-bold"
              value={browseSection}
              onChange={e => { 
                const sec = e.target.value; 
                setBrowseSection(sec); 
                loadProducts(browseStore, sec) 
              }}
              disabled={!browseStore}
            >
              <option value="">All sections</option>
              {(items.find(s => s.name === browseStore)?.sections || []).map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>
        </div>
        <div>
          {!browseStore ? (
            <div className="text-sm text-gray-500">Select a store to view its inventory.</div>
          ) : loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-gray-500">No products found for the selected location.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {products.map(p => (
                <div key={p._id} className="border rounded-2xl p-3 bg-gray-50 hover:bg-white">
                  <div className="h-24 w-full bg-white border rounded-xl flex items-center justify-center overflow-hidden">
                    {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} className="h-full w-full object-contain" /> : <span className="text-[10px] text-gray-400">No Img</span>}
                  </div>
                  <div className="mt-2 text-[12px] font-bold text-gray-800 truncate">{p.name}</div>
                  <div className="text-[10px] text-gray-500">{(p.store || '')}{p.section ? `(${p.section})` : ''}</div>
                  <div className="text-[10px] font-black mt-1">{p.stock ?? 0} IN STOCK</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
