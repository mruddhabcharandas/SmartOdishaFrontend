import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import ImageUpload from '../../components/ImageUpload'

// Industry Preset Options with Popular Value Suggestions
const PRESET_OPTIONS = [
  {
    name: 'Color',
    icon: '🎨',
    suggestions: ['Black', 'White', 'Red', 'Blue', 'Navy Blue', 'Green', 'Yellow', 'Grey', 'Pink', 'Brown', 'Beige', 'Maroon', 'Purple']
  },
  {
    name: 'Size',
    icon: '📏',
    suggestions: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size']
  },
  {
    name: 'Shoe Size',
    icon: '👟',
    suggestions: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12']
  },
  {
    name: 'Storage',
    icon: '💾',
    suggestions: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB']
  },
  {
    name: 'RAM',
    icon: '⚡',
    suggestions: ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB']
  },
  {
    name: 'Material',
    icon: '🧱',
    suggestions: ['Cotton', 'Polyester', 'Leather', 'Denim', 'Silk', 'Linen', 'Wood', 'Metal', 'Glass']
  },
  {
    name: 'Pack Size',
    icon: '📦',
    suggestions: ['Pack of 1', 'Pack of 2', 'Pack of 3', 'Pack of 4', 'Pack of 5', 'Pack of 10']
  },
  {
    name: 'Weight / Qty',
    icon: '⚖️',
    suggestions: ['100g', '250g', '500g', '1kg', '2kg', '5kg', '10kg', '500ml', '1L']
  }
]

// Safely extract plain object attributes from Mongoose Map or Object
const getAttrMap = (v) => {
  if (!v || !v.attributes) return {}
  if (v.attributes instanceof Map) return Object.fromEntries(v.attributes)
  if (typeof v.attributes === 'object') {
    if (typeof v.attributes.toObject === 'function') return v.attributes.toObject()
    return { ...v.attributes }
  }
  return {}
}

// Parse attributes from product data (handles both "Name:Val1,Val2" and "name" format)
const parseProductOptions = (prod) => {
  if (!prod) return []
  const rawAttrs = Array.isArray(prod.attributes) ? prod.attributes : []
  const optionsMap = new Map() // name -> Set of values

  rawAttrs.forEach(attrStr => {
    if (!attrStr || typeof attrStr !== 'string') return
    const colonIdx = attrStr.indexOf(':')
    if (colonIdx !== -1) {
      const name = attrStr.substring(0, colonIdx).trim()
      const vals = attrStr.substring(colonIdx + 1).split(',').map(s => s.trim()).filter(Boolean)
      if (name) {
        if (!optionsMap.has(name)) optionsMap.set(name, new Set())
        vals.forEach(v => optionsMap.get(name).add(v))
      }
    } else {
      const name = attrStr.trim()
      if (name) {
        if (!optionsMap.has(name)) optionsMap.set(name, new Set())
      }
    }
  })

  // Auto-discover values from existing variants if options have no values
  if (Array.isArray(prod.variants)) {
    prod.variants.forEach(v => {
      const vAttrs = getAttrMap(v)
      Object.entries(vAttrs).forEach(([k, val]) => {
        if (!k || val === undefined || val === null || val === '') return
        let matchedKey = null
        for (const optKey of optionsMap.keys()) {
          if (optKey.toLowerCase() === k.toLowerCase()) {
            matchedKey = optKey
            break
          }
        }
        const keyToUse = matchedKey || (k.charAt(0).toUpperCase() + k.slice(1))
        if (!optionsMap.has(keyToUse)) optionsMap.set(keyToUse, new Set())
        optionsMap.get(keyToUse).add(String(val).trim())
      })
    })
  }

  return Array.from(optionsMap.entries()).map(([name, valSet]) => ({
    name,
    values: Array.from(valSet)
  }))
}

// Format options back to strings for backend storage
const formatOptionsForSave = (optionsList) => {
  return optionsList.map(opt => {
    const cleanName = String(opt.name || '').trim()
    const cleanVals = (opt.values || []).map(v => String(v || '').trim()).filter(Boolean)
    return `${cleanName}:${cleanVals.join(',')}`
  }).filter(str => str.length > 1)
}

