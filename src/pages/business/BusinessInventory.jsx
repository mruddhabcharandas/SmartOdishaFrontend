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
  const [filterType, setFilterType] = useState('all') // 'all', 'low_stock', 'out_of_stock'
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

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Check main or variant stock
    const totalStock = p.variants && p.variants.length > 0 
      ? p.variants.reduce((acc, v) => acc + v.stock, 0)
      : p.stock

    if (filterType === 'out_of_stock') {
      return matchesSearch && totalStock === 0
    } else if (filterType === 'low_stock') {
      return matchesSearch && totalStock > 0 && totalStock <= 10
    }
    return matchesSearch
  })

  // Open adjust stock modal
  const handleOpenAdjust = (product) => {
    setSelectedProduct(product)
    setAdjustData({
      quantity: '',
      type: 'add',
      variantId: product.variants && product.variants.length > 0 ? product.variants[0]._id : ''
    })
    setShowAdjustModal(true)
  }

  // Adjust stock API call
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

  // Open stock history modal
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
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner text="Loading inventory data..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total SKUs</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">
              {products.reduce((acc, p) => acc + (p.variants?.length || 1), 0)}
            </div>
          </div>
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg font-bold">📦</div>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Low Stock Items</div>
            <div className="text-2xl font-extrabold text-red-600 mt-1">
              {products.filter(p => {
                const stock = p.variants && p.variants.length > 0 
                  ? p.variants.reduce((acc, v) => acc + v.stock, 0)
                  : p.stock
                return stock > 0 && stock <= 10
              }).length}
            </div>
          </div>
          <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-lg font-bold">⚠️</div>
        </div>
        <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Out of Stock</div>
            <div className="text-2xl font-extrabold text-slate-500 mt-1">
              {products.filter(p => {
                const stock = p.variants && p.variants.length > 0 
                  ? p.variants.reduce((acc, v) => acc + v.stock, 0)
                  : p.stock
                return stock === 0
              }).length}
            </div>
          </div>
          <div className="h-10 w-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center text-lg font-bold">🛑</div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search catalog by name/SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {['all', 'low_stock', 'out_of_stock'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                filterType === type 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'bg-slate-50 border text-slate-600 hover:bg-slate-100'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b">
              <tr>
                <th className="px-6 py-4 text-left">Product & Attributes</th>
                <th className="px-6 py-4 text-center">SKU</th>
                <th className="px-6 py-4 text-center">Current Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((p) => {
                const totalStock = p.variants && p.variants.length > 0 
                  ? p.variants.reduce((acc, v) => acc + v.stock, 0)
                  : p.stock

                return (
                  <React.Fragment key={p._id}>
                    {/* Main Product Row */}
                    <tr className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 border rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt="" className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-lg">📦</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">{p.name}</div>
                          {p.variants && p.variants.length > 0 && (
                            <div className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-wider">
                              {p.variants.length} Variants Configured
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-500">
                        {p.variants && p.variants.length > 0 ? '—' : (p.sku || 'No SKU')}
                      </td>
                      <td className="px-6 py-4 text-center font-extrabold text-sm text-slate-800">
                        {totalStock}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          totalStock === 0 
                            ? 'bg-red-50 text-red-600 border border-red-100' 
                            : totalStock <= 10 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {totalStock === 0 ? 'Out of Stock' : totalStock <= 10 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenHistory(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border hover:bg-slate-50 transition-all"
                        >
                          History
                        </button>
                        {(!p.variants || p.variants.length === 0) && (
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all border border-blue-100"
                          >
                            Adjust Stock
                          </button>
                        )}
                      </td>
                    </tr>
                    
                    {/* Variant Rows (if any) */}
                    {p.variants && p.variants.length > 0 && p.variants.map((v) => {
                      const vAttrs = (v.attributes && typeof v.attributes === 'object' && !(v.attributes instanceof Map))
                        ? v.attributes
                        : (v.attributes instanceof Map ? Object.fromEntries(v.attributes) : {})
                      const attrLabel = Object.entries(vAttrs).map(([k, val]) => `${k}: ${val}`).join(', ')

                      return (
                        <tr key={v._id} className="bg-slate-50/30 hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3 pl-16 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            <span className="text-xs font-bold text-slate-600">{attrLabel || 'Default Variant'}</span>
                          </td>
                          <td className="px-6 py-3 text-center font-mono text-xs text-slate-500 font-semibold">{v.sku || 'No SKU'}</td>
                          <td className="px-6 py-3 text-center text-xs font-bold text-slate-700">{v.stock}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              v.stock === 0 ? 'bg-red-100 text-red-700' : v.stock <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {v.stock === 0 ? 'Out' : v.stock <= 5 ? 'Low' : 'OK'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedProduct(p)
                                setAdjustData({
                                  quantity: '',
                                  type: 'add',
                                  variantId: v._id
                                })
                                setShowAdjustModal(true)
                              }}
                              className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
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
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">
                    No products found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <form onSubmit={handleAdjustStock} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Adjust Product Stock</h3>
              <button type="button" onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-800 transition-colors p-1 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-1">Product</label>
                <div className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">{selectedProduct.name}</div>
              </div>

              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-1">Select Variant</label>
                  <select
                    value={adjustData.variantId}
                    onChange={(e) => setAdjustData({ ...adjustData, variantId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    {selectedProduct.variants.map((v) => {
                      const vAttrs = (v.attributes && typeof v.attributes === 'object' && !(v.attributes instanceof Map)) ? v.attributes : (v.attributes instanceof Map ? Object.fromEntries(v.attributes) : {})
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
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-1">Adjustment Type</label>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, type: 'add' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                      adjustData.type === 'add' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustData({ ...adjustData, type: 'subtract' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                      adjustData.type === 'subtract' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Reduce Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Enter adjustment amount"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                Submit Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Modal */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Stock History</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{historyProduct.name}</p>
              </div>
              <button type="button" onClick={() => setHistoryProduct(null)} className="text-gray-400 hover:text-gray-800 transition-colors p-1 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner text="Fetching transaction logs..." />
                </div>
              ) : historyItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">No stock adjustment history logs found for this product.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">SKU/Attributes</th>
                        <th className="px-4 py-3 text-center">Change</th>
                        <th className="px-4 py-3 text-left">Note/Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {historyItems.map((h) => {
                        return (
                          <tr key={h._id} className="hover:bg-slate-50/40 transition-colors text-xs">
                            <td className="px-4 py-3 text-slate-500">
                              {new Date(h.createdAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-semibold">
                              {h.variantSku ? `SKU: ${h.variantSku}` : 'Main Product'}
                            </td>
                            <td className={`px-4 py-3 text-center font-extrabold ${h.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                            </td>
                            <td className="px-4 py-3 text-slate-500 leading-tight">
                              {h.note || 'Manual Adjustment'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border hover:bg-slate-50"
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
