import React, { Fragment, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

const safeNumber = (num) => {
  const n = Number(num)
  return isNaN(n) || !isFinite(n) ? 0 : n
}

export default function BusinessOrders() {
  const location = useLocation()
  const { notify } = useToast()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Cancel Modal States
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/stores/orders')
      const list = Array.isArray(data) ? data : []
      setOrders(list)
      if (location.state?.orderId) {
        setExpandedId(location.state.orderId)
      }
    } catch (err) {
      notify('Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  // Filtering Logic
  useEffect(() => {
    let result = [...orders]
    
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'NEW') {
        result = result.filter(o => ['NEW', 'PENDING_CASH_APPROVAL'].includes(o.status))
      } else {
        result = result.filter(o => o.status === statusFilter)
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(o => 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o._id && o._id.toLowerCase().includes(q)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.phone && o.customer.phone.includes(q))
      )
    }

    setFilteredOrders(result)
  }, [orders, statusFilter, searchQuery])

  // Actions
  const handleUpdateStatus = async (id, newStatus) => {
    setActionLoading(`${id}-${newStatus}`)
    try {
      await api.patch(`/api/stores/orders/${id}/status`, { status: newStatus })
      notify(`Order status updated to ${newStatus}`, 'success')
      loadOrders()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update order status', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkPacked = async (id) => {
    setActionLoading(`${id}-pack`)
    try {
      await api.patch(`/api/stores/orders/${id}/pack`)
      notify('Order marked as Packed successfully', 'success')
      loadOrders()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to mark as Packed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateShipment = async (id) => {
    setActionLoading(`${id}-shipment`)
    notify('Initiating Delhivery shipment...', 'info')
    try {
      const { data } = await api.post(`/api/stores/orders/${id}/delhivery/create`)
      if (data.success) {
        notify(`Shipment created! Waybill: ${data.waybill}`, 'success')
        loadOrders()
      }
    } catch (err) {
      notify(err.response?.data?.message || err.response?.data?.error || 'Failed to initiate shipment', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSyncDelhiveryStatus = async (id) => {
    setActionLoading(`${id}-sync`)
    try {
      const { data } = await api.post(`/api/stores/orders/${id}/delhivery/sync`)
      if (data?.hasChanged) {
        notify(`Order status updated to ${data.orderStatus} from Delhivery (${data.delhiveryStatus})`, 'success')
      } else {
        notify(`Delhivery status: ${data?.delhiveryStatus || 'No change'}`, 'info')
      }
      loadOrders()
    } catch (err) {
      notify(err.response?.data?.message || err.response?.data?.error || 'Failed to sync with Delhivery', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenCancel = (id) => {
    setCancellingId(id)
    setCancelReason('')
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async (e) => {
    e.preventDefault()
    setActionLoading(`${cancellingId}-cancel`)
    try {
      await api.post(`/api/stores/orders/${cancellingId}/cancel`, { reason: cancelReason })
      notify('Order cancelled and stock restored successfully!', 'success')
      loadOrders()
      setShowCancelModal(false)
    } catch (err) {
      notify(err.response?.data?.message || err.response?.data?.error || 'Failed to cancel order', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadLabel = (orderId, waybill) => {
    const token = localStorage.getItem('storeToken') || localStorage.getItem('token') || localStorage.getItem('partnerToken')
    window.open(`${api.defaults.baseURL}/api/stores/orders/${orderId}/delhivery/label/${waybill}?token=${token}`, '_blank')
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const statusStyles = {
    NEW: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PENDING_CASH_APPROVAL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
    PACKED: 'bg-amber-50 text-amber-700 border-amber-200',
    SHIPPED: 'bg-sky-50 text-sky-700 border-sky-200',
    OUT_FOR_DELIVERY: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FULFILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
    RETURNED: 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const orderStats = {
    total: orders.length,
    active: orders.filter(o => ['NEW', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status)).length,
    delivered: orders.filter(o => ['DELIVERED', 'FULFILLED'].includes(o.status)).length,
    cancelled: orders.filter(o => ['CANCELLED', 'RETURNED'].includes(o.status)).length
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest font-black text-indigo-600">Seller Partner Hub</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Orders
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track incoming purchases, print Delhivery shipping labels, and manage order fulfillments.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 self-start md:self-auto"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Orders</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{orderStats.total}</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">In Fulfillment</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{orderStats.active}</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Delivered / Settled</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{orderStats.delivered}</div>
        </div>
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Cancelled Orders</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{orderStats.cancelled}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'NEW', label: 'New' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'PACKED', label: 'Packed' },
            { id: 'SHIPPED', label: 'Shipped' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'CANCELLED', label: 'Cancelled' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by Order #, Customer, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Seller Earnings</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400 font-medium">
                    Loading your orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400 italic">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const isExpanded = expandedId === o._id
                  const isCancelled = ['CANCELLED', 'RETURNED'].includes(o.status)
                  const displayStatus = o.status === 'PENDING_CASH_APPROVAL' ? 'NEW' : o.status
                  const badgeClass = statusStyles[o.status] || 'bg-slate-100 text-slate-700 border-slate-200'

                  return (
                    <Fragment key={o._id}>
                      <tr 
                        onClick={() => toggleExpand(o._id)}
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900">#{o.orderNumber || o._id.slice(-6).toUpperCase()}</div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{o.customer?.name || 'Customer'}</div>
                          <div className="text-[11px] text-slate-500 font-medium">{o.customer?.phone || '—'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-700">{o.paymentMethod || 'ONLINE'}</div>
                          <span className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                            o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {o.paymentStatus}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isCancelled ? (
                            <div>
                              <div className="font-black text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md inline-block">
                                ₹0
                              </div>
                              <div className="text-[10px] text-slate-400 line-through mt-0.5">
                                ₹{safeNumber(o.originalProductTotal || o.totalEstimate).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-black text-slate-900 text-sm">
                                ₹{safeNumber(o.storeRevenue || o.totalEstimate).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {o.items?.length || 0} unique item(s)
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeClass}`}>
                            {displayStatus}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleExpand(o._id)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan="6" className="bg-slate-50/50 p-5 border-y border-slate-200">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Order & Financial Summary */}
                              <div className="space-y-4">
                                <div>
                                  <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                    Seller Financials
                                  </div>
                                  
                                  {isCancelled ? (
                                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                                      <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                                        <span>❌ Order Cancelled</span>
                                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                          ₹0 Earning Credited
                                        </span>
                                      </div>
                                      <p className="text-xs text-rose-600 leading-relaxed">
                                        {o.refundReason ? `Reason: "${o.refundReason}"` : "This order was cancelled before delivery. Inventory stock was restored and no revenue is added to your seller wallet."}
                                      </p>
                                      <div className="border-t border-rose-200 pt-2 flex justify-between text-xs text-slate-500">
                                        <span>Order Value (Ref):</span>
                                        <span className="line-through">₹{safeNumber(o.originalProductTotal || o.totalEstimate).toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between font-black text-rose-700 text-sm">
                                        <span>Net Seller Earning:</span>
                                        <span>₹0</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-sm">
                                      <div className="flex justify-between text-slate-500 text-xs">
                                        <span>Products Subtotal:</span>
                                        <span className="font-bold text-slate-700">₹{safeNumber(o.productTotal || o.totalEstimate).toLocaleString()}</span>
                                      </div>
                                      <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-sm">
                                        <span className="text-slate-900">Your Net Earnings:</span>
                                        <span className="text-indigo-600 font-black text-base">₹{safeNumber(o.storeRevenue || o.totalEstimate).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                    Customer & Shipping Address
                                  </div>
                                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2 shadow-sm">
                                    <div className="font-bold text-slate-800">
                                      {o.customer?.name}
                                    </div>
                                    <div className="text-slate-600 leading-relaxed">
                                      {o.shippingAddress?.line1}
                                      {o.shippingAddress?.line2 && `, ${o.shippingAddress.line2}`}
                                      <br />
                                      {o.shippingAddress?.city}, {o.shippingAddress?.state} — {o.shippingAddress?.pincode}
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap gap-4">
                                      <span><b>Phone:</b> {o.customer?.phone || 'N/A'}</span>
                                      {o.customer?.email && <span><b>Email:</b> {o.customer.email}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Items and Fulfillment Actions */}
                              <div className="space-y-4">
                                <div>
                                  <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                    Items Ordered ({o.items?.length || 0})
                                  </div>
                                  <div className="space-y-2">
                                    {o.items?.map((it, idx) => (
                                      <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                                        <div className="w-11 h-11 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
                                          {it.image ? <img src={it.image} alt={it.name} className="w-full h-full object-contain p-1" /> : '📦'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-black text-slate-900 truncate">{it.name}</div>
                                          {it.attributes && Object.keys(it.attributes).length > 0 && (
                                            <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
                                              {Object.entries(it.attributes instanceof Map ? Object.fromEntries(it.attributes) : it.attributes).map(([k,v])=>`${k}: ${v}`).join(' • ')}
                                            </div>
                                          )}
                                          <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                                            Qty: {it.quantity} × ₹{it.price}
                                          </div>
                                        </div>
                                        <div className="text-xs font-black text-slate-900">
                                          ₹{(it.price * it.quantity).toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="border-t border-slate-200 pt-3">
                                  <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                                    Fulfillment & Shipping
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {o.status === 'NEW' && (
                                      <button
                                        disabled={actionLoading === `${o._id}-CONFIRMED`}
                                        onClick={() => handleUpdateStatus(o._id, 'CONFIRMED')}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                                      >
                                        Confirm Order
                                      </button>
                                    )}

                                    {['CONFIRMED', 'PROCESSING'].includes(o.status) && (
                                      <button
                                        disabled={actionLoading === `${o._id}-pack`}
                                        onClick={() => handleMarkPacked(o._id)}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                                      >
                                        Mark Packed
                                      </button>
                                    )}

                                    {['CONFIRMED', 'PACKED', 'PROCESSING'].includes(o.status) && !o.shipping?.waybill && (
                                      <button
                                        disabled={actionLoading === `${o._id}-shipment`}
                                        onClick={() => handleCreateShipment(o._id)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                                      >
                                        {actionLoading === `${o._id}-shipment` ? 'Creating Shipment...' : 'Create Delhivery Shipment'}
                                      </button>
                                    )}

                                    {o.shipping?.waybill && (
                                      <div className="w-full bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                        <div>
                                          <div className="text-[10px] text-blue-500 font-black uppercase tracking-wider">Delhivery Waybill</div>
                                          <div className="font-black text-blue-900 text-sm mt-0.5">{o.shipping.waybill}</div>
                                          {o.shipping?.status && (
                                            <div className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                                              Delhivery Status: <span className="text-blue-700 font-extrabold uppercase">{o.shipping.status}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            onClick={() => handleSyncDelhiveryStatus(o._id)}
                                            disabled={actionLoading === `${o._id}-sync`}
                                            className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                            title="Sync latest live status from Delhivery"
                                          >
                                            <span>🔄</span> {actionLoading === `${o._id}-sync` ? "Syncing..." : "Sync"}
                                          </button>
                                          {o.shipping.trackingUrl && (
                                            <a
                                              href={o.shipping.trackingUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all"
                                            >
                                              Track
                                            </a>
                                          )}
                                          <button
                                            onClick={() => handleDownloadLabel(o._id, o.shipping.waybill)}
                                            className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-50 transition-all flex items-center gap-1.5"
                                          >
                                            <span>🏷️</span> Thermal PDF Label
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {!['DELIVERED', 'FULFILLED', 'CANCELLED', 'SHIPPED', 'RETURNED'].includes(o.status) && (
                                      <button
                                        disabled={actionLoading === `${o._id}-cancel`}
                                        onClick={() => handleOpenCancel(o._id)}
                                        className="px-4 py-2 bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                                      >
                                        Cancel Order
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CANCEL ORDER MODAL */}
      {showCancelModal && cancellingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-rose-600 text-base">Cancel Order</h3>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-200"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to cancel order #{orders.find(o=>o._id===cancellingId)?.orderNumber || cancellingId.slice(-6).toUpperCase()}?
                <br />
                This will automatically restore items to inventory stock and initiate a customer refund.
              </p>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Cancellation Reason
                </label>
                <textarea
                  rows="3"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Specify why this order is being cancelled..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                  disabled={actionLoading === `${cancellingId}-cancel`}
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
