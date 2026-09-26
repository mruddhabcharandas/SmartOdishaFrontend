import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import ImageUpload from '../../components/ImageUpload'

export default function BusinessProducts() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ name:'', price:'', mrp:'', brandId: '', categoryId:'', subCategoryId:'', stock:'', weight:'', length:'', width:'', height:'', images: '', description:'', highlights: [], highlightInput:'', specifications: [], specKey:'', specValue:'', store:'', section:'' })
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [managingVariants, setManagingVariants] = useState(null)
  const [editingVariant, setEditingVariant] = useState(null)
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [myStore, setMyStore] = useState(null)
  const [openDropdown, setOpenDropdown] = useState(null)
  const limit = 10
  const [preview, setPreview] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)

  const [loading, setLoading] = useState(false)
  const load = async (p=1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/stores/products', { params: { page:p, limit, q } })
      setItems(data); setTotal(data.length || 0); setPage(p) // store products endpoint returns array of products
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
    api.get('/api/stores/profile').then(({ data }) => {
      setMyStore(data);
      // Set default section if available
      if (data?.sections?.length > 0) {
        setForm(f => ({ ...f, section: data.sections[0] }));
      }
    }).catch(() => {})
  }, [])

  const create = async (e) => {
    e.preventDefault()
    const images = form.images.split(',').map(s=>s.trim()).filter(Boolean)
    const stockNum = Number(form.stock)
    await api.post('/api/stores/products', { 
      name: form.name,
      price: Number(form.price), 
      stock: Number.isFinite(stockNum) ? stockNum : 0, 
      weight: Number(form.weight || 0),
      length: Number(form.length || 0),
      width: Number(form.width || 0),
      height: Number(form.height || 0),
      mrp: form.mrp ? Number(form.mrp) : undefined,
      description: form.description || '',
      highlights: (form.highlights || []).map(h => String(h).trim()).filter(Boolean),
      specifications: (form.specifications || []).map(s => ({ key: String(s.key||'').trim(), value: String(s.value||'').trim() })).filter(s => s.key && s.value),
      images,
      brandId: form.brandId || undefined,
      categoryId: form.categoryId,
      subCategoryId: form.subCategoryId || undefined,
      store: myStore?._id || '',
      section: form.section || '',
      attributes: [],
      variants: []
    })
    setForm({ name:'', price:'', mrp:'', brandId:'', categoryId:'', subCategoryId:'', stock:'', images: '', description:'', highlights: [], highlightInput:'', specifications: [], specKey:'', specValue:'', store:'', section:'' }); setShowAddProduct(false); load(page); notify('Product added','success')
  }

  const reduceStock = async (id) => {
    const qty = Number(prompt('Reduce by quantity?')||'0')
    if (qty>0){ await api.patch(`/api/stores/products/${id}/stock`, { quantity: qty }); load(page) }
  }

  const openEdit = (p) => {
    const ed = { 
      ...p, 
      brandId: p.brand?._id || p.brand || '',
      categoryId: p.category?._id || p.category || '',
      subCategoryId: p.subCategory?._id || p.subCategory || '',
      weight: p.weight || '',
      length: p.length || '',
      width: p.width || '',
      height: p.height || '',
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
        length: v.length || '',
        width: v.width || '',
        height: v.height || '',
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
      variantDisplayType: 'selector'
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
      length: Number(editing.length || 0),
      width: Number(editing.width || 0),
      height: Number(editing.height || 0),
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
      store: myStore?._id || '',
      section: editing.section || '',
      attributes: editing.attributes || [],
      variantDisplayType: editing.variantDisplayType || 'selector',
      variants: (editing.variants || []).map(v => ({
        ...v,
        attributes: v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes,
        price: Number(v.price),
        mrp: v.mrp ? Number(v.mrp) : undefined,
        weight: Number(v.weight || 0),
        length: Number(v.length || 0),
        width: Number(v.width || 0),
        height: Number(v.height || 0),
        images: (v.images || '').toString().split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url }))
      }))
    }
    // Remove stock from payload to prevent accidental reset to 0
    delete payload.stock;
    payload.variants.forEach(v => delete v.stock);

    await api.put(`/api/stores/products/${editing._id}`, payload)
    setEditing(null); load(page); notify('Product updated','success')
  }
  const remove = (p) => setToDelete(p)
  const confirmDelete = async () => { if (!toDelete) return; await api.delete(`/api/stores/products/${toDelete._id}`); setToDelete(null); load(page); notify('Product deleted','success') }

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
          <div className="space-y-4 flex flex-col min-h-[320px] max-h-[min(78vh,820px)]">
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
                                  {p.variants?.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setManagingVariants(p); }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100 transition-colors"
                                      title="Open Variant Manager"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                      {p.variants.length} Variants
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setManagingVariants(p); }}
                                      className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 font-semibold"
                                      title="Add variants to this product"
                                    >
                                      + Add Variants
                                    </button>
                                  )}
                                </div>
                                {p.variants?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {p.variants.slice(0, 3).map((v, idx) => (
                                      <span key={idx} className="text-[9px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                        {Object.values(v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {})).join(', ')}
                                      </span>
                                    ))}
                                    {p.variants.length > 3 && (
                                      <span 
                                        onClick={(e) => { e.stopPropagation(); setManagingVariants(p); }}
                                        className="text-[9px] text-indigo-600 font-bold cursor-pointer hover:underline"
                                      >
                                        +{p.variants.length - 3} more
                                      </span>
                                    )}
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
        </div>

        {/* Add Product Modal */}
        {showAddProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-8 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <form
            onSubmit={create}
            className="bg-white border border-gray-100 rounded-[2rem] p-6 md:p-10 w-full max-w-4xl shadow-2xl space-y-8 animate-in zoom-in-95 duration-300 my-auto relative"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Add New Product</h3>
                <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] mt-1">Catalogue wizard</p>
              </div>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => setShowAddProduct(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="space-y-4 sm:col-span-2 xl:col-span-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                    <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. iPhone 16" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price (₹)</label>
                      <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="999" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">MRP (₹)</label>
                      <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="1299" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                      <select className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} required>
                        <option value="">Select Category...</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Subcategory</label>
                      <select className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none appearance-none" value={form.subCategoryId} onChange={e => setForm({ ...form, subCategoryId: e.target.value })}>
                        <option value="">Select Subcategory...</option>
                        {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>



                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Inventory Stock</label>
                      <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="50" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Weight (g)</label>
                      <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="500" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Length (cm)</label>
                      <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="10" value={form.length} onChange={e => setForm({ ...form, length: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Width (cm)</label>
                      <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="10" value={form.width} onChange={e => setForm({ ...form, width: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Height (cm)</label>
                      <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="10" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Images</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-[10px] font-bold transition-all outline-none" placeholder="Multiple URLs comma-separated" value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} />
                  <ImageUpload onUploaded={url => setForm(f => ({ ...f, images: (f.images ? f.images + ', ' : '') + url }))} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                <textarea className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-medium transition-all outline-none min-h-[80px]" placeholder="Product details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Highlights</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="Add a highlight and press Add" value={form.highlightInput} onChange={e=>setForm({...form, highlightInput: e.target.value})} />
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
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Specifications</label>
                <div className="flex flex-wrap gap-2">
                  <input className="flex-1 min-w-[120px] bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="Name (e.g. Material)" value={form.specKey} onChange={e=>setForm({...form, specKey: e.target.value})} />
                  <input className="flex-1 min-w-[120px] bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="Value (e.g. Cotton)" value={form.specValue} onChange={e=>setForm({...form, specValue: e.target.value})} />
                  <button type="button" onClick={()=>{ const k=(form.specKey||'').trim(); const v=(form.specValue||'').trim(); if(k&&v){ setForm(f=>({ ...f, specifications:[...(f.specifications||[]), {key:k, value:v}], specKey:'', specValue:'' })) } }} className="px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold">Add</button>
                </div>
                {(form.specifications||[]).length>0 && (
                  <div className="flex flex-col gap-1.5">
                    {form.specifications.map((s,i)=>(
                      <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50 border text-[11px] font-bold">
                        <span><span className="text-gray-400">{s.key}:</span> {s.value}</span>
                        <button type="button" className="text-red-600" onClick={()=>setForm(f=>({...f, specifications: f.specifications.filter((_,idx)=>idx!==i)}))}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[11px] text-gray-500">Variants and per-option SKUs: use <span className="font-bold text-indigo-600">Manage Variants</span> on the row after save.</p>
              <button type="submit" className="px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white rounded-2xl text-sm font-black shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest">
                Add To Inventory
              </button>
            </div>
          </form>
        </div>
        )}

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
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">GST %</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="GST %" value={editing.gst} onChange={e => setEditing({ ...editing, gst: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Weight (grams)</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 500" value={editing.weight} onChange={e => setEditing({ ...editing, weight: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Length (cm)</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 10" value={editing.length} onChange={e => setEditing({ ...editing, length: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Width (cm)</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 10" value={editing.width} onChange={e => setEditing({ ...editing, width: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Height (cm)</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 10" value={editing.height} onChange={e => setEditing({ ...editing, height: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">HSN Code</label>
                <input className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold transition-all outline-none" placeholder="e.g. 8517" value={editing.hsnCode || ''} onChange={e => setEditing({ ...editing, hsnCode: e.target.value })} />
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-2 sm:p-6 backdrop-blur-md overflow-hidden">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] max-h-[880px] shadow-2xl animate-in zoom-in-95 flex flex-col relative overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {managingVariants.images?.[0] ? (
                    <img src={managingVariants.images[0].url || managingVariants.images[0]} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xl">📦</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate max-w-md">{managingVariants.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Variant Studio
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 font-medium">
                    <span>Base Price: <strong className="text-gray-900">₹{Number(managingVariants.price || 0).toLocaleString()}</strong></span>
                    <span>·</span>
                    <span>Total Variants: <strong className="text-gray-900">{managingVariants.variants?.length || 0}</strong></span>
                    <span>·</span>
                    <span>Category: <strong className="text-gray-900">{managingVariants.category?.name || 'General'}</strong></span>
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setManagingVariants(null)} 
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
              <VariantManager 
                product={managingVariants} 
                setEditing={setManagingVariants}
                editingVariant={editingVariant}
                setEditingVariant={setEditingVariant}
                onChanged={() => { 
                  api.get(`/api/stores/products/${managingVariants._id}`).then(({data}) => {
                    setManagingVariants(data)
                    load(page)
                  })
                }} 
                price={managingVariants.price}
                weight={managingVariants.weight}
              />
            </div>
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
  const [activeTab, setActiveTab] = useState((product.variants || []).length === 0 && (product.attributes || []).length === 0 ? 'options' : 'list')
  const [attrInput, setAttrInput] = useState('')
  const [valInput, setValInput] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'live' | 'hidden' | 'out_of_stock'
  const [isGenerating, setIsGenerating] = useState(false)

  const commonPresets = ['Color', 'Size', 'Storage', 'Material', 'Pack Size', 'Weight', 'Model']

  const getAttrMap = (v) => {
    if (!v) return {}
    if (v.attributes instanceof Map) return Object.fromEntries(v.attributes)
    if (typeof v.attributes === 'object' && v.attributes !== null) return v.attributes
    return {}
  }

  const toggleActive = async (v) => {
    try {
      await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, { isActive: !v.isActive })
      notify('Variant status updated', 'success')
      onChanged && onChanged()
    } catch { 
      notify('Update failed', 'error') 
    }
  }

  const deleteVariant = async (v) => {
    const attrs = getAttrMap(v)
    const label = Object.values(attrs).join(' / ') || v.sku || 'Variant'
    if (!window.confirm(`Delete variant "${label}"? This will permanently remove its inventory.`)) return
    try {
      await api.delete(`/api/stores/products/${product._id}/variants/${v._id}`)
      notify('Variant deleted', 'success')
      onChanged && onChanged()
    } catch { 
      notify('Delete failed', 'error') 
    }
  }

  const updateAttributes = async (next) => {
    try {
      await api.put(`/api/stores/products/${product._id}`, { attributes: next })
      setEditing(prev => ({ ...prev, attributes: next }))
      notify('Options updated', 'success')
    } catch { 
      notify('Failed to save attributes', 'error') 
    }
  }

  const addAttr = async (customName) => {
    const nameToAdd = (customName || attrInput || '').trim().toLowerCase()
    if (!nameToAdd) return
    const currentAttrs = Array.isArray(product.attributes) ? product.attributes : []
    const attrNames = currentAttrs.map(a => a.split(':')[0]?.toLowerCase())
    if (attrNames.includes(nameToAdd)) return notify(`Option "${nameToAdd}" already exists`, 'error')
    
    const next = [...currentAttrs, `${nameToAdd}:`]
    await updateAttributes(next)
    setAttrInput('')
  }

  const removeAttr = async (a) => {
    const name = a.split(':')[0]
    if (!window.confirm(`Remove option "${name}" and all its values? Existing variants will keep their data, but future combinations will change.`)) return
    const currentAttrs = Array.isArray(product.attributes) ? product.attributes : []
    const next = currentAttrs.filter(x => x !== a)
    await updateAttributes(next)
  }

  const addAttrValue = async (attrName, value) => {
    const rawVal = (value || '').trim()
    if (!rawVal) return
    const newVals = rawVal.split(',').map(v => v.trim()).filter(Boolean)
    
    const currentAttrs = [...(product.attributes || [])]
    const idx = currentAttrs.findIndex(a => a.toLowerCase().startsWith(`${attrName.toLowerCase()}:`))
    if (idx === -1) return

    const [name, valuesStr] = currentAttrs[idx].split(':')
    const existingValues = valuesStr ? valuesStr.split(',').filter(Boolean) : []
    
    // Case-insensitive dedup preserving casing
    const lowerExisting = new Set(existingValues.map(v => v.toLowerCase()))
    const uniqueToAdd = newVals.filter(v => !lowerExisting.has(v.toLowerCase()))
    
    if (uniqueToAdd.length === 0) {
      setValInput(prev => ({ ...prev, [attrName]: '' }))
      return notify('Value already exists', 'error')
    }

    const finalValues = [...existingValues, ...uniqueToAdd]
    currentAttrs[idx] = `${name}:${finalValues.join(',')}`
    await updateAttributes(currentAttrs)
    setValInput(prev => ({ ...prev, [attrName]: '' }))
  }

  const removeAttrValue = async (attrName, valToRemove) => {
    const currentAttrs = [...(product.attributes || [])]
    const idx = currentAttrs.findIndex(a => a.toLowerCase().startsWith(`${attrName.toLowerCase()}:`))
    if (idx === -1) return

    const [name, valuesStr] = currentAttrs[idx].split(':')
    const values = (valuesStr ? valuesStr.split(',') : []).filter(v => v.trim().toLowerCase() !== valToRemove.trim().toLowerCase())
    
    currentAttrs[idx] = `${name}:${values.join(',')}`
    await updateAttributes(currentAttrs)
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
      const vAttrs = getAttrMap(v);
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
    const nameParts = (product.name || '').split(' ').filter(Boolean)
    let nameCode = ''
    if (nameParts.length >= 2) {
      nameCode = nameParts.map(p => p[0]).join('').substring(0, 4)
    } else {
      nameCode = (product.name || 'PRD').substring(0, 3)
    }
    const cleanValues = Object.values(combo).map(val => 
      String(val).toLowerCase().replace(/[^a-z0-9]/g, '').trim()
    ).join('-')
    return `${nameCode.toUpperCase()}-${cleanValues.toUpperCase()}`
  }

  const addCombination = async (combo) => {
    try {
      const images = Array.isArray(product.images)
        ? product.images.map(img => (typeof img === 'string' ? { url: img } : img)).filter(i => i?.url)
        : (typeof product.images === 'string' ? product.images.split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url })) : []);

      await api.post(`/api/stores/products/${product._id}/variants`, {
        attributes: combo,
        price: Number(price || product.price || 0),
        mrp: product.mrp ? Number(product.mrp) : undefined,
        stock: 0,
        weight: Number(weight || product.weight || 0),
        images: images,
        sku: getSku(combo),
        isActive: true
      });
      notify('Variant added', 'success');
      onChanged && onChanged();
    } catch (err) { 
      notify(err.response?.data?.error || 'Failed to add variant', 'error'); 
    }
  };

  const addAllCombinations = async () => {
    if (!missingCombinations.length) return
    if (!window.confirm(`Generate ${missingCombinations.length} variant(s) automatically with base price ₹${product.price}? You can adjust prices and stock after creation.`)) return;
    
    setIsGenerating(true)
    let success = 0;
    const images = Array.isArray(product.images)
      ? product.images.map(img => (typeof img === 'string' ? { url: img } : img)).filter(i => i?.url)
      : (typeof product.images === 'string' ? product.images.split(',').map(s=>s.trim()).filter(Boolean).map(url => ({ url })) : []);

    for (const combo of missingCombinations) {
      try {
        await api.post(`/api/stores/products/${product._id}/variants`, {
          attributes: combo,
          price: Number(price || product.price || 0),
          mrp: product.mrp ? Number(product.mrp) : undefined,
          stock: 0,
          weight: Number(weight || product.weight || 0),
          images: images,
          sku: getSku(combo),
          isActive: true
        });
        success++;
      } catch (e) { 
        console.error("Failed to create variant:", combo, e); 
      }
    }
    setIsGenerating(false)
    notify(`Created ${success} variants successfully!`, 'success');
    setActiveTab('list');
    onChanged && onChanged();
  };

  const handleUpdateVariant = async (e) => {
    e.preventDefault()
    try {
      const rawImgs = editingVariant.imageUrls || []
      const images = rawImgs.map(url => ({ url }))

      await api.put(`/api/stores/products/${product._id}/variants/${editingVariant._id}`, {
        attributes: getAttrMap(editingVariant),
        price: Number(editingVariant.price),
        mrp: editingVariant.mrp ? Number(editingVariant.mrp) : undefined,
        stock: Number(editingVariant.stock || 0),
        weight: Number(editingVariant.weight || 0),
        sku: editingVariant.sku || undefined,
        isActive: editingVariant.isActive !== false,
        images: images
      })
      notify('Variant details updated', 'success')
      setEditingVariant(null)
      onChanged && onChanged()
    } catch (err) { 
      notify(err.response?.data?.error || 'Failed to update variant', 'error') 
    }
  }

  // Filtered variants
  const variants = product.variants || []
  const filteredVariants = variants.filter(v => {
    const vAttrs = getAttrMap(v)
    const attrString = Object.values(vAttrs).join(' ').toLowerCase()
    const skuString = (v.sku || '').toLowerCase()
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query || attrString.includes(query) || skuString.includes(query)

    if (!matchesSearch) return false

    if (statusFilter === 'live') return v.isActive !== false
    if (statusFilter === 'hidden') return v.isActive === false
    if (statusFilter === 'in_stock') return (v.stock || 0) > 0
    if (statusFilter === 'out_of_stock') return (v.stock || 0) <= 0
    return true
  })

  const totalVariantStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)
  const prices = variants.map(v => Number(v.price || 0)).filter(p => p > 0)
  const minPrice = prices.length ? Math.min(...prices) : Number(product.price || 0)
  const maxPrice = prices.length ? Math.max(...prices) : Number(product.price || 0)

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            <span>📦 Variants & Stock</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'list' ? 'bg-indigo-800/40 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {variants.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'options' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            <span>⚙️ Options & Generator</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'options' ? 'bg-indigo-800/40 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {(product.attributes || []).length}
            </span>
          </button>
        </div>

        {missingCombinations.length > 0 && (
          <button
            type="button"
            disabled={isGenerating}
            onClick={addAllCombinations}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-100 transition-all disabled:opacity-50"
          >
            <span>⚡ Generate Missing ({missingCombinations.length})</span>
          </button>
        )}
      </div>

      {/* ─── TAB 1: VARIANTS LIST ─── */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Variants</span>
              <span className="text-xl font-extrabold text-slate-900 mt-1">{variants.length}</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Combined Stock</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-1">{totalVariantStock} units</span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Price Range</span>
              <span className="text-xl font-extrabold text-slate-900 mt-1">
                {minPrice === maxPrice ? `₹${minPrice.toLocaleString()}` : `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}`}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Uncreated Combos</span>
              <span className={`text-xl font-extrabold mt-1 ${missingCombinations.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {missingCombinations.length}
              </span>
            </div>
          </div>

          {/* Alert if combinations pending */}
          {missingCombinations.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {missingCombinations.length} new combinations ready to generate
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Based on your options ({product.attributes?.map(a => a.split(':')[0]).join(', ')}), you can generate them in 1-click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addAllCombinations}
                disabled={isGenerating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
              >
                Create All ({missingCombinations.length})
              </button>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search variant by option or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Filter:</span>
              {[
                { id: 'all', label: `All (${variants.length})` },
                { id: 'live', label: 'Live' },
                { id: 'hidden', label: 'Hidden' },
                { id: 'in_stock', label: 'In Stock' },
                { id: 'out_of_stock', label: 'Out of Stock' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variants List Table / Cards */}
          {filteredVariants.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 w-12">Photo</th>
                      <th className="py-3 px-4">Variant Options</th>
                      <th className="py-3 px-4">Price & MRP</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">SKU / Weight</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredVariants.map(v => {
                      const vAttrs = getAttrMap(v)
                      const entries = Object.entries(vAttrs)
                      const primaryImg = (v.images && v.images[0]?.url) || (Array.isArray(v.images) && typeof v.images[0] === 'string' && v.images[0]) || (product.images?.[0]?.url) || null
                      const inStock = (v.stock || 0) > 0

                      return (
                        <tr key={v._id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Image */}
                          <td className="py-3 px-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {primaryImg ? (
                                <img src={primaryImg} alt="" className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <span className="text-sm opacity-30">📦</span>
                              )}
                            </div>
                          </td>

                          {/* Options */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {entries.length > 0 ? (
                                entries.map(([k, val]) => (
                                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 font-bold text-xs uppercase tracking-tight">
                                    <span className="text-indigo-400 font-medium text-[10px]">{k}:</span>
                                    <span>{val}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic">No attributes</span>
                              )}
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900 text-sm">
                              ₹{Number(v.price || 0).toLocaleString()}
                            </div>
                            {Number(v.mrp) > Number(v.price) && (
                              <div className="text-[10px] text-slate-400 line-through font-medium">
                                ₹{Number(v.mrp).toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Stock */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${inStock ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {inStock ? `${v.stock} in stock` : 'Out of Stock'}
                            </span>
                          </td>

                          {/* SKU & Weight */}
                          <td className="py-3 px-4">
                            <div className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                              {v.sku || 'No SKU'}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {v.weight ? `${v.weight}g` : 'No weight'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => toggleActive(v)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${v.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              title="Click to toggle Live / Hidden"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${v.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {v.isActive !== false ? 'Live' : 'Hidden'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingVariant({
                                  ...v,
                                  imageUrls: (v.images || []).map(img => (typeof img === 'string' ? img : img.url)).filter(Boolean)
                                })}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-all"
                                title="Edit Variant"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteVariant(v)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                title="Delete Variant"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl">
                🎨
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900">
                  {variants.length === 0 ? 'No variants created yet' : 'No variants match your filter'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {variants.length === 0
                    ? 'Define your product options (like Size, Color, or Material) in the Options tab to generate your variant catalogue automatically.'
                    : 'Try clearing your search query or switching your status filter above to see other variants.'}
                </p>
              </div>
              {variants.length === 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('options')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all inline-flex items-center gap-2"
                >
                  <span>Configure Options (Size, Color...) →</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: OPTIONS & GENERATOR ─── */}
      {activeTab === 'options' && (
        <div className="space-y-6">
          {/* Quick Presets & Add Option Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Product Option Attributes</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Options define the variations of this product (e.g. Color, Size, Storage). Each combination becomes a sellable variant with its own price, SKU, and inventory.
              </p>
            </div>

            {/* Common Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Quick Add Preset:</span>
              {commonPresets.map(preset => {
                const currentNames = (product.attributes || []).map(a => a.split(':')[0]?.toLowerCase())
                const alreadyAdded = currentNames.includes(preset.toLowerCase())
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => addAttr(preset)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${alreadyAdded ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60' : 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 hover:bg-indigo-100 shadow-sm'}`}
                  >
                    <span>{alreadyAdded ? '✓' : '+'}</span>
                    <span>{preset}</span>
                  </button>
                )
              })}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2 max-w-md pt-1">
              <input
                type="text"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400"
                placeholder="Or custom option name (e.g. Finish, Volume)..."
                value={attrInput}
                onChange={e => setAttrInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAttr()}
              />
              <button
                type="button"
                onClick={() => addAttr()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm flex-shrink-0"
              >
                Add Option
              </button>
            </div>
          </div>

          {/* Active Defined Options */}
          <div className="space-y-3">
            {Array.isArray(product.attributes) && product.attributes.length > 0 ? (
              product.attributes.map(attr => {
                const [name, valuesStr] = attr.split(':')
                const values = valuesStr ? valuesStr.split(',').filter(Boolean) : []
                return (
                  <div key={name} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-800 font-extrabold text-xs uppercase tracking-wider">
                          {name}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          ({values.length} {values.length === 1 ? 'value' : 'values'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttr(attr)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Remove Option
                      </button>
                    </div>

                    {/* Values Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      {values.map(v => (
                        <span
                          key={v}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-sm group hover:border-slate-300"
                        >
                          <span>{v}</span>
                          <button
                            type="button"
                            onClick={() => removeAttrValue(name, v)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-1 transition-colors"
                            title="Remove value"
                          >
                            ✕
                          </button>
                        </span>
                      ))}

                      {/* Add Value Input Form */}
                      <div className="inline-flex items-center gap-1.5 ml-1">
                        <input
                          type="text"
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-48 placeholder-slate-400"
                          placeholder="Add value (e.g. Red, Blue)..."
                          value={valInput[name] || ''}
                          onChange={e => setValInput(prev => ({ ...prev, [name]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addAttrValue(name, valInput[name])}
                        />
                        <button
                          type="button"
                          onClick={() => addAttrValue(name, valInput[name])}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Tip: You can paste comma-separated values like <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">S, M, L, XL</code> to add them all at once.
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
                No options defined yet. Add common presets above or enter a custom option name.
              </div>
            )}
          </div>

          {/* Combinations Matrix Calculator Card */}
          {Array.isArray(product.attributes) && product.attributes.filter(a => a.split(':')[1]).length > 0 && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Variant Matrix Preview</span>
                  <h3 className="text-xl font-bold mt-1">
                    {product.attributes.filter(a => a.split(':')[1]).map(a => {
                      const [name, vals] = a.split(':');
                      return `${vals.split(',').filter(Boolean).length} ${name}`;
                    }).join(' × ')} = {missingCombinations.length + variants.length} Total Combinations
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-1">
                    {variants.length} created · {missingCombinations.length} ready to generate
                  </p>
                </div>

                {missingCombinations.length > 0 && (
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={addAllCombinations}
                    className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 flex-shrink-0"
                  >
                    <span>⚡ Generate All {missingCombinations.length} Variants</span>
                  </button>
                )}
              </div>

              {/* Individual Missing Combinations Chips */}
              {missingCombinations.length > 0 ? (
                <div className="pt-3 border-t border-indigo-800/60 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Click any combination to create individually:
                  </span>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {missingCombinations.map((combo, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => addCombination(combo)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <span className="text-emerald-400">+</span>
                        <span>{Object.values(combo).join(' / ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-indigo-800/60 flex items-center gap-2 text-xs text-emerald-300 font-bold">
                  <span>✓ All possible combinations are already created and live in your catalogue!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── EDIT VARIANT MODAL / DRAWER ─── */}
      {editingVariant && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[70] backdrop-blur-md p-4 overflow-y-auto">
          <form 
            onSubmit={handleUpdateVariant} 
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95 my-auto border border-slate-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">Edit Variant Details</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {Object.entries(getAttrMap(editingVariant)).map(([k, val]) => (
                    <span key={k} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md uppercase">
                      {k}: {val}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingVariant(null)} 
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Price & MRP */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={editingVariant.price}
                    onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MRP (₹)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Optional"
                    value={editingVariant.mrp || ''}
                    onChange={e => setEditingVariant({ ...editingVariant, mrp: e.target.value })}
                  />
                </div>
              </div>

              {/* Stock & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Stock *</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={editingVariant.stock}
                    onChange={e => setEditingVariant({ ...editingVariant, stock: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight (grams)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 250"
                    value={editingVariant.weight || ''}
                    onChange={e => setEditingVariant({ ...editingVariant, weight: e.target.value })}
                  />
                </div>
              </div>

              {/* SKU */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SKU Code</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={editingVariant.sku || ''}
                  onChange={e => setEditingVariant({ ...editingVariant, sku: e.target.value })}
                />
              </div>

              {/* Variant Images Gallery */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Variant Specific Photos</label>
                
                {/* Thumbnails */}
                {(editingVariant.imageUrls || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editingVariant.imageUrls || []).map((url, idx) => (
                      <div key={idx} className="relative group w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0">
                        <img src={url} alt="" className="w-full h-full object-contain p-0.5" />
                        <button
                          type="button"
                          onClick={() => setEditingVariant({
                            ...editingVariant,
                            imageUrls: editingVariant.imageUrls.filter((_, i) => i !== idx)
                          })}
                          className="absolute inset-0 bg-rose-900/70 text-white font-bold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-indigo-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const url = e.target.value.trim()
                          if (url) {
                            setEditingVariant(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), url] }))
                            e.target.value = ''
                          }
                        }
                      }}
                    />
                  </div>
                  <ImageUpload onUploaded={(url) => {
                    setEditingVariant(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), url] }))
                  }} />
                </div>
                <p className="text-[10px] text-slate-400">Upload new image or paste a link and press Enter.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-100 transition-all"
              >
                Save Variant Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}