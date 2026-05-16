import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'

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

const fmtIST = (d) => new Date(d).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true
})
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
  timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric'
})

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
  if (s === 'FULFILLED' || s === 'DELIVERED') return { bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.2)', color: '#059669' }
  if (s === 'CANCELLED') return { bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.2)', color: '#dc2626' }
  return { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', color: '#7c3aed' }
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

  /* ── LOADING ── */
  if (loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;700&display=swap');
        .oh-load-root { font-family:'DM Sans',sans-serif; background:#f5f3ff; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:32px; position:relative; overflow:hidden; }
        .oh-load-root::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle at 2px 2px, rgba(124,58,237,.05) 1px, transparent 0); background-size:32px 32px; }
        
        .oh-load-box { position:relative; width:100px; height:100px; display:flex; align-items:center; justify-content:center; z-index:1; }
        .oh-load-circle { position:absolute; inset:0; border:2px dashed rgba(124,58,237,.2); border-radius:50%; animation:ohRotate 8s linear infinite; }
        .oh-load-inner { width:60px; height:60px; background:white; border-radius:20px; box-shadow:0 10px 30px rgba(124,58,237,.15); display:flex; align-items:center; justify-content:center; font-size:28px; border:1px solid rgba(124,58,237,.1); animation:ohFloat 2s ease-in-out infinite; }
        
        .oh-load-txt-wrap { text-align:center; z-index:1; }
        .oh-load-h { font-family:'Bebas Neue',sans-serif; font-size:24px; color:#1e1b2e; letter-spacing:.05em; margin-bottom:4px; }
        .oh-load-p { font-size:10px; font-weight:800; color:#7c3aed; text-transform:uppercase; letter-spacing:.2em; opacity:.6; }
        
        @keyframes ohRotate { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes ohFloat { 0%, 100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-10px) rotate(5deg); } }
      `}</style>
      <div className="oh-load-root">
        <div className="oh-load-box">
          <div className="oh-load-circle" />
          <div className="oh-load-inner">📜</div>
        </div>
        <div className="oh-load-txt-wrap">
          <h2 className="oh-load-h">Order History</h2>
          <p className="oh-load-p">Retrieving your purchases…</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .oh-root{
          font-family:'DM Sans',system-ui,sans-serif;
          background:#f5f3ff; min-height:100vh; color:#1e1b2e;
          position:relative; overflow-x:hidden;
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .oh-root::before{
          content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:
            linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),
            linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px);
          background-size:60px 60px;
        }
        .oh-blob{
          position:fixed; top:-180px; left:50%; transform:translateX(-50%);
          width:800px; height:500px; border-radius:50%; pointer-events:none; z-index:0;
          background:radial-gradient(ellipse,rgba(139,92,246,0.08),transparent 65%);
        }
        .oh-blob2{
          position:fixed; bottom:-150px; right:-100px;
          width:500px; height:500px; border-radius:50%; pointer-events:none; z-index:0;
          background:radial-gradient(ellipse,rgba(109,40,217,0.05),transparent 65%);
        }
        .oh-wrap{
          max-width:900px; margin:0 auto;
          padding:36px 16px 80px; position:relative; z-index:1;
        }
        @media(min-width:600px){.oh-wrap{padding:48px 24px 80px;}}

        /* ── page header ── */
        .oh-hd{
          display:flex; align-items:flex-start; justify-content:space-between;
          flex-wrap:wrap; gap:14px; margin-bottom:32px;
          animation:ohUp .6s ease both;
        }
        .oh-eyebrow{
          display:inline-flex; align-items:center; gap:7px;
          padding:5px 14px; border-radius:100px;
          background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.22);
          color:#7c3aed; font-size:9px; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
          margin-bottom:10px;
        }
        .oh-edot{
          width:5px; height:5px; border-radius:50%;
          background:#7c3aed; box-shadow:0 0 5px rgba(124,58,237,.5);
          animation:ohpulse 2s ease infinite;
        }
        @keyframes ohpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
        .oh-h1{
          font-family:'Bebas Neue',sans-serif;
          font-size:clamp(34px,5vw,52px);
          color:#1e1b2e; letter-spacing:.02em; line-height:1; margin-bottom:6px;
        }
        .oh-h1 span{color:#7c3aed;}
        .oh-sub{font-size:13px;color:#6b7280;font-weight:400;}
        .oh-count-pill{
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px; border-radius:100px;
          background:rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.18);
          color:#7c3aed; font-size:12px; font-weight:700; white-space:nowrap;
        }

        /* ── empty state ── */
        .oh-empty{
          background:white; border:1px solid rgba(139,92,246,0.12);
          border-radius:24px; padding:64px 24px; text-align:center;
          box-shadow:0 4px 24px rgba(139,92,246,0.06);
          position:relative; overflow:hidden;
          animation:ohUp .6s .1s ease both;
        }
        .oh-empty::before{
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,transparent 10%,#7c3aed 50%,transparent 90%);
        }
        .oh-empty-ico{
          width:72px; height:72px; border-radius:20px; margin:0 auto 20px;
          background:#f5f3ff; border:1px solid rgba(139,92,246,0.18);
          display:flex; align-items:center; justify-content:center; font-size:30px;
        }
        .oh-empty-h{
          font-family:'Bebas Neue',sans-serif; font-size:28px;
          color:#1e1b2e; letter-spacing:.03em; margin-bottom:8px;
        }
        .oh-empty-p{font-size:14px;color:#9ca3af;margin-bottom:28px;}
        .oh-shop-btn{
          display:inline-flex; align-items:center; gap:8px;
          background:#7c3aed; color:white;
          padding:13px 28px; border-radius:12px; border:none;
          font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.14em;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .25s;
          box-shadow:0 6px 20px rgba(124,58,237,.28);
        }
        .oh-shop-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(124,58,237,.4);}

        /* ── order list ── */
        .oh-list{display:flex;flex-direction:column;gap:16px;}

        /* ── order card ── */
        .oh-card{
          background:white; border:1px solid rgba(139,92,246,0.12);
          border-radius:20px; overflow:hidden;
          box-shadow:0 2px 16px rgba(139,92,246,0.05);
          transition:all .3s; position:relative;
          animation:ohUp .5s ease both;
        }
        .oh-card::before{
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,transparent 10%,#7c3aed 50%,transparent 90%);
          opacity:0; transition:opacity .3s;
        }
        .oh-card:hover{box-shadow:0 8px 32px rgba(124,58,237,.1);border-color:rgba(124,58,237,.22);}
        .oh-card:hover::before{opacity:1;}
        .oh-card.expanded{border-color:rgba(124,58,237,.25);box-shadow:0 8px 32px rgba(124,58,237,.1);}
        .oh-card.expanded::before{opacity:1;}

        /* card header row */
        .oh-card-hd{
          padding:18px 20px; cursor:pointer;
          border-bottom:1px solid rgba(139,92,246,0.07);
          background:#faf8ff;
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:12px;
          transition:background .2s;
        }
        .oh-card-hd:hover{background:#f5f0ff;}
        @media(max-width:480px){.oh-card-hd{padding:14px 16px;}}

        .oh-card-meta{display:flex;flex-wrap:wrap;gap:20px;align-items:center;}
        @media(max-width:480px){.oh-card-meta{gap:14px;}}

        .oh-meta-item{}
        .oh-meta-label{
          font-size:8px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#9ca3af; margin-bottom:3px;
        }
        .oh-meta-val{font-size:14px;font-weight:700;color:#1e1b2e;}
        @media(max-width:480px){.oh-meta-val{font-size:13px;}}

        /* status pill */
        .oh-status{
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 12px; border-radius:100px;
          font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
        }
        .oh-sdot{width:5px;height:5px;border-radius:50%;animation:ohpulse 2s ease infinite;}

        /* chevron */
        .oh-chevron{
          color:#9ca3af; transition:transform .25s; flex-shrink:0;
        }
        .oh-chevron.open{transform:rotate(180deg);}

        /* order id */
        .oh-oid{
          font-size:10px; color:#c4b5fd; font-weight:600;
          font-family:monospace; letter-spacing:.05em;
        }

        /* ── expanded body ── */
        .oh-body{padding:24px 20px;display:flex;flex-direction:column;gap:24px;}
        @media(max-width:480px){.oh-body{padding:18px 16px;gap:20px;}}

        /* ── progress stepper ── */
        .oh-stepper-label{
          font-size:9px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#9ca3af; margin-bottom:14px;
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
          top:14px; left:50%; width:100%; height:2px;
          background:rgba(139,92,246,0.12);
          z-index:0;
        }
        .oh-step.done:not(:last-child)::after{
          background:linear-gradient(90deg,#7c3aed,rgba(139,92,246,0.3));
        }

        .oh-step-circle{
          width:28px; height:28px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:700; position:relative; z-index:1;
          transition:all .3s;
        }
        .oh-step-circle.done{background:#7c3aed;color:white;box-shadow:0 3px 10px rgba(124,58,237,.3);}
        .oh-step-circle.done.last{background:#059669;box-shadow:0 3px 10px rgba(5,150,105,.3);}
        .oh-step-circle.idle{background:#f5f3ff;color:#c4b5fd;border:2px solid rgba(139,92,246,.15);}

        .oh-step-label{
          margin-top:8px; font-size:9px; font-weight:700;
          letter-spacing:.12em; text-transform:uppercase; text-align:center;
          transition:color .3s;
        }
        .oh-step-label.done{color:#7c3aed;}
        .oh-step-label.done.last{color:#059669;}
        .oh-step-label.idle{color:#c4b5fd;}

        /* eta */
        .oh-eta{
          display:inline-flex; align-items:center; gap:6px;
          font-size:11px; font-weight:600; color:#6b7280;
          background:#f9f7ff; border:1px solid rgba(139,92,246,.1);
          padding:7px 14px; border-radius:10px; margin-top:12px;
        }
        .oh-eta b{color:#7c3aed;}

        /* ── info grid ── */
        .oh-info-grid{
          display:grid; grid-template-columns:1fr;
          gap:12px;
        }
        @media(min-width:540px){.oh-info-grid{grid-template-columns:1fr 1fr;}}

        .oh-info-card{
          background:#f9f7ff; border:1px solid rgba(139,92,246,.08);
          border-radius:14px; padding:16px 18px;
          transition:all .2s;
        }
        .oh-info-card:hover{background:white;border-color:rgba(139,92,246,.18);box-shadow:0 4px 16px rgba(124,58,237,.06);}
        .oh-info-title{
          font-size:9px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#9ca3af; margin-bottom:10px;
        }
        .oh-info-row{font-size:12px;color:#6b7280;line-height:1.6;}
        .oh-info-row b{color:#1e1b2e;font-weight:600;}
        .oh-mono{font-family:monospace;font-size:11px;color:#7c3aed;}

        /* ── items ── */
        .oh-items-label{
          font-size:9px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#9ca3af; margin-bottom:12px;
        }
        .oh-items-list{display:flex;flex-direction:column;gap:10px;}

        .oh-item{
          display:flex; align-items:center; gap:14px;
          background:#f9f7ff; border:1px solid rgba(139,92,246,.08);
          border-radius:14px; padding:12px 16px;
          transition:all .2s;
        }
        .oh-item:hover{background:white;border-color:rgba(139,92,246,.18);}

        .oh-item-img{
          width:52px; height:52px; border-radius:10px;
          background:white; border:1px solid rgba(139,92,246,.12);
          overflow:hidden; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
        }
        .oh-item-img img{width:100%;height:100%;object-fit:contain;}
        .oh-item-placeholder{width:24px;height:24px;background:#f5f3ff;border-radius:6px;}
        .oh-item-name{font-size:14px;font-weight:700;color:#1e1b2e;line-height:1.3;margin-bottom:4px;}
        .oh-item-meta{font-size:12px;color:#9ca3af;font-weight:500;}
        .oh-item-price{
          font-family:'Bebas Neue',sans-serif; font-size:18px;
          color:#7c3aed; letter-spacing:.03em; flex-shrink:0; margin-left:auto;
        }
        .oh-item-row{display:flex;align-items:center;gap:12px;width:100%;cursor:pointer;}
        .oh-rate-row{
          margin-top:10px;padding-top:10px;
          border-top:1px solid rgba(139,92,246,.1);
          display:flex;flex-wrap:wrap;align-items:center;gap:10px;
        }
        .oh-rate-lbl{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af;}
        .oh-rate-stars{display:flex;gap:4px;}
        .oh-rate-star{
          width:28px;height:28px;border-radius:8px;
          background:white;border:1px solid rgba(139,92,246,.12);
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:all .2s;padding:0;
        }
        .oh-rate-star:hover{background:#f5f3ff;border-color:rgba(124,58,237,.35);}
        .oh-rate-star svg{width:14px;height:14px;color:#f59e0b;}
        .oh-rate-done{font-size:11px;font-weight:700;color:#059669;}

        /* ── action sections ── */
        .oh-section-label{
          font-size:9px; font-weight:700; letter-spacing:.2em;
          text-transform:uppercase; color:#9ca3af; margin-bottom:12px;
        }
        .oh-action-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}

        /* tracking pill */
        .oh-track-pill{
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(37,99,235,0.08); border:1px solid rgba(37,99,235,0.2);
          color:#2563eb; padding:7px 14px; border-radius:10px;
          font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
        }

        /* action buttons */
        .oh-btn{
          display:inline-flex; align-items:center; gap:7px;
          padding:9px 18px; border-radius:10px; border:none;
          font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s;
        }
        .oh-btn.violet{background:#7c3aed;color:white;box-shadow:0 4px 14px rgba(124,58,237,.25);}
        .oh-btn.violet:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(124,58,237,.35);}
        .oh-btn.green{background:#059669;color:white;box-shadow:0 4px 14px rgba(5,150,105,.2);}
        .oh-btn.green:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(5,150,105,.3);}
        .oh-btn.blue{background:#2563eb;color:white;box-shadow:0 4px 14px rgba(37,99,235,.2);}
        .oh-btn.blue:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(37,99,235,.3);}
        .oh-btn.outline{background:white;color:#7c3aed;border:1px solid rgba(139,92,246,.25);}
        .oh-btn.outline:hover{background:#f5f3ff;border-color:rgba(124,58,237,.4);}

        /* ── star rating ── */
        .oh-stars{display:flex;gap:6px;flex-wrap:wrap;}
        .oh-star{
          width:36px; height:36px; border-radius:10px;
          background:white; border:1px solid rgba(139,92,246,.15);
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; transition:all .2s;
        }
        .oh-star:hover{background:#f5f3ff;border-color:rgba(124,58,237,.4);transform:scale(1.1);}
        .oh-star svg{width:16px;height:16px;}
        .oh-star.low svg{color:#d1d5db;}
        .oh-star.high svg{color:#f59e0b;}

        /* divider */
        .oh-divider{
          height:1px; width:100%;
          background:linear-gradient(90deg,transparent,rgba(139,92,246,.12),transparent);
        }

        @keyframes ohUp{
          from{opacity:0;transform:translateY(16px);}
          to  {opacity:1;transform:translateY(0);}
        }
      `}</style>

      <div className="oh-root">
        <div className="oh-blob" /><div className="oh-blob2" />
        <div className="oh-wrap">

          {/* ── PAGE HEADER ── */}
          <div className="oh-hd">
            <div>
              <div className="oh-eyebrow"><span className="oh-edot" /> My Account</div>
              <h1 className="oh-h1">Order <span>History</span></h1>
              <p className="oh-sub">Track, manage and review all your wholesale orders.</p>
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

                return (
                  <div
                    key={order._id}
                    className={`oh-card${isExpanded ? ' expanded' : ''}`}
                    style={{ animationDelay: `${idx * 60}ms` }}
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
                          <div className="oh-meta-val" style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:18, color:'#7c3aed', letterSpacing:'.03em' }}>
                            ₹{order.totalEstimate?.toLocaleString()}
                          </div>
                        </div>

                        <div className="oh-meta-item">
                          <div className="oh-meta-label">Items</div>
                          <div className="oh-meta-val">{order.items.length}</div>
                        </div>

                        <div className="oh-meta-item">
                          <div className="oh-meta-label">Status</div>
                          <div className="oh-status" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                            <span className="oh-sdot" style={{ background: sc.color, boxShadow: `0 0 5px ${sc.color}` }} />
                            {displayStatus}
                          </div>
                        </div>

                        {order.shippingAddress?.line1 && (
                          <div className="oh-meta-item" style={{ display:'none' }} data-desktop>
                            <div className="oh-meta-label">Deliver To</div>
                            <div className="oh-meta-val" style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13, color:'#6b7280', fontWeight:600 }}>
                              {order.shippingAddress.city}, {order.shippingAddress.state}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                        <span className="oh-oid">#{order._id.slice(-6).toUpperCase()}</span>
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
                          <div className="oh-stepper-label">Order Timeline</div>
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
                          {statusIdx < 4 && (
                            <div className="oh-eta">
                              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                              Estimated Delivery: <b>{eta.toLocaleDateString('en-IN', { month:'short', day:'2-digit' })}</b>
                            </div>
                          )}
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
                              <div className="oh-info-row">Order: <span className="oh-mono">{order._id}</span></div>
                              {order.billId && <div className="oh-info-row">Bill: <span className="oh-mono">{order.billId}</span></div>}
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
                                      ? <img src={getCloudinaryUrl(item.image, 100)} alt={item.name} loading="lazy" width="50" height="50" />
                                      : <div className="oh-item-placeholder" />
                                    }
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div className="oh-item-name">
                                      {item.name}
                                      {hasAttributes && (
                                        <span style={{ marginLeft: 8, color: '#6b7280', fontSize: '0.9em', fontWeight: 500 }}>
                                          ({Object.values(displayAttributes).filter(v => v).map(v => String(v).toUpperCase()).join(', ')})
                                        </span>
                                      )}
                                    </div>
                                    <div className="oh-item-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                      <span className="oh-item-qty">Qty: {item.quantity} · ₹{item.price} each</span>
                                    </div>
                                  </div>
                                  <div className="oh-item-price">₹{(item.price * item.quantity).toLocaleString()}</div>
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

                        {/* INVOICE */}
                        {order.paymentStatus === 'PAID' && order.billId && (
                          <>
                            <div className="oh-divider" />
                            <div>
                              <div className="oh-section-label">Invoice</div>
                              <div className="oh-action-row">
                                <button className="oh-btn green" onClick={() => {
                                  const t = localStorage.getItem('token')
                                  window.open(`${api.defaults.baseURL}/api/bills/${order.billId}/pdf?token=${t}`, '_blank')
                                }}>
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/></svg>
                                  Download PDF
                                </button>
                                <button className="oh-btn outline" onClick={() => {
                                  const t = localStorage.getItem('token')
                                  window.open(`${api.defaults.baseURL}/api/bills/${order.billId}/html?token=${t}`, '_blank')
                                }}>
                                  View HTML
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* SHIPPING */}
                        {order.shipping?.waybill && (
                          <>
                            <div className="oh-divider" />
                            <div>
                              <div className="oh-section-label">Shipment</div>
                              <div className="oh-action-row">
                                <div className="oh-track-pill">
                                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                                  {order.shipping.provider} · {order.shipping.status} · {order.shipping.waybill}
                                </div>
                                <button className="oh-btn blue" onClick={() => {
                                  const url = order.shipping.trackingUrl || `${api.defaults.baseURL}/api/shipping/delhivery/track/${order.shipping.waybill}`
                                  window.open(url, '_blank')
                                }}>
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                                  Track Order
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}