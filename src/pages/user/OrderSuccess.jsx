import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useCart } from '../../lib/CartContext'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function OrderSuccess() {
  const { orderId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { notify } = useToast()
  
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Clear cart on mount
    clearCart()
  }, [clearCart])

  useEffect(() => {
    const fetchOrder = async () => {
      const targetId = orderId || state?.orderId
      if (!targetId) {
        navigate('/')
        return
      }
      
      try {
        setLoading(true)
        const { data } = await api.get(`/api/orders/my/${targetId}`)
        setOrder(data)
      } catch (err) {
        console.error('Failed to load order details via customer endpoint:', err)
        // If customer route fails, try standard route if they have permission
        try {
          const { data } = await api.get(`/api/orders/${targetId}`)
          setOrder(data)
        } catch (adminErr) {
          notify('Failed to load order details', 'error')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId, state?.orderId, navigate, notify])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEstDeliveryDate = (createdAt) => {
    if (!createdAt) return '—'
    const date = new Date(createdAt)
    date.setDate(date.getDate() + 4)
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  if (loading) {
    return (
      <>
        <style>{`
          .os-loader-root {
            font-family: 'DM Sans', sans-serif;
            background: #020617;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
          }
          .os-loader-spin {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(249,115,22,0.1);
            border-top: 4px solid #f97316;
            border-radius: 50%;
            animation: osSpin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes osSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div className="os-loader-root flex flex-col items-center">
          <div className="os-loader-spin"></div>
          <div>Loading receipt details...</div>
        </div>
      </>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-2">Order Not Found</h1>
          <p className="text-slate-400 mb-6">We couldn't retrieve the details for this order. It might still be processing.</p>
          <Link to="/" className="inline-block bg-orange-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-600 transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const isCod = order.paymentMethod === 'COD'
  const advancePaid = isCod ? Math.ceil(order.totalEstimate * 0.15) : order.totalEstimate
  const remainingCod = isCod ? order.codDueAmount : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        .os-root {
          font-family: 'DM Sans', sans-serif;
          background: #020617;
          min-height: 100vh;
          color: #f8fafc;
          padding: 40px 16px;
          position: relative;
          overflow-x: hidden;
        }
        .os-root::before {
          content: '';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 600px; height: 300px;
          background: radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 75%);
          z-index: 0;
          pointer-events: none;
        }
        .os-container {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .os-card-main {
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          border-radius: 28px;
          padding: 40px 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          margin-bottom: 24px;
        }
        @media(min-width: 640px) {
          .os-card-main { padding: 48px 40px; }
        }
        .os-success-icon {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.08);
          border: 3px solid #10b981;
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
          animation: osBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .os-success-icon svg {
          width: 44px;
          height: 44px;
        }
        .os-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 44px;
          letter-spacing: 0.02em;
          text-align: center;
          color: #fff;
          margin-bottom: 8px;
          line-height: 1;
        }
        .os-title span { color: #f97316; }
        .os-subtitle {
          text-align: center;
          font-size: 14px;
          color: #94a3b8;
          max-width: 460px;
          margin: 0 auto 36px;
          line-height: 1.6;
        }
        .os-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 36px;
        }
        @media(min-width: 640px) {
          .os-grid-2 { grid-template-columns: 1fr 1fr; }
        }
        .os-info-block {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 20px;
        }
        .os-block-lbl {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #64748b;
          margin-bottom: 6px;
          font-weight: 700;
        }
        .os-block-val {
          font-size: 16px;
          font-weight: 800;
          color: #f8fafc;
        }
        .os-timeline-w {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 36px;
        }
        .os-timeline-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 20px;
        }
        .os-timeline {
          display: flex;
          justify-content: space-between;
          position: relative;
          padding-bottom: 12px;
        }
        .os-timeline::before {
          content: '';
          position: absolute;
          top: 14px; left: 16px; right: 16px;
          height: 2px;
          background: rgba(255,255,255,0.08);
          z-index: 0;
        }
        .os-timeline-line-active {
          position: absolute;
          top: 14px; left: 16px;
          height: 2px;
          background: #10b981;
          z-index: 1;
          transition: width 0.4s ease;
        }
        .os-timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          width: 70px;
        }
        .os-step-node {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: #1e293b;
          border: 2px solid rgba(255,255,255,0.1);
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
          transition: all 0.3s ease;
        }
        .os-timeline-step.active .os-step-node {
          background: #10b981;
          border-color: #10b981;
          color: white;
          box-shadow: 0 0 15px rgba(16,185,129,0.4);
        }
        .os-timeline-step.current .os-step-node {
          background: #f97316;
          border-color: #f97316;
          color: white;
          box-shadow: 0 0 15px rgba(249,115,22,0.4);
          animation: pulseNode 1.5s infinite alternate;
        }
        .os-step-lbl {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-align: center;
        }
        .os-timeline-step.active .os-step-lbl { color: #10b981; }
        .os-timeline-step.current .os-step-lbl { color: #f97316; }

        .os-sect-title {
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .os-sect-title span {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #f97316;
        }

        .os-item-card {
          background: rgba(30, 41, 59, 0.25);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 18px;
          padding: 16px;
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 12px;
          transition: border-color 0.25s;
        }
        .os-item-card:hover {
          border-color: rgba(249,115,22,0.2);
        }
        .os-item-img {
          width: 60px; height: 60px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .os-item-img img {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .os-item-info {
          flex: 1;
          min-width: 0;
        }
        .os-item-name {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .os-item-meta {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        .os-item-meta span {
          color: #94a3b8;
          font-weight: 600;
        }
        .os-item-price {
          font-size: 14px;
          font-weight: 800;
          color: #f8fafc;
        }

        .os-addr-card {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 36px;
        }
        .os-addr-name {
          font-size: 15px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 6px;
        }
        .os-addr-text {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
        }

        .os-summary-table {
          background: rgba(30, 41, 59, 0.25);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 36px;
        }
        .os-sum-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #94a3b8;
          padding: 10px 0;
        }
        .os-sum-row.border-t {
          border-top: 1px solid rgba(255,255,255,0.06);
          margin-top: 8px;
          padding-top: 14px;
        }
        .os-sum-row.total {
          font-size: 16px;
          font-weight: 800;
          color: #fff;
        }
        .os-sum-val.green { color: #10b981; font-weight: 700; }
        .os-sum-val.orange { color: #f97316; font-weight: 800; }

        .os-actions-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media(min-width: 480px) {
          .os-actions-row { grid-template-columns: 1fr 1fr; }
        }
        .os-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 48px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .os-btn-primary {
          background: #f97316;
          color: white;
          box-shadow: 0 8px 24px rgba(249,115,22,0.2);
        }
        .os-btn-primary:hover {
          background: #ea580c;
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(249,115,22,0.3);
        }
        .os-btn-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #f8fafc;
        }
        .os-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }
        .os-btn:active {
          transform: translateY(0);
        }

        @keyframes osBounce {
          from { opacity: 0; transform: scale(0.3); }
          50% { opacity: 0.9; transform: scale(1.1); }
          70% { transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseNode {
          from { transform: scale(1); box-shadow: 0 0 10px rgba(249,115,22,0.4); }
          to { transform: scale(1.08); box-shadow: 0 0 20px rgba(249,115,22,0.7); }
        }
      `}</style>

      <div className="os-root">
        <div className="os-container">
          <div className="os-card-main">
            <div className="os-success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="os-title">Order <span>Placed!</span></h1>
            <p className="os-subtitle">Thank you for shopping with us. Your payment has been received, and your order is officially confirmed!</p>

            <div className="os-grid-2">
              <div className="os-info-block">
                <div className="os-block-lbl">Order Reference</div>
                <div className="os-block-val" style={{fontFamily:'monospace',fontSize:'15px'}}>{order.orderNumber}</div>
              </div>
              <div className="os-info-block">
                <div className="os-block-lbl">Payment Status</div>
                <div className="os-block-val" style={{color:'#10b981',display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#10b981'}}></span>
                  PAID ({order.paymentMethod})
                </div>
              </div>
            </div>

            {/* Visual Tracking Progress */}
            <div className="os-timeline-w">
              <div className="os-timeline-title">Shipping Status Progress</div>
              <div className="os-timeline">
                <div className="os-timeline-line-active" style={{width: '25%'}}></div>
                
                <div className="os-timeline-step active">
                  <div className="os-step-node">✓</div>
                  <div className="os-step-lbl">Ordered</div>
                </div>
                <div className="os-timeline-step current">
                  <div className="os-step-node">●</div>
                  <div className="os-step-lbl">Confirmed</div>
                </div>
                <div className="os-timeline-step">
                  <div className="os-step-node">3</div>
                  <div className="os-step-lbl">Shipped</div>
                </div>
                <div className="os-timeline-step">
                  <div className="os-step-node">4</div>
                  <div className="os-step-lbl">Delivered</div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <h3 className="os-sect-title"><span></span>Shipping Address</h3>
            <div className="os-addr-card">
              <div className="os-addr-name">{order.customer?.name}</div>
              <div className="os-addr-text">
                {order.customer?.phone}<br/>
                {order.shippingAddress?.line1}
                {order.shippingAddress?.line2 && <>, {order.shippingAddress.line2}</>}<br/>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} - <strong>{order.shippingAddress?.pincode}</strong>
              </div>
            </div>

            {/* Line Items */}
            <h3 className="os-sect-title"><span></span>Items Purchased</h3>
            <div style={{marginBottom:'36px'}}>
              {order.items?.map((it, idx) => {
                const attributesStr = it.attributes && typeof it.attributes === 'object'
                  ? Object.entries(it.attributes).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' · ')
                  : '';
                return (
                  <div key={idx} className="os-item-card">
                    <div className="os-item-img">
                      {it.image ? <img src={it.image} alt={it.name} /> : '📦'}
                    </div>
                    <div className="os-item-info">
                      <div className="os-item-name" title={it.name}>{it.name}</div>
                      <div className="os-item-meta">
                        Qty: <span>{it.quantity}</span>
                        {attributesStr && <> · <span>{attributesStr}</span></>}
                      </div>
                    </div>
                    <div className="os-item-price">₹{Number(it.lineTotal).toLocaleString('en-IN')}</div>
                  </div>
                )
              })}
            </div>

            {/* Cost Summary Table */}
            <h3 className="os-sect-title"><span></span>Receipt Breakdown</h3>
            <div className="os-summary-table">
              <div className="os-sum-row">
                <span>Items Subtotal</span>
                <span className="os-sum-val">₹{Number(order.productTotal + (order.couponDiscount || 0)).toLocaleString('en-IN')}</span>
              </div>
              {order.couponDiscount > 0 && (
                <div className="os-sum-row">
                  <span>Coupon discount ({order.couponCode})</span>
                  <span className="os-sum-val green">-₹{Number(order.couponDiscount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="os-sum-row">
                <span>Shipping & Handling</span>
                <span className="os-sum-val">
                  {order.shippingCost === 0 ? <span className="green">FREE</span> : `₹${Number(order.shippingCost).toLocaleString('en-IN')}`}
                </span>
              </div>
              {order.codCharge > 0 && (
                <div className="os-sum-row">
                  <span>COD Collection Fee</span>
                  <span className="os-sum-val">₹{Number(order.codCharge).toLocaleString('en-IN')}</span>
                </div>
              )}
              
              <div className="os-sum-row border-t total">
                <span>Net Total Payable</span>
                <span className="os-sum-val">₹{Number(order.totalEstimate).toLocaleString('en-IN')}</span>
              </div>

              {isCod ? (
                <>
                  <div className="os-sum-row">
                    <span>COD Advance Paid (15%)</span>
                    <span className="os-sum-val orange">₹{Number(advancePaid).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="os-sum-row" style={{background:'rgba(249,115,22,0.05)', borderRadius:'10px', padding:'8px 10px', marginTop: '6px'}}>
                    <span style={{fontWeight: 700, color:'#f97316'}}>Due on Delivery (COD)</span>
                    <span className="os-sum-val orange">₹{Number(remainingCod).toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="os-sum-row" style={{background:'rgba(16,185,129,0.05)', borderRadius:'10px', padding:'8px 10px', marginTop: '6px'}}>
                  <span style={{fontWeight: 700, color:'#10b981'}}>Amount Paid Online</span>
                  <span className="os-sum-val green">₹{Number(order.totalEstimate).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="os-actions-row">
              <Link to="/orders" className="os-btn os-btn-primary">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                Track In My Orders
              </Link>
              <Link to="/" className="os-btn os-btn-secondary">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
