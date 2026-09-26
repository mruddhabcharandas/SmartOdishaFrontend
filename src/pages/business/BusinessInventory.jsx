import React, { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ConfirmModal from '../../components/ConfirmModal'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function BusinessInventory() {
  const { notify } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustData, setAdjustData] = useState({ quantity: '', type: 'add', variantId: '' })
  const [historyProduct, setHistoryProduct] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/stores/products')
      setProducts(data || [])
    } catch (err) {
      notify('Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    const totalStock = p.variants && p.variants.length > 0
      ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0)
      : (p.stock || 0)

    if (filterType === 'out_of_stock') {
      return matchesSearch && totalStock === 0
    } else if (filterType === 'low_stock') {
      return matchesSearch && totalStock > 0 && totalStock <= 10
    } else if (filterType === 'in_stock') {
      return matchesSearch && totalStock > 10
    }
    return matchesSearch
  })

  // KPI stats
  const totalSkus = products.reduce((acc, p) => acc + (p.variants?.length || 1), 0)
  const lowStockCount = products.filter(p => {
    const stock = p.variants?.length ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : (p.stock || 0)
    return stock > 0 && stock <= 10
  }).length
  const outOfStockCount = products.filter(p => {
    const stock = p.variants?.length ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : (p.stock || 0)
    return stock === 0
  }).length
  const healthyStockCount = products.filter(p => {
    const stock = p.variants?.length ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : (p.stock || 0)
    return stock > 10
  }).length

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product)
    setAdjustData({
      quantity: '',
      type: 'add',
      variantId: product.variants && product.variants.length > 0 ? product.variants[0]._id : ''
    })
    setShowAdjustModal(true)
  }

  const handleAdjustStock = async (e) => {
    e.preventDefault()
    const qty = parseInt(adjustData.quantity)
    if (isNaN(qty) || qty <= 0) {
      notify('Please enter a valid positive quantity', 'error')
      return
    }

    try {
      const isVariant = selectedProduct.variants && selectedProduct.variants.length > 0
      const finalQty = adjustData.type === 'subtract' ? -qty : qty

      if (isVariant) {
        await api.patch(`/api/stores/products/${selectedProduct._id}/variants/${adjustData.variantId}/stock`, {
          quantity: finalQty
        })
      } else {
        await api.patch(`/api/stores/products/${selectedProduct._id}/stock`, {
          quantity: finalQty
        })
      }

      notify('Stock updated successfully', 'success')
      setShowAdjustModal(false)
      loadProducts()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update stock', 'error')
    }
  }

  const handleOpenHistory = async (product) => {
    setHistoryProduct(product)
    setHistoryLoading(true)
    setHistoryItems([])
    try {
      const { data } = await api.get(`/api/stores/products/${product._id}/stock-history`)
      setHistoryItems(data?.items || [])
    } catch (err) {
      notify('Failed to load stock history', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <LoadingSpinner text="Loading inventory data..." />
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
            Warehouse & Logistics
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time SKU quantities, automated low-stock warnings, and historical adjustments.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Tracked SKUs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalSkus}</div>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Healthy Stock</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{healthyStockCount}</div>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">Low Stock Alert</div>
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
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold">
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'in_stock', label: 'Healthy' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'out_of_stock', label: 'Out of Stock' }
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFilterType(type.id)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap ${
                filterType === type.id
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-4">Product & Specification</th>
                <th className="px-6 py-4 text-center">SKU</th>
                <th className="px-6 py-4 text-center">Available Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const totalStock = p.variants && p.variants.length > 0
                  ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0)
                  : (p.stock || 0)
                const thumb = p.images?.[0]?.url || p.images?.[0]

                return (
                  <React.Fragment key={p._id}>
                    {/* Main Product Row */}
                    <tr className="hover:bg-indigo-50/15 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-11 h-11 bg-slate-100 border border-slate-200/70 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                          {thumb ? (
                            <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">📦</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 leading-snug">{p.name}</div>
                          {p.variants && p.variants.length > 0 && (
                            <div className="text-[10px] font-black text-indigo-600 mt-0.5 uppercase tracking-wider">
                              {p.variants.length} Variants Configured
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-500">
                        {p.variants && p.variants.length > 0 ? '—' : (p.sku || 'No SKU')}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-sm text-slate-900">
                        {totalStock}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          totalStock === 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                            : totalStock <= 10
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            totalStock === 0 ? 'bg-rose-500' : totalStock <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></span>
                          {totalStock === 0 ? 'Out of Stock' : totalStock <= 10 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenHistory(p)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            History
                          </button>
                          {(!p.variants || p.variants.length === 0) && (
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors"
                            >
                              Adjust
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Variant Rows */}
                    {p.variants && p.variants.length > 0 && p.variants.map((v) => {
                      const vAttrs = v.attributes && typeof v.attributes === 'object' ? v.attributes : {}
                      const attrLabel = Object.entries(vAttrs).map(([k, val]) => `${k}: ${val}`).join(', ')
                      const vStock = v.stock || 0

                      return (
                        <tr key={v._id} className="bg-slate-50/50 hover:bg-indigo-50/20 transition-colors border-t border-slate-100/60">
                          <td className="px-6 py-3 pl-14 flex items-center gap-2">
                            <span className="text-slate-300 font-mono text-sm leading-none">↳</span>
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                            <span className="text-xs font-bold text-slate-700">{attrLabel || 'Default Variant'}</span>
                          </td>
                          <td className="px-6 py-3 text-center font-mono text-xs text-slate-500 font-semibold">{v.sku || 'No SKU'}</td>
                          <td className="px-6 py-3 text-center text-xs font-black text-slate-800">{vStock}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              vStock === 0 ? 'bg-rose-100 text-rose-700' : vStock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {vStock === 0 ? 'Out' : vStock <= 5 ? 'Low' : 'OK'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedProduct(p)
                                setAdjustData({ quantity: '', type: 'add', variantId: v._id })
                                setShowAdjustModal(true)
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all shadow-xs"
                            >
                              Quick Adjust
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="font-black text-slate-700 text-sm">No products found matching filters</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {filteredProducts.map((p) => {
          const totalStock = p.variants && p.variants.length > 0
            ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0)
            : (p.stock || 0)
          const thumb = p.images?.[0]?.url || p.images?.[0]

          return (
            <div key={p._id} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-12 h-12 bg-slate-100 border border-slate-200/70 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 leading-snug">{p.name}</div>
                  {p.variants?.length > 0 ? (
                    <div className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-wider">
                      {p.variants.length} Variants Configured
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      SKU: {p.sku || 'No SKU'}
                    </div>
                  )}
                  <div className="mt-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                      totalStock === 0
                        ? 'bg-rose-50 text-rose-700'
                        : totalStock <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {totalStock} Available
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenHistory(p)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700"
                >
                  History
                </button>
                {(!p.variants || p.variants.length === 0) && (
                  <button
                    type="button"
                    onClick={() => handleOpenAdjust(p)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    Adjust
                  </button>
                )}
              </div>

              {p.variants?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                  {p.variants.map((v) => {
                    const vAttrs = v.attributes && typeof v.attributes === 'object' ? v.attributes : {}
                    const attrLabel = Object.entries(vAttrs).map(([k, val]) => `${k}: ${val}`).join(', ')
                    return (
                      <div key={v._id} className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                          <span className="text-xs font-bold text-slate-700">{attrLabel || 'Default Variant'}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-black text-slate-900">{v.stock || 0}</span>
                          <button
                            onClick={() => {
                              setSelectedProduct(p)
                              setAdjustData({ quantity: '', type: 'add', variantId: v._id })
                              setShowAdjustModal(true)
                            }}
                            className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all shadow-xs"
                          >
                            Adjust
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {filteredProducts.length === 0 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-500">
            <div className="text-3xl mb-2">📦</div>
            <div className="font-black text-slate-700 text-sm">No products found</div>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowAdjustModal(false)}
        >
          <form
            onSubmit={handleAdjustStock}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-base">Adjust Stock Level</h3>
                <p className="text-xs text-slate-500 mt-0.5">Increment or decrement warehouse quantity</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Product</label>
                <div className="text-xs font-extrabold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {selectedProduct.name}
                </div>
              </div>

              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Variant</label>
                  <select
                    value={adjustData.variantId}
                    onChange={(e) => setAdjustData({ ...adjustData, variantId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                  >
                    {selectedProduct.variants.map((v) => {
                      const vAttrs = v.attributes && typeof v.attributes === 'object' ? v.attributes : {}
                      const label = Object.entries(vAttrs).map(([k, val]) => `${k}: ${val}`).join(', ')
                      return (
                        <option key={v._id} value={v._id}>
                          {label} (Stock: {v.stock}, SKU: {v.sku || 'No SKU'})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, type: 'add' })}
                    className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      adjustData.type === 'add'
                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    + Add Units
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, type: 'subtract' })}
                    className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      adjustData.type === 'subtract'
                        ? 'bg-white text-rose-700 shadow-xs border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    - Deduct Units
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Enter quantity to adjust"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                Submit Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Modal */}
      {historyProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setHistoryProduct(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Stock Audit Log</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{historyProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner text="Fetching audit logs..." />
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">No stock adjustment history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Target SKU</th>
                        <th className="px-4 py-3 text-center">Change</th>
                        <th className="px-4 py-3 text-left">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyItems.map((h) => (
                        <tr key={h._id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {new Date(h.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-semibold font-mono">
                            {h.variantSku ? `SKU: ${h.variantSku}` : 'Main Product'}
                          </td>
                          <td className={`px-4 py-3 text-center font-black ${h.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {h.note || 'Manual Adjustment'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

