import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

/** Rows for SKU dropdown (same shape as previous inline useMemo). */
function buildSkuRows(selectedProduct) {
  if (!selectedProduct) return []
  const list = []
  if (selectedProduct.variants && selectedProduct.variants.length > 0) {
    selectedProduct.variants.forEach(v => {
      const vAttrs = (v.attributes && typeof v.attributes === 'object' && !(v.attributes instanceof Map))
        ? v.attributes
        : (v.attributes instanceof Map ? Object.fromEntries(v.attributes) : {})
      const attrLabel = Object.entries(vAttrs).map(([k, val]) => `${k}: ${val}`).join(', ')
      list.push({
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        sku: v.sku,
        attrLabel,
        image: v.images?.[0]?.url || selectedProduct.images?.[0]?.url,
        stock: v.stock,
        isVariant: true,
        variantId: v._id,
      })
    })
  } else {
    list.push({
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku || '',
      image: selectedProduct.images?.[0]?.url,
      stock: selectedProduct.stock,
      isVariant: false,
    })
  }
  return list
}

/** Parse `/api/inventory/overview` row id → product ObjectId + optional variant SKU. */
function parseOverviewItemId(raw) {
  const s = String(raw || '')
  const m = s.match(/^([a-f\d]{24})_(.*)$/i)
  if (m) return { productId: m[1], variantSku: m[2] || '' }
  if (/^[a-f\d]{24}$/i.test(s)) return { productId: s, variantSku: '' }
  return { productId: s, variantSku: '' }
}

function skuHintLine(p) {
  const brand = p.brand?.name || p.brand
  const cat = p.category?.name || p.category
  const bits = [brand, cat].filter(Boolean)
  const sku = p.sku || (Array.isArray(p.variants) ? p.variants.find(v => v.sku)?.sku : '') || ''
  const tail = sku ? `SKU: ${sku}` : ''
  return [bits.join(' · '), tail].filter(Boolean).join(' · ') || '—'
}

