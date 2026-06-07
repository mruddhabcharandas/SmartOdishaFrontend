import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import ImageUpload from '../../components/ImageUpload'
import LoadingSpinner from '../../components/LoadingSpinner'

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
        <label className="text-xs font-bold text-gray-500 uppercase">Product Name</label>
        <input className="w-full mt-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-semibold" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} required />
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
          <p className="text-sm text-gray-500 mt-1">Add, edit and manage your catalogue</p>
        </div>
        <div className="flex gap-3">
          <input placeholder="Search products..." className="bg-gray-50 border rounded-xl px-4 py-2.5 text-sm w-56" value={q} onChange={e => setQ(e.target.value)} />
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">+ Add Product</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
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
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {thumb && <img src={thumb} alt="" className="w-12 h-12 object-cover rounded-lg border" />}
                      <div>
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.variants?.length ? `${p.variants.length} variants` : 'Simple product'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold">₹{Number(p.price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${stock <= 0 ? 'bg-red-50 text-red-600' : stock <= 10 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{stock}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.weight ? `${p.weight}g` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setManagingVariants(p)} className="px-3 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 rounded-lg">Variants</button>
                      <button onClick={() => openEdit(p)} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg">Edit</button>
                      <button onClick={() => setToDelete(p)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg">Delete</button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <form onSubmit={create} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Add New Product</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <ProductFormFields data={form} setData={setForm} />
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Create Product</button>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <form onSubmit={saveEdit} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Product</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            {editing.stock != null && <div className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-2">Current stock: <strong>{editing.stock}</strong> — manage via Inventory</div>}
            <ProductFormFields data={editing} setData={setEditing} isEdit />
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Save Changes</button>
          </form>
        </div>
      )}

      {managingVariants && <SellerVariantManager product={managingVariants} onClose={() => setManagingVariants(null)} onChanged={load} />}
      <ConfirmModal open={!!toDelete} title="Delete Product" message={`Delete "${toDelete?.name}"?`} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </div>
  )
}

function SellerVariantManager({ product, onClose, onChanged }) {
  const { notify } = useToast()
  const [local, setLocal] = useState(product)
  const [attrInput, setAttrInput] = useState('')
  const [valInput, setValInput] = useState({})

  const refresh = async () => {
    const { data } = await api.get('/api/stores/products')
    const updated = (data || []).find(p => p._id === product._id)
    if (updated) setLocal(updated)
    onChanged()
  }

  const updateAttributes = async (attrs) => {
    await api.put(`/api/stores/products/${product._id}`, { attributes: attrs })
    setLocal(prev => ({ ...prev, attributes: attrs }))
  }

  const addAttr = async () => {
    const val = attrInput.trim().toLowerCase()
    if (!val) return
    const current = Array.isArray(local.attributes) ? local.attributes : []
    if (current.some(a => a.startsWith(`${val}:`))) return notify('Attribute exists', 'error')
    await updateAttributes([...current, `${val}:`])
    setAttrInput('')
  }

  const addAttrValue = async (attrName, value) => {
    const raw = value.trim()
    if (!raw) return
    const current = [...(local.attributes || [])]
    const idx = current.findIndex(a => a.startsWith(`${attrName}:`))
    if (idx === -1) return
    const [, vals] = current[idx].split(':')
    const existing = vals ? vals.split(',').filter(Boolean) : []
    const merged = [...new Set([...existing, ...raw.split(',').map(v => v.trim().toLowerCase()).filter(Boolean)])]
    current[idx] = `${attrName}:${merged.join(',')}`
    await updateAttributes(current)
    setValInput(prev => ({ ...prev, [attrName]: '' }))
  }

  const toggleVariant = async (v) => {
    await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, { isActive: !v.isActive })
    refresh()
  }

  const deleteVariant = async (v) => {
    if (!window.confirm('Delete this variant?')) return
    await api.delete(`/api/stores/products/${product._id}/variants/${v._id}`)
    refresh()
  }

  const attrs = (local.attributes || []).map(a => {
    const [name, vals] = a.split(':')
    return { name, values: vals ? vals.split(',').filter(Boolean) : [] }
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div><h2 className="text-xl font-bold">Manage Variants</h2><p className="text-sm text-gray-500">{local.name}</p></div>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
            <h3 className="text-sm font-bold text-violet-800 mb-3">Product Attributes</h3>
            <div className="flex gap-2 mb-4">
              <input placeholder="e.g. color, size" className="flex-1 bg-white rounded-lg px-3 py-2 text-sm border" value={attrInput} onChange={e => setAttrInput(e.target.value)} />
              <button type="button" onClick={addAttr} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold">Add</button>
            </div>
            {attrs.map(attr => (
              <div key={attr.name} className="mb-3 p-3 bg-white rounded-lg border">
                <div className="text-xs font-bold uppercase text-gray-500 mb-2">{attr.name}</div>
                <div className="flex flex-wrap gap-2 mb-2">{attr.values.map(v => <span key={v} className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">{v}</span>)}</div>
                <div className="flex gap-2">
                  <input placeholder="Add values" className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm" value={valInput[attr.name] || ''} onChange={e => setValInput(prev => ({ ...prev, [attr.name]: e.target.value }))} />
                  <button type="button" onClick={() => addAttrValue(attr.name, valInput[attr.name] || '')} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold">Add</button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">Variants ({(local.variants || []).length})</h3>
            <div className="space-y-2">
              {(local.variants || []).map(v => {
                const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {})
                const label = Object.entries(vAttrs).map(([k, val]) => `${k}: ${val}`).join(' · ')
                return (
                  <div key={v._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                    <div>
                      <div className="font-semibold text-sm">{label || v.sku || 'Variant'}</div>
                      <div className="text-xs text-gray-500">₹{v.price} · Stock: {v.stock} · {v.weight ? `${v.weight}g` : 'no weight'}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleVariant(v)} className={`px-3 py-1 rounded-lg text-xs font-bold ${v.isActive !== false ? 'bg-green-50 text-green-700' : 'bg-gray-200'}`}>{v.isActive !== false ? 'Active' : 'Inactive'}</button>
                      <button onClick={() => deleteVariant(v)} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold">Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
