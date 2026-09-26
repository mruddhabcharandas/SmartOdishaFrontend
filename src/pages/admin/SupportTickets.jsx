import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function SupportTickets() {
  const { notify } = useToast()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaPrompt, setMediaPrompt] = useState('')
  const [mediaType, setMediaType] = useState('IMAGE_OR_VIDEO')
  const [requestingMedia, setRequestingMedia] = useState(false)

  const handleRequestMedia = async (e) => {
    e.preventDefault()
    if (!selectedTicket || requestingMedia) return
    setRequestingMedia(true)
    try {
      const { data } = await api.post(`/api/support-tickets/admin/${selectedTicket._id}/request-media`, {
        prompt: mediaPrompt.trim() || 'Please share a clear photo or video showing the item condition and parcel label.',
        mediaType
      })
      notify('Photo/Video verification requested from customer', 'success')
      setShowMediaModal(false)
      setMediaPrompt('')
      setSelectedTicket(data)
      setTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)))
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to request media', 'error')
    } finally {
      setRequestingMedia(false)
    }
  }

  const loadTickets = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (categoryFilter !== 'All') params.category = categoryFilter
      const { data } = await api.get('/api/support-tickets/admin/all', { params })
      const list = Array.isArray(data) ? data : []
      setTickets(list)
      // Keep selected ticket updated if it is currently open
      if (selectedTicket) {
        const found = list.find((t) => t._id === selectedTicket._id)
        if (found) setSelectedTicket(found)
      } else if (list.length > 0) {
        setSelectedTicket(list[0])
      }
    } catch (err) {
      notify('Failed to load support tickets', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [statusFilter, categoryFilter])

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyMessage.trim() || !selectedTicket) return
    setSendingReply(true)
    try {
      const { data } = await api.post(`/api/support-tickets/admin/${selectedTicket._id}/messages`, {
        message: replyMessage.trim()
      })
      notify('Reply sent to customer successfully', 'success')
      setReplyMessage('')
      setSelectedTicket(data)
      setTickets((prev) => prev.map((t) => (t._id === data._id ? data : t)))
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to send reply', 'error')
    } finally {
      setSendingReply(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const { data } = await api.put(`/api/support-tickets/admin/${selectedTicket._id}/status`, {
        status: newStatus
      })
      notify(`Ticket marked as ${newStatus}`, 'success')
      setSelectedTicket((prev) => ({ ...prev, status: newStatus }))
      setTickets((prev) => prev.map((t) => (t._id === selectedTicket._id ? { ...t, status: newStatus } : t)))
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update ticket status', 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const subj = String(t.subject || '').toLowerCase()
    const desc = String(t.description || '').toLowerCase()
    const custName = String(t.customer?.name || '').toLowerCase()
    const custPhone = String(t.customer?.phone || '').toLowerCase()
    const ordNum = String(t.order?.orderNumber || '').toLowerCase()
    return subj.includes(q) || desc.includes(q) || custName.includes(q) || custPhone.includes(q) || ordNum.includes(q)
  })

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'Open').length,
    inProgress: tickets.filter((t) => t.status === 'In Progress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Closed':
        return 'bg-slate-100 text-slate-600 border-slate-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Customer Support Tickets</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Helpdesk
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resolve customer queries, order delivery concerns, return/refund requests, and payment issues.
          </p>
        </div>
        <button
          onClick={loadTickets}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tickets</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Open Tickets</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.open}</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">In Progress</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.inProgress}</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Resolved</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.resolved}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by ticket title, customer name, phone, order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <span className="absolute left-3 top-3 text-slate-400 text-sm">🔍</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Order Issue">Order Issue</option>
            <option value="Product Issue">Product Issue</option>
            <option value="Payment Issue">Payment Issue</option>
            <option value="Return/Refund">Return/Refund</option>
            <option value="General Query">General Query</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Main Support Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Tickets List (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden max-h-[720px]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">
              Tickets ({filteredTickets.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No tickets found matching current filters
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket && selectedTicket._id === t._id
                return (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : ''}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">
                      {t.subject}
                    </div>

                    <div className="text-xs text-slate-500 line-clamp-2 mb-2">
                      {t.description}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/60">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <span>👤</span> {t.customer?.name || 'Customer'}
                      </div>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600">
                        {t.category}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Conversation & Actions (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden max-h-[720px]">
          {selectedTicket ? (
            <>
              {/* Ticket Detail Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Category: <b className="text-slate-700">{selectedTicket.category}</b>
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedTicket.subject}
                  </h2>
                </div>

                {/* Actions & Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>📷</span> Request Photo / Video
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Status:</span>
                    <select
                      value={selectedTicket.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none shadow-sm"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Related Customer & Order Pill Strip */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Customer:</span>
                  <b className="text-slate-900">{selectedTicket.customer?.name || 'Customer'}</b>
                  {selectedTicket.customer?.phone && (
                    <span className="text-slate-500 font-mono">({selectedTicket.customer.phone})</span>
                  )}
                </div>

                {selectedTicket.order && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Related Order:</span>
                    <Link
                      to="/admin/orders"
                      className="font-bold text-blue-600 hover:text-blue-700 underline"
                    >
                      #{selectedTicket.order.orderNumber || (selectedTicket.order._id ? selectedTicket.order._id.slice(-6).toUpperCase() : '')}
                    </Link>
                    {selectedTicket.order.totalEstimate && (
                      <span className="text-emerald-600 font-bold">
                        · ₹{Number(selectedTicket.order.totalEstimate).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Message History Thread */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-slate-50/30">
                {/* Initial Issue Description */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-sm text-slate-800">
                  <div className="text-[11px] font-black uppercase tracking-wider text-amber-700 mb-1 flex items-center justify-between">
                    <span>Initial Customer Issue</span>
                    <span className="text-slate-400 font-normal">
                      {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Conversation Messages */}
                {Array.isArray(selectedTicket.messages) &&
                  selectedTicket.messages.map((m, idx) => {
                    const isAdmin = m.senderModel === 'Admin'
                    const isMediaReq = m.messageType === 'MEDIA_REQUEST'

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-bold text-slate-500">
                            {isAdmin ? '🛡️ Admin Support' : `👤 ${selectedTicket.customer?.name || 'Customer'}`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div
                          className={`p-3.5 rounded-2xl max-w-lg text-sm leading-relaxed shadow-sm ${
                            isAdmin
                              ? 'bg-slate-900 text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                          }`}
                        >
                          {isMediaReq ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                                <span>📷 Media Verification Requested</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.mediaRequest?.status === 'FULFILLED' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'}`}>
                                  {m.mediaRequest?.status === 'FULFILLED' ? '✓ Received' : 'Pending Customer Upload'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200">{m.mediaRequest?.prompt || m.message}</p>
                              {m.mediaRequest?.fulfilledUrl && (
                                <div className="mt-2 bg-slate-800 p-2 rounded-xl border border-slate-700">
                                  {m.mediaRequest.fulfilledMediaType === 'VIDEO' || m.mediaRequest.fulfilledUrl.match(/\.(mp4|mov|webm)$/i) ? (
                                    <video controls src={m.mediaRequest.fulfilledUrl} className="w-full max-h-56 rounded-lg" />
                                  ) : (
                                    <img
                                      src={m.mediaRequest.fulfilledUrl}
                                      alt="Verification evidence"
                                      className="w-full max-h-56 object-contain rounded-lg cursor-pointer bg-black/20"
                                      onClick={() => window.open(m.mediaRequest.fulfilledUrl, '_blank')}
                                    />
                                  )}
                                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                    <span>Uploaded on {m.mediaRequest.fulfilledAt ? new Date(m.mediaRequest.fulfilledAt).toLocaleDateString() : 'N/A'}</span>
                                    <a href={m.mediaRequest.fulfilledUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">Open Full Media ↗</a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{m.message}</div>
                          )}

                          {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {m.attachments.map((att, attIdx) => (
                                att.match(/\.(mp4|mov|webm)$/i) ? (
                                  <video key={attIdx} controls src={att} className="w-full max-h-48 rounded-lg" />
                                ) : (
                                  <img
                                    key={attIdx}
                                    src={att}
                                    alt="attachment"
                                    className="w-full max-h-48 object-contain rounded-lg cursor-pointer bg-slate-100"
                                    onClick={() => window.open(att, '_blank')}
                                  />
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-2.5">
                  <textarea
                    rows="2"
                    placeholder="Type a helpful reply to the customer..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1 p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyMessage.trim()}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-100 transition-all disabled:opacity-40 self-end"
                  >
                    {sendingReply ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
              <span className="text-4xl mb-2">💬</span>
              <p className="text-sm font-semibold">Select a ticket from the left to view details and reply</p>
            </div>
          )}
        </div>
      </div>

      {/* REQUEST MEDIA MODAL (Amazon Style) */}
      {showMediaModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Request Photo / Video</h3>
                <p className="text-xs text-slate-500">Customer will receive an interactive single-upload card.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestMedia} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Media Type Allowed
                </label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="IMAGE_OR_VIDEO">Photo or Video (Recommended)</option>
                  <option value="IMAGE">Photo Only</option>
                  <option value="VIDEO">Video Only (Unboxing / Damage)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Instructions for Customer
                </label>
                <textarea
                  rows="3"
                  value={mediaPrompt}
                  onChange={(e) => setMediaPrompt(e.target.value)}
                  placeholder="e.g. Please share a clear unboxing video or photos showing the damaged product and parcel shipping label."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                ℹ️ <b>Amazon-style Single Upload:</b> Once the customer uploads their verification media, the upload button is permanently locked for audit integrity.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMediaModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingMedia}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
                >
                  {requestingMedia ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
