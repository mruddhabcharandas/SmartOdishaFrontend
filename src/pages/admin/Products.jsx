import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import ImageUpload from '../../components/ImageUpload'

export default function Products() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ name:'', price:'', mrp:'', brandId: '', categoryId:'', subCategoryId:'', stock:'', weight:'', hsnCode:'', gst:'', images: '', description:'', highlights: [], highlightInput:'', specifications: [], specKey:'', specValue:'', minOrderQty:'', bulkDiscountQuantity: '', bulkDiscountPriceReduction: '', bulkTiers: [], store:'', section:'', variantDisplayType: 'selector', packSize: '' })
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [managingVariants, setManagingVariants] = useState(null)
  const [editingVariant, setEditingVariant] = useState(null)
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [stores, setStores] = useState([])
  const [openDropdown, setOpenDropdown] = useState(null)
  const limit = 10
  const [preview, setPreview] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)

  const [loading, setLoading] = useState(false)
  const load = async (p=1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/products', { params: { page:p, limit, q } })
      setItems(data.items); setTotal(data.total); setPage(p)
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load(1) }, [q])

  useEffect(() => {
    api.get('/api/brands', { params: { active: true } }).then(({ data }) => setBrands(data || [])).catch(() => {})
  }, [])
  useEffect(() => {
    const brandId = editing ? editing.brandId : form.brandId;
    const params = { active: true };
    if (brandId) params.brand = brandId;
    api.get('/api/categories', { params }).then(({ data }) => setCategories(data || [])).catch(() => {})
  }, [form.brandId, editing?.brandId])
  const [lastCategoryId, setLastCategoryId] = useState(null)
  useEffect(() => {
    const categoryId = editing ? editing.categoryId : form.categoryId;
    if (categoryId) {
      api.get('/api/subcategories', { params: { category: categoryId, active: true } }).then(({ data }) => setSubcategories(data || [])).catch(() => {})
      
      // Auto load attributes from category only if category changed
      if (categoryId !== lastCategoryId) {
        const cat = categories.find(c => c._id === categoryId)
        if (cat && Array.isArray(cat.attributes) && cat.attributes.length > 0) {
          if (editing) {
            setEditing(prev => ({ ...prev, attributes: cat.attributes }))
          }
        }
        setLastCategoryId(categoryId)
      }
    } else {
      setSubcategories([])
      setLastCategoryId(null)
    }
  }, [form.categoryId, editing?.categoryId, categories, lastCategoryId])
  useEffect(() => {
    api.get('/api/stores').then(({ data }) => setStores(data || [])).catch(()=>{})
  }, [])

  const create = async (e) => {
    e.preventDefault()
    const images = form.images.split(',').map(s=>s.trim()).filter(Boolean)
    const stockNum = Number(form.stock)
    await api.post('/api/products', { 
      name: form.name,
      price: Number(form.price), 
      stock: Number.isFinite(stockNum) ? stockNum : 0, 
      weight: Number(form.weight || 0),
      gst: Number(form.gst||0), 
      mrp: form.mrp ? Number(form.mrp) : undefined,
      minOrderQty: Number(form.minOrderQty || 0),
      packSize: Number(form.packSize || 1),
      description: form.description || '',
      highlights: (form.highlights || []).map(h => String(h).trim()).filter(Boolean),
      specifications: (form.specifications || []).map(s => ({ key: String(s.key||'').trim(), value: String(s.value||'').trim() })).filter(s => s.key && s.value),
      bulkDiscountQuantity: form.bulkTiers?.[0]?.quantity ? Number(form.bulkTiers[0].quantity) : Number(form.bulkDiscountQuantity||0),
      bulkDiscountPriceReduction: form.bulkTiers?.[0]?.priceReduction ? Number(form.bulkTiers[0].priceReduction) : Number(form.bulkDiscountPriceReduction||0),
      bulkTiers: (form.bulkTiers || []).map(t => ({ quantity: Number(t.quantity||0), priceReduction: Number(t.priceReduction||0) })),
      images,
      brandId: form.brandId || undefined,
      categoryId: form.categoryId,
      subCategoryId: form.subCategoryId || undefined,
      store: form.store || '',
      section: form.section || '',
      hsnCode: form.hsnCode || '',
      attributes: [],
      variantDisplayType: form.variantDisplayType || 'selector',
      variants: []
    })
    setForm({ name:'', price:'', mrp:'', brandId:'', categoryId:'', subCategoryId:'', stock:'', weight: '', hsnCode: '', gst:'', images: '', description:'', highlights: [], highlightInput:'', specifications: [], specKey:'', specValue:'', minOrderQty:'', bulkDiscountQuantity: '', bulkDiscountPriceReduction: '', bulkTiers: [], store:'', section:'', variantDisplayType: 'selector', packSize: '' }); setShowAddProduct(false); load(page); notify('Product added','success')
  }

  const reduceStock = async (id) => {
    const qty = Number(prompt('Reduce by quantity?')||'0')
    if (qty>0){ await api.patch(`/api/products/${id}/stock`, { quantity: qty }); load(page) }
  }

  const openEdit = (p) => {
    const ed = { 
      ...p, 
      brandId: p.brand?._id || p.brand || '',
      categoryId: p.category?._id || p.category || '',
      subCategoryId: p.subCategory?._id || p.subCategory || '',
      weight: p.weight || '',
      hsnCode: p.hsnCode || '',
      images: (p.images||[]).map(i=>i.url||i).join(', '),
      attributes: Array.isArray(p.attributes) ? p.attributes : [],
      variants: (p.variants || []).map(v => ({
        ...v,
        attributes: v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {}),
        price: v.price || '',
        mrp: v.mrp || '',
        stock: v.stock || '',
        weight: v.weight || '',
        images: (v.images || []).map(i => i.url || i).join(', ')
      })),
      bulkDiscountQuantity: p.bulkDiscountQuantity || '',
      bulkDiscountPriceReduction: p.bulkDiscountPriceReduction || '',
      minOrderQty: p.minOrderQty || '',
      packSize: p.packSize ?? '',
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      highlightInput: '',
      bulkTiers: Array.isArray(p.bulkTiers) ? p.bulkTiers.map(t => ({ quantity: t.quantity, priceReduction: t.priceReduction })) : [],
      specifications: Array.isArray(p.specifications) ? p.specifications.map(s => ({ key: s.key || '', value: s.value || '' })).filter(s => s.key && s.value) : [],
      specKey: '',
      specValue: '',
      variantDisplayType: p.variantDisplayType || 'selector'
    }
    setEditing(ed)
    return ed
  }
  const saveEdit = async (e) => {
    e.preventDefault()
    const payload = {
      name: editing.name,
      description: editing.description,
      price: Number(editing.price),
      brandId: editing.brandId,
      categoryId: editing.categoryId,
      subCategoryId: editing.subCategoryId || undefined,
      weight: Number(editing.weight || 0),
      hsnCode: editing.hsnCode || '',
      gst: Number(editing.gst || 0),
      mrp: editing.mrp ? Number(editing.mrp) : undefined,
      minOrderQty: Number(editing.minOrderQty || 0),
      packSize: Number(editing.packSize || 1),
      highlights: (editing.highlights || []).map(h => String(h).trim()).filter(Boolean),
      specifications: (editing.specifications || []).map(s => ({ key: String(s.key||'').trim(), value: String(s.value||'').trim() })).filter(s => s.key && s.value),
      bulkDiscountQuantity: editing.bulkTiers?.[0]?.quantity ? Number(editing.bulkTiers[0].quantity) : Number(editing.bulkDiscountQuantity||0),
      bulkDiscountPriceReduction: editing.bulkTiers?.[0]?.priceReduction ? Number(editing.bulkTiers[0].priceReduction) : Number(editing.bulkDiscountPriceReduction||0),
      bulkTiers: (editing.bulkTiers || []).map(t => ({ quantity: Number(t.quantity||0), priceReduction: Number(t.priceReduction||0) })),
      images: (editing.images||'').split(',').map(s=>s.trim()).filter(Boolean),
      store: editing.store || '',
      section: editing.section || '',
      attributes: editing.attributes || [],
      variantDisplayType: editing.variantDisplayType || 'selector',
      variants: (editing.variants || []).map(v => ({
        ...v,
        attributes: v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes,
        price: Number(v.price),
        mrp: v.mrp ? Number(v.mrp) : undefined,
        weight: Number(v.weight || 0),
        images: (v.images || '').toString().split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url }))
      }))
    }
    // Remove stock from payload to prevent accidental reset to 0
    delete payload.stock;
    payload.variants.forEach(v => delete v.stock);

    await api.put(`/api/products/${editing._id}`, payload)
    setEditing(null); load(page); notify('Product updated','success')
  }
  const remove = (p) => setToDelete(p)
  const confirmDelete = async () => { if (!toDelete) return; await api.delete(`/api/products/${toDelete._id}`); setToDelete(null); load(page); notify('Product deleted','success') }

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
      <div className="space-y-6 max-w-[1600px] mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Catalogue</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Manage inventory, pricing, and variants</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddProduct(v => !v)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${showAddProduct ? 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200' : 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800 shadow-md'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
              {showAddProduct ? 'Close add form' : 'Add New Product'}
            </button>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <input
                placeholder="Search products..."
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl pl-10 pr-4 py-2.5 w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className={`space-y-4 flex flex-col min-h-[320px] ${showAddProduct ? 'max-h-[min(48vh,480px)]' : 'max-h-[min(78vh,820px)]'}`}>
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Live Inventory ({total})</h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase">● In Stock</span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase">● Low Stock</span>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1">
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-sm border-collapse relative">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left">Product Details</th>
                      <th className="px-6 py-4 text-left">Price & GST</th>
                      <th className="px-6 py-4 text-left">Stock</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {!loading &&
                      items.map(p => (
                        <tr key={p._id} className="group hover:bg-gray-50/50 transition-all cursor-pointer" onClick={() => setViewing(p)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center p-1" onClick={(e) => { e.stopPropagation(); if (p.images?.[0]?.url) setPreview(p.images[0].url) }}>
                                {p.images?.[0]?.url ? (
                                  <img src={p.images[0].url} alt={p.name} className="h-full w-full object-contain" />
                                ) : (
                                  <span className="text-[9px] text-gray-400 font-bold">NO IMG</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 truncate max-w-[240px] text-sm">
                                  {p.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-blue-600 font-bold uppercase">{p.brand?.name || 'Unbranded'}</span>
                                  <span className="text-[9px] text-gray-400 font-medium">{p.category?.name || 'General'}</span>
                                  {p.variants?.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase border border-blue-100">
                                      {p.variants.length} Variants
                                    </span>
                                  )}
                                </div>
                                {p.variants?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {p.variants.slice(0, 3).map((v, idx) => (
                                      <span key={idx} className="text-[8px] bg-gray-100 px-1 rounded text-gray-500 font-bold">
                                        ({Object.values(v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {})).join(', ')})
                                      </span>
                                    ))}
                                    {p.variants.length > 3 && <span className="text-[8px] text-gray-400">+{p.variants.length - 3} more</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">₹{p.price.toLocaleString()}</div>
                            <div className="text-[10px] text-gray-400 font-medium">MRP: ₹{p.mrp?.toLocaleString()} · {p.gst}% GST</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-flex flex-col px-3 py-1 rounded-lg border ${p.stock <= 5 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                              <span className="text-xs font-bold">{p.stock}</span>
                              <span className="text-[8px] font-bold uppercase opacity-60">Units</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative inline-block">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === p._id ? null : p._id); }}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                title="Actions"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <circle cx="12" cy="6" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="12" cy="18" r="2" />
                                </svg>
                              </button>
                              {openDropdown === p._id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10"
                                    onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}
                                  />
                                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-100 shadow-xl z-20 py-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setManagingVariants(p); setOpenDropdown(null); }}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-all text-indigo-600"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                      Manage Variants
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openEdit(p); setOpenDropdown(null); }}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-all text-blue-600"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      Edit Product
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); reduceStock(p._id); setOpenDropdown(null); }}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-all text-amber-600"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                                      Reduce Stock
                                    </button>
                                    <div className="border-t border-gray-100 my-1" />
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); remove(p); setOpenDropdown(null); }}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-red-50 transition-all text-red-600"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      Delete Product
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-50 bg-gray-50/30">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Page {page} of {Math.max(1, Math.ceil(total / limit))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => load(Math.max(1, page - 1))} className="p-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm" disabled={page === 1}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => load(page + 1)} className="p-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm" disabled={page * limit >= total}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Creation Section — only when opened from header */}
          {showAddProduct && (
          <div className="flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ring-1 ring-indigo-100/80 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-5 sm:p-6 border-b border-gray-50 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add New Product</h3>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Catalogue wizard</p>
              </div>
              <div className="flex items-start gap-3 flex-1 justify-end min-w-0">
                <p className="text-[11px] text-gray-500 max-w-xl text-right max-md:text-left max-md:w-full">Variants and per-option SKUs: use <span className="font-bold text-indigo-600">Manage Variants</span> on the row after save.</p>
                <button type="button" onClick={() => setShowAddProduct(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0" title="Close">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={create} className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-4 sm:col-span-2 xl:col-span-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Product Name</label>
                      <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. iPhone 16" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Price (₹)</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="999" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">MRP (₹)</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1299" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Category</label>
                        <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} required>
                          <option value="">Select Category...</option>
                          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Subcategory</label>
                        <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.subCategoryId} onChange={e => setForm({ ...form, subCategoryId: e.target.value })}>
                          <option value="">Select Subcategory...</option>
                          {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Store</label>
                        <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.store} onChange={e => setForm({ ...form, store: e.target.value, section: '' })}>
                          <option value="">Select store</option>
                          {stores.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Section</label>
                        <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                          <option value="">Select section</option>
                          {(stores.find(s => s.name === form.store)?.sections || []).map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">GST %</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="12" value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Weight (g)</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 500" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">HSN Code</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 8517" value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Min Order Qty</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 5" value={form.minOrderQty} onChange={e => setForm({ ...form, minOrderQty: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Pack Size</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 12" value={form.packSize} onChange={e => setForm({ ...form, packSize: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Inventory Stock</label>
                        <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="50" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase ml-1">Variant Display</div>
                        <div className="text-[10px] text-gray-400 ml-1">{form.variantDisplayType === 'matrix' ? 'Bulk Matrix View' : 'Standard Selector'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, variantDisplayType: f.variantDisplayType === 'matrix' ? 'selector' : 'matrix' }))}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${form.variantDisplayType === 'matrix' ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${form.variantDisplayType === 'matrix' ? 'translate-x-9' : 'translate-x-1'}`}
                        />
                        <span className="absolute left-2 text-[8px] font-bold text-white uppercase">{form.variantDisplayType === 'matrix' ? 'MTX' : ''}</span>
                        <span className="absolute right-2 text-[8px] font-bold text-gray-400 uppercase">{form.variantDisplayType === 'selector' ? 'SEL' : ''}</span>
                      </button>
                    </div>
                    
                    <div className="space-y-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-500 uppercase ml-1">Bulk Options</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Bulk Qty</label>
                          <input className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 10" value={form.bulkDiscountQuantity} onChange={e => setForm({ ...form, bulkDiscountQuantity: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Reduction (₹)/Unit</label>
                          <input className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 50" value={form.bulkDiscountPriceReduction} onChange={e => setForm({ ...form, bulkDiscountPriceReduction: e.target.value })} />
                        </div>
                      </div>
                      <button type="button" onClick={() => {
                        const q = Number(form.bulkDiscountQuantity||0)
                        const r = Number(form.bulkDiscountPriceReduction||0)
                        if (Number.isFinite(q) && q > 0 && Number.isFinite(r) && r >= 0) {
                          setForm(f => ({ ...f, bulkTiers: [...(f.bulkTiers||[]), { quantity: q, priceReduction: r }], bulkDiscountQuantity: '', bulkDiscountPriceReduction: '' }))
                        }
                      }} className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100">Add Bulk Offer</button>
                      {(form.bulkTiers || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.bulkTiers.map((t, i) => (
                            <div key={i} className="inline-flex items-center gap-2 text-[10px] font-black bg-white border rounded-xl px-2 py-1">
                              <span className="text-gray-700">{t.quantity}+: -₹{t.priceReduction}</span>
                              <button type="button" className="text-red-600" onClick={() => setForm(f => ({ ...f, bulkTiers: f.bulkTiers.filter((_, idx) => idx !== i) }))}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Images</label>
                  <div className="flex gap-2">
                    <input className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-[10px] font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Multiple URLs comma-separated" value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} />
                    <ImageUpload onUploaded={url => setForm(f => ({ ...f, images: (f.images ? f.images + ', ' : '') + url }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Description</label>
                  <textarea className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" placeholder="Product details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Highlights</label>
                  <div className="flex gap-2">
                    <input className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold" placeholder="Add a highlight and press Add" value={form.highlightInput} onChange={e=>setForm({...form, highlightInput: e.target.value})} />
                    <button type="button" onClick={()=>{ const h=(form.highlightInput||'').trim(); if(h){ setForm(f=>({ ...f, highlights:[...(f.highlights||[]), h], highlightInput:'' })) } }} className="px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold">Add</button>
                  </div>
                  {(form.highlights||[]).length>0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.highlights.map((h,i)=>(
                        <span key={i} className="px-3 py-1 rounded-xl bg-gray-50 border text-[11px] font-bold flex items-center gap-2">
                          {h}
                          <button type="button" className="text-red-600" onClick={()=>setForm(f=>({...f, highlights: f.highlights.filter((_,idx)=>idx!==i)}))}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Specifications</label>
                  <div className="flex flex-wrap gap-2">
                    <input className="flex-1 min-w-[120px] bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold" placeholder="Name (e.g. Material)" value={form.specKey} onChange={e=>setForm({...form, specKey: e.target.value})} />
                    <input className="flex-1 min-w-[120px] bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold" placeholder="Value (e.g. Cotton)" value={form.specValue} onChange={e=>setForm({...form, specValue: e.target.value})} />
                    <button type="button" onClick={()=>{ const k=(form.specKey||'').trim(); const v=(form.specValue||'').trim(); if(k&&v){ setForm(f=>({ ...f, specifications:[...(f.specifications||[]), {key:k, value:v}], specKey:'', specValue:'' })) } }} className="px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold">Add</button>
                  </div>
                  {(form.specifications||[]).length>0 && (
                    <div className="flex flex-col gap-1.5">
                      {form.specifications.map((s,i)=>(
                        <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50 border text-[11px] font-bold">
                          <span><span className="text-gray-500">{s.key}:</span> {s.value}</span>
                          <button type="button" className="text-red-600" onClick={()=>setForm(f=>({...f, specifications: f.specifications.filter((_,idx)=>idx!==i)}))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="w-full bg-gray-900 text-white py-4 rounded-2xl text-sm font-black shadow-lg hover:bg-gray-800 transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest">ADD TO INVENTORY</button>
              </form>
            </div>
          )}
        </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-8 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <form
            onSubmit={saveEdit}
            className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-10 w-full max-w-4xl shadow-2xl space-y-8 animate-in zoom-in-95 duration-300 my-auto relative"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Edit Product</h3>
                <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">Inventory Management</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price (₹)</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="Price" value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">MRP (₹)</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="1099" value={editing.mrp || ''} onChange={e => setEditing({ ...editing, mrp: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Brand (Optional)</label>
                <select className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none" value={editing.brandId || ''} onChange={e => setEditing({ ...editing, brandId: e.target.value })}>
                  <option value="">No Brand</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                <select className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none" value={editing.categoryId || ''} onChange={e => setEditing({ ...editing, categoryId: e.target.value, subCategoryId: '' })} required>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Subcategory</label>
                <select className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none" value={editing.subCategoryId || ''} onChange={e => setEditing({ ...editing, subCategoryId: e.target.value })}>
                  <option value="">Select subcategory</option>
                  {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Current Stock (Read Only)</label>
                <div className="w-full bg-gray-100 border-2 border-transparent rounded-2xl px-4 py-3 text-sm font-bold text-gray-500 cursor-not-allowed">
                  {editing.stock} Units
                </div>
                <p className="text-[9px] text-gray-400 ml-1">Manage stock via Inventory page or stock adjustment.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Store</label>
                <select className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none" value={editing.store || ''} onChange={e => setEditing({ ...editing, store: e.target.value, section: '' })}>
                  <option value="">Select store</option>
                  {stores.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Section</label>
                <select className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none" value={editing.section || ''} onChange={e => setEditing({ ...editing, section: e.target.value })}>
                  <option value="">Select section</option>
                  {(stores.find(s => s.name === (editing.store||''))?.sections || []).map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">GST %</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="GST %" value={editing.gst} onChange={e => setEditing({ ...editing, gst: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Weight (grams)</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 500" value={editing.weight} onChange={e => setEditing({ ...editing, weight: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">HSN Code</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 8517" value={editing.hsnCode || ''} onChange={e => setEditing({ ...editing, hsnCode: e.target.value })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100 mt-1 md:col-span-3">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase ml-1">Variant Display Style</div>
                  <div className="text-[10px] text-gray-400 ml-1">{editing.variantDisplayType === 'matrix' ? 'Bulk Matrix View (Grid)' : 'Standard Variant Selector (Dropdown)'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(e => ({ ...e, variantDisplayType: e.variantDisplayType === 'matrix' ? 'selector' : 'matrix' }))}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${editing.variantDisplayType === 'matrix' ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${editing.variantDisplayType === 'matrix' ? 'translate-x-9' : 'translate-x-1'}`}
                  />
                  <span className="absolute left-2 text-[8px] font-bold text-white uppercase">{editing.variantDisplayType === 'matrix' ? 'MTX' : ''}</span>
                  <span className="absolute right-2 text-[8px] font-bold text-gray-400 uppercase">{editing.variantDisplayType === 'selector' ? 'SEL' : ''}</span>
                </button>
              </div>

              <div className="space-y-1 md:col-span-3">
                <p className="text-[11px] text-gray-500 bg-violet-50/80 border border-violet-100 rounded-xl px-3 py-2">Option SKUs and variant stock are managed in <span className="font-bold text-violet-700">Manage Variants</span>, not here.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Min Order Qty</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 5" value={editing.minOrderQty || ''} onChange={e => setEditing({ ...editing, minOrderQty: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pack Size</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 12" value={editing.packSize ?? ''} onChange={e => setEditing({ ...editing, packSize: e.target.value })} />
              </div>
              
              <div className="space-y-4 md:col-span-2 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bulk Pricing Tiers</label>
                  <div className="text-[10px] font-bold text-blue-600">Multiple discounts based on Qty</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Target Qty</label>
                    <input className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="10" value={editing.bulkDiscountQuantity} onChange={e => setEditing({ ...editing, bulkDiscountQuantity: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Price Off (₹)</label>
                    <input className="w-full bg-white border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="50" value={editing.bulkDiscountPriceReduction} onChange={e => setEditing({ ...editing, bulkDiscountPriceReduction: e.target.value })} />
                  </div>
                </div>
                <button type="button" onClick={() => {
                  const qv = Number(editing.bulkDiscountQuantity||0)
                  const rv = Number(editing.bulkDiscountPriceReduction||0)
                  if (Number.isFinite(qv) && qv > 0 && Number.isFinite(rv) && rv >= 0) {
                    setEditing(ed => ({ ...ed, bulkTiers: [...(ed.bulkTiers||[]), { quantity: qv, priceReduction: rv }], bulkDiscountQuantity: '', bulkDiscountPriceReduction: '' }))
                  }
                }} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm">Add Discount Tier</button>
                
                {(editing.bulkTiers || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {editing.bulkTiers.map((t, i) => (
                      <div key={i} className="inline-flex items-center gap-2 text-[10px] font-black bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm">
                        <span className="text-gray-700">{t.quantity}+ units: -₹{t.priceReduction}</span>
                        <button type="button" className="text-red-600 hover:scale-110 transition-transform" onClick={() => setEditing(ed => ({ ...ed, bulkTiers: ed.bulkTiers.filter((_, idx) => idx !== i) }))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Images (URLs)</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-[10px] font-bold transition-all outline-none" placeholder="Paste image URLs separated by comma" value={editing.images} onChange={e => setEditing({ ...editing, images: e.target.value })} />
                  <ImageUpload onUploaded={url => setEditing(f => ({ ...f, images: (f.images ? f.images + ', ' : '') + url }))} />
                </div>
                <div className="flex gap-3 flex-wrap mt-3">
                  {(editing.images || '').split(',').map(s => s.trim()).filter(Boolean).map((url, i) => (
                    <div key={i} className="group relative">
                      <img src={url} className="h-16 w-16 object-contain bg-gray-50 border-2 border-gray-100 rounded-2xl p-1 transition-all group-hover:border-blue-200" />
                      <button type="button" onClick={() => {
                        const imgs = editing.images.split(',').map(s=>s.trim()).filter(Boolean);
                        setEditing({ ...editing, images: imgs.filter((_,idx)=>idx!==i).join(', ') })
                      }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                <textarea className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-medium transition-all outline-none min-h-[120px]" placeholder="Detailed product specifications..." value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>

              <div className="space-y-4 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Highlights</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="Key feature..." value={editing.highlightInput || ''} onChange={e=>setEditing({...editing, highlightInput: e.target.value})} />
                  <button type="button" onClick={()=>{ const h=(editing.highlightInput||'').trim(); if(h){ setEditing(ed=>({ ...ed, highlights:[...(ed.highlights||[]), h], highlightInput:'' })) } }} className="px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all">Add</button>
                </div>
                {(editing.highlights||[]).length>0 && (
                  <div className="flex flex-wrap gap-2">
                    {editing.highlights.map((h,i)=>(
                      <span key={i} className="px-4 py-2 rounded-2xl bg-white border-2 border-gray-50 text-[11px] font-bold text-gray-700 flex items-center gap-3 shadow-sm">
                        {h}
                        <button type="button" className="text-red-500 hover:scale-125 transition-transform" onClick={() => setEditing(ed => ({ ...ed, highlights: ed.highlights.filter((_,idx)=>idx!==i)}))}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Specifications</label>
                <div className="flex flex-wrap gap-2">
                  <input className="flex-1 min-w-[120px] bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="Name" value={editing.specKey || ''} onChange={e=>setEditing({...editing, specKey: e.target.value})} />
                  <input className="flex-1 min-w-[120px] bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="Value" value={editing.specValue || ''} onChange={e=>setEditing({...editing, specValue: e.target.value})} />
                  <button type="button" onClick={()=>{ const k=(editing.specKey||'').trim(); const v=(editing.specValue||'').trim(); if(k&&v){ setEditing(ed=>({ ...ed, specifications:[...(ed.specifications||[]), {key:k, value:v}], specKey:'', specValue:'' })) } }} className="px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all">Add</button>
                </div>
                {(editing.specifications||[]).length>0 && (
                  <div className="flex flex-col gap-2">
                    {editing.specifications.map((s,i)=>(
                      <div key={i} className="flex items-center justify-between gap-2 px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] font-bold">
                        <span><span className="text-gray-500">{s.key}:</span> {s.value}</span>
                        <button type="button" className="text-red-500" onClick={() => setEditing(ed => ({ ...ed, specifications: ed.specifications.filter((_,idx)=>idx!==i)}))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-3xl text-xs font-black hover:bg-gray-100 transition-all uppercase tracking-[0.2em] border-2 border-transparent">Cancel</button>
                <button className="flex-[2] bg-blue-600 text-white py-4 px-12 rounded-3xl text-xs font-black shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all uppercase tracking-[0.2em]">Update Product</button>
              </div>
            </form>
          </div>
        )}

      {managingVariants && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 my-auto relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Manage Variants</h3>
                <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest">{managingVariants.name}</p>
              </div>
              <button type="button" onClick={() => setManagingVariants(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">✕</button>
            </div>
            
            <VariantManager 
              product={managingVariants} 
              setEditing={setManagingVariants}
              editingVariant={editingVariant}
              setEditingVariant={setEditingVariant}
              onChanged={() => { 
                api.get(`/api/products/${managingVariants._id}`).then(({data}) => {
                  setManagingVariants(data)
                  load(page)
                })
              }} 
              price={managingVariants.price}
              weight={managingVariants.weight}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        title="Delete Product?"
        message={`Are you sure you want to remove "${toDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-8 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-10 w-full max-w-4xl shadow-2xl space-y-8 animate-in zoom-in-95 duration-300 my-auto relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{viewing.name}</h3>
                <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">Product Details</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { const p = viewing; setViewing(null); openEdit(p); }} 
                  className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >Edit</button>
                <button type="button" onClick={() => setViewing(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Price</div>
                    <div className="text-xl font-black text-gray-900">₹{viewing.price?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">MRP</div>
                    <div className="text-xl font-black text-gray-400 line-through">₹{viewing.mrp?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Stock</div>
                    <div className={`text-xl font-black ${viewing.stock <= 5 ? 'text-red-600' : 'text-emerald-600'}`}>{viewing.stock} Units</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">HSN Code</div>
                    <div className="text-xl font-black text-gray-900">{viewing.hsnCode || 'N/A'}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</h4>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100 italic">{viewing.description || 'No description provided.'}</p>
                </div>

                {viewing.highlights?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Highlights</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewing.highlights.map((h, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">{h}</span>
                      ))}
                    </div>
                  </div>
                )}

                {viewing.specifications?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Specifications</h4>
                    <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                      {viewing.specifications.map((s, i) => (
                        <div key={i} className="flex justify-between gap-4 px-4 py-2.5 bg-gray-50/50 text-[12px]">
                          <span className="font-bold text-gray-500">{s.key}</span>
                          <span className="font-bold text-gray-900 text-right">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Images</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {viewing.images?.map((img, i) => (
                      <div key={i} className="aspect-square bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden cursor-zoom-in" onClick={() => setPreview(img.url)}>
                        <img src={img.url} className="w-full h-full object-contain p-2" alt="" />
                      </div>
                    ))}
                  </div>
                </div>

                {viewing.variants?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Variants</h4>
                    <div className="space-y-2">
                      {viewing.variants.map((v, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {})).map(([k, val]) => (
                                  <span key={k} className="px-2 py-0.5 bg-white text-gray-700 text-[9px] font-black rounded border border-gray-200 uppercase">
                                    {val}
                                  </span>
                                ))}
                              </div>
                              <div className="h-3 w-[1px] bg-gray-200" />
                              <div className="text-[11px] font-black text-gray-900">₹{v.price.toLocaleString()}</div>
                            </div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <span className={v.stock <= 0 ? 'text-red-500' : 'text-emerald-600'}>{v.stock} in stock</span>
                              {v.sku && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                                  <span className="font-mono lowercase text-[8px] tracking-normal">{v.sku}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setPreview('')}>
          <div className="max-w-2xl w-full">
            <img src={preview} alt="Preview" className="w-full h-auto max-h-[80vh] rounded-3xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
      </div>
    </>
  )
}

function VariantManager({ product, setEditing, onChanged, editingVariant, setEditingVariant, price = '', weight = '' }) {
  const { notify } = useToast()
  const [attrInput, setAttrInput] = useState('')
  const [valInput, setValInput] = useState({}) // { attrName: 'currentInput' }

  const toggleActive = async (v) => {
    try {
      await api.put(`/api/products/${product._id}/variants/${v._id}`, { isActive: !v.isActive })
      notify('Variant updated','success')
      onChanged && onChanged()
    } catch { notify('Update failed','error') }
  }

  const deleteVariant = async (v) => {
    if (!window.confirm('Delete variant?')) return
    try {
      await api.delete(`/api/products/${product._id}/variants/${v._id}`)
      notify('Variant deleted','success')
      onChanged && onChanged()
    } catch { notify('Delete failed','error') }
  }

  const updateAttributes = async (next) => {
    try {
      await api.put(`/api/products/${product._id}`, { attributes: next })
      setEditing(prev => ({ ...prev, attributes: next }))
      // No need for notify here to avoid spamming, but we can if preferred
    } catch { notify('Failed to save attributes', 'error') }
  }

  const addAttr = async () => {
    const val = attrInput.trim().toLowerCase()
    if (!val) return
    const currentAttrs = Array.isArray(product.attributes) ? product.attributes : []
    const attrNames = currentAttrs.map(a => a.split(':')[0])
    if (attrNames.includes(val)) return notify('Attribute already exists', 'error')
    
    const next = [...currentAttrs, `${val}:`]
    await updateAttributes(next)
    setAttrInput('')
  }

  const removeAttr = async (a) => {
    if (!window.confirm('Remove this attribute and all its values?')) return
    const currentAttrs = Array.isArray(product.attributes) ? product.attributes : []
    const next = currentAttrs.filter(x => x !== a)
    await updateAttributes(next)
  }

  const addAttrValue = async (attrName, value) => {
    const rawVal = value.trim()
    if (!rawVal) return
    const newVals = rawVal.split(',').map(v => v.trim().toLowerCase()).filter(Boolean)
    
    const currentAttrs = [...(product.attributes || [])]
    const idx = currentAttrs.findIndex(a => a.startsWith(`${attrName}:`))
    if (idx === -1) return

    const [name, valuesStr] = currentAttrs[idx].split(':')
    const existingValues = valuesStr ? valuesStr.split(',').filter(Boolean).map(v => v.toLowerCase()) : []
    
    const finalValues = [...new Set([...existingValues, ...newVals])]
    
    currentAttrs[idx] = `${name}:${finalValues.join(',')}`
    await updateAttributes(currentAttrs)
    setValInput(prev => ({ ...prev, [attrName]: '' }))
  }

  const removeAttrValue = async (attrName, valToRemove) => {
    const currentAttrs = [...(product.attributes || [])]
    const idx = currentAttrs.findIndex(a => a.startsWith(`${attrName}:`))
    if (idx === -1) return

    const [name, valuesStr] = currentAttrs[idx].split(':')
    const values = valuesStr.split(',').filter(v => v !== valToRemove)
    
    currentAttrs[idx] = `${name}:${values.join(',')}`
    await updateAttributes(currentAttrs)
  }

  const handleQuickAdd = async (v) => {
    try {
      const images = v.images.split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url }));
      
      await api.post(`/api/products/${product._id}/variants`, {
        attributes: v.attributes,
        price: Number(v.price),
        mrp: v.mrp ? Number(v.mrp) : undefined,
        stock: Number(v.stock),
        sku: v.sku || undefined,
        weight: Number(v.weight || 0),
        images: images
      })
      notify('Variant added','success')
      onChanged && onChanged()
    } catch (err) { notify(err.response?.data?.error || 'Failed to add','error') }
  }

  const handleUpdateVariant = async (e) => {
    e.preventDefault()
    try {
      const images = typeof editingVariant.images === 'string' 
        ? editingVariant.images.split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url }))
        : editingVariant.images;

      await api.put(`/api/products/${product._id}/variants/${editingVariant._id}`, {
        ...editingVariant,
        price: Number(editingVariant.price),
        mrp: editingVariant.mrp ? Number(editingVariant.mrp) : undefined,
        stock: Number(editingVariant.stock),
        weight: Number(editingVariant.weight || 0),
        images: images
      })
      notify('Variant updated','success')
      setEditingVariant(null)
      onChanged && onChanged()
    } catch (err) { notify(err.response?.data?.error || 'Failed to update','error') }
  }

  const generateCombinations = () => {
    const attrs = (product.attributes || []).map(a => {
      const [name, valuesStr] = a.split(':');
      const values = valuesStr ? valuesStr.split(',').filter(Boolean) : [];
      return { name, values };
    }).filter(a => a.values.length > 0);

    if (attrs.length === 0) return [];

    const combine = (index, current) => {
      if (index === attrs.length) return [current];
      const result = [];
      for (const val of attrs[index].values) {
        result.push(...combine(index + 1, { ...current, [attrs[index].name]: val }));
      }
      return result;
    };

    const all = combine(0, {});
    const existing = (product.variants || []).map(v => {
      const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {});
      const normalized = {};
      Object.entries(vAttrs).forEach(([k, val]) => { normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim() });
      const sorted = Object.keys(normalized).sort().reduce((obj, key) => {
        obj[key] = normalized[key];
        return obj;
      }, {});
      return JSON.stringify(sorted);
    });

    return all.filter(combo => {
      const normalized = {};
      Object.entries(combo).forEach(([k, val]) => { normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim() });
      const sorted = Object.keys(normalized).sort().reduce((obj, key) => {
        obj[key] = normalized[key];
        return obj;
      }, {});
      return !existing.includes(JSON.stringify(sorted));
    });
  };

  const missingCombinations = generateCombinations();

  const getSku = (combo) => {
    const nameParts = product.name.split(' ').filter(Boolean)
    let nameCode = ''
    if (nameParts.length >= 2) {
      nameCode = nameParts.map(p => p[0]).join('').substring(0, 4)
    } else {
      nameCode = product.name.substring(0, 3)
    }
    const cleanValues = Object.values(combo).map(val => 
      val.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
    ).join('-')
    return `${nameCode.toUpperCase()}-${cleanValues.toUpperCase()}`
  }

  const addCombination = async (combo) => {
    try {
      const images = typeof product.images === 'string' 
        ? product.images.split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url }))
        : (product.images || []);

      await api.post(`/api/products/${product._id}/variants`, {
        attributes: combo,
        price: Number(price || 0),
        mrp: product.mrp ? Number(product.mrp) : undefined,
        stock: 0,
        weight: Number(weight || 0),
        images: images,
        sku: getSku(combo),
        isActive: true
      });
      notify('Variant added', 'success');
      onChanged && onChanged();
    } catch (err) { notify(err.response?.data?.error || 'Failed to add', 'error'); }
  };

  const addAllCombinations = async () => {
    if (!window.confirm(`Create ${missingCombinations.length} variant(s)?`)) return;
    let success = 0;
    const images = typeof product.images === 'string' 
      ? product.images.split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url }))
      : (product.images || []);

    // Create variants sequentially to avoid race conditions/duplicate errors
    for (const combo of missingCombinations) {
      try {
        await api.post(`/api/products/${product._id}/variants`, {
          attributes: combo,
          price: Number(price || 0),
          mrp: product.mrp ? Number(product.mrp) : undefined,
          stock: 0,
          weight: Number(weight || 0),
          images: images,
          sku: getSku(combo),
          isActive: true
        });
        success++;
      } catch (e) { 
        console.error("Failed to create variant:", combo, e); 
      }
    }
    notify(`Created ${success} variants`, 'success');
    onChanged && onChanged();
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Define Attributes */}
      <div className="p-4 bg-gray-50 border border-gray-100 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="text-[9px] font-black uppercase tracking-widest text-gray-400">1. Define Attributes & Values</h5>
          <div className="flex gap-2">
            <input 
              className="bg-white border rounded-xl px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 w-28" 
              placeholder="e.g. Color" 
              value={attrInput} 
              onChange={e=>setAttrInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAttr()}
            />
            <button type="button" onClick={addAttr} className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {Array.isArray(product.attributes) && product.attributes.length > 0 ? (
            product.attributes.map(attr => {
              const [name, valuesStr] = attr.split(':');
              const values = valuesStr ? valuesStr.split(',').filter(Boolean) : [];
              return (
                <div key={name} className="bg-white p-3 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-600 uppercase">{name}</span>
                    <button type="button" onClick={() => removeAttr(attr)} className="text-gray-300 hover:text-red-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {values.map(v => (
                      <span key={v} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-lg text-[9px] font-bold text-gray-600 uppercase">
                        {v}
                        <button type="button" onClick={() => removeAttrValue(name, v)} className="text-gray-300 hover:text-red-500">✕</button>
                      </span>
                    ))}
                    <div className="flex gap-1 items-center ml-1">
                      <input 
                        className="bg-gray-50 border rounded-lg px-2 py-0.5 text-[10px] font-bold outline-none w-20" 
                        placeholder="Add value..."
                        value={valInput[name] || ''}
                        onChange={e => setValInput(prev => ({ ...prev, [name]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addAttrValue(name, valInput[name])}
                      />
                      <button type="button" onClick={() => addAttrValue(name, valInput[name])} className="p-0.5 text-blue-600 hover:scale-110">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-[9px] text-gray-400 font-bold italic text-center py-2">Add attributes to start...</div>
          )}
        </div>
      </div>

      {/* Step 2: Create Variants */}
      {Array.isArray(product.attributes) && product.attributes.length > 0 && (
        <div className="p-4 bg-white border border-gray-100 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-[9px] font-black uppercase tracking-widest text-gray-400">2. Create Variants from Values</h5>
              {product.attributes.filter(a => a.split(':')[1]).length > 0 && (
                <p className="text-[8px] font-black text-blue-600 uppercase mt-1">
                  {product.attributes.filter(a => a.split(':')[1]).map(a => {
                    const [name, vals] = a.split(':');
                    return `${vals.split(',').filter(Boolean).length} ${name}`;
                  }).join(' x ')} = {missingCombinations.length + (product.variants || []).length} Total Combinations
                </p>
              )}
            </div>
            {missingCombinations.length > 1 && (
              <button 
                onClick={addAllCombinations}
                className="px-4 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-50"
              >Create All ({missingCombinations.length})</button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {missingCombinations.length > 0 ? (
              missingCombinations.map((combo, i) => (
                <button
                  key={i}
                  onClick={() => addCombination(combo)}
                  className="group flex flex-col items-start p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all text-left min-w-[120px]"
                >
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(combo).map(([k, v]) => (
                      <span key={k} className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                        {v}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">+ Add</span>
                    <svg className="w-3 h-3 text-blue-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                  </div>
                </button>
              ))
            ) : (
              <div className="w-full py-4 text-center border-2 border-dashed border-gray-50 rounded-2xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">All combinations created!</p>
                <p className="text-[8px] text-gray-300 mt-1">Define more values in Step 1 to create more variants.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Inventory */}
      <div className="space-y-2 pt-3 border-t border-gray-50">
        {(product.variants || []).length > 0 && (
          <div className="px-1 flex items-center justify-between">
            <h5 className="text-[9px] font-black uppercase tracking-widest text-gray-400">3. Inventory / Active Variants ({product.variants.length})</h5>
          </div>
        )}

        <div className="space-y-2">
          {/* Header for table-like layout */}
          {(product.variants || []).length > 0 && (
            <div className="hidden md:flex items-center gap-4 px-4 py-1.5 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
              <div className="w-[180px]">Attributes & Values</div>
              <div className="w-[80px]">Price</div>
              <div className="w-[80px]">Stock</div>
              <div className="w-[60px]">Weight</div>
              <div className="flex-1">SKU</div>
              <div className="w-[120px] text-right">Actions</div>
            </div>
          )}

          {(product.variants || []).map(v => (
            <div key={v._id} className="p-3 bg-white rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 group hover:border-blue-100 transition-all">
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 overflow-hidden">
                {/* Attributes */}
                <div className="flex flex-wrap gap-2 w-full md:w-[180px]">
                  {(() => {
                    const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {});
                    const entries = Object.entries(attrs);
                    if (entries.length === 0) return <span className="text-[9px] text-gray-300 italic">No attributes</span>;
                    return entries.map(([k,val]) => (
                      <div key={k} className="flex flex-col md:flex-row md:items-center gap-1">
                        <span className="text-[7px] md:hidden font-black text-gray-400 uppercase">{k}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg uppercase border border-blue-100/50">
                          {val}
                        </span>
                      </div>
                    ));
                  })()}
                </div>

                {/* Price */}
                <div className="flex flex-col md:w-[80px]">
                  <span className="text-[7px] md:hidden font-black text-gray-400 uppercase">Price</span>
                  <div className="text-[12px] font-black text-gray-900">
                    ₹{v.price.toLocaleString()}
                  </div>
                </div>

                {/* Stock */}
                <div className="flex flex-col md:w-[80px]">
                  <span className="text-[7px] md:hidden font-black text-gray-400 uppercase">Stock</span>
                  <div className={`text-[11px] font-black ${v.stock <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {v.stock} pcs
                  </div>
                </div>

                {/* Weight */}
                <div className="flex flex-col md:w-[60px]">
                  <span className="text-[7px] md:hidden font-black text-gray-400 uppercase">Weight</span>
                  <div className="text-[11px] font-black text-gray-500">
                    {v.weight || 0}g
                  </div>
                </div>

                {/* SKU */}
                {v.sku && (
                  <div className="flex flex-col flex-1 min-w-[100px]">
                    <span className="text-[7px] md:hidden font-black text-gray-400 uppercase">SKU</span>
                    <div className="font-mono lowercase text-[9px] text-gray-400 truncate">
                      {v.sku}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 justify-end md:w-[120px]">
                <button type="button" onClick={() => setEditingVariant({ 
                  ...v, 
                  attributes: v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {}),
                  images: (v.images || []).map(img => img.url).join(', ') 
                })} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button type="button" onClick={() => toggleActive(v)} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${v.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'}`}>
                  {v.isActive ? 'Live' : 'Hidden'}
                </button>
                <button type="button" onClick={() => deleteVariant(v)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Variant Modal */}
      {editingVariant && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
          <form onSubmit={handleUpdateVariant} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h6 className="text-sm font-black uppercase tracking-widest text-gray-900">Edit Variant</h6>
              <button type="button" onClick={() => setEditingVariant(null)} className="text-gray-400">✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {(product.attributes || []).map(attr => (
                <div key={attr} className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{attr}</label>
                  <input 
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold" 
                    value={editingVariant.attributes?.[attr] || ''} 
                    onChange={e => setEditingVariant({
                      ...editingVariant,
                      attributes: {
                        ...(editingVariant.attributes || {}),
                        [attr]: e.target.value
                      }
                    })} 
                    required 
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Price</label>
                <input className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold" value={editingVariant.price} onChange={e=>setEditingVariant({...editingVariant, price: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">MRP</label>
                <input className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold" value={editingVariant.mrp || ''} onChange={e=>setEditingVariant({...editingVariant, mrp: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Stock</label>
                <input className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold" value={editingVariant.stock} onChange={e=>setEditingVariant({...editingVariant, stock: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Weight (g)</label>
                <input className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold" value={editingVariant.weight || ''} onChange={e=>setEditingVariant({...editingVariant, weight: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Images (Comma separated)</label>
              <textarea className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold min-h-[60px]" value={editingVariant.images} onChange={e=>setEditingVariant({...editingVariant, images: e.target.value})} />
              <div className="flex justify-end mt-1">
                <ImageUpload onUploaded={(url) => {
                  const current = (editingVariant.images || '').split(',').map(s=>s.trim()).filter(Boolean)
                  setEditingVariant({ ...editingVariant, images: [...current, url].join(', ') })
                }} />
              </div>
            </div>

            <button className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Update Variant</button>
          </form>
        </div>
      )}
    </div>
  )
}

