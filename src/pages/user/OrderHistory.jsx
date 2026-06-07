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
  if (order.status === 'FULFILLED' || order.status === 'DELIVERED') return 4
  if (order.shipping?.waybill) return 3
  if (order.status === 'CONFIRMED') return 2
  if (order.status === 'NEW' || order.status === 'PENDING_CASH_APPROVAL') return 1
  return 0
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

export default function OrderHistory() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [reviewedProductIds, setReviewedProductIds] = useState(loadReviewedProductIds)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const { notify } = useToast()

  // Support Help Modal States
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [helpOrder, setHelpOrder] = useState(null)
  const [helpCategory, setHelpCategory] = useState('Order Status')
  const [helpSubject, setHelpSubject] = useState('')
  const [helpDescription, setHelpDescription] = useState('')
  const [submittingHelp, setSubmittingHelp] = useState(false)

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

  useEffect(() => {
    if (!token) { navigate('/login', { state: { from: location.pathname + location.search } }); return }
    api.get('/api/orders/my')
      .then(({ data }) => { setOrders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token, navigate])

  const handleOpenHelp = (order) => {
    setHelpOrder(order)
    setHelpCategory('Order Status')
    setHelpSubject(`Issue with Order #${order.orderNumber || order._id.slice(-6).toUpperCase()}`)
    setHelpDescription('')
    setShowHelpModal(true)
  }

  const handleCreateSupportTicket = async (e) => {
    e.preventDefault()
    setSubmittingHelp(true)
    try {
      await api.post('/api/support-tickets', {
        subject: helpSubject,
        description: helpDescription,
        category: helpCategory,
        orderId: helpOrder._id
      })
      notify('Support ticket raised successfully!', 'success')
      setShowHelpModal(false)
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to create support ticket', 'error')
    } finally {
      setSubmittingHelp(false)
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
      notify('Order cancelled successfully!', 'success')
      // Reload orders
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
        .oh-load-root { font-family:'DM Sans',sans-serif; background:#f1f3f6; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:32px; position:relative; overflow:hidden; }
        .oh-load-root::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle at 2px 2px, rgba(40,116,240,.05) 1px, transparent 0); background-size:32px 32px; }
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
          background:#f1f3f6; min-height:100vh; color:#212121;
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
          background:rgba(40,116,240,0.08); border:1px solid rgba(40,116,240,0.15);
          color:#2874f0; font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
          margin-bottom:8px;
        }
        .oh-h1{
          font-size:24px;
          font-weight:700;
          color:#212121; line-height:1.2; margin-bottom:4px;
        }
        .oh-h1 span{color:#2874f0;}
        .oh-sub{font-size:13px;color:#878787;font-weight:400;}
        .oh-count-pill{
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px; border-radius:100px;
          background:white; border:1px solid #e0e0e0;
          color:#2874f0; font-size:12px; font-weight:700; white-space:nowrap;
          box-shadow:0 1px 2px rgba(0,0,0,0.05);
        }

        /* ── empty state ── */
        .oh-empty{
          background:white; border:1px solid #e0e0e0;
          border-radius:4px; padding:56px 24px; text-align:center;
          box-shadow:0 1px 2px rgba(0,0,0,0.05);
        }
        .oh-empty-ico{
          width:64px; height:64px; border-radius:50%; margin:0 auto 16px;
          background:#f0f5ff; border:1px solid rgba(40,116,240,0.15);
          display:flex; align-items:center; justify-content:center; font-size:28px;
        }
        .oh-empty-h{
          font-size:20px; font-weight:700;
          color:#212121; margin-bottom:8px;
        }
        .oh-empty-p{font-size:14px;color:#878787;margin-bottom:24px;}
        .oh-shop-btn{
          display:inline-flex; align-items:center; gap:8px;
          background:#fb641b; color:white;
          padding:12px 24px; border-radius:2px; border:none;
          font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s;
          box-shadow:0 1px 2px rgba(0,0,0,0.1);
        }
        .oh-shop-btn:hover{background:#e85a17;}

        /* ── order list ── */
        .oh-list{display:flex;flex-direction:column;gap:16px;}

        /* ── order card ── */
        .oh-card{
          background:white; border:1px solid #e0e0e0;
          border-radius:4px; overflow:hidden;
          box-shadow:0 1px 3px rgba(0,0,0,0.08);
          transition:all .2s;
        }
        .oh-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.1);}
        .oh-card.expanded{box-shadow:0 4px 12px rgba(0,0,0,0.12); border-color:#2874f0;}

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
          font-size:12px; color:#2874f0; font-weight:700;
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
          background:#2874f0;
        }

        .oh-step-circle{
          width:24px; height:24px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:700; position:relative; z-index:1;
          transition:all .3s;
        }
        .oh-step-circle.done{background:#2874f0;color:white;}
        .oh-step-circle.done.last{background:#059669;}
        .oh-step-circle.idle{background:#f0f5ff;color:#2874f0;border:2px solid #2874f0;}

        .oh-step-label{
          margin-top:8px; font-size:11px; font-weight:700;
          text-transform:uppercase; text-align:center;
          transition:color .3s;
        }
        .oh-step-label.done{color:#2874f0;}
        .oh-step-label.done.last{color:#059669;}
        .oh-step-label.idle{color:#878787;}

        /* eta */
        .oh-eta{
          display:inline-flex; align-items:center; gap:6px;
          font-size:12px; font-weight:600; color:#212121;
          background:#f0f5ff; border:1px solid rgba(40,116,240,0.1);
          padding:6px 12px; border-radius:2px; margin-top:12px;
        }
        .oh-eta b{color:#2874f0;}

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
        .oh-mono{font-family:monospace;font-size:11px;color:#2874f0;}

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
        .oh-rate-star:hover{background:#f0f5ff;border-color:#2874f0;}
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
          background:#f0f5ff; border:1px solid rgba(40,116,240,0.15);
          color:#2874f0; padding:6px 12px; border-radius:2px;
          font-size:11px; font-weight:700; text-transform:uppercase;
        }

        /* action buttons */
        .oh-btn{
          display:inline-flex; align-items:center; gap:7px;
          padding:10px 20px; border-radius:2px; border:none;
          font-size:11px; font-weight:700; text-transform:uppercase;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s;
        }
        .oh-btn.violet{background:#2874f0;color:white;}
        .oh-btn.violet:hover{background:#1c5fd0;}
        .oh-btn.green{background:#059669;color:white;}
        .oh-btn.green:hover{background:#047857;}
        .oh-btn.blue{background:#2874f0;color:white;}
        .oh-btn.blue:hover{background:#1c5fd0;}
        .oh-btn.outline{background:white;color:#2874f0;border:1px solid #2874f0;}
        .oh-btn.outline:hover{background:#f0f5ff;}

        /* ── star rating ── */
        .oh-stars{display:flex;gap:6px;flex-wrap:wrap;}
        .oh-star{
          width:36px; height:36px; border-radius:2px;
          background:white; border:1px solid #e0e0e0;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all .15s;
        }
        .oh-star:hover{background:#f0f5ff;border-color:#2874f0;transform:scale(1.05);}
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
              <p className="oh-sub font-medium">Track, manage and request support for your wholesale B2B orders.</p>
            </div>
            {orders.length > 0 && (
              <div className="oh-count-pill">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
                </svg>
                {orders.length} Order{orders.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* ── EMPTY ── */}
          {orders.length === 0 && (
            <div className="oh-empty">
              <div className="oh-empty-ico">📦</div>
              <div className="oh-empty-h">No Orders Yet</div>
              <p className="oh-empty-p">You haven't placed any orders. Browse our wholesale catalogue to get started.</p>
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
                
                const canCancel = !["CANCELLED", "RETURNED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "FULFILLED"].includes(order.status) && !order.shipping?.waybill && !order.shiprocketOrderId;

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
                            ₹{safeNumber(order.totalEstimate).toLocaleString()}
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
                            <div className="oh-info-title">Wholesale Price Breakdown</div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13}}>
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#878787'}}>Product Total:</span>
                                <span style={{fontWeight: 600, color: '#212121'}}>₹{safeNumber(order.productTotal || (order.totalEstimate - order.shippingCost - order.codCharge)).toLocaleString()}</span>
                              </div>
                              {order.couponDiscount > 0 && (
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                  <span style={{color: '#878787'}}>Coupon Discount ({order.couponCode}):</span>
                                  <span style={{fontWeight: 600, color: '#388e3c'}}>-₹{safeNumber(order.couponDiscount).toLocaleString()}</span>
                                </div>
                              )}
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#878787'}}>Delivery Charges:</span>
                                <span style={{fontWeight: 600, color: '#212121'}}>₹{safeNumber(order.shippingCost).toLocaleString()}</span>
                              </div>
                              {order.codCharge > 0 && (
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                  <span style={{color: '#878787'}}>COD Collection Fee:</span>
                                  <span style={{fontWeight: 600, color: '#212121'}}>₹{safeNumber(order.codCharge).toLocaleString()}</span>
                                </div>
                              )}
                              <div style={{height: 1, background: '#e0e0e0', margin: '4px 0'}} />
                              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700}}>
                                <span>Total Payable Value:</span>
                                <span style={{color: '#2874f0'}}>₹{safeNumber(order.totalEstimate).toLocaleString()}</span>
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
                                    <span style={{fontWeight: 600, color: '#388e3c'}}>₹{safeNumber(Math.round(order.totalEstimate - order.codDueAmount)).toLocaleString()}</span>
                                  </div>
                                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700}}>
                                    <span style={{color: '#d97706'}}>Remaining Cash on Delivery:</span>
                                    <span style={{color: '#d97706'}}>₹{safeNumber(order.codDueAmount).toLocaleString()}</span>
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
                                        <span className="oh-item-qty">Qty: {item.quantity} · ₹{item.price} each</span>
                                      </div>
                                    </div>
                                    <div className="oh-item-price">₹{safeNumber(safeNumber(item.price) * safeNumber(item.quantity)).toLocaleString()}</div>
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

                        {/* RATING */}
                        {order.status === 'FULFILLED' && !order.feedbackRating && (
                          <>
                            <div className="oh-divider" />
                            <div>
                              <div className="oh-section-label">Rate This Delivery</div>
                              <div className="oh-stars">
                                {[1,2,3,4,5].map(star => (
                                  <button
                                    key={star}
                                    className={`oh-star ${star <= 3 ? 'low' : 'high'}`}
                                    title={`${star} Star`}
                                    onClick={async () => {
                                      try {
                                        const { data } = await api.post(`/api/orders/${order._id}/feedback`, { rating: star })
                                        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, feedbackRating: data.feedbackRating } : o))
                                      } catch {}
                                    }}
                                  >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z"/>
                                    </svg>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {order.feedbackRating && (
                          <>
                            <div className="oh-divider" />
                            <div>
                              <div className="oh-section-label">Your Rating</div>
                              <div className="oh-stars">
                                {[1,2,3,4,5].map(star => (
                                  <div key={star} className={`oh-star ${star <= 3 ? 'low' : 'high'}`} style={{ cursor:'default' }}>
                                    <svg viewBox="0 0 24 24" fill={star <= order.feedbackRating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                                      <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z"/>
                                    </svg>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* ACTIONS ROW (INVOICE, TRACKING, HELP, CANCELLATION) */}
                        <div className="oh-divider" />
                        <div>
                          <div className="oh-section-label">Actions</div>
                          <div className="oh-action-row">
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
                              Need Help?
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

      {/* HELP TICKET MODAL */}
      {showHelpModal && helpOrder && (
        <div className="oh-modal-overlay">
          <div className="oh-modal">
            <div className="oh-modal-header">
              <div className="oh-modal-title">Need Help with Order #{helpOrder.orderNumber || helpOrder._id.slice(-6).toUpperCase()}</div>
              <button className="oh-modal-close" onClick={() => setShowHelpModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSupportTicket}>
              <div className="oh-modal-body">
                <div className="oh-form-group">
                  <label className="oh-form-label">Category</label>
                  <select 
                    className="oh-form-input" 
                    value={helpCategory} 
                    onChange={e => setHelpCategory(e.target.value)}
                  >
                    <option value="Order Status">Order Status Query</option>
                    <option value="Delivery Issue">Delivery Issues</option>
                    <option value="Payment Issue">Payment/Refund Issues</option>
                    <option value="Return Request">Return/Exchange Request</option>
                    <option value="Other">Other Query</option>
                  </select>
                </div>
                <div className="oh-form-group">
                  <label className="oh-form-label">Subject</label>
                  <input 
                    type="text" 
                    className="oh-form-input" 
                    value={helpSubject} 
                    onChange={e => setHelpSubject(e.target.value)} 
                    required 
                  />
                </div>
                <div className="oh-form-group">
                  <label className="oh-form-label">Describe your issue</label>
                  <textarea 
                    className="oh-form-input" 
                    rows="4" 
                    value={helpDescription} 
                    onChange={e => setHelpDescription(e.target.value)} 
                    placeholder="Provide details of your query so our support team can assist you." 
                    required
                  />
                </div>
              </div>
              <div className="oh-modal-footer">
                <button type="button" className="oh-modal-btn cancel" onClick={() => setShowHelpModal(false)}>Cancel</button>
                <button type="submit" className="oh-modal-btn save" disabled={submittingHelp}>
                  {submittingHelp ? 'Submitting...' : 'Submit Ticket'}
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