export default function InventoryPage() {
  const { notify } = useToast()
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [activeCatalogProduct, setActiveCatalogProduct] = useState(null)
  const [bulkQuantities, setBulkQuantities] = useState({})
  const [bulkNote, setBulkNote] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ kpis: { totalSkus:0, totalUnits:0, lowStockCount:0, totalAdded30d:0 }, daily: [], topProducts: [], lowStock: [] })
  const [overview, setOverview] = useState([])
  const [showSkuModal, setShowSkuModal] = useState(false)
  const [selectedProductForSkuView, setSelectedProductForSkuView] = useState(null)
  const [topSkus, setTopSkus] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [hist, sum, over] = await Promise.all([
        api.get('/api/inventory/history', { params: { limit: 20 } }),
        api.get('/api/inventory/summary', { params: { days: 30 } }),
        api.get('/api/inventory/overview')
      ])
      setHistory(hist.data?.items || [])
      setSummary(sum.data)
      setOverview(over.data?.items || [])
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (selectedProductForSkuView) {
      const fetchTopSkus = async () => {
        try {
          const { data } = await api.get(`/api/products/${selectedProductForSkuView.productId}/top-skus`)
          setTopSkus(data.items || [])
        } catch (error) {
          console.error('Failed to fetch top SKUs', error)
        }
      }
      fetchTopSkus()
    }
  }, [selectedProductForSkuView])

  const skuOverview = useMemo(() => {
    return overview.filter(o => o.sku);
  }, [overview]);

  useEffect(() => {
    const ctrl = new AbortController()
    const run = async () => {
      setCatalogLoading(true)
      try {
        const { data } = await api.get('/api/products', { params: { q: catalogSearch.trim(), limit: 12, page: 1 }, signal: ctrl.signal })
        setCatalogProducts(data.items || [])
      } catch { /* ignore */ }
      finally {
        if (!ctrl.signal.aborted) setCatalogLoading(false)
      }
    }
    const id = setTimeout(run, 200)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [catalogSearch])

  const submitBulk = async (e) => {
    e.preventDefault()
    const updates = Object.entries(bulkQuantities)
      .filter(([sku, qty]) => qty && !isNaN(qty) && Number.isInteger(Number(qty)) && Number(qty) > 0)
      .map(([sku, qty]) => ({ productId: activeCatalogProduct._id, variantSku: sku, quantity: Number(qty) }))
    
    if (updates.length === 0) {
      notify('Please enter a valid positive quantity for at least one SKU.', 'error')
      return
    }

    setBulkSubmitting(true)
    try {
      await api.post('/api/inventory/bulk-in', { updates, note: bulkNote })
      notify(`Added stock to ${updates.length} item(s) successfully`, 'success')
      setActiveCatalogProduct(null)
      setBulkQuantities({})
      setBulkNote('')
      loadData()
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to add bulk stock', 'error')
    } finally {
      setBulkSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">Log incoming stock and review analytics.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total SKUs</div>
          <div className="text-2xl font-black">{summary.kpis.totalSkus}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Units</div>
          <div className="text-2xl font-black">{summary.kpis.totalUnits}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Low Stock</div>
          <div className="text-2xl font-black">{summary.kpis.lowStockCount}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stock-In (30d)</div>
          <div className="text-2xl font-black">+{summary.kpis.totalAdded30d}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-700">Daily Stock-In (30 days)</div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={summary.daily}>
                <defs>
                  <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="quantity" stroke="#2563eb" fillOpacity={1} fill="url(#c1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-2">Top Stocked Products</div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={summary.topProducts}>
                <CartesianGrid stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#10b981" onClick={(data) => { setSelectedProductForSkuView(data); setShowSkuModal(true); }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showSkuModal && selectedProductForSkuView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Top 5 SKUs for {selectedProductForSkuView.name}</h2>
              <button onClick={() => setShowSkuModal(false)} className="text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Quantity Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topSkus.map(sku => (
                    <tr key={sku.sku}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{sku.sku}</td>
                      <td className="px-4 py-3 text-gray-800">{sku.quantity}</td>
                    </tr>
                  ))}
                  {topSkus.length === 0 && (
                    <tr>
                      <td colSpan="2" className="px-4 py-6 text-center text-gray-400">No SKU data available for this product.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Product Stock Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Reserved</th>
                <th className="px-4 py-3 text-left">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {skuOverview.map(o => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{o.sku ? `${o.name} (${o.sku})` : o.name}</td>
                  <td className="px-4 py-3 text-gray-800">{o.total}</td>
                  <td className="px-4 py-3 text-gray-800">{o.reserved}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${o.low ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                      {o.available}
                    </span>
                  </td>
                </tr>
              ))}
              {skuOverview.length === 0 && (<tr><td colSpan="4" className="px-4 py-6 text-center text-gray-400">No SKUs available. Assign SKUs to products/variants to manage stock.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Catalog & Bulk Add Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Catalog / Add Inventory</h2>
          <div className="relative w-64 md:w-80">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-9 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Search products..."
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
            />
            {catalogLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" aria-hidden />
            )}
          </div>
        </div>

        {catalogProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {catalogProducts.map(p => {
              const pSkus = buildSkuRows(p)
              return (
                <div key={p._id} className="relative group rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col cursor-pointer hover:border-violet-300 hover:ring-1 hover:ring-violet-300 transition-all" onClick={() => setActiveCatalogProduct(p)}>
                  <div className="aspect-square bg-gray-50 relative flex border-b border-gray-100">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <div className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{p.name}</div>
                    <div className="mt-auto flex items-center justify-between text-[10px] text-gray-500 font-medium">
                      <span>{pSkus.length} {pSkus.length === 1 ? 'SKU' : 'SKUs'}</span>
                      <span className="text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded">Add</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-400 text-sm font-medium">
            {catalogSearch ? 'No products found matching your search.' : 'Type to search products'}
          </div>
        )}
      </div>

      {activeCatalogProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                  {activeCatalogProduct.images?.[0]?.url ? (
                    <img src={activeCatalogProduct.images[0].url} alt="" className="w-full h-full object-contain p-1" />
                  ) : <span>📦</span>}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{activeCatalogProduct.name}</h3>
                  <p className="text-[10px] uppercase font-black tracking-wider text-gray-500">Bulk Add Inventory</p>
                </div>
              </div>
              <button type="button" onClick={() => { setActiveCatalogProduct(null); setBulkQuantities({}); setBulkNote(''); }} className="text-gray-400 hover:text-gray-800 transition-colors p-1 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left border-b border-gray-100">SKU</th>
                    <th className="px-4 py-3 text-left border-b border-gray-100">Attributes</th>
                    <th className="px-4 py-3 text-center border-b border-gray-100 w-24">Current Stock</th>
                    <th className="px-4 py-3 text-right border-b border-gray-100 w-32">Qty to Add</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {buildSkuRows(activeCatalogProduct).map(s => (
                    <tr key={s.sku} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-900 font-bold text-xs">{s.sku || 'No SKU'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{s.attrLabel || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{s.stock ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number" min="1" step="1"
                          placeholder="0"
                          value={bulkQuantities[s.sku] || ''}
                          onChange={(e) => setBulkQuantities(prev => ({ ...prev, [s.sku]: e.target.value }))}
                          className="w-20 text-right bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Note (e.g. Supplier, GRN) - applies to all"
                  value={bulkNote}
                  onChange={e => setBulkNote(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={submitBulk}
                disabled={bulkSubmitting}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {bulkSubmitting ? 'Saving...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Recent Stock-In</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Product / SKU</th>
                <th className="px-4 py-3 text-left">Quantity</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">Loading...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No stock-in records yet</td></tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 text-gray-600">{new Date(h.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 leading-tight">{h.productName || h.productId}</div>
                      {h.variantSku && <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">SKU: {h.variantSku}</div>}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">+{h.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{(h.store || '-')}{h.section ? `(${h.section})` : ''}</td>
                    <td className="px-4 py-3 text-gray-600">{h.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Low Stock</h2>
        </div>
        <div className="divide-y">
          {summary.lowStock.map(p => (
            <div key={p.id} className="py-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800 truncate">{p.name}</div>
              <div className="text-sm font-bold text-red-600">{p.stock}</div>
            </div>
          ))}
          {summary.lowStock.length === 0 && (
            <div className="py-3 text-gray-500 text-sm">No low stock items</div>
          )}
        </div>
      </div>
    </div>
  )
}
