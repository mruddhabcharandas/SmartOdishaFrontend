import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../../lib/api'
import { getImageUrl } from '../../lib/cloudinary'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import LoadingSpinner from '../../components/LoadingSpinner'

const REVIEWED_PIDS_KEY = 'c2k_reviewed_product_ids'

function loadReviewedProductIds() {
  try {
    const raw = sessionStorage.getItem(REVIEWED_PIDS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.filter(Boolean) : [])
  } catch {
    return new Set()
  }
}

function persistReviewedProductIds(set) {
  try {
    sessionStorage.setItem(REVIEWED_PIDS_KEY, JSON.stringify([...set]))
  } catch {}
}

function orderLineProductId(item) {
  const x = item?.product
  if (typeof x === 'string' && /^[a-f\d]{24}$/i.test(x)) return x
  if (x && typeof x === 'object' && x._id) return String(x._id)
  return ''
}

const fmtIST = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })
}

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric'
  })
}

const safeNumber = (num) => {
  const n = Number(num)
  return isNaN(n) || !isFinite(n) ? 0 : n
}

const STATUS_STEPS = ['Placed', 'Processing', 'Packed', 'Shipped', 'Delivered']

function getStatusIndex(order) {
  const s = order.status;
  if (s === 'DELIVERED' || s === 'FULFILLED') return 4;
  if (s === 'SHIPPED' || order.shipping?.waybill) return 3;
  if (s === 'PACKED') return 2;
  if (s === 'CONFIRMED' || s === 'PROCESSING') return 1;
  return 0; // PENDING, NEW, PENDING_CASH_APPROVAL, PENDING_PAYMENT
}

