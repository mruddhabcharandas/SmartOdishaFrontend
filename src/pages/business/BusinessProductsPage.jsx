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
  hsnCode: '',
  gst: '',
  imageUrls: [],
  description: '',
  highlights: [],
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

  const filtered = items.filter(p =>
    p.name?.toLowerCase().includes(q.toLowerCase()) ||
    p.sku?.toLowerCase().includes(q.toLowerCase())
  )

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
        gst: Number(form.gst || 0),
        hsnCode: form.hsnCode || '',
        images: form.imageUrls,
        description: form.description,
        section: form.section || '',
        variantDisplayType: form.variantDisplayType,
        variants: []
      })
      setForm(emptyForm)
      setShowAdd(false)
      load()
      notify('Product added', 'success')
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to add product', 'error')
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
      hsnCode: p.hsnCode || ''
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
        hsnCode: editing.hsnCode || '',
        gst: Number(editing.gst || 0),
        images: editing.imageUrls,
        section: editing.section || '',
        variantDisplayType: editing.variantDisplayType || 'selector'
      })
      setEditing(null)
      load()
      notify('Product updated', 'success')
    } catch (err) {
      notify(err.response?.data?.error || 'Update failed', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await api.delete(`/api/stores/products/${toDelete._id}`)
      setToDelete(null)
      load()
      notify('Product deleted', 'success')
    } catch {
      notify('Delete failed', 'error')
    }
  }

  const ImageGallery = ({ urls, onChange }) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={i} className="group relative">
            <img src={url} alt="" className="h-20 w-20 object-cover rounded-xl border-2 border-gray-100 bg-gray-50" />
            <button type="button" onClick={() => onChange(urls.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
      <ImageUpload multiple onUploaded={(url) => onChange([...urls, url])} />
    </div>
  )

  const ProductFormFields = ({ data, setData, isEdit }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="panel-label">Product Name</label>
        <input className="panel-input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} required />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Selling Price (₹)</label>
        <input type="number" className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.price} onChange={e => setData({ ...data, price: e.target.value })} required />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">MRP (₹)</label>
        <input type="number" className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.mrp || ''} onChange={e => setData({ ...data, mrp: e.target.value })} />
      </div>
      {!isEdit && (
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Stock</label>
          <input type="number" className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.stock} onChange={e => setData({ ...data, stock: e.target.value })} required />
        </div>
      )}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Weight (grams)</label>
        <input type="number" className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" placeholder="e.g. 500" value={data.weight} onChange={e => setData({ ...data, weight: e.target.value })} />
        <p className="text-[10px] text-gray-400 mt-1">Used for delivery charge calculation</p>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">GST %</label>
        <input type="number" className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.gst} onChange={e => setData({ ...data, gst: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">HSN Code</label>
        <input className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.hsnCode || ''} onChange={e => setData({ ...data, hsnCode: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Brand</label>
        <select className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.brandId || ''} onChange={e => setData({ ...data, brandId: e.target.value })}>
          <option value="">No Brand</option>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
        <select className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.categoryId || ''} onChange={e => setData({ ...data, categoryId: e.target.value, subCategoryId: '' })} required>
          <option value="">Select category</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Subcategory</label>
        <select className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.subCategoryId || ''} onChange={e => setData({ ...data, subCategoryId: e.target.value })}>
          <option value="">Optional</option>
          {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>
      {sections.length > 0 && (
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Section</label>
          <select className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.section || ''} onChange={e => setData({ ...data, section: e.target.value })}>
            <option value="">None</option>
            {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
          </select>
        </div>
      )}
      <div className="md:col-span-2">
        <label className="text-xs font-bold text-gray-500 uppercase">Product Images</label>
        <div className="mt-2">
          <ImageGallery urls={data.imageUrls || []} onChange={urls => setData({ ...data, imageUrls: urls })} />
        </div>
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
        <textarea className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm min-h-[100px]" value={data.description || ''} onChange={e => setData({ ...data, description: e.target.value })} />
      </div>
    </div>
  )

  if (loading) {
    return <div className="flex justify-center p-16"><LoadingSpinner text="Loading your products..." /></div>
  }

  return (
    <div className="space-y-4">
      <div className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1 className="panel-title">My Products</h1>
            <p className="panel-subtitle">Add, edit and manage your catalogue</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <input placeholder="Search products..." className="panel-input" style={{ width: 220 }} value={q} onChange={e => setQ(e.target.value)} />
            <button type="button" onClick={() => setShowAdd(true)} className="panel-btn-primary">+ Add Product</button>
          </div>
        </div>
      </div>

      <div className="panel-card panel-table-wrap">
        <table className="panel-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Weight</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(p => {
              const stock = p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : p.stock
              const thumb = p.images?.[0]?.url || p.images?.[0]
              return (
                <tr key={p._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {thumb && <img src={thumb} alt="" className="panel-img-thumb" />}
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.variants?.length ? `${p.variants.length} variants` : 'Simple product'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold">₹{Number(p.price).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`panel-badge ${stock <= 0 ? 'panel-badge-red' : stock <= 10 ? 'panel-badge-amber' : 'panel-badge-green'}`}>{stock}</span>
                  </td>
                  <td className="text-gray-500">{p.weight ? `${p.weight}g` : '—'}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setManagingVariants(p)} className="panel-btn-outline text-xs py-1">Variants</button>
                      <button type="button" onClick={() => openEdit(p)} className="panel-btn-outline text-xs py-1">Edit</button>
                      <button type="button" onClick={() => setToDelete(p)} className="panel-btn-danger text-xs py-1">Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No products found</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="panel-modal-overlay">
          <form onSubmit={create} className="panel-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="panel-modal-header">
              <h2 className="panel-title">Add New Product</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="panel-btn-ghost">✕ Close</button>
            </div>
            <div className="panel-modal-body">
              <ProductFormFields data={form} setData={setForm} />
            </div>
            <div className="panel-modal-footer">
              <button type="button" onClick={() => setShowAdd(false)} className="panel-btn-ghost">Cancel</button>
              <button type="submit" className="panel-btn-primary">Create Product</button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="panel-modal-overlay">
          <form onSubmit={saveEdit} className="panel-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="panel-modal-header">
              <h2 className="panel-title">Edit Product</h2>
              <button type="button" onClick={() => setEditing(null)} className="panel-btn-ghost">✕ Close</button>
            </div>
            <div className="panel-modal-body">
              {editing.stock != null && <div className="text-sm text-gray-500 bg-gray-50 rounded-sm px-4 py-2 mb-4">Current stock: <strong>{editing.stock}</strong> — manage via Inventory</div>}
              <ProductFormFields data={editing} setData={setEditing} isEdit />
            </div>
            <div className="panel-modal-footer">
              <button type="button" onClick={() => setEditing(null)} className="panel-btn-ghost">Cancel</button>
              <button type="submit" className="panel-btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {managingVariants && (
        <VariantManagerPanel
          product={managingVariants}
          apiPrefix="/api/stores/products"
          onChanged={load}
          onClose={() => setManagingVariants(null)}
        />
      )}
      <ConfirmModal open={!!toDelete} title="Delete Product" message={`Delete "${toDelete?.name}"?`} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  )
}
