import { useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../Toast'
import ImageUpload from '../ImageUpload'

/**
 * Shared variant manager for Seller & Admin panels.
 * @param apiPrefix - '/api/stores/products' or '/api/products'
 */
export default function VariantManagerPanel({ product, apiPrefix, onChanged, onClose }) {
  const { notify } = useToast()
  const [local, setLocal] = useState(product)
  const [attrInput, setAttrInput] = useState('')
  const [valInput, setValInput] = useState({})
  const [editingVariant, setEditingVariant] = useState(null)

  const refresh = async () => {
    if (apiPrefix.includes('/stores/')) {
      const { data } = await api.get('/api/stores/products')
      const updated = (data || []).find(p => p._id === product._id)
      if (updated) setLocal(updated)
    } else {
      const { data } = await api.get(`${apiPrefix}/${product._id}`)
      setLocal(data)
    }
    onChanged?.()
  }

  const updateAttributes = async (attrs) => {
    await api.put(`${apiPrefix}/${product._id}`, { attributes: attrs })
    setLocal(prev => ({ ...prev, attributes: attrs }))
  }

  const addAttr = async () => {
    const val = attrInput.trim().toLowerCase()
    if (!val) return
    const current = Array.isArray(local.attributes) ? local.attributes : []
    if (current.some(a => a.startsWith(`${val}:`))) return notify('Attribute already exists', 'error')
    await updateAttributes([...current, `${val}:`])
    setAttrInput('')
    notify('Attribute added', 'success')
  }

  const removeAttr = async (attr) => {
    if (!window.confirm('Remove this attribute?')) return
    const current = (local.attributes || []).filter(x => x !== attr)
    await updateAttributes(current)
    refresh()
  }

  const addAttrValue = async (attrName, value) => {
    const raw = (value || '').trim()
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

  const removeAttrValue = async (attrName, valToRemove) => {
    const current = [...(local.attributes || [])]
    const idx = current.findIndex(a => a.startsWith(`${attrName}:`))
    if (idx === -1) return
    const [, vals] = current[idx].split(':')
    const values = vals.split(',').filter(v => v !== valToRemove)
    current[idx] = `${attrName}:${values.join(',')}`
    await updateAttributes(current)
    refresh()
  }

  const generateCombinations = () => {
    const attrs = (local.attributes || []).map(a => {
      const [name, valuesStr] = a.split(':')
      return { name, values: valuesStr ? valuesStr.split(',').filter(Boolean) : [] }
    }).filter(a => a.values.length > 0)
    if (!attrs.length) return []

    const combine = (index, current) => {
      if (index === attrs.length) return [current]
      const result = []
      for (const val of attrs[index].values) {
        result.push(...combine(index + 1, { ...current, [attrs[index].name]: val }))
      }
      return result
    }

    const all = combine(0, {})
    const existing = (local.variants || []).map(v => {
      const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {})
      const normalized = {}
      Object.entries(vAttrs).forEach(([k, val]) => { normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim() })
      return JSON.stringify(Object.keys(normalized).sort().reduce((o, k) => ({ ...o, [k]: normalized[k] }), {}))
    })

    return all.filter(combo => {
      const normalized = {}
      Object.entries(combo).forEach(([k, val]) => { normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim() })
      return !existing.includes(JSON.stringify(Object.keys(normalized).sort().reduce((o, k) => ({ ...o, [k]: normalized[k] }), {})))
    })
  }

  const getSku = (combo) => {
    const nameCode = local.name.split(' ').filter(Boolean).map(p => p[0]).join('').substring(0, 4).toUpperCase() || 'PRD'
    const vals = Object.values(combo).map(v => String(v).toLowerCase().replace(/[^a-z0-9]/g, '')).join('-')
    return `${nameCode}-${vals.toUpperCase()}`
  }

  const addCombination = async (combo) => {
    try {
      const images = (local.images || []).map(i => (typeof i === 'string' ? { url: i } : i)).filter(i => i?.url)
      await api.post(`${apiPrefix}/${local._id}/variants`, {
        attributes: combo,
        price: Number(local.price || 0),
        mrp: local.mrp ? Number(local.mrp) : undefined,
        stock: 0,
        weight: Number(local.weight || 0),
        images,
        sku: getSku(combo),
        isActive: true
      })
      notify('Variant created', 'success')
      refresh()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to create variant', 'error')
    }
  }

  const addAllCombinations = async () => {
    const missing = generateCombinations()
    if (!missing.length) return notify('No new combinations', 'error')
    if (!window.confirm(`Create ${missing.length} variant(s)?`)) return
    let ok = 0
    for (const combo of missing) {
      try {
        await addCombination(combo)
        ok++
      } catch {}
    }
    notify(`Created ${ok} variants`, 'success')
    refresh()
  }

  const saveVariant = async (e) => {
    e.preventDefault()
    try {
      const images = Array.isArray(editingVariant.imageUrls)
        ? editingVariant.imageUrls.map(url => ({ url }))
        : []
      await api.put(`${apiPrefix}/${local._id}/variants/${editingVariant._id}`, {
        price: Number(editingVariant.price),
        mrp: editingVariant.mrp ? Number(editingVariant.mrp) : undefined,
        stock: Number(editingVariant.stock),
        weight: Number(editingVariant.weight || 0),
        sku: editingVariant.sku || undefined,
        isActive: editingVariant.isActive !== false,
        images
      })
      notify('Variant updated', 'success')
      setEditingVariant(null)
      refresh()
    } catch (err) {
      notify(err.response?.data?.error || 'Update failed', 'error')
    }
  }

  const toggleVariant = async (v) => {
    await api.put(`${apiPrefix}/${local._id}/variants/${v._id}`, { isActive: !v.isActive })
    refresh()
  }

  const deleteVariant = async (v) => {
    if (!window.confirm('Delete this variant?')) return
    await api.delete(`${apiPrefix}/${local._id}/variants/${v._id}`)
    notify('Variant deleted', 'success')
    refresh()
  }

  const missingCombinations = generateCombinations()

  const variantLabel = (v) => {
    const vAttrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {})
    const parts = Object.entries(vAttrs).map(([k, val]) => `${k}: ${val}`)
    return parts.length ? parts.join(' · ') : (v.sku || 'Variant')
  }

  return (
    <div className="panel-modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="panel-modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="panel-modal-header">
          <div>
            <h2 className="panel-title">Manage Variants</h2>
            <p className="panel-subtitle">{local.name}</p>
          </div>
          <button type="button" className="panel-btn-ghost" onClick={onClose}>✕ Close</button>
        </div>

        <div className="panel-modal-body">
          <div className="panel-step">
            <div className="panel-step-title">Step 1 — Define attributes (e.g. Color, Size)</div>
            <div className="flex gap-2 mb-4">
              <input className="panel-input flex-1" placeholder="Attribute name, e.g. color" value={attrInput} onChange={e => setAttrInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAttr()} />
              <button type="button" className="panel-btn-primary" onClick={addAttr}>Add</button>
            </div>
            {(local.attributes || []).map(attr => {
              const [name, valuesStr] = attr.split(':')
              const values = valuesStr ? valuesStr.split(',').filter(Boolean) : []
              return (
                <div key={name} className="panel-card mb-3" style={{ padding: 12 }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="panel-chip">{name}</span>
                    <button type="button" className="panel-btn-danger text-xs py-1 px-2" onClick={() => removeAttr(attr)}>Remove</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {values.map(v => (
                      <span key={v} className="panel-chip">
                        {v}
                        <button type="button" onClick={() => removeAttrValue(name, v)} className="text-red-500 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className="panel-input flex-1" placeholder="Add values (comma separated)" value={valInput[name] || ''} onChange={e => setValInput(p => ({ ...p, [name]: e.target.value }))} />
                    <button type="button" className="panel-btn-outline" onClick={() => addAttrValue(name, valInput[name])}>Add values</button>
                  </div>
                </div>
              )
            })}
          </div>

          {(local.attributes || []).some(a => a.split(':')[1]) && (
            <div className="panel-step">
              <div className="flex justify-between items-center mb-3">
                <div className="panel-step-title" style={{ margin: 0 }}>Step 2 — Create variants ({missingCombinations.length} pending)</div>
                {missingCombinations.length > 1 && (
                  <button type="button" className="panel-btn-accent" onClick={addAllCombinations}>Create all ({missingCombinations.length})</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {missingCombinations.slice(0, 12).map((combo, i) => (
                  <button key={i} type="button" className="panel-btn-outline text-xs" onClick={() => addCombination(combo)}>
                    + {Object.values(combo).join(' / ')}
                  </button>
                ))}
                {missingCombinations.length > 12 && <span className="text-xs text-gray-400">+{missingCombinations.length - 12} more</span>}
              </div>
            </div>
          )}

          <div className="panel-step">
            <div className="panel-step-title">Step 3 — Existing variants ({(local.variants || []).length})</div>
            <p className="text-xs text-gray-500 mb-3">Stock changes are best done from the Inventory page.</p>
            <div className="space-y-2">
              {(local.variants || []).map(v => (
                <div key={v._id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-gray-100 rounded-sm">
                  <div>
                    <div className="font-medium text-sm">{variantLabel(v)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      ₹{v.price} · Stock: {v.stock} · {v.weight ? `${v.weight}g` : 'no weight'} · {v.sku || 'no SKU'}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" className="panel-btn-outline text-xs py-1" onClick={() => setEditingVariant({
                      ...v,
                      imageUrls: (v.images || []).map(i => i.url || i)
                    })}>Edit</button>
                    <button type="button" className={`text-xs py-1 px-3 rounded-sm font-semibold ${v.isActive !== false ? 'panel-badge-green' : 'panel-badge-amber'}`} onClick={() => toggleVariant(v)}>
                      {v.isActive !== false ? 'Active' : 'Inactive'}
                    </button>
                    <button type="button" className="panel-btn-danger text-xs py-1" onClick={() => deleteVariant(v)}>Delete</button>
                  </div>
                </div>
              ))}
              {!(local.variants || []).length && <p className="text-sm text-gray-400 text-center py-4">No variants yet. Add attributes above first.</p>}
            </div>
          </div>

          {editingVariant && (
            <form onSubmit={saveVariant} className="panel-step border-2 border-blue-100">
              <div className="panel-step-title">Edit variant</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="panel-label">Price (₹)</label><input type="number" className="panel-input" value={editingVariant.price} onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value })} required /></div>
                <div><label className="panel-label">MRP (₹)</label><input type="number" className="panel-input" value={editingVariant.mrp || ''} onChange={e => setEditingVariant({ ...editingVariant, mrp: e.target.value })} /></div>
                <div><label className="panel-label">Stock</label><input type="number" className="panel-input" value={editingVariant.stock} onChange={e => setEditingVariant({ ...editingVariant, stock: e.target.value })} /></div>
                <div><label className="panel-label">Weight (g)</label><input type="number" className="panel-input" value={editingVariant.weight || ''} onChange={e => setEditingVariant({ ...editingVariant, weight: e.target.value })} /></div>
                <div className="col-span-2"><label className="panel-label">SKU</label><input className="panel-input" value={editingVariant.sku || ''} onChange={e => setEditingVariant({ ...editingVariant, sku: e.target.value })} /></div>
                <div className="col-span-2">
                  <label className="panel-label">Images</label>
                  <div className="panel-img-grid mb-2">
                    {(editingVariant.imageUrls || []).map((url, i) => (
                      <div key={i} className="panel-img-wrap">
                        <img src={url} alt="" className="panel-img-thumb" />
                        <button type="button" className="panel-img-remove" onClick={() => setEditingVariant({ ...editingVariant, imageUrls: editingVariant.imageUrls.filter((_, idx) => idx !== i) })}>×</button>
                      </div>
                    ))}
                  </div>
                  <ImageUpload multiple onUploaded={url => setEditingVariant({ ...editingVariant, imageUrls: [...(editingVariant.imageUrls || []), url] })} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" className="panel-btn-ghost" onClick={() => setEditingVariant(null)}>Cancel</button>
                <button type="submit" className="panel-btn-primary">Save variant</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