export default function BusinessVariants() {
  const { notify } = useToast()
  const { id: paramId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const selectedProductId = paramId || searchParams.get('productId') || ''

  // All store products for selector
  const [allProducts, setAllProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Active selected product
  const [product, setProduct] = useState(null)
  const [loadingProduct, setLoadingProduct] = useState(false)

  // Options & Values state: Array of { name: string, values: string[] }
  const [options, setOptions] = useState([])
  const [savingOptions, setSavingOptions] = useState(false)
  const [customOptionName, setCustomOptionName] = useState('')
  const [tagInputs, setTagInputs] = useState({}) // { [optionName]: currentText }

  // Studio tabs: 'list' | 'options'
  const [activeTab, setActiveTab] = useState('list')

  // Search & Filtering inside variants table
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'live' | 'hidden' | 'in_stock' | 'out_of_stock'

  // Inline edits: { [variantId]: { price, mrp, stock, sku } }
  const [inlineEdits, setInlineEdits] = useState({})
  const [savingRowId, setSavingRowId] = useState(null)
  const [savingAll, setSavingAll] = useState(false)

  // Bulk actions toolbar
  const [showBulkBar, setShowBulkBar] = useState(false)
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkMrp, setBulkMrp] = useState('')
  const [bulkStock, setBulkStock] = useState('')
  const [isBulkApplying, setIsBulkApplying] = useState(false)

  // Matrix generation defaults
  const [genPrice, setGenPrice] = useState('')
  const [genMrp, setGenMrp] = useState('')
  const [genStock, setGenStock] = useState('10')
  const [genSkuPrefix, setGenSkuPrefix] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Modals
  const [editingVariant, setEditingVariant] = useState(null)
  const [variantToDelete, setVariantToDelete] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newVariantData, setNewVariantData] = useState({
    attributes: {},
    price: '',
    mrp: '',
    stock: '10',
    sku: '',
    weight: '0',
    images: []
  })

  // Fetch all products for quick switcher
  const loadAllProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await api.get('/api/stores/products')
      const list = Array.isArray(res.data) ? res.data : []
      setAllProducts(list)

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

      // Initialize generator defaults
      setGenPrice(String(data.price || ''))
      setGenMrp(String(data.mrp || ''))

      const nameParts = (data.name || '').split(' ').filter(Boolean)
      const prefix = (nameParts.length >= 2 ? nameParts.map(p => p[0]).join('') : (data.name || 'PRD')).substring(0, 4).toUpperCase()
      setGenSkuPrefix(prefix)

      // Parse and sync options
      const parsed = parseProductOptions(data)
      setOptions(parsed)

      // If product has no variants and no options, jump to Options tab
      if ((data.variants || []).length === 0 && parsed.length === 0) {
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

  // Save options to backend (with immediate optimistic local state update)
  const saveOptionsToBackend = async (newOptions) => {
    if (!product?._id) return
    setSavingOptions(true)
    const formatted = formatOptionsForSave(newOptions)
    try {
      // Use dedicated endpoint first, fallback to standard product update
      try {
        await api.put(`/api/stores/products/${product._id}/attributes`, { attributes: formatted })
      } catch (subErr) {
        await api.put(`/api/stores/products/${product._id}`, { attributes: formatted })
      }
      setProduct(prev => prev ? { ...prev, attributes: formatted } : null)
      notify('Options saved successfully', 'success')
    } catch (err) {
      console.error('Failed to save attributes:', err)
      notify(err.response?.data?.error || 'Failed to save options to server', 'error')
    } finally {
      setSavingOptions(false)
    }
  }

  // Add Option (e.g. "Color", "Size")
  const handleAddOption = (nameToAdd) => {
    const cleanName = (nameToAdd || customOptionName || '').trim()
    if (!cleanName) return

    const lower = cleanName.toLowerCase()
    if (options.some(o => o.name.toLowerCase() === lower)) {
      notify(`Option "${cleanName}" already exists`, 'info')
      setCustomOptionName('')
      return
    }

    const nextOptions = [...options, { name: cleanName, values: [] }]
    setOptions(nextOptions)
    setCustomOptionName('')
    saveOptionsToBackend(nextOptions)
  }

  // Remove Entire Option
  const handleRemoveOption = (optName) => {
    if (!window.confirm(`Are you sure you want to remove option "${optName}"? Existing variants will keep their data, but combinations will update.`)) {
      return
    }
    const nextOptions = options.filter(o => o.name.toLowerCase() !== optName.toLowerCase())
    setOptions(nextOptions)
    saveOptionsToBackend(nextOptions)
  }

  // Add Tag / Value to an Option (supports comma separated e.g. "Red, Blue, Green")
  const handleAddValueToOption = (optName, rawVal) => {
    const clean = (rawVal || '').trim()
    if (!clean) return

    const newValues = clean.split(',').map(s => s.trim()).filter(Boolean)
    if (newValues.length === 0) return

    let addedCount = 0
    const nextOptions = options.map(opt => {
      if (opt.name.toLowerCase() === optName.toLowerCase()) {
        const existingSet = new Set(opt.values.map(v => v.toLowerCase()))
        const toAdd = newValues.filter(v => !existingSet.has(v.toLowerCase()))
        addedCount = toAdd.length
        return {
          ...opt,
          values: [...opt.values, ...toAdd]
        }
      }
      return opt
    })

    if (addedCount === 0) {
      notify('Value already exists in this option', 'info')
      setTagInputs(prev => ({ ...prev, [optName]: '' }))
      return
    }

    setOptions(nextOptions)
    setTagInputs(prev => ({ ...prev, [optName]: '' }))
    saveOptionsToBackend(nextOptions)
  }

  // Remove Tag / Value from an Option
  const handleRemoveValueFromOption = (optName, valToRemove) => {
    const nextOptions = options.map(opt => {
      if (opt.name.toLowerCase() === optName.toLowerCase()) {
        return {
          ...opt,
          values: opt.values.filter(v => v.toLowerCase() !== valToRemove.toLowerCase())
        }
      }
      return opt
    })
    setOptions(nextOptions)
    saveOptionsToBackend(nextOptions)
  }

  // Cartesian Product Generator for Combinations
  const missingCombinations = useMemo(() => {
    if (!product) return []
    const activeOpts = options.filter(o => o.values && o.values.length > 0)
    if (activeOpts.length === 0) return []

    const combine = (index, current) => {
      if (index === activeOpts.length) return [current]
      const result = []
      for (const val of activeOpts[index].values) {
        result.push(...combine(index + 1, { ...current, [activeOpts[index].name]: val }))
      }
      return result
    }

    const all = combine(0, {})

    // Map existing variants attributes
    const existing = (product.variants || []).map(v => {
      const vAttrs = getAttrMap(v)
      const normalized = {}
      Object.entries(vAttrs).forEach(([k, val]) => {
        normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim()
      })
      return JSON.stringify(Object.keys(normalized).sort().reduce((acc, k) => {
        acc[k] = normalized[k]
        return acc
      }, {}))
    })

    return all.filter(combo => {
      const normalized = {}
      Object.entries(combo).forEach(([k, val]) => {
        normalized[k.toLowerCase().trim()] = String(val).toLowerCase().trim()
      })
      const keyStr = JSON.stringify(Object.keys(normalized).sort().reduce((acc, k) => {
        acc[k] = normalized[k]
        return acc
      }, {}))
      return !existing.includes(keyStr)
    })
  }, [product, options])

  // Generate structured SKU for a combination
  const getSkuForCombination = (combo) => {
    if (!product) return ''
    const prefix = genSkuPrefix.trim() || 'PRD'
    const valuesPart = Object.values(combo).map(val =>
      String(val).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5)
    ).filter(Boolean).join('-')
    return `${prefix}-${valuesPart}`
  }

  // Add a single missing combination as a variant
  const handleAddSingleCombination = async (combo) => {
    try {
      const price = Number(genPrice || product.price || 0)
      const mrp = genMrp ? Number(genMrp) : undefined
      const stock = Number(genStock || 10)
      const sku = getSkuForCombination(combo)
      const images = Array.isArray(product.images)
        ? product.images.map(i => (typeof i === 'string' ? { url: i } : i)).filter(i => i?.url)
        : []

      await api.post(`/api/stores/products/${product._id}/variants`, {
        attributes: combo,
        price,
        mrp,
        stock,
        weight: Number(product.weight || 0),
        images,
        sku,
        isActive: true
      })
      notify(`Variant ${Object.values(combo).join(' / ')} added!`, 'success')
      loadProductDetail(product._id)
    } catch (err) {
      notify(err.response?.data?.error || err.response?.data?.message || 'Failed to add variant', 'error')
    }
  }

  // Generate All Missing Combinations in 1-Click
  const handleGenerateAllCombinations = async () => {
    if (!missingCombinations.length) return
    setIsGenerating(true)
    let created = 0
    const price = Number(genPrice || product.price || 0)
    const mrp = genMrp ? Number(genMrp) : undefined
    const stock = Number(genStock || 10)
    const images = Array.isArray(product.images)
      ? product.images.map(i => (typeof i === 'string' ? { url: i } : i)).filter(i => i?.url)
      : []

    for (const combo of missingCombinations) {
      try {
        await api.post(`/api/stores/products/${product._id}/variants`, {
          attributes: combo,
          price,
          mrp,
          stock,
          weight: Number(product.weight || 0),
          images,
          sku: getSkuForCombination(combo),
          isActive: true
        })
        created++
      } catch (err) {
        console.error('Failed to create variant combination:', combo, err)
      }
    }

    setIsGenerating(false)
    notify(`Successfully generated ${created} new variants!`, 'success')
    setActiveTab('list')
    loadProductDetail(product._id)
  }

  // Inline Spreadsheet edits
  const handleInlineChange = (variantId, field, val) => {
    setInlineEdits(prev => ({
      ...prev,
      [variantId]: {
        ...(prev[variantId] || {}),
        [field]: val
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
      notify(err.response?.data?.error || err.response?.data?.message || 'Failed to save variant', 'error')
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

  // Toggle Live / Hidden Status
  const toggleVariantStatus = async (v) => {
    try {
      const currentActive = v.isActive !== false
      await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, {
        isActive: !currentActive
      })
      notify(`Variant marked as ${!currentActive ? 'Live' : 'Hidden'}`, 'success')
      loadProductDetail(product._id)
    } catch {
      notify('Failed to update status', 'error')
    }
  }

  // Bulk Apply Price
  const handleBulkApplyPrice = async () => {
    const pVal = Number(bulkPrice)
    if (isNaN(pVal) || pVal < 0) return notify('Please enter a valid price', 'error')
    setIsBulkApplying(true)
    let count = 0
    for (const v of product.variants || []) {
      try {
        const payload = { price: pVal }
        if (bulkMrp) payload.mrp = Number(bulkMrp)
        await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, payload)
        count++
      } catch (err) {}
    }
    setIsBulkApplying(false)
    setBulkPrice('')
    setBulkMrp('')
    notify(`Updated price for ${count} variants!`, 'success')
    loadProductDetail(product._id)
  }

  // Bulk Apply Stock
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

  // Auto Generate SKUs
  const handleAutoGenerateSkus = async () => {
    setIsBulkApplying(true)
    let count = 0
    for (const v of product.variants || []) {
      try {
        const vAttrs = getAttrMap(v)
        const autoSku = getSkuForCombination(vAttrs)
        await api.put(`/api/stores/products/${product._id}/variants/${v._id}`, { sku: autoSku })
        count++
      } catch (err) {}
    }
    setIsBulkApplying(false)
    notify(`Generated structured SKUs for ${count} variants!`, 'success')
    loadProductDetail(product._id)
  }

  // Delete Variant with Password Confirmation
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

  // Full Variant Update from Modal
  const handleUpdateVariantModal = async (e) => {
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
        images
      })
      notify('Variant details updated', 'success')
      setEditingVariant(null)
      loadProductDetail(product._id)
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update variant', 'error')
    }
  }

  // Add Custom Single Variant Submit
  const handleCreateSingleVariant = async (e) => {
    e.preventDefault()
    try {
      const price = Number(newVariantData.price || product.price || 0)
      const mrp = newVariantData.mrp ? Number(newVariantData.mrp) : undefined
      const stock = Number(newVariantData.stock || 0)
      const sku = newVariantData.sku || getSkuForCombination(newVariantData.attributes)
      const images = (newVariantData.images || []).map(url => ({ url }))

      await api.post(`/api/stores/products/${product._id}/variants`, {
        attributes: newVariantData.attributes,
        price,
        mrp,
        stock,
        sku,
        weight: Number(newVariantData.weight || product.weight || 0),
        images,
        isActive: true
      })
      notify('Custom variant added successfully!', 'success')
      setShowAddModal(false)
      setNewVariantData({
        attributes: {},
        price: '',
        mrp: '',
        stock: '10',
        sku: '',
        weight: '0',
        images: []
      })
      loadProductDetail(product._id)
    } catch (err) {
      notify(err.response?.data?.error || err.response?.data?.message || 'Failed to add variant', 'error')
    }
  }

  // Filtered variants
  const variants = product?.variants || []
  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
      const vAttrs = getAttrMap(v)
      const attrString = Object.entries(vAttrs).map(([k, val]) => `${k} ${val}`).join(' ').toLowerCase()
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
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4 py-2 sm:py-4 font-sans text-slate-800">
      {/* ─── TOP BREADCRUMB & HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/business/products"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all flex-shrink-0 font-bold"
            title="Back to Products"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Product Studio</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Industry Variant Manager
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
            Active Store Product
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
            Select a product from the dropdown above or visit your product catalog to choose an item.
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
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {product.category?.name || 'General Product'}
                  </span>
                  {product.brand?.name && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-semibold text-slate-500">{product.brand.name}</span>
                    </>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    product.isActive !== false
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {product.isActive !== false ? 'Live on Store' : 'Draft / Inactive'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 truncate mt-1">
                  {product.name}
                </h2>
                <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-3">
                  <span>Base Price: <strong className="text-slate-800 font-bold">₹{product.originalStorePrice ?? product.price}</strong></span>
                  {product.mrp && <span>MRP: <strong className="text-slate-500 line-through">₹{product.mrp}</strong></span>}
                  {product.sku && <span>SKU: <strong className="font-mono text-slate-700">{product.sku}</strong></span>}
                </div>
              </div>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 flex-shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variants</div>
                <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5">{variants.length}</div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stock</div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{totalVariantStock}</div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price Range</div>
                <div className="text-xs sm:text-sm font-black text-emerald-700 mt-1">
                  {minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice}–${maxPrice}`}
                </div>
              </div>
            </div>
          </div>

          {/* ─── STUDIO TABS NAVIGATION BAR ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'list'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>📦 Variants & Inventory</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'list' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {variants.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('options')}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'options'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>⚙️ Options & Matrix</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'options' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {options.length}
                </span>
                {missingCombinations.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Combinations ready to generate" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {activeTab === 'list' && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowBulkBar(!showBulkBar)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      showBulkBar
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ⚡ Bulk Actions {showBulkBar ? '▲' : '▼'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Prepopulate default attributes with first value of each option
                      const initAttrs = {}
                      options.forEach(opt => {
                        if (opt.values && opt.values.length > 0) {
                          initAttrs[opt.name] = opt.values[0]
                        }
                      })
                      setNewVariantData({
                        attributes: initAttrs,
                        price: String(product.price || ''),
                        mrp: String(product.mrp || ''),
                        stock: '10',
                        sku: '',
                        weight: String(product.weight || '0'),
                        images: []
                      })
                      setShowAddModal(true)
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>➕</span> Add Custom Variant
                  </button>
                </>
              )}

              {unsavedCount > 0 && (
                <button
                  type="button"
                  disabled={savingAll}
                  onClick={saveAllInlineVariants}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 animate-pulse"
                >
                  <span>💾</span> {savingAll ? 'Saving...' : `Save All (${unsavedCount})`}
                </button>
              )}
            </div>
          </div>

          {/* ══════════════ TAB 1: VARIANTS LIST & SPREADSHEET ══════════════ */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Bulk Actions Panel */}
              {showBulkBar && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      ⚡ Bulk Actions Across All {variants.length} Variants
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBulkBar(false)}
                      className="text-amber-800 hover:text-amber-950 font-bold text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Bulk Price */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700">Set Price for All Variants:</div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Price (₹)"
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                          value={bulkPrice}
                          onChange={e => setBulkPrice(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={isBulkApplying}
                          onClick={handleBulkApplyPrice}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all flex-shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    {/* Bulk Stock */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700">Set Stock Units for All:</div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Stock count"
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                          value={bulkStock}
                          onChange={e => setBulkStock(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={isBulkApplying}
                          onClick={handleBulkApplyStock}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all flex-shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    {/* Auto SKUs */}
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 flex flex-col justify-between">
                      <div className="text-[11px] font-bold text-slate-700">Auto-Generate Clean SKUs:</div>
                      <button
                        type="button"
                        disabled={isBulkApplying}
                        onClick={handleAutoGenerateSkus}
                        className="w-full mt-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs"
                      >
                        Auto-Format SKUs (e.g. PRD-RED-XL)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters & Search Toolbar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by attribute or SKU..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Variants' },
                    { id: 'live', label: 'Live' },
                    { id: 'hidden', label: 'Hidden' },
                    { id: 'in_stock', label: 'In Stock' },
                    { id: 'out_of_stock', label: 'Out of Stock' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${
                        statusFilter === f.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DESKTOP SPREADSHEET TABLE */}
              <div className="hidden lg:block bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4 w-12">#</th>
                        <th className="py-3 px-4">Variant Attributes</th>
                        <th className="py-3 px-4 w-36">Selling Price (₹)</th>
                        <th className="py-3 px-4 w-32">MRP (₹)</th>
                        <th className="py-3 px-4 w-28">Stock</th>
                        <th className="py-3 px-4 w-44">SKU</th>
                        <th className="py-3 px-4 text-center w-24">Status</th>
                        <th className="py-3 px-4 text-right w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVariants.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-slate-400 font-medium">
                            <div className="text-3xl mb-1">🏷️</div>
                            No variants match your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredVariants.map((v, idx) => {
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
                                isEdited ? 'bg-amber-50/40' : 'hover:bg-indigo-50/15'
                              }`}
                            >
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              {/* Attributes & Image */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {thumb ? (
                                      <img src={thumb} alt="" className="w-full h-full object-contain p-0.5" />
                                    ) : (
                                      <span className="text-slate-400 text-xs">📷</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {Object.entries(vAttrs).map(([k, val]) => (
                                      <span
                                        key={k}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-800"
                                      >
                                        <span className="text-slate-400 font-semibold mr-1">{k}:</span>
                                        <span>{val}</span>
                                      </span>
                                    ))}
                                    {Object.keys(vAttrs).length === 0 && (
                                      <span className="text-slate-400 italic text-xs">Standard Variant</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Price Inline */}
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  className={`w-full px-2.5 py-1.5 text-xs font-black rounded-lg border outline-none transition-all ${
                                    edits.price !== undefined
                                      ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500'
                                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
                                  }`}
                                  value={currentPrice}
                                  onChange={e => handleInlineChange(v._id, 'price', e.target.value)}
                                />
                              </td>

                              {/* MRP Inline */}
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  placeholder="Optional"
                                  className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border outline-none transition-all ${
                                    edits.mrp !== undefined
                                      ? 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-500'
                                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'
                                  }`}
                                  value={currentMrp}
                                  onChange={e => handleInlineChange(v._id, 'mrp', e.target.value)}
                                />
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

                              {/* Status Toggle */}
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
                                    title="Edit Details (Photos, Weight)"
                                  >
                                    ✏️
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setVariantToDelete(v)}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Delete Variant"
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

              {/* MOBILE CARDS VIEW */}
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

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Price (₹)
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Define Product Options</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add options like Color, Size, Storage, or Material. Each option contains multiple values that combine into sellable variants.
                    </p>
                  </div>
                  {savingOptions && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                      Saving to server...
                    </div>
                  )}
                </div>

                {/* Common Presets Shortcuts */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Quick Preset Shortcuts:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_OPTIONS.map(preset => {
                      const alreadyAdded = options.some(o => o.name.toLowerCase() === preset.name.toLowerCase())
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddOption(preset.name)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            alreadyAdded
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 shadow-2xs'
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.name}</span>
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
                    placeholder="Enter custom option name (e.g. Finish, Pack Size)..."
                    value={customOptionName}
                    onChange={e => setCustomOptionName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddOption()}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs flex-shrink-0"
                  >
                    + Add Option
                  </button>
                </div>
              </div>

              {/* Active Defined Options Cards */}
              <div className="space-y-4">
                {options.length > 0 ? (
                  options.map(opt => {
                    const preset = PRESET_OPTIONS.find(p => p.name.toLowerCase() === opt.name.toLowerCase())
                    const unusedSuggestions = preset
                      ? preset.suggestions.filter(s => !opt.values.some(v => v.toLowerCase() === s.toLowerCase()))
                      : []

                    return (
                      <div key={opt.name} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            {preset?.icon && <span className="text-base">{preset.icon}</span>}
                            <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                              {opt.name}
                            </span>
                            <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                              {opt.values.length} {opt.values.length === 1 ? 'value' : 'values'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.name)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Remove Option
                          </button>
                        </div>

                        {/* Value Tags Container */}
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {opt.values.map(val => (
                              <span
                                key={val}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 rounded-xl text-xs font-black text-indigo-900 shadow-2xs group hover:border-indigo-300"
                              >
                                <span>{val}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveValueFromOption(opt.name, val)}
                                  className="text-indigo-400 hover:text-rose-600 font-bold ml-1 transition-colors"
                                  title="Remove value"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}

                            {/* Tag Input */}
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="text"
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-56 placeholder-slate-400"
                                placeholder="Type value & press Enter or Comma (,)..."
                                value={tagInputs[opt.name] || ''}
                                onChange={e => {
                                  const text = e.target.value
                                  if (text.includes(',')) {
                                    handleAddValueToOption(opt.name, text)
                                  } else {
                                    setTagInputs(prev => ({ ...prev, [optName]: text }))
                                  }
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddValueToOption(opt.name, tagInputs[opt.name])
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddValueToOption(opt.name, tagInputs[opt.name])}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
                              >
                                + Add Tag
                              </button>
                            </div>
                          </div>

                          {/* Suggested Value Chips */}
                          {unusedSuggestions.length > 0 && (
                            <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Suggestions:</span>
                              {unusedSuggestions.slice(0, 8).map(sug => (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => handleAddValueToOption(opt.name, sug)}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[11px] font-bold border border-slate-200 transition-colors"
                                >
                                  + {sug}
                                </button>
                              ))}
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 font-medium pt-1">
                            Tip: You can paste comma-separated values like <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">S, M, L, XL</code> to add multiple tags at once.
                          </p>
                        </div>
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
              {options.filter(o => o.values && o.values.length > 0).length > 0 && (
                <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200">
                        Matrix Studio
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">
                        {options.filter(o => o.values.length > 0).map(o => `${o.values.length} ${o.name}`).join(' × ')} = {missingCombinations.length + variants.length} Total Variations
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <strong className="text-emerald-600 font-bold">{variants.length} active</strong> in catalog · <strong className="text-amber-600 font-bold">{missingCombinations.length} ready to generate</strong>
                      </p>
                    </div>

                    {missingCombinations.length > 0 && (
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={handleGenerateAllCombinations}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 flex-shrink-0"
                      >
                        <span>{isGenerating ? '⚡ Generating...' : `⚡ Generate All ${missingCombinations.length} Variants`}</span>
                      </button>
                    )}
                  </div>

                  {/* Generation Defaults Settings Bar */}
                  {missingCombinations.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Defaults for Generated Variants:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Selling Price (₹)</label>
                          <input
                            type="number"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                            value={genPrice}
                            onChange={e => setGenPrice(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">MRP (₹, Optional)</label>
                          <input
                            type="number"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                            value={genMrp}
                            onChange={e => setGenMrp(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Initial Stock Units</label>
                          <input
                            type="number"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                            value={genStock}
                            onChange={e => setGenStock(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">SKU Prefix</label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 uppercase"
                            value={genSkuPrefix}
                            onChange={e => setGenSkuPrefix(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Missing Combinations Chips */}
                  {missingCombinations.length > 0 ? (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Click any combination chip below to create it individually:
                      </span>
                      <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                        {missingCombinations.map((combo, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAddSingleCombination(combo)}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="text-indigo-600 font-extrabold">+</span>
                            <span>{Object.values(combo).join(' / ')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-700 font-bold">
                      <span>✓ All possible combinations are already generated and active in your catalog!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── MODAL: FULL EDIT VARIANT DETAILS ─── */}
      {editingVariant && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[70] backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
          <form
            onSubmit={handleUpdateVariantModal}
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

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Selling Price (₹)*</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={editingVariant.price || ''}
                  onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">MRP (₹, Optional)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={editingVariant.mrp || ''}
                  onChange={e => setEditingVariant({ ...editingVariant, mrp: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Stock Inventory*</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={editingVariant.stock != null ? editingVariant.stock : ''}
                  onChange={e => setEditingVariant({ ...editingVariant, stock: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Weight (Grams)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  value={editingVariant.weight || ''}
                  onChange={e => setEditingVariant({ ...editingVariant, weight: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">SKU</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold"
                  value={editingVariant.sku || ''}
                  onChange={e => setEditingVariant({ ...editingVariant, sku: e.target.value })}
                />
              </div>
            </div>

            {/* Photos for this variant */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 block">Variant Specific Photos</label>
              <div className="flex flex-wrap gap-2 items-center">
                {(editingVariant.imageUrls || []).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                    <button
                      type="button"
                      onClick={() => setEditingVariant({
                        ...editingVariant,
                        imageUrls: editingVariant.imageUrls.filter((_, idx) => idx !== i)
                      })}
                      className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <ImageUpload
                  onUploaded={url => setEditingVariant({
                    ...editingVariant,
                    imageUrls: [...(editingVariant.imageUrls || []), url]
                  })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: ADD CUSTOM SINGLE VARIANT ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[70] backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateSingleVariant}
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 my-auto border border-slate-100 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Add Custom Variant</h4>
                <p className="text-xs text-slate-400 mt-0.5">Define attributes and pricing for this specific variant.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Dynamic Attributes Inputs based on Defined Options */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-700 block">Variant Option Attributes:</span>
              {options.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {options.map(opt => (
                    <div key={opt.name}>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        {opt.name}
                      </label>
                      {opt.values && opt.values.length > 0 ? (
                        <select
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                          value={newVariantData.attributes[opt.name] || opt.values[0] || ''}
                          onChange={e => setNewVariantData({
                            ...newVariantData,
                            attributes: { ...newVariantData.attributes, [opt.name]: e.target.value }
                          })}
                        >
                          {opt.values.map(val => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={`Enter ${opt.name}`}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                          value={newVariantData.attributes[opt.name] || ''}
                          onChange={e => setNewVariantData({
                            ...newVariantData,
                            attributes: { ...newVariantData.attributes, [opt.name]: e.target.value }
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="text-slate-500">No options defined yet. Add an attribute name and value:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Option Name (e.g. Color)"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      id="customAttrName"
                    />
                    <input
                      type="text"
                      placeholder="Option Value (e.g. Red)"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      id="customAttrVal"
                      onChange={e => {
                        const k = document.getElementById('customAttrName')?.value || 'Option'
                        setNewVariantData({
                          ...newVariantData,
                          attributes: { [k]: e.target.value }
                        })
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Selling Price (₹)*</label>
                <input
                  type="number"
                  required
                  placeholder={String(product.price)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  value={newVariantData.price}
                  onChange={e => setNewVariantData({ ...newVariantData, price: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">MRP (₹, Optional)</label>
                <input
                  type="number"
                  placeholder={String(product.mrp || '')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  value={newVariantData.mrp}
                  onChange={e => setNewVariantData({ ...newVariantData, mrp: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Stock Units*</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  value={newVariantData.stock}
                  onChange={e => setNewVariantData({ ...newVariantData, stock: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">SKU (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold text-slate-900"
                  value={newVariantData.sku}
                  onChange={e => setNewVariantData({ ...newVariantData, sku: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm"
              >
                Create Variant
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: DELETE CONFIRMATION WITH PASSWORD ─── */}
      {variantToDelete && (
        <ConfirmModal
          isOpen={!!variantToDelete}
          title="Delete Product Variant"
          message={`Are you sure you want to permanently delete this variant (${Object.values(getAttrMap(variantToDelete)).join(' / ') || variantToDelete.sku})? This cannot be undone.`}
          confirmText="Delete Variant"
          confirmType="danger"
          requirePassword={true}
          onConfirm={confirmDeleteVariant}
          onClose={() => setVariantToDelete(null)}
        />
      )}
    </div>
  )
}
