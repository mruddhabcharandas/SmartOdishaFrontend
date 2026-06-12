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
      setOrders(data || [])
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
      result = result.filter(o => o.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(o => 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
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
    notify('Initiating Shiprocket shipment...', 'info')
    try {
      const { data } = await api.post(`/api/stores/orders/${id}/shiprocket/create`)
      if (data.success) {
        notify(`Shipment created! AWB: ${data.waybill}`, 'success')
        loadOrders()
      }
    } catch (err) {
      notify(err.response?.data?.message || err.response?.data?.error || 'Failed to initiate shipment', 'error')
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

  const handleDownloadLabel = (orderId, awb) => {
    const token = localStorage.getItem('storeToken')
    window.open(`${api.defaults.baseURL}/api/stores/orders/${orderId}/shiprocket/label/${awb}?token=${token}`, '_blank')
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const statusColors = {
    CONFIRMED: 'panel-badge-blue',
    PROCESSING: 'panel-badge-blue',
    PACKED: 'panel-badge-amber',
    SHIPPED: 'panel-badge-green',
    DELIVERED: 'panel-badge-green',
    FULFILLED: 'panel-badge-green',
    CANCELLED: 'panel-badge-red'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <p className="text-sm text-gray-500">Track and fulfill orders placed by your customers.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel-filter-bar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'NEW', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`panel-filter-btn ${statusFilter === st ? 'active' : ''}`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by Order ID, Name, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="panel-input pr-10"
          />
          <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {/* Orders List */}
      <div className="panel-card">
        <div className="panel-table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Order ID / Date</th>
                <th>Customer</th>
                <th>Payment Mode</th>
                <th>Total Value</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">Retrieving orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400 italic">No orders match the selected filters.</td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const isExpanded = expandedId === o._id
                  const unpaidCOD = o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID'
                  
                  return (
                    <Fragment key={o._id}>
                      <tr 
                        onClick={() => toggleExpand(o._id)}
                        className="cursor-pointer hover:bg-gray-50"
                        style={{ background: isExpanded ? '#fbfcfe' : 'transparent' }}
                      >
                        <td>
                          <div className="font-bold text-gray-900">#{o.orderNumber || o._id.slice(-6).toUpperCase()}</div>
                          <div className="text-xs text-gray-400 font-medium">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : ''}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold text-gray-900">{o.customer?.name}</div>
                          <div className="text-xs text-gray-500">{o.customer?.phone}</div>
                        </td>
                        <td>
                          <span className="font-medium text-gray-700">{o.paymentMethod}</span>
                          <span style={{ marginLeft: 8 }} className={`text-[10px] font-bold uppercase ${o.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
                            ({o.paymentStatus})
                          </span>
                        </td>
                        <td>
                          <div className="font-bold text-gray-900">₹{o.totalEstimate.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">{o.items?.length || 0} unique item(s)</div>
                        </td>
                        <td>
                          <span className={`panel-badge ${statusColors[o.status] || 'panel-badge-blue'}`}>
                            {o.status === 'PENDING_CASH_APPROVAL' ? 'NEW' : o.status}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleExpand(o._id)}
                              className="panel-btn-outline"
                              style={{ padding: '6px 12px', fontSize: 11 }}
                            >
                              {isExpanded ? 'Hide' : 'Details'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" style={{ background: '#fafbfc', padding: '24px' }}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              
                              {/* Order Details & Summary */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="panel-step-title" style={{ margin: 0 }}>Order Price Summary</h4>
                                  <div className="bg-white border rounded p-4 mt-2 space-y-2 text-sm shadow-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Products Subtotal:</span>
                                      <span className="font-semibold">₹{safeNumber(o.productTotal || (o.totalEstimate - o.shippingCost - o.codCharge)).toLocaleString()}</span>
                                    </div>
                                    {o.couponDiscount > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span>Coupon Discount ({o.couponCode}):</span>
                                        <span>-₹{safeNumber(o.couponDiscount).toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Delivery Charge:</span>
                                      <span>₹{safeNumber(o.shippingCost).toLocaleString()}</span>
                                    </div>
                                    {o.codCharge > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">COD Fee:</span>
                                        <span>₹{safeNumber(o.codCharge).toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                                      <span>Total Price:</span>
                                      <span className="text-blue-600">₹{o.totalEstimate.toLocaleString()}</span>
                                    </div>
                                    
                                    {o.paymentMethod === 'COD' && (
                                      <div className="bg-amber-50/50 border border-amber-100 rounded p-3 mt-3 space-y-1 text-xs">
                                        <div className="flex justify-between text-gray-700">
                                          <span>COD Advance Paid (15%):</span>
                                          <span className="font-bold text-green-700">₹{Math.round(o.totalEstimate - o.codDueAmount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-amber-800 font-bold">
                                          <span>Remaining Cash on Delivery:</span>
                                          <span>₹{o.codDueAmount.toLocaleString()}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="panel-step-title">Customer & Delivery Details</h4>
                                  <div className="bg-white border rounded p-4 space-y-2 text-sm shadow-sm">
                                    <div><b>Delivery Address:</b></div>
                                    <div className="text-gray-600">
                                      {o.shippingAddress?.line1}
                                      {o.shippingAddress?.line2 && `, ${o.shippingAddress.line2}`}
                                      <br />
                                      {o.shippingAddress?.city}, {o.shippingAddress?.state} - {o.shippingAddress?.pincode}
                                    </div>
                                    <div className="pt-2 border-t text-xs text-gray-500">
                                      Email: {o.customer?.email || 'N/A'} • Phone: {o.customer?.phone}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Items & Status Lifecycle */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="panel-step-title">Items Ordered ({o.items?.length || 0})</h4>
                                  <div className="space-y-2">
                                    {o.items?.map((it, idx) => (
                                      <div key={idx} className="flex items-center gap-3 bg-white border rounded p-3 shadow-sm">
                                        <div className="w-10 h-10 border rounded overflow-hidden flex items-center justify-center bg-gray-50">
                                          {it.image ? <img src={it.image} className="w-full h-full object-contain p-1" /> : '📦'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-bold text-gray-800 truncate">{it.name}</div>
                                          {it.attributes && Object.keys(it.attributes).length > 0 && (
                                            <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                              {Object.entries(it.attributes instanceof Map ? Object.fromEntries(it.attributes) : it.attributes).map(([k,v])=>`${k}: ${v}`).join(' • ')}
                                            </div>
                                          )}
                                          <div className="text-[10px] text-gray-500 font-semibold">Qty: {it.quantity} × ₹{it.price}</div>
                                        </div>
                                        <div className="text-xs font-bold text-gray-900">₹{(it.price * it.quantity).toLocaleString()}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                  <h4 className="panel-step-title">Fulfillment Lifecycle Action</h4>
                                  
                                  <div className="flex flex-wrap gap-2">
                                    {o.status === 'NEW' && (
                                      <button
                                        disabled={actionLoading === `${o._id}-CONFIRMED`}
                                        onClick={() => handleUpdateStatus(o._id, 'CONFIRMED')}
                                        className="panel-btn-primary"
                                      >
                                        Confirm Order
                                      </button>
                                    )}

                                    {['CONFIRMED', 'PROCESSING'].includes(o.status) && (
                                      <button
                                        disabled={actionLoading === `${o._id}-pack`}
                                        onClick={() => handleMarkPacked(o._id)}
                                        className="panel-btn-primary"
                                      >
                                        Mark Packed
                                      </button>
                                    )}

                                    {['CONFIRMED', 'PACKED', 'PROCESSING'].includes(o.status) && !o.shipping?.waybill && (
                                      <button
                                        disabled={actionLoading === `${o._id}-shipment`}
                                        onClick={() => handleCreateShipment(o._id)}
                                        className="panel-btn-accent"
                                      >
                                        {actionLoading === `${o._id}-shipment` ? 'Creating Shipment...' : 'Create Shiprocket Shipment'}
                                      </button>
                                    )}

                                    {o.shipping?.waybill && (
                                      <div className="w-full bg-blue-50 border border-blue-100 rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                                        <div>
                                          <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Shiprocket Waybill / AWB</div>
                                          <div className="font-bold text-blue-800">{o.shipping.waybill}</div>
                                        </div>
                                        <div className="flex gap-2">
                                          {o.shipping.trackingUrl && (
                                            <a href={o.shipping.trackingUrl} target="_blank" rel="noreferrer" className="panel-btn-primary" style={{ padding: '6px 12px', fontSize: 11, textDecoration: 'none' }}>
                                              Track
                                            </a>
                                          )}
                                          <button onClick={() => handleDownloadLabel(o._id, o.shipping.waybill)} className="panel-btn-outline" style={{ padding: '6px 12px', fontSize: 11 }}>
                                            Label PDF
                                          </button>
                                        </div>
                                      </div>
                                    )}



                                    {!['DELIVERED', 'FULFILLED', 'CANCELLED', 'SHIPPED', 'RETURNED'].includes(o.status) && (
                                      <button
                                        disabled={actionLoading === `${o._id}-cancel`}
                                        onClick={() => handleOpenCancel(o._id)}
                                        className="panel-btn-danger"
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

      {/* CANCEL ORDER REASON DIALOG */}
      {showCancelModal && cancellingId && (
        <div className="panel-modal-overlay">
          <div className="panel-modal" style={{ maxWidth: 450 }}>
            <div className="panel-modal-header">
              <h3 className="panel-title" style={{ color: '#e53935' }}>Cancel Order</h3>
              <button 
                onClick={() => setShowCancelModal(false)} 
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleConfirmCancel}>
              <div className="panel-modal-body space-y-4">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Are you sure you want to cancel order #{orders.find(o=>o._id===cancellingId)?.orderNumber || cancellingId.slice(-6).toUpperCase()}?
                  <br />
                  Doing so will restore inventory stock immediately and request a 95% refund of the online payment or COD advance.
                </p>
                <div className="space-y-1">
                  <label className="panel-label">Reason for cancellation</label>
                  <textarea
                    rows="3"
                    className="panel-input"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Provide cancellation details..."
                    required
                  />
                </div>
              </div>
              <div className="panel-modal-footer">
                <button type="button" onClick={() => setShowCancelModal(false)} className="panel-btn-ghost">Close</button>
                <button type="submit" className="panel-btn-danger" style={{ background: '#e53935', color: 'white' }}>
                  Cancel Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
