import React, { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import ImageUpload from '../../components/ImageUpload'

export default function BusinessVariants() {
  const { notify } = useToast()
  const { id: paramId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const selectedProductId = paramId || searchParams.get('productId') || ''

  // All store products for switcher
  const [allProducts, setAllProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productSearch, setProductSearch] = useState('')

  // Active selected product
  const [product, setProduct] = useState(null)
  const [loadingProduct, setLoadingProduct] = useState(false)

  // Studio tabs: 'list' | 'options'
  const [activeTab, setActiveTab] = useState('list')

  // Filtering & search within variants
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'live' | 'hidden' | 'in_stock' | 'out_of_stock'

  // Inline edits: { [variantId]: { price, mrp, stock, sku } }
  const [inlineEdits, setInlineEdits] = useState({})
  const [savingRowId, setSavingRowId] = useState(null)
  const [savingAll, setSavingAll] = useState(false)

  // Bulk actions toolbar
  const [showBulkBar, setShowBulkBar] = useState(false)
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')
  const [isBulkApplying, setIsBulkApplying] = useState(false)

  // Options input
  const [attrInput, setAttrInput] = useState('')
  const [valInput, setValInput] = useState({})
  const [isGenerating, setIsGenerating] = useState(false)

  // Edit variant modal
  const [editingVariant, setEditingVariant] = useState(null)

  // Delete variant modal with password confirmation
  const [variantToDelete, setVariantToDelete] = useState(null)

  const commonPresets = [
    { label: 'Color', icon: '🎨' },
    { label: 'Size', icon: '📏' },
    { label: 'Storage', icon: '💾' },
    { label: 'Material', icon: '🧱' },
    { label: 'Pack Size', icon: '📦' },
    { label: 'Weight', icon: '⚖️' },
    { label: 'Model', icon: '🏷️' },
    { label: 'Finish', icon: '✨' }
  ]

  // Fetch all products for selector
  const loadAllProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await api.get('/api/stores/products')
      const list = Array.isArray(res.data) ? res.data : []
      setAllProducts(list)

      // If no product selected, select the first one or the first one that has variants
      if (!selectedProductId && list.length > 0) {
        const withVariants = list.find(p => p.variants && p.variants.length > 0)
        const target = withVariants || list[0]
        setSearchParams({ productId: target._id }, { replace: true })
      }
    } catch (err) {
      console.error('Failed to load products list:', err)
      notify('Failed to load product catalog', 'error')
    } finally {
      setLoadingProducts(false)
    }
  }

  // Fetch active product details
  const loadProductDetail = async (prodId) => {
    if (!prodId) {
      setProduct(null)
      return
    }
    setLoadingProduct(true)
    try {
      const { data } = await api.get(`/api/stores/products/${prodId}`)
      setProduct(data)
      setInlineEdits({})
      if ((data.variants || []).length === 0 && (data.attributes || []).length === 0) {
        setActiveTab('options')
      }
    } catch (err) {
      console.error('Failed to load product:', err)
      notify(err.response?.data?.error || 'Failed to load product', 'error')
      setProduct(null)
    } finally {
      setLoadingProduct(false)
    }
  }

  useEffect(() => {
    loadAllProducts()
  }, [])

  useEffect(() => {
    if (selectedProductId) {
      loadProductDetail(selectedProductId)
    }
  }, [selectedProductId])

  const selectProduct = (p) => {
    setSearchParams({ productId: p._id })
  }

  const getAttrMap = (v) => {
    if (!v) return {}
    if (v.attributes instanceof Map) return Object.fromEntries(v.attributes)
    if (typeof v.attributes === 'object') return v.attributes
    return {}
  }

  // Toggle active status for variant
  const toggleVariantStatus = async (v) => {
    try {
      const currentActive = v.isActive !== false
      await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, {
        isActive: !currentActive
      })
      notify(`Variant marked as ${!currentActive ? 'Live' : 'Hidden'}`, 'success')
      loadProductDetail(product._id)
    } catch {
      notify('Update failed', 'error')
    }
  }

  // Delete variant with password
  const confirmDeleteVariant = async (password) => {
    if (!variantToDelete) return
    try {
      await api.delete(`/api/stores/products/${product._id}/variants/${variantToDelete._id}`, {
        headers: { 'X-Action-Password': password },
        data: { password }
      })
      notify('Variant deleted successfully', 'success')
      setVariantToDelete(null)
      loadProductDetail(product._id)
    } catch (err) {
      notify(err.response?.data?.error || 'Delete failed', 'error')
      throw err
    }
  }

  // Option / Attribute management
  const updateAttributes = async (next) => {
    try {
      await api.put(`/api/stores/products/${product._id}`, { attributes: next })
      setProduct(prev => ({ ...prev, attributes: next }))
      notify('Options updated', 'success')
      loadProductDetail(product._id)
    } catch {
      notify('Failed to save attributes', 'error')
    }
  }

  const addAttr = async (customName) => {
    const nameToAdd = (customName || attrInput || '').trim()
    if (!nameToAdd) return
    const currentAttrs = Array.isArray(product.attributes) ? product.attributes : []
    const attrNames = currentAttrs.map(a => a.split(':')[0]?.toLowerCase().trim())
    if (attrNames.includes(nameToAdd.toLowerCase())) return notify(`Option "${nameToAdd}" already exists`, 'error')

    const next = [...currentAttrs, `${nameToAdd}:`]
    await updateAttributes(next)
    setAttrInput('')
  }

  const removeAttr = async (a) => {
    const name = a.split(':')[0]
    if (!window.confirm(`Remove option "${name}" and all its values? Existing variants will keep their data, but combinations will update.`)) return
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
    const existingValues = valuesStr ? valuesStr.split(',').map(s => s.trim()).filter(Boolean) : []

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

  // Cartesian product generator for missing combinations
  const missingCombinations = useMemo(() => {
    if (!product) return []
    const attrs = (product.attributes || []).map(a => {
      const [name, valuesStr] = a.split(':')
      const values = valuesStr ? valuesStr.split(',').map(s => s.trim()).filter(Boolean) : []
      return { name, values }
    }).filter(a => a.values.length > 0)

    if (attrs.length === 0) return []

    const combine = (index, current) => {
      if (index === attrs.length) return [current]
      const result = []
      for (const val of attrs[index].values) {
        result.push(...combine(index + 1, { ...current, [attrs[index].name]: val }))
      }
      return result
    }

    const all = combine(0, {})
    const existing = (product.variants || []).map(v => {
      const vAttrs = getAttrMap(v)
      const normalized = {}
      Object.entries(vAttrs).forEach(([k, val]) => { normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim() })
      const sorted = Object.keys(normalized).sort().reduce((obj, key) => {
        obj[key] = normalized[key]
        return obj
      }, {})
      return JSON.stringify(sorted)
    })

    return all.filter(combo => {
      const normalized = {}
      Object.entries(combo).forEach(([k, val]) => { normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim() })
      const sorted = Object.keys(normalized).sort().reduce((obj, key) => {
        obj[key] = normalized[key]
        return obj
      }, {})
      return !existing.includes(JSON.stringify(sorted))
    })
  }, [product])

  const getSku = (combo) => {
    if (!product) return ''
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
        : (typeof product.images === 'string' ? product.images.split(',').map(s => s.trim()).filter(Boolean).map(url => ({ url })) : [])

      await api.post(`/api/stores/products/${product._id}/variants`, {
        attributes: combo,
        price: Number(product.price || 0),
        mrp: product.mrp ? Number(product.mrp) : undefined,
        stock: 0,
        weight: Number(product.weight || 0),
        images: images,
        sku: getSku(combo),
        isActive: true
      })
      notify('Variant added', 'success')
      loadProductDetail(product._id)
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to add variant', 'error')
    }
  }

  const addAllCombinations = async () => {
    if (!missingCombinations.length) return
    setIsGenerating(true)
    let success = 0
    const images = Array.isArray(product.images)
      ? product.images.map(img => (typeof img === 'string' ? { url: img } : img)).filter(i => i?.url)
      : (typeof product.images === 'string' ? product.images.split(',').map(s => s.trim()).filter(Boolean).map(url => ({ url })) : [])

    for (const combo of missingCombinations) {
      try {
        await api.post(`/api/stores/products/${product._id}/variants`, {
          attributes: combo,
          price: Number(product.price || 0),
          mrp: product.mrp ? Number(product.mrp) : undefined,
          stock: 0,
          weight: Number(product.weight || 0),
          images: images,
          sku: getSku(combo),
          isActive: true
        })
        success++
      } catch (e) {
        console.error("Failed to create variant:", combo, e)
      }
    }
    setIsGenerating(false)
    notify(`Created ${success} variants successfully!`, 'success')
    setActiveTab('list')
    loadProductDetail(product._id)
  }

  // Inline changes
  const handleInlineChange = (variantId, field, value) => {
    setInlineEdits(prev => ({
      ...prev,
      [variantId]: {
        ...(prev[variantId] || {}),
        [field]: value
      }
    }))
  }

  const saveInlineVariant = async (v) => {
    const edits = inlineEdits[v._id]
    if (!edits) return
    setSavingRowId(v._id)
    try {
      const payload = {
        price: edits.price !== undefined ? Number(edits.price) : Number(v.price),
        mrp: edits.mrp !== undefined ? (edits.mrp ? Number(edits.mrp) : undefined) : v.mrp,
        stock: edits.stock !== undefined ? Number(edits.stock) : Number(v.stock || 0),
        sku: edits.sku !== undefined ? edits.sku : v.sku
      }
      await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, payload)
      notify('Variant saved', 'success')
      setInlineEdits(prev => {
        const next = { ...prev }
        delete next[v._id]
        return next
      })
      loadProductDetail(product._id)
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to save variant', 'error')
    } finally {
      setSavingRowId(null)
    }
  }

  const saveAllInlineVariants = async () => {
    const variantIds = Object.keys(inlineEdits)
    if (!variantIds.length) return
    setSavingAll(true)
    let saved = 0
    for (const vid of variantIds) {
      const v = (product.variants || []).find(x => x._id === vid)
      if (!v) continue
      const edits = inlineEdits[vid]
      try {
        const payload = {
          price: edits.price !== undefined ? Number(edits.price) : Number(v.price),
          mrp: edits.mrp !== undefined ? (edits.mrp ? Number(edits.mrp) : undefined) : v.mrp,
          stock: edits.stock !== undefined ? Number(edits.stock) : Number(v.stock || 0),
          sku: edits.sku !== undefined ? edits.sku : v.sku
        }
        await api.put(`/api/stores/products/${product._id}/variants/${vid}`, payload)
        saved++
      } catch (err) {
        console.error(`Failed to save variant ${vid}:`, err)
      }
    }
    setSavingAll(false)
    setInlineEdits({})
    notify(`Saved ${saved} variants successfully!`, 'success')
    loadProductDetail(product._id)
  }

  // Bulk tools
  const handleBulkApplyPrice = async () => {
    const pVal = Number(bulkPrice)
    if (isNaN(pVal) || pVal < 0) return notify('Please enter a valid price', 'error')
    setIsBulkApplying(true)
    let count = 0
    for (const v of product.variants || []) {
      try {
        await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, { price: pVal })
        count++
      } catch (err) {}
    }
    setIsBulkApplying(false)
    setBulkPrice('')
    notify(`Updated price for ${count} variants!`, 'success')
    loadProductDetail(product._id)
  }

  const handleBulkApplyStock = async () => {
    const sVal = parseInt(bulkStock)
    if (isNaN(sVal) || sVal < 0) return notify('Please enter a valid stock quantity', 'error')
    setIsBulkApplying(true)
    let count = 0
    for (const v of product.variants || []) {
      try {
        await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, { stock: sVal })
        count++
      } catch (err) {}
    }
    setIsBulkApplying(false)
    setBulkStock('')
    notify(`Updated stock for ${count} variants!`, 'success')
    loadProductDetail(product._id)
  }

  const handleAutoGenerateSkus = async () => {
    setIsBulkApplying(true)
    let count = 0
    for (const v of product.variants || []) {
      try {
        const vAttrs = getAttrMap(v)
        const autoSku = getSku(vAttrs)
        await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, { sku: autoSku })
        count++
      } catch (err) {}
    }
    setIsBulkApplying(false)
    notify(`Generated clean SKUs for ${count} variants!`, 'success')
    loadProductDetail(product._id)
  }

  // Full variant update from modal
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
      loadProductDetail(product._id)
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update variant', 'error')
    }
  }

  // Filtered variants
  const variants = product?.variants || []
  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
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
  }, [variants, searchQuery, statusFilter])

  const totalVariantStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)
  const prices = variants.map(v => Number(v.price || 0)).filter(p => p > 0)
  const minPrice = prices.length ? Math.min(...prices) : Number(product?.price || 0)
  const maxPrice = prices.length ? Math.max(...prices) : Number(product?.price || 0)
  const unsavedCount = Object.keys(inlineEdits).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4 py-2 sm:py-4">
      {/* ─── TOP BREADCRUMB & HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/business/products"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all flex-shrink-0"
            title="Back to Products"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Product Studio</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Variants & SKUs
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Variant Management Studio
            </h1>
          </div>
        </div>

        {/* Product Quick-Select Switcher Dropdown */}
        <div className="relative w-full sm:w-80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Active Product
          </div>
          <select
            value={selectedProductId}
            onChange={(e) => {
              const val = e.target.value
              if (val) setSearchParams({ productId: val })
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            {loadingProducts ? (
              <option>Loading products...</option>
            ) : allProducts.length === 0 ? (
              <option>No products found</option>
            ) : (
              allProducts.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.variants?.length || 0} variants)
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loadingProduct ? (
        <div className="min-h-[400px] flex items-center justify-center bg-white rounded-3xl border border-slate-200/80 p-12">
          <LoadingSpinner text="Loading variant studio..." />
        </div>
      ) : !product ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="text-4xl">📦</div>
          <h2 className="text-lg font-black text-slate-800">No Product Selected</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select a product from the top dropdown or visit your product catalog to choose an item.
          </p>
          <Link
            to="/business/products"
            className="inline-flex px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            View Products Catalog
          </Link>
        </div>
      ) : (
        <>
          {/* ─── ACTIVE PRODUCT HERO BANNER ─── */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200 p-1 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0].url || product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl">📦</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate max-w-md">
                    {product.name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    product.isActive !== false
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {product.isActive !== false ? '● Active in Store' : 'Draft / Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                  <span>Base Price: <strong className="text-slate-900 font-bold">₹{Number(product.price || 0).toLocaleString()}</strong></span>
                  <span>·</span>
                  <span>Category: <strong className="text-slate-900 font-bold">{product.category?.name || 'General'}</strong></span>
                  <span>·</span>
                  <span>Brand: <strong className="text-slate-900 font-bold">{product.brand?.name || 'Standard'}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200/70 text-center flex-shrink-0">
              <div className="px-3 py-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variants</div>
                <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5">{variants.length}</div>
              </div>
              <div className="px-3 py-1 border-x border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stock</div>
                <div className={`text-base sm:text-lg font-black mt-0.5 ${totalVariantStock <= 5 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {totalVariantStock}
                </div>
              </div>
              <div className="px-3 py-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price Range</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-1">
                  ₹{minPrice} {minPrice !== maxPrice ? `– ₹${maxPrice}` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* ─── STUDIO TABS & ACTIONS TOOLBAR ─── */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📦 Variants & Stock</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'list' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {variants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('options')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'options'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚙️ Options (Size, Color...)</span>
                {missingCombinations.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 animate-pulse">
                    +{missingCombinations.length} new
                  </span>
                )}
              </button>
            </div>

            {/* Right Tools Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {unsavedCount > 0 && (
                <button
                  type="button"
                  disabled={savingAll}
                  onClick={saveAllInlineVariants}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-1.5 animate-bounce"
                >
                  <span>💾</span>
                  <span>{savingAll ? 'Saving...' : `Save All Changes (${unsavedCount})`}</span>
                </button>
              )}

              {activeTab === 'list' && variants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowBulkBar(!showBulkBar)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    showBulkBar
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>⚡</span>
                  <span>Bulk Tools</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── BULK EDIT DRAWER / TOOLBAR ─── */}
          {activeTab === 'list' && showBulkBar && (
            <div className="bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/70 border-2 border-indigo-100 rounded-2xl p-4 shadow-xs space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <span>⚡</span> Instant Bulk Operations (Applies to all {variants.length} variants)
                </span>
                <button
                  type="button"
                  onClick={() => setShowBulkBar(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Bulk Price */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <input
                    type="number"
                    placeholder="New Price (₹)..."
                    value={bulkPrice}
                    onChange={e => setBulkPrice(e.target.value)}
                    className="w-full bg-transparent px-2 text-xs font-bold outline-none text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={isBulkApplying}
                    onClick={handleBulkApplyPrice}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold uppercase whitespace-nowrap"
                  >
                    Apply Price
                  </button>
                </div>

                {/* Bulk Stock */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-100 shadow-2xs">
                  <input
                    type="number"
                    placeholder="Set Stock Units..."
                    value={bulkStock}
                    onChange={e => setBulkStock(e.target.value)}
                    className="w-full bg-transparent px-2 text-xs font-bold outline-none text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={isBulkApplying}
                    onClick={handleBulkApplyStock}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold uppercase whitespace-nowrap"
                  >
                    Apply Stock
                  </button>
                </div>

                {/* Auto Generate SKUs */}
                <div className="flex items-center">
                  <button
                    type="button"
                    disabled={isBulkApplying}
                    onClick={handleAutoGenerateSkus}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all"
                  >
                    <span>🏷️</span> Auto-Generate SKUs for All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 1: VARIANTS & STOCK LIST ══════════════ */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Filter by attribute (e.g. Red, XL) or SKU code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'live', label: 'Live' },
                    { id: 'hidden', label: 'Hidden' },
                    { id: 'in_stock', label: 'In Stock' },
                    { id: 'out_of_stock', label: 'Out of Stock' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        statusFilter === tab.id
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── DESKTOP SPREADSHEET TABLE ─── */}
              <div className="hidden lg:block bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">Photo</th>
                        <th className="py-3 px-4">Variant Attributes</th>
                        <th className="py-3 px-4 w-32">Price (₹) *</th>
                        <th className="py-3 px-4 w-28">MRP (₹)</th>
                        <th className="py-3 px-4 w-28">Stock *</th>
                        <th className="py-3 px-4 w-36">SKU Code</th>
                        <th className="py-3 px-4 w-24 text-center">Status</th>
                        <th className="py-3 px-4 w-28 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVariants.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-16 text-center text-slate-400">
                            <div className="text-3xl mb-2">🏷️</div>
                            <div className="font-bold text-slate-700">No variants match your filter</div>
                            {variants.length === 0 && (
                              <button
                                type="button"
                                onClick={() => setActiveTab('options')}
                                className="mt-3 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700"
                              >
                                Configure Options to Generate Variants →
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredVariants.map(v => {
                          const vAttrs = getAttrMap(v)
                          const edits = inlineEdits[v._id] || {}
                          const isEdited = Object.keys(edits).length > 0
                          const currentPrice = edits.price !== undefined ? edits.price : v.price
                          const currentMrp = edits.mrp !== undefined ? edits.mrp : (v.mrp || '')
                          const currentStock = edits.stock !== undefined ? edits.stock : (v.stock || 0)
                          const currentSku = edits.sku !== undefined ? edits.sku : (v.sku || '')
                          const isRowSaving = savingRowId === v._id
                          const isLive = v.isActive !== false
                          const thumb = v.images?.[0]?.url || product.images?.[0]?.url || product.images?.[0]

                          return (
                            <tr
                              key={v._id}
                              className={`transition-colors ${
                                isEdited ? 'bg-amber-50/40' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              {/* Photo thumbnail */}
                              <td className="py-3 px-4 text-center">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center mx-auto">
                                  {thumb ? (
                                    <img src={thumb} alt="" className="w-full h-full object-contain p-0.5" />
                                  ) : (
                                    <span className="text-slate-400 text-xs">📷</span>
                                  )}
                                </div>
                              </td>

                              {/* Attributes Pills */}
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(vAttrs).map(([k, val]) => (
                                    <span
                                      key={k}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-lg text-[11px] font-bold text-slate-800"
                                    >
                                      <span className="text-slate-400 font-semibold">{k}:</span>
                                      <span className="text-slate-900">{val}</span>
                                    </span>
                                  ))}
                                </div>
                                {v.weight ? (
                                  <div className="text-[10px] text-slate-400 mt-1 font-medium">
                                    Weight: {v.weight}g
                                  </div>
                                ) : null}
                              </td>

                              {/* Selling Price Inline */}
                              <td className="py-3 px-4">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                                  <input
                                    type="number"
                                    className={`w-full pl-6 pr-2 py-1.5 text-xs font-black rounded-lg border outline-none transition-all ${
                                      edits.price !== undefined
                                        ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500'
                                        : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
                                    }`}
                                    value={currentPrice}
                                    onChange={e => handleInlineChange(v._id, 'price', e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* MRP Inline */}
                              <td className="py-3 px-4">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
                                  <input
                                    type="number"
                                    placeholder="Optional"
                                    className={`w-full pl-6 pr-2 py-1.5 text-xs font-bold rounded-lg border outline-none transition-all ${
                                      edits.mrp !== undefined
                                        ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500'
                                        : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
                                    }`}
                                    value={currentMrp}
                                    onChange={e => handleInlineChange(v._id, 'mrp', e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* Stock Inline */}
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  className={`w-full px-2.5 py-1.5 text-xs font-black rounded-lg border outline-none transition-all ${
                                    edits.stock !== undefined
                                      ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500'
                                      : currentStock <= 5
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
                                  }`}
                                  value={currentStock}
                                  onChange={e => handleInlineChange(v._id, 'stock', e.target.value)}
                                />
                              </td>

                              {/* SKU Inline */}
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  placeholder="SKU Code"
                                  className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all uppercase ${
                                    edits.sku !== undefined
                                      ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500'
                                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
                                  }`}
                                  value={currentSku}
                                  onChange={e => handleInlineChange(v._id, 'sku', e.target.value)}
                                />
                              </td>

                              {/* Live/Hidden Status Toggle */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleVariantStatus(v)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                    isLive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                  }`}
                                  title="Click to toggle status"
                                >
                                  {isLive ? 'Live' : 'Hidden'}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {isEdited && (
                                    <button
                                      type="button"
                                      disabled={isRowSaving}
                                      onClick={() => saveInlineVariant(v)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase shadow-xs transition-all"
                                      title="Save row"
                                    >
                                      {isRowSaving ? '...' : 'Save'}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setEditingVariant({
                                      ...v,
                                      imageUrls: (v.images || []).map(img => (typeof img === 'string' ? img : img.url)).filter(Boolean)
                                    })}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                                    title="Edit Full Details (Photos, Weight)"
                                  >
                                    ✏️
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setVariantToDelete(v)}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Delete Variant (Password Protected)"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── MOBILE RESPONSIVE CARDS VIEW ─── */}
              <div className="lg:hidden space-y-3">
                {filteredVariants.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                    <div className="text-2xl mb-1">🏷️</div>
                    <div className="font-bold text-slate-700 text-sm">No variants found</div>
                  </div>
                ) : (
                  filteredVariants.map(v => {
                    const vAttrs = getAttrMap(v)
                    const edits = inlineEdits[v._id] || {}
                    const isEdited = Object.keys(edits).length > 0
                    const currentPrice = edits.price !== undefined ? edits.price : v.price
                    const currentMrp = edits.mrp !== undefined ? edits.mrp : (v.mrp || '')
                    const currentStock = edits.stock !== undefined ? edits.stock : (v.stock || 0)
                    const currentSku = edits.sku !== undefined ? edits.sku : (v.sku || '')
                    const isRowSaving = savingRowId === v._id
                    const isLive = v.isActive !== false
                    const thumb = v.images?.[0]?.url || product.images?.[0]?.url || product.images?.[0]

                    return (
                      <div
                        key={v._id}
                        className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3.5 transition-all ${
                          isEdited ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                        }`}
                      >
                        {/* Top: Photo, Pills, Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {thumb ? (
                                <img src={thumb} alt="" className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <span className="text-slate-400 text-xs">📷</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(vAttrs).map(([k, val]) => (
                                <span
                                  key={k}
                                  className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800"
                                >
                                  {k}: {val}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleVariantStatus(v)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isLive ? 'Live' : 'Hidden'}
                          </button>
                        </div>

                        {/* Fields Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Selling Price (₹)
                            </label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 outline-none focus:border-indigo-500"
                              value={currentPrice}
                              onChange={e => handleInlineChange(v._id, 'price', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              MRP (₹)
                            </label>
                            <input
                              type="number"
                              placeholder="Optional"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500"
                              value={currentMrp}
                              onChange={e => handleInlineChange(v._id, 'mrp', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Stock Units
                            </label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 outline-none focus:border-indigo-500"
                              value={currentStock}
                              onChange={e => handleInlineChange(v._id, 'stock', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              SKU
                            </label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 uppercase"
                              value={currentSku}
                              onChange={e => handleInlineChange(v._id, 'sku', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingVariant({
                                ...v,
                                imageUrls: (v.images || []).map(img => (typeof img === 'string' ? img : img.url)).filter(Boolean)
                              })}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                            >
                              Edit Details
                            </button>
                            <button
                              type="button"
                              onClick={() => setVariantToDelete(v)}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </div>

                          {isEdited && (
                            <button
                              type="button"
                              disabled={isRowSaving}
                              onClick={() => saveInlineVariant(v)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-xs"
                            >
                              {isRowSaving ? 'Saving...' : 'Save'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: OPTIONS & COMBINATIONS STUDIO ══════════════ */}
          {activeTab === 'options' && (
            <div className="space-y-6">
              {/* Option Presets Builder Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Define Product Options</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Options define the variations of this product (e.g. Color, Size, Storage). Each combination becomes a sellable variant with its own price, SKU, and inventory.
                  </p>
                </div>

                {/* Common Presets */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quick Preset Shortcuts:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {commonPresets.map(preset => {
                      const currentNames = (product.attributes || []).map(a => a.split(':')[0]?.toLowerCase().trim())
                      const alreadyAdded = currentNames.includes(preset.label.toLowerCase())
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addAttr(preset.label)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            alreadyAdded
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 shadow-2xs'
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.label}</span>
                          {alreadyAdded && <span className="text-[10px] text-emerald-600">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom Option Name Input */}
                <div className="flex gap-2 max-w-md pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400"
                    placeholder="Or custom option name (e.g. Finish, Pack Size)..."
                    value={attrInput}
                    onChange={e => setAttrInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addAttr()}
                  />
                  <button
                    type="button"
                    onClick={() => addAttr()}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs flex-shrink-0"
                  >
                    + Add Option
                  </button>
                </div>
              </div>

              {/* Active Defined Options Cards */}
              <div className="space-y-4">
                {Array.isArray(product.attributes) && product.attributes.length > 0 ? (
                  product.attributes.map(attr => {
                    const [name, valuesStr] = attr.split(':')
                    const values = valuesStr ? valuesStr.split(',').map(s => s.trim()).filter(Boolean) : []
                    return (
                      <div key={name} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <span className="px-3.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 font-black text-xs uppercase tracking-wider">
                              {name}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              ({values.length} {values.length === 1 ? 'value' : 'values'})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttr(attr)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Remove Option
                          </button>
                        </div>

                        {/* Values Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          {values.map(v => (
                            <span
                              key={v}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs group hover:border-slate-300"
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
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-52 placeholder-slate-400"
                              placeholder="Add value (e.g. Red, Blue)..."
                              value={valInput[name] || ''}
                              onChange={e => setValInput(prev => ({ ...prev, [name]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addAttrValue(name, valInput[name])}
                            />
                            <button
                              type="button"
                              onClick={() => addAttrValue(name, valInput[name])}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Tip: You can paste comma-separated values like <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">S, M, L, XL</code> to add them all at once.
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-slate-400 text-xs font-medium">
                    No options defined yet. Click any preset shortcut above or enter a custom option name to start.
                  </div>
                )}
              </div>

              {/* Combinations Matrix Calculator Card */}
              {Array.isArray(product.attributes) && product.attributes.filter(a => a.split(':')[1]).length > 0 && (
                <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200">
                        Matrix Studio
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">
                        {product.attributes.filter(a => a.split(':')[1]).map(a => {
                          const [name, vals] = a.split(':')
                          return `${vals.split(',').filter(Boolean).length} ${name}`
                        }).join(' × ')} = {missingCombinations.length + variants.length} Total Variations
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <strong className="text-emerald-600 font-bold">{variants.length} active</strong> in inventory · <strong className="text-amber-600 font-bold">{missingCombinations.length} ready to generate</strong>
                      </p>
                    </div>

                    {missingCombinations.length > 0 && (
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={addAllCombinations}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 flex-shrink-0"
                      >
                        <span>⚡ Generate All {missingCombinations.length} Variants</span>
                      </button>
                    )}
                  </div>

                  {/* Individual Missing Combinations Chips */}
                  {missingCombinations.length > 0 ? (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Click any combination chip below to create it individually:
                      </span>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {missingCombinations.map((combo, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => addCombination(combo)}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="text-indigo-600 font-extrabold">+</span>
                            <span>{Object.values(combo).join(' / ')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-700 font-bold">
                      <span>✓ All possible combinations are already generated and active in your catalogue!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── FULL EDIT VARIANT MODAL / DRAWER ─── */}
      {editingVariant && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[70] backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
          <form
            onSubmit={handleUpdateVariant}
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 my-auto border border-slate-100 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Edit Variant Details</h4>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {Object.entries(getAttrMap(editingVariant)).map(([k, val]) => (
                    <span key={k} className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black rounded-md uppercase">
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
                          ✕
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
                <p className="text-[10px] text-slate-400">Upload an image file or paste a direct image URL.</p>
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

      {/* Confirm Delete Variant Modal with Password Security */}
      {variantToDelete && (
        <ConfirmModal
          open={!!variantToDelete}
          title="Delete Variant?"
          message={`Are you sure you want to delete this variant? This will permanently remove its inventory.`}
          confirmText="Delete Variant"
          onConfirm={confirmDeleteVariant}
          onCancel={() => setVariantToDelete(null)}
        />
      )}
    </div>
  )
}
