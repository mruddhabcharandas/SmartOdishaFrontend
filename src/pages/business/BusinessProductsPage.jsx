import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import ImageUpload from '../../components/ImageUpload'
import LoadingSpinner from '../../components/LoadingSpinner'
import VariantManagerPanel from '../../components/panel/VariantManagerPanel'

const emptyForm = {
  name: '',
  price: '',
  mrp: '',
  brandId: '',
  categoryId: '',
  subCategoryId: '',
  stock: '',
  weight: '',
  length: '',
  width: '',
  height: '',
  gst: '',
  imageUrls: [],
  description: '',
  highlights: [],
  specifications: {},
  section: '',
  variantDisplayType: 'selector'
}

export default function BusinessProductsPage() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [managingVariants, setManagingVariants] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [sections, setSections] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/stores/products')
      setItems(data || [])
    } catch {
      notify('Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    api.get('/api/brands', { params: { active: true } }).then(({ data }) => setBrands(data || [])).catch(() => {})
    api.get('/api/stores/profile').then(({ data }) => setSections(data?.sections || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const brandId = editing ? editing.brandId : form.brandId
    const params = { active: true }
    if (brandId) params.brand = brandId
    api.get('/api/categories', { params }).then(({ data }) => setCategories(data || [])).catch(() => {})
  }, [form.brandId, editing?.brandId])

  useEffect(() => {
    const categoryId = editing ? editing.categoryId : form.categoryId
    if (categoryId) {
      api.get('/api/subcategories', { params: { category: categoryId, active: true } })
        .then(({ data }) => setSubcategories(data || []))
        .catch(() => {})
    } else {
      setSubcategories([])
    }
  }, [form.categoryId, editing?.categoryId])

  const [stockFilter, setStockFilter] = useState('ALL') // 'ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'

  const filtered = items.filter(p => {
    const matchesQuery = p.name?.toLowerCase().includes(q.toLowerCase()) ||
      p.sku?.toLowerCase().includes(q.toLowerCase())
    if (!matchesQuery) return false

    const stock = p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : (p.stock || 0)
    if (stockFilter === 'IN_STOCK') return stock > 10
    if (stockFilter === 'LOW_STOCK') return stock > 0 && stock <= 10
    if (stockFilter === 'OUT_OF_STOCK') return stock <= 0
    return true
  })

  // KPI stats
  const totalCount = items.length
  const outOfStockCount = items.filter(p => {
    const s = p.variants?.length ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : (p.stock || 0)
    return s <= 0
  }).length
  const lowStockCount = items.filter(p => {
    const s = p.variants?.length ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : (p.stock || 0)
    return s > 0 && s <= 10
  }).length
  const inStockCount = items.filter(p => {
    const s = p.variants?.length ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : (p.stock || 0)
    return s > 10
  }).length

  const create = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/stores/products', {
        name: form.name,
        price: Number(form.price),
        mrp: form.mrp ? Number(form.mrp) : undefined,
        brandId: form.brandId || undefined,
        categoryId: form.categoryId,
        subCategoryId: form.subCategoryId || undefined,
        stock: Number(form.stock),
        weight: Number(form.weight || 0),
        length: Number(form.length || 0),
        width: Number(form.width || 0),
        height: Number(form.height || 0),
        gst: Number(form.gst || 0),
        hsnCode: form.hsnCode || '',
        images: form.imageUrls,
        description: form.description,
        highlights: form.highlights || [],
        specifications: Object.entries(form.specifications || {}).map(([key, value]) => ({
          key: key.trim(),
          value: String(value || '').trim()
        })).filter(s => s.key),
        section: form.section || '',
        variantDisplayType: form.variantDisplayType,
        variants: []
      })
      setForm(emptyForm)
      setShowAdd(false)
      load()
      notify('Product added successfully', 'success')
    } catch (err) {
      notify(err.response?.data?.message || err.response?.data?.error || 'Failed to add product', 'error')
    }
  }

  const openEdit = (p) => {
    setEditing({
      ...p,
      brandId: p.brand?._id || p.brand || '',
      categoryId: p.category?._id || p.category || '',
      subCategoryId: p.subCategory?._id || p.subCategory || '',
      imageUrls: (p.images || []).map(i => i.url || i),
      weight: p.weight || '',
      length: p.length || '',
      width: p.width || '',
      height: p.height || '',
      hsnCode: p.hsnCode || '',
      highlights: p.highlights || [],
      specifications: Array.isArray(p.specifications)
        ? p.specifications.reduce((acc, curr) => {
            if (curr && curr.key) acc[curr.key] = curr.value || '';
            return acc;
          }, {})
        : p.specifications || {}
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/api/stores/products/${editing._id}`, {
        name: editing.name,
        description: editing.description,
        price: Number(editing.price),
        mrp: editing.mrp ? Number(editing.mrp) : undefined,
        brandId: editing.brandId || undefined,
        categoryId: editing.categoryId,
        subCategoryId: editing.subCategoryId || undefined,
        weight: Number(editing.weight || 0),
        length: Number(editing.length || 0),
        width: Number(editing.width || 0),
        height: Number(editing.height || 0),
        hsnCode: editing.hsnCode || '',
        gst: Number(editing.gst || 0),
        images: editing.imageUrls,
        highlights: editing.highlights || [],
        specifications: Object.entries(editing.specifications || {}).map(([key, value]) => ({
          key: key.trim(),
          value: String(value || '').trim()
        })).filter(s => s.key),
        section: editing.section || '',
        variantDisplayType: editing.variantDisplayType || 'selector'
      })
      setEditing(null)
      load()
      notify('Product updated successfully', 'success')
    } catch (err) {
      notify(err.response?.data?.message || err.response?.data?.error || 'Update failed', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await api.delete(`/api/stores/products/${toDelete._id}`)
      setToDelete(null)
      load()
      notify('Product deleted successfully', 'success')
    } catch {
      notify('Delete failed', 'error')
    }
  }

  const ImageGallery = ({ urls, onChange }) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        {urls.map((url, i) => (
          <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200 shadow-xs">
            <img src={url} alt="" className="h-20 w-20 object-cover bg-slate-50" />
            <button
              type="button"
              onClick={() => onChange(urls.filter((_, idx) => idx !== i))}
              className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <ImageUpload multiple onUploaded={(url) => onChange([...urls, url])} />
    </div>
  )

  const ProductFormFields = ({ data, setData, isEdit }) => {
    const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
    const labelCls = "block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5"

    const addHighlight = () => setData({ ...data, highlights: [...(data.highlights || []), ''] })
    const removeHighlight = (index) => setData({ ...data, highlights: (data.highlights || []).filter((_, i) => i !== index) })
    const updateHighlight = (index, value) => {
      const newHighlights = [...(data.highlights || [])]
      newHighlights[index] = value
      setData({ ...data, highlights: newHighlights })
    }
    const addSpec = () => {
      const newSpecs = { ...(data.specifications || {}) }
      newSpecs[`Key_${Object.keys(newSpecs).length + 1}`] = ''
      setData({ ...data, specifications: newSpecs })
    }
    const removeSpec = (key) => {
      const newSpecs = { ...(data.specifications || {}) }
      delete newSpecs[key]
      setData({ ...data, specifications: newSpecs })
    }
    const updateSpec = (oldKey, newKey, value) => {
      const newSpecs = { ...(data.specifications || {}) }
      delete newSpecs[oldKey]
      newSpecs[newKey] = value
      setData({ ...data, specifications: newSpecs })
    }

    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <span>🏷️</span> Basic Information
          </div>
          <div>
            <label className={labelCls}>Product Title / Name *</label>
            <input className={inputCls} placeholder="e.g. Handmade Sambalpuri Cotton Saree" value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Brand</label>
              <select className={inputCls} value={data.brandId || ''} onChange={e => setData({ ...data, brandId: e.target.value })}>
                <option value="">No Brand</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Category *</label>
              <select className={inputCls} value={data.categoryId || ''} onChange={e => setData({ ...data, categoryId: e.target.value, subCategoryId: '' })} required>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Subcategory</label>
              <select className={inputCls} value={data.subCategoryId || ''} onChange={e => setData({ ...data, subCategoryId: e.target.value })}>
                <option value="">Optional</option>
                {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="space-y-4">
          <div className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <span>💰</span> Pricing & Inventory
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Selling Price (₹) *</label>
              <input type="number" className={inputCls} placeholder="e.g. 1499" value={data.price || ''} onChange={e => setData({ ...data, price: e.target.value })} required />
              <p className="text-[10px] text-slate-400 mt-1">Amount you will receive per unit</p>
            </div>
            <div>
              <label className={labelCls}>MRP (₹)</label>
              <input type="number" className={inputCls} placeholder="e.g. 2499" value={data.mrp || ''} onChange={e => setData({ ...data, mrp: e.target.value })} />
              <p className="text-[10px] text-slate-400 mt-1">Printed Retail Price</p>
            </div>
            {!isEdit ? (
              <div>
                <label className={labelCls}>Initial Stock Units *</label>
                <input type="number" className={inputCls} placeholder="e.g. 50" value={data.stock || ''} onChange={e => setData({ ...data, stock: e.target.value })} required />
              </div>
            ) : (
              <div>
                <label className={labelCls}>Current Stock</label>
                <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                  {data.stock ?? 0} units
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>GST %</label>
              <input type="number" className={inputCls} placeholder="e.g. 5 or 18" value={data.gst || ''} onChange={e => setData({ ...data, gst: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>HSN Code</label>
              <input className={inputCls} placeholder="e.g. 5208" value={data.hsnCode || ''} onChange={e => setData({ ...data, hsnCode: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Shipping & Dimensions */}
        <div className="space-y-4">
          <div className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <span>📦</span> Dimensions & Shipping Weight
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Weight (g)</label>
              <input type="number" className={inputCls} placeholder="500" value={data.weight || ''} onChange={e => setData({ ...data, weight: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Length (cm)</label>
              <input type="number" className={inputCls} placeholder="25" value={data.length || ''} onChange={e => setData({ ...data, length: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Width (cm)</label>
              <input type="number" className={inputCls} placeholder="15" value={data.width || ''} onChange={e => setData({ ...data, width: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Height (cm)</label>
              <input type="number" className={inputCls} placeholder="10" value={data.height || ''} onChange={e => setData({ ...data, height: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <span>📸</span> Product Images
          </div>
          <ImageGallery urls={data.imageUrls || []} onChange={urls => setData({ ...data, imageUrls: urls })} />
        </div>

        {/* Highlights */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <span>✨</span> Key Highlights
            </span>
            <button type="button" onClick={addHighlight} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              + Add Bullet
            </button>
          </div>
          <div className="space-y-2">
            {(data.highlights || []).map((h, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} value={h} onChange={(e) => updateHighlight(i, e.target.value)} placeholder="e.g. 100% Organic Handwoven Cotton" />
                <button type="button" onClick={() => removeHighlight(i)} className="px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Specifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <span>⚙️</span> Technical Specifications
            </span>
            <button type="button" onClick={addSpec} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              + Add Specification
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(data.specifications || {}).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <input className={`${inputCls} w-1/3`} value={key} onChange={(e) => updateSpec(key, e.target.value, value)} placeholder="e.g. Material" />
                <input className={`${inputCls} flex-1`} value={value} onChange={(e) => updateSpec(key, key, e.target.value)} placeholder="e.g. Cotton" />
                <button type="button" onClick={() => removeSpec(key)} className="px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className={labelCls}>Detailed Description</label>
          <textarea
            className={`${inputCls} min-h-[110px] leading-relaxed`}
            placeholder="Write a clear, compelling description of the item..."
            value={data.description || ''}
            onChange={e => setData({ ...data, description: e.target.value })}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <LoadingSpinner text="Loading your catalogue..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Inventory & Catalogue
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Products Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your store's listings, prices, images, and product variants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all self-start md:self-auto"
        >
          <span className="text-base leading-none">+</span> Add New Product
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Products</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">In Stock</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{inStockCount}</div>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">Low Stock (≤10)</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{lowStockCount}</div>
        </div>
        <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-rose-600">Out of Stock</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{outOfStockCount}</div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-9 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold">
              ✕
            </button>
          )}
        </div>

        {/* Stock Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Listings' },
            { id: 'IN_STOCK', label: 'In Stock' },
            { id: 'LOW_STOCK', label: 'Low Stock' },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStockFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap ${
                stockFilter === f.id
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Products Table */}
      <div className="hidden sm:block bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4 text-center">Stock Level</th>
                <th className="px-6 py-4 text-center">Weight</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const stock = p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : (p.stock || 0)
                const thumb = p.images?.[0]?.url || p.images?.[0]
                const mrp = Number(p.mrp || 0)
                const price = Number(p.price || 0)
                const hasDiscount = mrp > price

                return (
                  <tr key={p._id} className="hover:bg-indigo-50/15 transition-colors">
                    {/* Product Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🛍️</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs truncate max-w-xs">{p.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {p.category?.name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                {p.category.name}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.variants?.length ? `${p.variants.length} Variants` : (p.sku || 'Simple Product')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 text-sm">
                        ₹{price.toLocaleString('en-IN')}
                      </div>
                      {hasDiscount && (
                        <div className="text-[11px] text-slate-400 line-through">
                          ₹{mrp.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Stock Level */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          stock <= 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                            : stock <= 10
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            stock <= 0 ? 'bg-rose-500' : stock <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        ></span>
                        {stock <= 0 ? 'Out of Stock' : `${stock} Units`}
                      </span>
                    </td>

                    {/* Weight */}
                    <td className="px-6 py-4 text-center text-slate-500 font-medium">
                      {p.weight ? `${p.weight}g` : '—'}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setManagingVariants(p)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors"
                        >
                          Variants
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(p)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="font-black text-slate-700 text-sm">No products found</div>
                    <p className="text-xs text-slate-400 mt-1">Try modifying your search or filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Products Card List */}
      <div className="sm:hidden space-y-3">
        {filtered.map(p => {
          const stock = p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : (p.stock || 0)
          const thumb = p.images?.[0]?.url || p.images?.[0]
          const price = Number(p.price || 0)

          return (
            <div key={p._id} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {thumb ? (
                    <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🛍️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-xs leading-snug">{p.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-black text-slate-900 text-sm">₹{price.toLocaleString('en-IN')}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                        stock <= 0
                          ? 'bg-rose-50 text-rose-700'
                          : stock <= 10
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {stock <= 0 ? 'Out of Stock' : `${stock} left`}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {p.variants?.length ? `${p.variants.length} Variants` : 'Simple Product'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManagingVariants(p)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  Variants
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(p)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-100"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500">
            <div className="text-3xl mb-2">📦</div>
            <div className="font-black text-slate-700 text-sm">No products found</div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowAdd(false)}
        >
          <form
            onSubmit={create}
            className="bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-base">Add New Product</h3>
                <p className="text-xs text-slate-500 mt-0.5">Fill in product details to list on marketplace</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <ProductFormFields data={form} setData={setForm} />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all"
              >
                Create Product Listing
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Product Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-3xl max-w-2xl w-full my-8 shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-base">Edit Product</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update details for {editing.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {editing.stock != null && (
                <div className="text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span>Current Inventory Stock: <strong>{editing.stock} units</strong></span>
                  <span className="text-[10px] text-indigo-700 font-bold">Manage via Inventory Page</span>
                </div>
              )}
              <ProductFormFields data={editing} setData={setEditing} isEdit />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Variant Manager Drawer */}
      {managingVariants && (
        <VariantManagerPanel
          product={managingVariants}
          apiPrefix="/api/stores/products"
          onChanged={load}
          onClose={() => setManagingVariants(null)}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmModal
        open={!!toDelete}
        title="Delete Product Listing"
        message={`Are you sure you want to delete "${toDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