function getStatusColor(status) {
  const s = status === 'PENDING_CASH_APPROVAL' ? 'NEW' : status
  if (s === 'FULFILLED' || s === 'DELIVERED') return { bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)', color: '#059669' }
  if (s === 'CANCELLED') return { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', color: '#dc2626' }
  return { bg: 'rgba(40,116,240,0.08)', border: 'rgba(40,116,240,0.2)', color: '#2874f0' }
}

function getETA(createdAt) {
  const d = new Date(createdAt)
  d.setDate(d.getDate() + 4)
  return d
}

const FEEDBACK_TAG_OPTIONS = [
  "⚡ Super Fast Delivery",
  "📦 Safe & Eco Packaging",
  "✨ Authentic Quality",
  "💰 Value for Money",
  "🤝 Polite Delivery Person",
  "💯 Exactly as Described"
]

const RATING_EMOTIONS = {
  1: { text: "Very Poor", emoji: "😞", color: "#dc2626" },
  2: { text: "Poor", emoji: "🙁", color: "#ea580c" },
  3: { text: "Good", emoji: "😊", color: "#d97706" },
  4: { text: "Very Good", emoji: "😃", color: "#2563eb" },
  5: { text: "Excellent!", emoji: "🤩", color: "#059669" }
}

export default function OrderHistory() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [reviewedProductIds, setReviewedProductIds] = useState(loadReviewedProductIds)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const { notify } = useToast()

  // Support Tickets States
  const [myTickets, setMyTickets] = useState([])
  const [showTicketsModal, setShowTicketsModal] = useState(false)
  const [ticketTab, setTicketTab] = useState('list') // 'list' | 'detail' | 'create'
  const [activeTicket, setActiveTicket] = useState(null)
  const [ticketReply, setTicketReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [resolvingTicket, setResolvingTicket] = useState(false)
  const [ticketCategory, setTicketCategory] = useState('Order Issue')
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketDescription, setTicketDescription] = useState('')
  const [ticketOrderId, setTicketOrderId] = useState('')

  // Order Delivery Feedback Modal States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackOrder, setFeedbackOrder] = useState(null)
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackHover, setFeedbackHover] = useState(0)
  const [feedbackTags, setFeedbackTags] = useState([])
  const [feedbackComment, setFeedbackComment] = useState('')
  const [itemRatings, setItemRatings] = useState({})
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  // Cancellation Modal States
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const markProductReviewed = (pid) => {
    setReviewedProductIds((prev) => {
      const next = new Set(prev)
      next.add(pid)
      persistReviewedProductIds(next)
      return next
    })
  }

  const fetchMyTickets = async () => {
    try {
      const { data } = await api.get('/api/support-tickets/my-tickets')
      setMyTickets(Array.isArray(data) ? data : [])
    } catch (e) {
      console.warn('Could not fetch support tickets:', e)
    }
  }

  useEffect(() => {
    if (!token) { navigate('/login', { state: { from: location.pathname + location.search } }); return }
    api.get('/api/orders/my')
      .then(({ data }) => { setOrders(data); setLoading(false) })
      .catch(() => setLoading(false))
    fetchMyTickets()
  }, [token, navigate])

  const handleOpenHelp = (order) => {
    const oId = order ? order._id : ''
    setTicketOrderId(oId)
    setTicketCategory('Order Issue')
    setTicketSubject(order ? `Help with Order #${order.orderNumber || order._id.slice(-6).toUpperCase()}` : '')
    setTicketDescription('')
    setTicketTab('create')
    setShowTicketsModal(true)
  }

  const handleOpenTicketsHub = () => {
    fetchMyTickets()
    setTicketTab('list')
    setShowTicketsModal(true)
  }

  const handleSelectTicket = (t) => {
    setActiveTicket(t)
    setTicketReply('')
    setTicketTab('detail')
  }

  const handleSendTicketReply = async (e) => {
    e.preventDefault()
    if (!ticketReply.trim() || !activeTicket) return
    setSendingReply(true)
    try {
      const { data } = await api.post(`/api/support-tickets/${activeTicket._id}/messages`, {
        message: ticketReply.trim()
      })
      setActiveTicket(data)
      setMyTickets(prev => prev.map(t => t._id === data._id ? data : t))
      setTicketReply('')
      notify('Reply sent to support team', 'success')
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to send reply', 'error')
    } finally {
      setSendingReply(false)
    }
  }

  const handleResolveTicket = async () => {
    if (!activeTicket) return
    setResolvingTicket(true)
    try {
      const { data } = await api.put(`/api/support-tickets/${activeTicket._id}/resolve`)
      setActiveTicket(data)
      setMyTickets(prev => prev.map(t => t._id === data._id ? data : t))
      notify('Ticket marked as resolved. Thank you!', 'success')
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to resolve ticket', 'error')
    } finally {
      setResolvingTicket(false)
    }
  }

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!ticketSubject.trim() || !ticketDescription.trim()) return
    setSubmittingTicket(true)
    try {
      const { data } = await api.post('/api/support-tickets', {
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        category: ticketCategory,
        orderId: ticketOrderId || undefined
      })
      notify('Support ticket raised successfully!', 'success')
      setMyTickets(prev => [data, ...prev])
      setActiveTicket(data)
      setTicketTab('detail')
      setTicketSubject('')
      setTicketDescription('')
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to create support ticket', 'error')
    } finally {
      setSubmittingTicket(false)
    }
  }

  // Feedback Handlers
  const handleOpenFeedback = (order, defaultRating = 5) => {
    setFeedbackOrder(order)
    setFeedbackRating(order.feedbackRating || defaultRating)
    setFeedbackHover(0)
    setFeedbackTags(Array.isArray(order.feedbackTags) ? [...order.feedbackTags] : [])
    setFeedbackComment(order.feedbackComment || '')
    setItemRatings({})
    setShowFeedbackModal(true)
  }

  const handleToggleTag = (tag) => {
    setFeedbackTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    if (!feedbackOrder) return
    setSubmittingFeedback(true)
    try {
      const { data } = await api.post(`/api/orders/${feedbackOrder._id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment,
        tags: feedbackTags
      })

      // Also submit ratings for any order items rated in the modal
      for (const [pid, r] of Object.entries(itemRatings)) {
        if (r > 0) {
          try {
            await api.post(`/api/products/${pid}/reviews`, { rating: r, comment: '' })
            markProductReviewed(pid)
          } catch (e) {}
        }
      }

      setOrders(prev => prev.map(o => o._id === feedbackOrder._id ? {
        ...o,
        feedbackRating: data.feedbackRating,
        feedbackComment: data.feedbackComment,
        feedbackTags: data.feedbackTags,
        feedbackAt: data.feedbackAt
      } : o))

      notify('Thank you for rating your delivery!', 'success')
      setShowFeedbackModal(false)
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to submit feedback', 'error')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const handleOpenCancel = (id) => {
    setCancellingId(id)
    setCancelReason('')
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/api/orders/${cancellingId}/cancel-customer`, { reason: cancelReason })
      notify('Order cancelled successfully! Your refund amount will be credited to your bank account in 2-3 days.', 'success')
      const { data } = await api.get('/api/orders/my')
      setOrders(data)
      setShowCancelModal(false)
    } catch (err) {
      notify(err?.response?.data?.message || err?.response?.data?.error || 'Failed to cancel order', 'error')
    } finally {
      setLoading(false)
    }
  }

  /* ── LOADING ── */
  if (loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap');
        .oh-load-root { font-family:'DM Sans',sans-serif; background:#f8fafc; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:32px; position:relative; overflow:hidden; color:#6b7280; }
        .oh-load-root::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle at 2px 2px, rgba(30,58,138,.05) 1px, transparent 0); background-size:32px 32px; }
      `}</style>
      <div className="oh-load-root">
        <LoadingSpinner text="Retrieving your orders..." />
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .oh-root{
          font-family:'DM Sans',system-ui,sans-serif;
          background: #f8fafc;
          min-height:100vh; color:#1e293b;
          position:relative; overflow-x:hidden;
          padding-bottom:32px;
        }
        .oh-wrap{
          max-width:1100px; margin:0 auto;
          padding:24px 16px 80px; position:relative; z-index:1;
        }
        @media(min-width:600px){.oh-wrap{padding:32px 24px 80px;}}

        /* ── page header ── */
        .oh-hd{
          display:flex; align-items:flex-start; justify-content:space-between;
          flex-wrap:wrap; gap:14px; margin-bottom:24px;
        }
        .oh-eyebrow{
          display:inline-flex; align-items:center; gap:7px;
          padding:4px 12px; border-radius:100px;
          background:rgba(30,58,138,0.08); border:1px solid rgba(30,58,138,0.15);
          color:#7c3aed; font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
          margin-bottom:8px;
        }
        .oh-h1{
          font-size:28px;
          font-weight:900;
          color:#1e1b2e; line-height:1.2; margin-bottom:4px;
        }
        .oh-h1 span{
          background: linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #7c3aed 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .oh-sub{font-size:14px;color:#6b7280;font-weight:500;}
        .oh-count-pill{
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px; border-radius:100px;
          background:rgba(249,115,22,0.1); border:1px solid rgba(249,115,22,0.15);
          color:#4f46e5; font-size:12px; font-weight:700; white-space:nowrap;
          box-shadow:0 4px 20px rgba(249,115,22,0.1);
        }

        /* ── empty state ── */
        .oh-empty{
          background:white; border:1px solid #e2e8f0;
          border-radius:12px; padding:56px 24px; text-align:center;
          box-shadow:0 4px 20px rgba(0,0,0,0.05);
        }
        .oh-empty-ico{
          width:64px; height:64px; border-radius:50%; margin:0 auto 16px;
          background:#eff6ff; border:1px solid rgba(59,130,246,0.15);
          display:flex; align-items:center; justify-content:center; font-size:28px;
        }
        .oh-empty-h{
          font-size:20px; font-weight:700;
          color:#0f172a; margin-bottom:8px;
        }
        .oh-empty-p{font-size:14px;color:#64748b;margin-bottom:24px;}
        .oh-shop-btn{
          display:inline-flex; align-items:center; gap:8px;
          background: linear-gradient(135deg, #4f46e5, #4338ca); color:white;
          padding:12px 24px; border-radius:8px; border:none;
          font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s;
          box-shadow:0 4px 20px rgba(249,115,22,0.2);
        }
        .oh-shop-btn:hover{background: linear-gradient(135deg, #4338ca, #dc2626); transform: translateY(-1px);}

        /* ── order list ── */
        .oh-list{display:flex;flex-direction:column;gap:16px;}

        /* ── order card ── */
        .oh-card{
          background:white; border:1px solid #e2e8f0;
          border-radius:12px; overflow:hidden;
          box-shadow:0 4px 16px rgba(15,23,42,0.05);
          transition:all .2s;
        }
        .oh-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.1);}
        .oh-card.expanded{box-shadow:0 4px 12px rgba(15,23,42,0.1); border-color:#3b82f6;}

        /* card header row */
        .oh-card-hd{
          padding:16px 20px; cursor:pointer;
          border-bottom:1px solid #f0f0f0;
          background:#fff;
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:12px;
          transition:background .2s;
        }
        .oh-card-hd:hover{background:#fafafa;}
        @media(max-width:480px){.oh-card-hd{padding:12px 14px;}}

        .oh-card-meta{display:flex;flex-wrap:wrap;gap:24px;align-items:center;flex:1;}
        @media(max-width:480px){.oh-card-meta{gap:14px;}}

        .oh-meta-item{}
        .oh-meta-label{
          font-size:10px; font-weight:600;
          text-transform:uppercase; color:#878787; margin-bottom:4px;
        }
        .oh-meta-val{font-size:14px;font-weight:700;color:#212121;}
        @media(max-width:480px){.oh-meta-val{font-size:13px;}}

        /* status pill */
        .oh-status{
          display:inline-flex; align-items:center; gap:6px;
          padding:4px 12px; border-radius:100px;
          font-size:11px; font-weight:700; text-transform:uppercase;
        }
        .oh-sdot{width:6px;height:6px;border-radius:50%;}

        /* chevron */
        .oh-chevron{
          color:#878787; transition:transform .25s; flex-shrink:0;
        }
        .oh-chevron.open{transform:rotate(180deg);}

        /* order id */
        .oh-oid{
          font-size:12px; color:#3b82f6; font-weight:700;
          font-family:inherit;
        }

        /* ── expanded body ── */
        .oh-body{padding:24px 20px;display:flex;flex-direction:column;gap:24px;background:#fcfcff;border-top:1px solid #f0f0f0;}
        @media(max-width:480px){.oh-body{padding:16px;gap:20px;}}

        /* ── progress stepper ── */
        .oh-stepper-label{
          font-size:11px; font-weight:700;
          text-transform:uppercase; color:#878787; margin-bottom:12px;
          letter-spacing:0.04em;
        }
        .oh-stepper{
          display:flex; align-items:flex-start;
          position:relative;
        }
        .oh-step{
          flex:1; display:flex; flex-direction:column; align-items:center;
          position:relative; z-index:1;
        }
        /* connecting line */
        .oh-step:not(:last-child)::after{
          content:''; position:absolute;
          top:12px; left:50%; width:100%; height:2px;
          background:#e0e0e0;
          z-index:0;
        }
        .oh-step.done:not(:last-child)::after{
          background:#3b82f6;
        }

        .oh-step-circle{
          width:24px; height:24px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:700; position:relative; z-index:1;
          transition:all .3s;
        }
        .oh-step-circle.done{background:#3b82f6;color:white;}
        .oh-step-circle.done.last{background:#059669;}
        .oh-step-circle.idle{background:#eff6ff;color:#3b82f6;border:2px solid #3b82f6;}

        .oh-step-label{
          margin-top:8px; font-size:11px; font-weight:700;
          text-transform:uppercase; text-align:center;
          transition:color .3s;
        }
        .oh-step-label.done{color:#3b82f6;}
        .oh-step-label.done.last{color:#059669;}
        .oh-step-label.idle{color:#878787;}

        /* eta */
        .oh-eta{
          display:inline-flex; align-items:center; gap:6px;
          font-size:12px; font-weight:600; color:#212121;
          background:#eff6ff; border:1px solid rgba(59,130,246,0.1);
          padding:6px 12px; border-radius:2px; margin-top:12px;
        }
        .oh-eta b{color:#3b82f6;}

        /* ── info grid ── */
        .oh-info-grid {
          display:grid; grid-template-columns:1fr;
          gap:14px;
        }
        @media(min-width:600px){.oh-info-grid{grid-template-columns:1fr 1fr;}}

        .oh-info-card{
          background:#fff; border:1px solid #e0e0e0;
          border-radius:2px; padding:16px;
          box-shadow:0 1px 2px rgba(0,0,0,0.04);
        }
        .oh-info-title{
          font-size:10px; font-weight:700;
          text-transform:uppercase; color:#878787; margin-bottom:8px;
          letter-spacing:0.04em;
        }
        .oh-info-row{font-size:13px;color:#212121;line-height:1.5;}
        .oh-info-row b{color:#212121;font-weight:700;}
        .oh-mono{font-family:monospace;font-size:11px;color:#3b82f6;}

        /* ── items ── */
        .oh-items-label{
          font-size:11px; font-weight:700;
          text-transform:uppercase; color:#878787; margin-bottom:10px;
        }
        .oh-items-list{display:flex;flex-direction:column;gap:12px;}

        .oh-item{
          display:flex; align-items:center; gap:16px;
          background:#fff; border:1px solid #e0e0e0;
          border-radius:2px; padding:16px;
        }
        .oh-item-img{
          width:60px; height:60px; border-radius:2px;
          background:white; border:1px solid #e0e0e0;
          overflow:hidden; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
        }
        .oh-item-img img{width:100%;height:100%;object-fit:contain;padding:4px;}
        .oh-item-placeholder{width:28px;height:28px;background:#f0f0f0;border-radius:2px;}
        .oh-item-name{font-size:14px;font-weight:700;color:#212121;line-height:1.4;margin-bottom:4px;}
        .oh-item-meta{font-size:12px;color:#878787;font-weight:500;}
        .oh-item-price{
          font-size:16px; font-weight:700;
          color:#212121; flex-shrink:0; margin-left:auto;
        }
        .oh-item-row{display:flex;align-items:center;gap:14px;width:100%;cursor:pointer;}
        .oh-rate-row{
          margin-top:12px;padding-top:12px;
          border-top:1px solid #f0f0f0;
          display:flex;flex-wrap:wrap;align-items:center;gap:12px;
        }
        .oh-rate-lbl{font-size:11px;font-weight:700;text-transform:uppercase;color:#878787;}
        .oh-rate-stars{display:flex;gap:6px;}
        .oh-rate-star{
          width:30px;height:30px;border-radius:2px;
          background:white;border:1px solid #e0e0e0;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:all .15s;padding:0;
        }
        .oh-rate-star:hover{background:#eff6ff;border-color:#3b82f6;}
        .oh-rate-star svg{width:14px;height:14px;color:#f59e0b;}
        .oh-rate-done{font-size:12px;font-weight:700;color:#059669;}

        /* ── action sections ── */
        .oh-section-label{
          font-size:11px; font-weight:700;
          text-transform:uppercase; color:#878787; margin-bottom:10px;
          letter-spacing:0.04em;
        }
        .oh-action-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}

        /* tracking pill */
        .oh-track-pill{
          display:inline-flex; align-items:center; gap:8px;
          background:#eff6ff; border:1px solid rgba(59,130,246,0.15);
          color:#3b82f6; padding:6px 12px; border-radius:2px;
          font-size:11px; font-weight:700; text-transform:uppercase;
        }

        /* action buttons */
        .oh-btn{
          display:inline-flex; align-items:center; gap:7px;
          padding:10px 20px; border-radius:2px; border:none;
          font-size:11px; font-weight:700; text-transform:uppercase;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s;
        }
        .oh-btn.violet{background:#4f46e5;color:white;}
        .oh-btn.violet:hover{background:#4338ca;}
        .oh-btn.green{background:#059669;color:white;}
        .oh-btn.green:hover{background:#047857;}
        .oh-btn.blue{background:#3b82f6;color:white;}
        .oh-btn.blue:hover{background:#2563eb;}
        .oh-btn.outline{background:white;color:#3b82f6;border:1px solid #3b82f6;}
        .oh-btn.outline:hover{background:#eff6ff;}

        /* ── star rating ── */
        .oh-stars{display:flex;gap:6px;flex-wrap:wrap;}
        .oh-star{
          width:36px; height:36px; border-radius:2px;
          background:white; border:1px solid #e0e0e0;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all .15s;
        }
        .oh-star:hover{background:#eff6ff;border-color:#3b82f6;transform:scale(1.05);}
        .oh-star svg{width:16px;height:16px;}
        .oh-star.low svg{color:#d1d5db;}
        .oh-star.high svg{color:#f59e0b;}

        /* divider */
        .oh-divider{
          height:1px; width:100%;
          background:#e0e0e0;
        }

        /* Premium summary grid */
        .oh-summary-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 2px;
          padding: 18px;
          margin-top: 10px;
        }
        @media(min-width: 600px) {
          .oh-summary-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* Help Modal overlays */
        .oh-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(2px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .oh-modal {
          background: white;
          border-radius: 4px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          animation: ohUp 0.2s ease-out;
        }
        .oh-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .oh-modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #212121;
        }
        .oh-modal-close {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 18px;
          color: #212121;
        }
        .oh-modal-close:hover { background: #e0e0e0; }
        .oh-modal-body { padding: 20px; }
        .oh-form-group { margin-bottom: 16px; }
        .oh-form-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #878787;
          text-transform: uppercase;
          letter-spacing: .04em;
          margin-bottom: 6px;
        }
        .oh-form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 2px;
          font-size: 14px;
          font-family: inherit;
          background: white;
          outline: none;
        }
        .oh-form-input:focus {
          border-color: #2874f0;
        }
        .oh-modal-footer {
          padding: 12px 20px;
          border-top: 1px solid #f0f0f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .oh-modal-btn {
          padding: 10px 20px;
          border-radius: 2px;
          border: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          text-transform: uppercase;
        }
        .oh-modal-btn.cancel { background: #f5f5f5; color: #212121; }
        .oh-modal-btn.save { background: #fb641b; color: white; }
        .oh-modal-btn.save:hover { background: #e85a17; }

        /* Support Tickets & Feedback Additions */
        .oh-ticket-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 100px;
          background: rgba(79, 70, 229, 0.08); border: 1px solid rgba(79, 70, 229, 0.2);
          color: #4f46e5; font-size: 12px; font-weight: 700; white-space: nowrap;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .oh-ticket-btn:hover {
          background: #4f46e5; color: white; border-color: #4f46e5;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
        }
        .oh-ticket-badge {
          background: #ef4444; color: white;
          font-size: 10px; font-weight: 800; border-radius: 999px;
          padding: 2px 7px; line-height: 1;
        }

        .oh-tag-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 999px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
          border: 1px solid #e2e8f0; background: white; color: #475569;
          user-select: none;
        }
        .oh-tag-chip.active {
          background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; font-weight: 700;
        }
        .oh-tag-chip:hover {
          border-color: #93c5fd;
        }

        .oh-tab-item {
          padding: 10px 16px; font-size: 13px; font-weight: 700;
          cursor: pointer; border-bottom: 2px solid transparent;
          color: #64748b; transition: all 0.15s;
        }
        .oh-tab-item.active {
          color: #4f46e5; border-bottom-color: #4f46e5;
        }

        @keyframes ohUp{
          from{opacity:0;transform:translateY(12px);}
          to  {opacity:1;transform:translateY(0);}
        }
      `}</style>

      <div className="oh-root">
        <div className="oh-wrap">

          {/* ── PAGE HEADER ── */}
          <div className="oh-hd">
            <div>
              <div className="oh-eyebrow">My Account</div>
              <h1 className="oh-h1">Order <span>History</span></h1>
              <p className="oh-sub font-medium">Track, manage and request support for your orders.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="oh-ticket-btn"
                onClick={handleOpenTicketsHub}
              >
                <span style={{ fontSize: 15 }}>🎧</span>
                <span>Support Tickets</span>
                {myTickets.length > 0 && (
                  <span className="oh-ticket-badge">{myTickets.length}</span>
                )}
              </button>
              {orders.length > 0 && (
                <div className="oh-count-pill">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
                  </svg>
                  {orders.length} Order{orders.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* ── EMPTY ── */}
          {orders.length === 0 && (
            <div className="oh-empty">
              <div className="oh-empty-ico">📦</div>
              <div className="oh-empty-h">No Orders Yet</div>
              <p className="oh-empty-p">You haven't placed any orders. Browse our catalogue to get started.</p>
              <button className="oh-shop-btn" onClick={() => navigate('/products')}>
                Browse Catalogue
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── ORDER LIST ── */}
          {orders.length > 0 && (
            <div className="oh-list">
              {orders.map((order, idx) => {
                const isExpanded  = expandedId === order._id
                const statusIdx   = getStatusIndex(order)
                const displayStatus = order.status === 'PENDING_CASH_APPROVAL' ? 'NEW' : order.status
                const sc          = getStatusColor(order.status)
                const eta         = getETA(order.createdAt)
                
                const canCancel = !["CANCELLED", "RETURNED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "FULFILLED"].includes(order.status) && !order.shipping?.waybill && !order.delhiveryOrderId && !order.shiprocketOrderId;

                return (
                  <div
                    key={order._id}
                    className={`oh-card${isExpanded ? ' expanded' : ''}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {/* ── CARD HEADER ── */}
                    <div className="oh-card-hd" onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                      <div className="oh-card-meta">

                        <div className="oh-meta-item">
                          <div className="oh-meta-label">Order Date</div>
                          <div className="oh-meta-val">{fmtDate(order.createdAt)}</div>
                        </div>

                        <div className="oh-meta-item">
                          <div className="oh-meta-label">Total</div>
                          <div className="oh-meta-val" style={{ color:'#2874f0' }}>
                            ₹{Math.round(safeNumber(order.totalEstimate)).toLocaleString()}
                          </div>
                        </div>

                        <div className="oh-meta-item">
                          <div className="oh-meta-label">Items</div>
                          <div className="oh-meta-val">{order.items.length}</div>
                        </div>

                        <div className="oh-meta-item">
                          <div className="oh-meta-label">Status</div>
                          <div className="oh-status" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                            <span className="oh-sdot" style={{ background: sc.color }} />
                            {displayStatus}
                          </div>
                        </div>
                      </div>

                      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                        <span className="oh-oid">#{order.orderNumber || order._id.slice(-6).toUpperCase()}</span>
                        <svg className={`oh-chevron${isExpanded ? ' open' : ''}`} width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>
                    </div>

                    {/* ── EXPANDED BODY ── */}
                    {isExpanded && (
                      <div className="oh-body">

                        {/* STEPPER */}
                        <div>
                          <div className="oh-stepper-label">Order Lifecycle Timeline</div>
                          <div className="oh-stepper">
                            {STATUS_STEPS.map((step, i) => {
                              const done = i <= statusIdx
                              const isLast = i === STATUS_STEPS.length - 1
                              return (
                                <div key={step} className={`oh-step${done ? ' done' : ''}`}>
                                  <div className={`oh-step-circle${done ? ` done${isLast && statusIdx === 4 ? ' last' : ''}` : ' idle'}`}>
                                    {done
                                      ? <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                                      : i + 1
                                    }
                                  </div>
                                  <div className={`oh-step-label${done ? ` done${isLast && statusIdx === 4 ? ' last' : ''}` : ' idle'}`}>{step}</div>
                                </div>
                              )
                            })}
                          </div>
                          {statusIdx < 4 && order.status !== 'CANCELLED' && (
                            <div className="oh-eta">
                              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                              Estimated Delivery: <b>{!isNaN(eta.getTime()) ? eta.toLocaleDateString('en-IN', { month:'short', day:'2-digit' }) : ''}</b>
                            </div>
                          )}
                        </div>

                        <div className="oh-divider" />

                        {/* FLIPKART STYLE SUMMARY BREAKDOWN */}
                        <div className="oh-section-label">Order Payment & Billing Summary</div>
                        <div className="oh-summary-grid">
                          <div>
                            <div className="oh-info-title">Order Price Breakdown</div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13}}>
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#878787'}}>Product Total:</span>
                                <span style={{fontWeight: 600, color: '#212121'}}>₹{Math.round(safeNumber(order.productTotal || (order.totalEstimate - order.shippingCost - order.codCharge))).toLocaleString()}</span>
                              </div>
                              {order.couponDiscount > 0 && (
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                  <span style={{color: '#878787'}}>Coupon Discount ({order.couponCode}):</span>
                                  <span style={{fontWeight: 600, color: '#388e3c'}}>-₹{Math.round(safeNumber(order.couponDiscount)).toLocaleString()}</span>
                                </div>
                              )}
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#878787'}}>Delivery Charges:</span>
                                <span style={{fontWeight: 600, color: '#212121'}}>₹{Math.round(safeNumber(order.shippingCost)).toLocaleString()}</span>
                              </div>
                              {order.codCharge > 0 && (
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                  <span style={{color: '#878787'}}>COD Collection Fee:</span>
                                  <span style={{fontWeight: 600, color: '#212121'}}>₹{Math.round(safeNumber(order.codCharge)).toLocaleString()}</span>
                                </div>
                              )}
                              <div style={{height: 1, background: '#e0e0e0', margin: '4px 0'}} />
                              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700}}>
                                <span>Total Payable Value:</span>
                                <span style={{color: '#2874f0'}}>₹{Math.round(safeNumber(order.totalEstimate)).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="oh-info-title">Payment & Collection Details</div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13}}>
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#878787'}}>Payment Mode:</span>
                                <span style={{fontWeight: 600, color: '#212121'}}>{order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : order.paymentMethod}</span>
                              </div>
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#878787'}}>Payment Status:</span>
                                <span style={{
                                  fontWeight: 700, 
                                  color: order.paymentStatus === 'PAID' ? '#059669' : '#d97706',
                                  textTransform: 'uppercase',
                                  fontSize: 12
                                }}>{order.paymentStatus}</span>
                              </div>
                              {order.paymentMethod === 'COD' && (
                                <>
                                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span style={{color: '#878787'}}>COD Advance Paid (15%):</span>
                                    <span style={{fontWeight: 600, color: '#388e3c'}}>₹{Math.round(safeNumber(order.totalEstimate - order.codDueAmount)).toLocaleString()}</span>
                                  </div>
                                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700}}>
                                    <span style={{color: '#d97706'}}>Remaining Cash on Delivery:</span>
                                    <span style={{color: '#d97706'}}>₹{Math.round(safeNumber(order.codDueAmount)).toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="oh-divider" />

                        {/* INFO GRID */}
                        <div>
                          <div className="oh-section-label">Order Details</div>
                          <div className="oh-info-grid">
                            <div className="oh-info-card">
                              <div className="oh-info-title">Customer</div>
                              <div className="oh-info-row"><b>{order.customer?.name}</b></div>
                              {order.customer?.phone && <div className="oh-info-row">{order.customer.phone}</div>}
                              {order.customer?.email && <div className="oh-info-row">{order.customer.email}</div>}
                            </div>
                            <div className="oh-info-card">
                              <div className="oh-info-title">Identifiers</div>
                              <div className="oh-info-row">Order ID: <span className="oh-mono">{order._id}</span></div>
                              {order.billId && <div className="oh-info-row">Invoice Link ID: <span className="oh-mono">{order.billId}</span></div>}
                              <div className="oh-info-row" style={{ marginTop:4 }}>Placed: {fmtIST(order.createdAt)}</div>
                              <div className="oh-info-row">Updated: {fmtIST(order.updatedAt)}</div>
                            </div>
                            {order.shippingAddress?.line1 && (
                              <div className="oh-info-card" style={{ gridColumn:'1/-1' }}>
                                <div className="oh-info-title">Delivery Address</div>
                                <div className="oh-info-row">
                                  <b>{order.shippingAddress.line1}</b>
                                  {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                                  <div>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="oh-divider" />

                        {/* ITEMS */}
                        <div>
                          <div className="oh-items-label">Items Ordered ({order.items.length})</div>
                          <div className="oh-items-list">
                            {order.items.map((item, i) => {
                              const pid = orderLineProductId(item)
                              const canRateProduct = ['DELIVERED', 'FULFILLED'].includes(order.status) && !!pid
                              const already = pid && reviewedProductIds.has(pid)
                              
                              const getAttrs = (attr) => {
                                if (!attr) return {};
                                return attr instanceof Map ? Object.fromEntries(attr) : attr;
                              };
                              const displayAttributes = getAttrs(item.attributes);
                              const hasAttributes = displayAttributes && Object.entries(displayAttributes).filter(([, v]) => v).length > 0;

                              return (
                                <div key={i} className="oh-item" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
                                  <div
                                    className="oh-item-row"
                                    onClick={() => { if (pid) navigate(`/products/${pid}`) }}
                                    style={{ cursor: pid ? 'pointer' : 'default' }}
                                  >
                                    <div className="oh-item-img">
                                      {item.image
                                        ? <img src={getImageUrl(item.image, 100)} alt={item.name} loading="lazy" width="50" height="50" />
                                        : <div className="oh-item-placeholder" />
                                      }
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div className="oh-item-name">
                                        {item.name}
                                        {hasAttributes && (
                                          <span style={{ marginLeft: 8, color: '#878787', fontSize: '0.9em', fontWeight: 500 }}>
                                            ({Object.values(displayAttributes).filter(v => v).map(v => String(v).toUpperCase()).join(', ')})
                                          </span>
                                        )}
                                      </div>
                                      <div className="oh-item-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        <span className="oh-item-qty">Qty: {item.quantity} · ₹{Math.round(item.price)} each</span>
                                      </div>
                                    </div>
                                    <div className="oh-item-price">₹{Math.round(safeNumber(safeNumber(item.price) * safeNumber(item.quantity))).toLocaleString()}</div>
                                  </div>
                                  {canRateProduct && (
                                    <div className="oh-rate-row" onClick={(e) => e.stopPropagation()}>
                                      {already ? (
                                        <span className="oh-rate-done">Thanks — your product rating was saved.</span>
                                      ) : (
                                        <>
                                          <span className="oh-rate-lbl">Rate product</span>
                                          <div className="oh-rate-stars">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                key={star}
                                                type="button"
                                                className="oh-rate-star"
                                                title={`${star} stars`}
                                                onClick={async () => {
                                                  try {
                                                    await api.post(`/api/products/${pid}/reviews`, { rating: star, comment: '' })
                                                    markProductReviewed(pid)
                                                    notify('Thanks for rating this product', 'success')
                                                  } catch (err) {
                                                    const code = err?.response?.data?.error
                                                    notify(code === 'not_eligible' ? 'You can rate after this item is on a delivered order' : (err?.response?.data?.error || 'Could not save rating'), 'error')
                                                  }
                                                }}
                                              >
                                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z"/></svg>
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* DELIVERY FEEDBACK & RATING */}
                        {['DELIVERED', 'FULFILLED'].includes(order.status) && (
                          <>
                            <div className="oh-divider" />
                            <div>
                              <div className="oh-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                <span>Delivery Experience & Feedback</span>
                                {order.feedbackRating && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFeedback(order, order.feedbackRating)}
                                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                                  >
                                    Edit Review
                                  </button>
                                )}
                              </div>

                              {order.feedbackRating ? (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <svg
                                          key={star}
                                          viewBox="0 0 24 24"
                                          fill={star <= order.feedbackRating ? '#f59e0b' : '#e2e8f0'}
                                          width="18"
                                          height="18"
                                        >
                                          <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z" />
                                        </svg>
                                      ))}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: RATING_EMOTIONS[order.feedbackRating]?.color || '#059669' }}>
                                      {order.feedbackRating}/5 — {RATING_EMOTIONS[order.feedbackRating]?.text || 'Delivered'} {RATING_EMOTIONS[order.feedbackRating]?.emoji}
                                    </span>
                                    {order.feedbackAt && (
                                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                                        Reviewed on {fmtDate(order.feedbackAt)}
                                      </span>
                                    )}
                                  </div>

                                  {Array.isArray(order.feedbackTags) && order.feedbackTags.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                      {order.feedbackTags.map((t, idx) => (
                                        <span
                                          key={idx}
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            padding: '3px 10px',
                                            borderRadius: 999,
                                            background: '#ecfdf5',
                                            color: '#065f46',
                                            border: '1px solid #a7f3d0'
                                          }}
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {order.feedbackComment && (
                                    <div style={{ marginTop: 10, fontSize: 13, color: '#334155', fontStyle: 'italic', background: 'white', padding: '10px 14px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                                      "{order.feedbackComment}"
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>🎉 Order Delivered!</span>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: '#15803d' }}>How was your delivery & product experience?</span>
                                      </div>
                                      <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                                        Rate now to share feedback with our artisans and delivery teams.
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            type="button"
                                            title={`Rate ${star} Star`}
                                            onClick={() => handleOpenFeedback(order, star)}
                                            style={{
                                              background: 'white',
                                              border: '1px solid #cbd5e1',
                                              borderRadius: 4,
                                              width: 32,
                                              height: 32,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              transition: 'all .15s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'scale(1)'; }}
                                          >
                                            <svg viewBox="0 0 24 24" fill="#f59e0b" width="16" height="16">
                                              <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z" />
                                            </svg>
                                          </button>
                                        ))}
                                      </div>
                                      <button
                                        type="button"
                                        className="oh-btn"
                                        style={{ background: '#16a34a', color: 'white', padding: '8px 14px', fontSize: 11 }}
                                        onClick={() => handleOpenFeedback(order, 5)}
                                      >
                                        ⭐ Rate Order
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* ACTIONS ROW (INVOICE, TRACKING, HELP, CANCELLATION) */}
                        <div className="oh-divider" />
                        <div>
                          <div className="oh-section-label">Actions</div>
                          <div className="oh-action-row">
                            {['DELIVERED', 'FULFILLED'].includes(order.status) && (
                              <button
                                className="oh-btn outline"
                                style={{ borderColor: '#16a34a', color: '#16a34a', background: '#f0fdf4' }}
                                onClick={() => handleOpenFeedback(order, order.feedbackRating || 5)}
                              >
                                ⭐ {order.feedbackRating ? 'Edit Review' : 'Rate & Review'}
                              </button>
                            )}

                            {order.paymentStatus === 'PAID' && order.billId && (
                              <>
                                <button className="oh-btn green" onClick={() => {
                                  const t = localStorage.getItem('token')
                                  window.open(`${api.defaults.baseURL}/api/bills/${order.billId}/pdf?token=${t}`, '_blank')
                                }}>
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/></svg>
                                  Invoice PDF
                                </button>
                                <button className="oh-btn outline" onClick={() => {
                                  const t = localStorage.getItem('token')
                                  window.open(`${api.defaults.baseURL}/api/bills/${order.billId}/html?token=${t}`, '_blank')
                                }}>
                                  Invoice HTML
                                </button>
                              </>
                            )}

                            {order.shipping?.waybill && (
                              <button className="oh-btn blue" onClick={() => {
                                const url = order.shipping.trackingUrl || `${api.defaults.baseURL}/api/shipping/delhivery/track/${order.shipping.waybill}`
                                window.open(url, '_blank')
                              }}>
                                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                                Track shipment
                              </button>
                            )}

                            <button className="oh-btn outline" onClick={() => handleOpenHelp(order)}>
                              🎧 Support Ticket
                            </button>

                            {canCancel && (
                              <button 
                                className="oh-btn outline" 
                                style={{borderColor: '#dc2626', color: '#dc2626'}}
                                onClick={() => handleOpenCancel(order._id)}
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* SUPPORT TICKETS HUB MODAL */}
      {showTicketsModal && (
        <div className="oh-modal-overlay">
          <div className="oh-modal" style={{ maxWidth: 640 }}>
            {/* Modal Header */}
            <div className="oh-modal-header" style={{ padding: '14px 20px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🎧</span>
                <div>
                  <div className="oh-modal-title" style={{ fontSize: 16 }}>Support Helpdesk</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>We're here to assist with your orders, returns & payments</div>
                </div>
              </div>
              <button className="oh-modal-close" onClick={() => setShowTicketsModal(false)}>×</button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fafafa', padding: '0 16px' }}>
              <button
                type="button"
                className={`oh-tab-item${ticketTab === 'list' || ticketTab === 'detail' ? ' active' : ''}`}
                onClick={() => setTicketTab('list')}
              >
                My Tickets ({myTickets.length})
              </button>
              <button
                type="button"
                className={`oh-tab-item${ticketTab === 'create' ? ' active' : ''}`}
                onClick={() => {
                  setTicketTab('create')
                  if (!ticketSubject && orders.length > 0) {
                    setTicketOrderId(orders[0]._id)
                    setTicketSubject(`Help with Order #${orders[0].orderNumber || orders[0]._id.slice(-6).toUpperCase()}`)
                  }
                }}
              >
                ➕ Raise New Ticket
              </button>
            </div>

            <div className="oh-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '18px 20px' }}>
              {/* TAB 1: TICKETS LIST */}
              {ticketTab === 'list' && (
                <div>
                  {myTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 12px' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🎫</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>No Support Tickets</div>
                      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '6px auto 16px' }}>
                        You don't have any support queries. Have an issue with an order, delivery or refund?
                      </p>
                      <button
                        type="button"
                        className="oh-btn violet"
                        onClick={() => setTicketTab('create')}
                      >
                        ➕ Raise a Support Ticket
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {myTickets.map((t) => {
                        const isResolved = t.status === 'Resolved' || t.status === 'Closed'
                        const statusColors = {
                          Open: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                          'In Progress': { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
                          Resolved: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
                          Closed: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
                        }
                        const sc = statusColors[t.status] || statusColors.Open

                        return (
                          <div
                            key={t._id}
                            onClick={() => handleSelectTicket(t)}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: 8,
                              padding: '14px 16px',
                              cursor: 'pointer',
                              background: 'white',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                                {t.category}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: sc.bg,
                                  color: sc.text,
                                  border: `1px solid ${sc.border}`
                                }}
                              >
                                {t.status}
                              </span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 6 }}>
                              {t.subject}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                              <span>
                                {t.order?.orderNumber ? `Order #${t.order.orderNumber}` : (t.order ? `Order #${t.order._id?.slice(-6).toUpperCase()}` : 'General Inquiry')}
                              </span>
                              <span>{fmtDate(t.createdAt)} · {t.messages?.length || 0} msg{(t.messages?.length !== 1 ? 's' : '')}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TICKET DETAIL & CHAT */}
              {ticketTab === 'detail' && activeTicket && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => setTicketTab('list')}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      ← Back to tickets
                    </button>
                    {activeTicket.status !== 'Resolved' && activeTicket.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={handleResolveTicket}
                        disabled={resolvingTicket}
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        {resolvingTicket ? 'Resolving...' : '✓ Mark as Resolved'}
                      </button>
                    )}
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#e0e7ff', color: '#4338ca' }}>
                        {activeTicket.category}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: activeTicket.status === 'Resolved' ? '#dcfce7' : '#fef3c7', color: activeTicket.status === 'Resolved' ? '#15803d' : '#b45309' }}>
                        {activeTicket.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{activeTicket.subject}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Created on {fmtIST(activeTicket.createdAt)}
                    </div>
                  </div>

                  {/* Conversation thread */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                    Conversation History
                  </div>
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      maxHeight: 280,
                      overflowY: 'auto'
                    }}
                  >
                    {activeTicket.messages?.map((msg, i) => {
                      const isAdmin = msg.senderModel === 'Admin'
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isAdmin ? 'flex-start' : 'flex-end',
                            gap: 3
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 700, color: isAdmin ? '#4f46e5' : '#64748b' }}>
                            {isAdmin ? '🎧 Support Team' : 'You'}
                          </div>
                          <div
                            style={{
                              maxWidth: '85%',
                              padding: '10px 14px',
                              borderRadius: isAdmin ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                              background: isAdmin ? '#f1f5f9' : '#4f46e5',
                              color: isAdmin ? '#1e293b' : 'white',
                              fontSize: 13,
                              lineHeight: 1.45,
                              wordBreak: 'break-word'
                            }}
                          >
                            {msg.message}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{fmtIST(msg.createdAt)}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Reply Input Form */}
                  <form onSubmit={handleSendTicketReply} style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="oh-form-input"
                        placeholder="Type your message to support..."
                        value={ticketReply}
                        onChange={(e) => setTicketReply(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        className="oh-btn violet"
                        style={{ padding: '0 18px', flexShrink: 0 }}
                        disabled={sendingReply}
                      >
                        {sendingReply ? '...' : 'Send'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: CREATE TICKET FORM */}
              {ticketTab === 'create' && (
                <form onSubmit={handleCreateTicket}>
                  {orders.length > 0 && (
                    <div className="oh-form-group">
                      <label className="oh-form-label">Related Order (Optional)</label>
                      <select
                        className="oh-form-input"
                        value={ticketOrderId}
                        onChange={(e) => {
                          const val = e.target.value
                          setTicketOrderId(val)
                          if (val) {
                            const o = orders.find(x => x._id === val)
                            if (o) setTicketSubject(`Help with Order #${o.orderNumber || o._id.slice(-6).toUpperCase()}`)
                          }
                        }}
                      >
                        <option value="">General Query (No specific order)</option>
                        {orders.map((o) => (
                          <option key={o._id} value={o._id}>
                            Order #{o.orderNumber || o._id.slice(-6).toUpperCase()} — {fmtDate(o.createdAt)} (₹{Math.round(safeNumber(o.totalEstimate)).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="oh-form-group">
                    <label className="oh-form-label">Query Category</label>
                    <select
                      className="oh-form-input"
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                    >
                      <option value="Order Issue">Order Status / Delivery Issue</option>
                      <option value="Product Issue">Product Quality / Damage Query</option>
                      <option value="Payment Issue">Payment & Refund Queries</option>
                      <option value="Return/Refund">Return or Exchange Request</option>
                      <option value="General Query">General Customer Support</option>
                      <option value="Other">Other Query</option>
                    </select>
                  </div>

                  <div className="oh-form-group">
                    <label className="oh-form-label">Subject</label>
                    <input
                      type="text"
                      className="oh-form-input"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Where is my delivery? / Damaged item received"
                      required
                    />
                  </div>

                  <div className="oh-form-group">
                    <label className="oh-form-label">Detailed Description</label>
                    <textarea
                      className="oh-form-input"
                      rows="4"
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      placeholder="Explain what happened in detail so our customer happiness team can help you resolve it quickly..."
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                    <button type="button" className="oh-btn outline" onClick={() => setTicketTab('list')}>
                      Cancel
                    </button>
                    <button type="submit" className="oh-btn violet" disabled={submittingTicket}>
                      {submittingTicket ? 'Submitting...' : 'Submit Support Ticket'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY FEEDBACK & REVIEW MODAL */}
      {showFeedbackModal && feedbackOrder && (
        <div className="oh-modal-overlay">
          <div className="oh-modal" style={{ maxWidth: 540 }}>
            <div className="oh-modal-header" style={{ background: '#f8fafc' }}>
              <div>
                <div className="oh-modal-title">Order Delivery Experience</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Order #{feedbackOrder.orderNumber || feedbackOrder._id.slice(-6).toUpperCase()}
                </div>
              </div>
              <button className="oh-modal-close" onClick={() => setShowFeedbackModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitFeedback}>
              <div className="oh-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Overall Rating Section */}
                <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    How was your delivery experience?
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (feedbackHover || feedbackRating)
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setFeedbackHover(star)}
                          onMouseLeave={() => setFeedbackHover(0)}
                          onClick={() => setFeedbackRating(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            transform: active ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s'
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill={active ? '#f59e0b' : '#cbd5e1'}
                            width="34"
                            height="34"
                          >
                            <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z" />
                          </svg>
                        </button>
                      )
                    })}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: RATING_EMOTIONS[feedbackHover || feedbackRating]?.color || '#059669'
                    }}
                  >
                    {RATING_EMOTIONS[feedbackHover || feedbackRating]?.text} {RATING_EMOTIONS[feedbackHover || feedbackRating]?.emoji}
                  </div>
                </div>

                {/* Quick Feedback Tags */}
                <div className="oh-form-group">
                  <label className="oh-form-label">What stood out to you?</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {FEEDBACK_TAG_OPTIONS.map((tag) => {
                      const isSelected = feedbackTags.includes(tag)
                      return (
                        <div
                          key={tag}
                          className={`oh-tag-chip${isSelected ? ' active' : ''}`}
                          onClick={() => handleToggleTag(tag)}
                        >
                          <span>{tag}</span>
                          {isSelected && <span>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Feedback Comment */}
                <div className="oh-form-group">
                  <label className="oh-form-label">Detailed Comments & Experience</label>
                  <textarea
                    className="oh-form-input"
                    rows="3"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Tell us what you loved about the delivery, product quality, or packaging..."
                  />
                </div>

                {/* Products in this order */}
                {feedbackOrder.items?.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                    <div className="oh-form-label" style={{ marginBottom: 10 }}>
                      Rate Items in this Order (Optional)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {feedbackOrder.items.map((item, idx) => {
                        const pid = orderLineProductId(item)
                        const currentRate = itemRatings[pid] || 0
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: '#f8fafc',
                              borderRadius: 6,
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1, paddingRight: 10 }} className="truncate">
                              {item.name}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setItemRatings(prev => ({ ...prev, [pid]: s }))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill={s <= currentRate ? '#f59e0b' : '#cbd5e1'}
                                    width="18"
                                    height="18"
                                  >
                                    <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="oh-modal-footer">
                <button type="button" className="oh-modal-btn cancel" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="oh-modal-btn save" disabled={submittingFeedback}>
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCELLATION CONFIRM MODAL */}
      {showCancelModal && cancellingId && (
        <div className="oh-modal-overlay">
          <div className="oh-modal" style={{maxWidth: 440}}>
            <div className="oh-modal-header">
              <div className="oh-modal-title" style={{color: '#dc2626'}}>Cancel Order</div>
              <button className="oh-modal-close" onClick={() => setShowCancelModal(false)}>×</button>
            </div>
            <form onSubmit={handleConfirmCancel}>
              <div className="oh-modal-body">
                <p style={{fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5}}>
                  Are you sure you want to cancel this order?
                  <br />
                  <span style={{fontWeight: 700, color: '#212121'}}>Note:</span> COD advance payment refunds will be processed back to the original source method minus standard Cashfree payment gateway transaction fees.
                </p>
                <div className="oh-form-group">
                  <label className="oh-form-label">Reason for cancellation</label>
                  <textarea 
                    className="oh-form-input" 
                    rows="3" 
                    value={cancelReason} 
                    onChange={e => setCancelReason(e.target.value)} 
                    placeholder="Optional: Please share your reason for cancelling."
                  />
                </div>
              </div>
              <div className="oh-modal-footer">
                <button type="button" className="oh-modal-btn cancel" onClick={() => setShowCancelModal(false)}>Keep Order</button>
                <button type="submit" className="oh-modal-btn save" style={{background: '#dc2626'}} disabled={loading}>
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}