import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart, getStockStatus } from '../../lib/CartContext'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../components/Toast'
import api from '../../lib/api'
import { getImageUrl } from '../../lib/cloudinary'

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal, addToCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const minAmount = Number(import.meta.env.VITE_MIN_ORDER_AMOUNT || 5000)

  const safeNum = (val) => {
    const n = Number(val)
    return isNaN(n) || !isFinite(n) ? 0 : n
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cart' } })
      return
    }
    navigate('/order', { state: { appliedCoupon } })
  }

  /* ── price helpers ── */
  const getBulkTiers = (item) => {
    const it = (item.bulkTiers || item.bulkDiscountQuantity) ? item : (item.productId && typeof item.productId === 'object' ? item.productId : item);
    if (Array.isArray(it.bulkTiers) && it.bulkTiers.length)
      return it.bulkTiers.slice().sort((a,b) => safeNum(a.quantity) - safeNum(b.quantity))
    if (safeNum(it.bulkDiscountQuantity) > 0)
      return [{ quantity: safeNum(it.bulkDiscountQuantity), priceReduction: safeNum(it.bulkDiscountPriceReduction || 0) }]
    return []
  }
  const getNextTier = (qty, tiers) => tiers.find(t => safeNum(qty) < safeNum(t.quantity)) || null
  const unitPrice = (item) => {
    let p = safeNum(item.price || 0)
    const qty = Math.max(1, safeNum(item.quantity || 1))
    const tiers = getBulkTiers(item)
    if (tiers.length) {
      const applicable = tiers.filter(t => qty >= safeNum(t.quantity || 0)).pop()
      if (applicable) p = Math.max(0, p - safeNum(applicable.priceReduction || 0))
    }
    return p
  }
  const lineTotal   = (item) => unitPrice(item) * Math.max(1, safeNum(item.quantity || 1))
  const mrpTotal    = cart.reduce((s,it) => s + safeNum(it.mrp||it.price||0) * Math.max(1,safeNum(it.quantity||1)), 0)
  const effTotal    = cart.reduce((s,it) => {
    const itemStock = it.variantSku 
      ? (it.productId?.variants?.find(v => v.sku === it.variantSku)?.stock ?? it.stock)
      : (it.productId?.stock ?? it.stock);
    if (safeNum(itemStock) <= 0) return s;
    return s + lineTotal(it);
  }, 0)
  const bulkDiscount = Math.max(0, mrpTotal - effTotal)
  const totalPayable = effTotal
  const minLeft = Math.max(0, minAmount - totalPayable)

  const handleApplyCoupon = async (e) => {
    e?.preventDefault()
    if (!couponCode.trim()) return
    setIsApplying(true)
    setCouponError('')
    try {
      const { data } = await api.post('/api/coupons/validate', { 
        code: couponCode.trim().toUpperCase(),
        amount: totalPayable 
      })
      if (data.valid) {
        setAppliedCoupon(data)
        setCouponCode('')
      }
    } catch (err) {
      const msg = err?.response?.data?.error || ''
      if (msg.startsWith('min_order_value_not_met:')) {
        const val = msg.split(':')[1]
        setCouponError(`Min order value ₹${Number(val).toLocaleString()} required`)
      } else if (msg === 'coupon_expired') setCouponError('Coupon has expired')
      else if (msg === 'usage_limit_reached') setCouponError('Coupon usage limit reached')
      else setCouponError('Invalid or inactive coupon')
    } finally {
      setIsApplying(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError('')
  }

  useEffect(() => {
    const first = cart[0]
    if (!first) {
      api.get('/api/recommendations/trending?limit=4').then(({data}) => setSuggestions(data||[]))
      return
    }
    const pid = first.productId || first._id
    api.get(`/api/recommendations/frequently-bought/${pid}?limit=4`)
      .then(({data}) => {
        if (data && data.length > 0) setSuggestions(data)
        else api.get('/api/recommendations/trending?limit=4').then(({data}) => setSuggestions(data||[]))
      })
      .catch(() => setSuggestions([]))
  }, [cart])

  /* ── EMPTY STATE ── */
  if (cart.length === 0) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');
        .ct-empty-root{font-family:'DM Sans',sans-serif;background:#f0f9ff;min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;}
        .ct-empty-root::before{content:'';position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(30,58,138,.04)1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,.04)1px,transparent 1px);background-size:60px 60px;}
        .ct-empty-box{background:white;border:1px solid rgba(30,58,138,.14);border-radius:28px;padding:56px 40px;text-align:center;max-width:400px;width:100%;position:relative;overflow:hidden;box-shadow:0 4px 32px rgba(30,58,138,.07);animation:ctUp .5s ease both;}
        .ct-empty-box::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg, #f97316, #f97316);}
        .ct-empty-ico{width:80px;height:80px;border-radius:24px;background:#f0f9ff;border:1px solid rgba(30,58,138,.18);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 24px;}
        .ct-empty-h{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#1e1b2e;letter-spacing:.03em;margin-bottom:10px;}
        .ct-empty-p{font-size:14px;color:#9ca3af;margin-bottom:32px;line-height:1.6;}
        .ct-empty-btn{
          display:inline-flex;align-items:center;gap:10px;background:#f97316;color:white;
          padding:15px 36px;border-radius:14px;font-size:11px;font-weight:800;
          letter-spacing:.14em;text-transform:uppercase;text-decoration:none;
          box-shadow:0 8px 24px rgba(124,58,237,.28);
          transition:all .3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .ct-empty-btn:hover{transform:translateY(-4px);box-shadow:0 14px 44px rgba(124,58,237,.42);background:#6d28d9;}
        .ct-empty-btn:active{transform:translateY(-1px) scale(0.97);}
        @keyframes ctUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
      `}</style>
      <div className="ct-empty-root">
        <div className="ct-empty-box">
          <div className="ct-empty-ico">🛒</div>
          <div className="ct-empty-h">Cart is Empty</div>
          <p className="ct-empty-p">You haven't added any products yet. Browse our wholesale catalogue to get started.</p>
          <Link to="/products" className="ct-empty-btn">
            Browse Catalogue
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
          </Link>
        </div>
      </div>
    </>
  )

  /* ── MAIN CART ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ct-root{
          font-family:'DM Sans',system-ui,sans-serif;
          background:#f0f9ff; min-height:100vh; color:#1e1b2e;
          position:relative; overflow-x:hidden;
          padding-bottom:160px;
        }
        .ct-root::before{
          content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:linear-gradient(rgba(30,58,138,.04)1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,.04)1px,transparent 1px);
          background-size:60px 60px;
        }
        .ct-blob{position:fixed;top:-180px;left:50%;transform:translateX(-50%);width:800px;height:500px;border-radius:50%;pointer-events:none;z-index:0;background:radial-gradient(ellipse,rgba(30,58,138,.07),transparent 65%);}

        .ct-wrap{max-width:1000px;margin:0 auto;padding:36px 16px 24px;position:relative;z-index:1;}
        @media(min-width:600px){.ct-wrap{padding:48px 24px 24px;}}

        /* page header */
        .ct-hd{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:32px;animation:ctUp .5s ease both;}
        .ct-eyebrow{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(30,58,138,.1);border:1px solid rgba(30,58,138,.22);color:#f97316;font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin-bottom:10px;}
        .ct-edot{width:5px;height:5px;border-radius:50%;background:#f97316;box-shadow:0 0 5px rgba(124,58,237,.5);animation:ctPulse 2s ease infinite;}
        @keyframes ctPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
        .ct-h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,50px);color:#1e1b2e;letter-spacing:.02em;line-height:1;margin-bottom:6px;}
        .ct-h1 span{color:#f97316;}
        .ct-sub{font-size:13px;color:#6b7280;}
        .ct-count-pill{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:100px;background:rgba(30,58,138,.08);border:1px solid rgba(30,58,138,.18);color:#f97316;font-size:12px;font-weight:700;white-space:nowrap;}

        /* ── ITEM CARD ── */
        .ct-item{
          background:white; border:1px solid rgba(30,58,138,.1);
          border-radius:18px; padding:18px 20px;
          display:grid; grid-template-columns: 88px 1fr 120px; gap:16px; position:relative; overflow:hidden;
          transition:all .25s; box-shadow:0 2px 12px rgba(30,58,138,.04);
          animation:ctUp .5s ease both;
        }
        .ct-item::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(30,58,138,.2),transparent);opacity:0;transition:opacity .2s;}
        .ct-item:hover{border-color:rgba(124,58,237,.22);box-shadow:0 6px 24px rgba(124,58,237,.08);}
        .ct-item:hover::before{opacity:1;}

        @media(max-width:640px){
          .ct-item {
            grid-template-columns: 72px 1fr;
            padding: 14px;
            gap: 12px;
          }
          .ct-line-total {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding-top: 10px;
            border-top: 1px dashed rgba(30,58,138,0.1);
            margin-top: 4px;
          }
          .ct-line-price { font-size: 18px; }
          .ct-item-name { font-size: 13px; }
          .ct-qty-ctrl { scale: 0.9; transform-origin: left; }
        }

        .ct-img{
          width:88px;height:88px;flex-shrink:0;
          background:#f9f7ff;border:1px solid rgba(30,58,138,.1);
          border-radius:12px;overflow:hidden;
          display:flex;align-items:center;justify-content:center;
        }
        .ct-img img{width:100%;height:100%;object-fit:contain;padding:8px;}
        .ct-img-ph{font-size:28px;opacity:.3;}
        @media(max-width:500px){.ct-img{width:64px;height:64px;}}

        .ct-item-body{flex:1;min-width:0;}
        .ct-item-name{font-size:15px;font-weight:700;color:#1e1b2e;line-height:1.3;margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ct-item-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;}
        .ct-item-variant{font-size:10px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:.1em;background:rgba(124,58,237,.06);padding:2px 8px;border-radius:6px;border:1px solid rgba(124,58,237,.1);}
        .ct-unit-price{font-size:13px;font-weight:600;color:#6b7280;}
        .ct-delivery{font-size:11px;color:#9ca3af;margin-bottom:10px;}
        .ct-delivery b{color:#059669;}

        /* qty ctrl */
        .ct-qty-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .ct-qty-ctrl{display:inline-flex;align-items:center;background:white;border:1.5px solid rgba(30,58,138,.25);border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(124,58,237,0.06);}
        .ct-qty-btn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#f97316;background:none;border:none;cursor:pointer;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);font-family:'DM Sans',sans-serif;}
        .ct-qty-btn:hover:not(:disabled){background:rgba(30,58,138,.08);color:#6d28d9;}
        .ct-qty-btn:active:not(:disabled){transform:scale(0.9);}
        .ct-qty-btn:disabled{opacity:.3;cursor:not-allowed;}
        .ct-qty-val{
          width:44px; text-align:center; font-size:14px; font-weight:800; color:#1e1b2e;
          border-left:1px solid rgba(30,58,138,.12); border-right:1px solid rgba(30,58,138,.12);
          line-height:36px; background:white; border-top:none; border-bottom:none; outline:none;
        }

        .ct-action-btn{
          font-size:11px;font-weight:800;letter-spacing:.08em;background:none;border:none;cursor:pointer;
          padding:6px 10px;border-radius:8px;font-family:'DM Sans',sans-serif;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ct-action-btn.remove{color:#ef4444;background:rgba(239,68,68,.05);}
        .ct-action-btn.remove:hover{color:white;background:#ef4444;transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,.2);}
        .ct-action-btn.save{color:#9ca3af;background:rgba(156,163,175,.05);}
        .ct-action-btn.save:hover{color:#f97316;background:rgba(124,58,237,.08);transform:translateY(-1px);}

        /* bulk tier nudge */
        .ct-tier-nudge{
          margin-top:12px; padding:14px 16px; border-radius:14px;
          background:rgba(5,150,105,.04); border:1px solid rgba(5,150,105,.12);
          box-shadow: 0 2px 10px rgba(5,150,105,0.03);
        }
        .ct-tier-bar-track{height:6px;background:rgba(5,150,105,.1);border-radius:100px;overflow:hidden;margin-bottom:10px;}
        .ct-tier-bar-fill{height:6px;background:#059669;border-radius:100px;transition:width .4s cubic-bezier(0.34, 1.56, 0.64, 1);}
        .ct-tier-nudge-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
        .ct-tier-text{font-size:11px;font-weight:700;color:#059669;line-height:1.4;}
        .ct-tier-add-btn{
          flex-shrink:0;padding:8px 18px;border-radius:10px;background:#059669;color:white;border:none;
          font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
          cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;
          transition:all .3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow:0 4px 12px rgba(5,150,105,.25);
        }
        .ct-tier-add-btn:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 8px 20px rgba(5,150,105,.4);}
        .ct-tier-add-btn:active{transform:translateY(-1px) scale(0.96);}
        .ct-tier-max{font-size:11px;font-weight:700;color:#059669;}

        /* line total */
        .ct-line-total{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:4px;}
        .ct-line-price{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#f97316;letter-spacing:.03em;}
        .ct-line-unlock{font-size:10px;font-weight:700;color:#d97706;text-align:right;max-width:120px;line-height:1.4;}
        @media(max-width:500px){.ct-line-total{flex-direction:row;align-items:center;justify-content:space-between;}}

        /* suggestions */
        .ct-sugg-section{margin-top:24px;}
        .ct-sugg-label{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
        .ct-sugg-label::before{content:'';width:20px;height:2px;background:rgba(30,58,138,.35);border-radius:2px;}
        .ct-sugg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;}
        .ct-sugg-card{background:white;border:1px solid rgba(30,58,138,.1);border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px;transition:all .2s;}
        .ct-sugg-card:hover{border-color:rgba(124,58,237,.25);box-shadow:0 4px 16px rgba(124,58,237,.08);}
        .ct-sugg-img{width:44px;height:44px;border-radius:8px;background:#f0f9ff;border:1px solid rgba(30,58,138,.1);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
        .ct-sugg-img img{width:100%;height:100%;object-fit:contain;}
        .ct-sugg-name{font-size:12px;font-weight:700;color:#1e1b2e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px;}
        .ct-sugg-price{font-size:12px;font-weight:700;color:#f97316;}
        .ct-sugg-add{padding:6px 12px;border-radius:8px;background:#f97316;color:white;border:none;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:'DM Sans',sans-serif;flex-shrink:0;transition:all .15s;}
        .ct-sugg-add:hover{background:#6d28d9;}

        /* ── CHECKOUT BAR ── */
        .ct-checkout-bar{
          position:fixed;bottom:0;left:0;right:0;z-index:50;
          padding:16px 20px calc(16px + env(safe-area-inset-bottom,0px));
          background:white;
          border-top:1px solid rgba(30,58,138,.12);
          box-shadow:0 -8px 32px rgba(30,58,138,.08);
        }
        .ct-checkout-wrap{max-width:1000px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;}
        .ct-checkout-total{display:flex;flex-direction:column;}
        .ct-checkout-label{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;}
        .ct-checkout-price{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#f97316;letter-spacing:.03em;line-height:1;}
        .ct-checkout-btn{
          padding:16px 32px;border-radius:14px;background:linear-gradient(135deg, #f97316, #1e3a8a);color:white;border:none;
          font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
          cursor:pointer;font-family:'DM Sans',sans-serif;
          transition:all .3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow:0 8px 24px rgba(124,58,237,.3);white-space:nowrap;
        }
        .ct-checkout-btn:hover{background:#6d28d9;transform:translateY(-2px);box-shadow:0 14px 32px rgba(124,58,237,.45);}
        .ct-checkout-btn:active{transform:scale(.98);}
        .ct-checkout-btn.disabled{background:#f3f4f6;color:#d1d5db;cursor:not-allowed;box-shadow:none;}
        .ct-min-text{font-size:10px;font-weight:600;color:#9ca3af;margin-top:4px;}
        .ct-min-text b{color:#f97316;}
        .ct-min-text.met{color:#059669;font-weight:700;}

        @keyframes ctUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      <div className="ct-root">
        <div className="ct-blob" />
        <div className="ct-wrap">

          {/* ── PAGE HEADER ── */}
          <div className="ct-hd">
            <div>
              <div className="ct-eyebrow"><span className="ct-edot"/> My Account</div>
              <h1 className="ct-h1">Shopping <span>Cart</span></h1>
              <p className="ct-sub">{cart.length} item{cart.length!==1?'s':''}</p>
            </div>
            <div className="ct-count-pill">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              ₹{safeNum(totalPayable).toLocaleString()}
            </div>
          </div>

          {/* ── CART ITEMS ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {cart.map((item, idx) => {
              const tiers   = getBulkTiers(item)
              const next    = getNextTier(item.quantity, tiers)
              const maxQ    = tiers.length ? Math.max(item.quantity, tiers[tiers.length-1].quantity) : item.quantity
              const pct     = tiers.length ? Math.min(100, Math.round((item.quantity/maxQ)*100)) : 100
              const itemStock = item.variantSku 
                ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock)
                : (item.productId?.stock ?? item.stock);
              const stockSt = getStockStatus(itemStock)
              const isOutOfStock = itemStock <= 0
              const imgSrc  = item.image || item.images?.[0]?.url
              const itemId  = item.productId || item._id
              const itemSku = item.variantSku || ''

              const getAttrs = (it) => {
                if (it.attributes) {
                  return it.attributes instanceof Map ? Object.fromEntries(it.attributes) : it.attributes;
                }
                if (it.productId && typeof it.productId === 'object' && it.variantSku && it.productId.variants) {
                  const variant = it.productId.variants.find(v => v.sku === it.variantSku);
                  if (variant && variant.attributes) {
                    return variant.attributes instanceof Map ? Object.fromEntries(variant.attributes) : variant.attributes;
                  }
                }
                return {};
              };
              const displayAttributes = getAttrs(item);
              const hasAttributes = displayAttributes && Object.entries(displayAttributes).filter(([, v]) => v).length > 0;

              return (
                <div key={`${itemId}-${itemSku}`} className={`ct-item ${isOutOfStock ? 'ct-oos' : ''}`} style={{ 
                  animationDelay:`${idx*50}ms`,
                  opacity: isOutOfStock ? 0.6 : 1,
                  filter: isOutOfStock ? 'grayscale(0.4)' : 'none'
                }}>
                  {isOutOfStock && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(255,255,255,0.4)', zIndex: 5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        background: '#ef4444', color: 'white', padding: '4px 12px',
                        borderRadius: '8px', fontSize: '10px', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.1em'
                      }}>Currently Unavailable</div>
                    </div>
                  )}

                  {/* image */}
                  <div className="ct-img" style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${itemId}`)}>
                    {imgSrc
                      ? <img src={getImageUrl(imgSrc, 200)} alt={item.name} loading="lazy" width="80" height="80" />
                      : <span className="ct-img-ph">📦</span>
                    }
                  </div>

                  {/* body */}
                  <div className="ct-item-body">
                    <div className="ct-item-name" style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${itemId}`)}>
                      {item.name}
                      {hasAttributes && (
                        <span style={{ marginLeft: 8, color: '#6b7280', fontSize: '0.9em', fontWeight: 500 }}>
                          ({Object.values(displayAttributes).filter(v => v).map(v => String(v).toUpperCase()).join(', ')})
                        </span>
                      )}
                    </div>
                    <div className="ct-item-meta">
                      <span className="ct-unit-price">₹{safeNum(unitPrice(item)).toLocaleString()} / unit</span>
                      <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase',
                        padding:'2px 8px', borderRadius:100,
                        background: isOutOfStock ? 'rgba(220,38,38,.1)' : itemStock <= 5 ? 'rgba(245,158,11,.1)' : 'rgba(5,150,105,.1)',
                        color: isOutOfStock ? '#dc2626' : itemStock <= 5 ? '#d97706' : '#059669',
                        border: `1px solid ${isOutOfStock ? 'rgba(220,38,38,.2)' : itemStock <= 5 ? 'rgba(245,158,11,.2)' : 'rgba(5,150,105,.2)'}`
                      }}>
                        {stockSt.text}
                      </span>
                    </div>

                    {/* bulk tier nudge */}
                    {tiers.length > 0 && (
                      <div className="ct-tier-nudge" style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                        <div className="ct-tier-bar-track" style={{ background: 'rgba(124, 58, 237, 0.1)' }}>
                          <div className="ct-tier-bar-fill" style={{ width:`${pct}%`, background: '#f97316' }}/>
                        </div>
                        <div className="ct-tier-nudge-row">
                          {next ? (() => {
                            const delta     = next.quantity - item.quantity
                            const perOff    = Number(next.priceReduction||0)
                            const effUnit   = Math.max(0, Number(item.price||0) - perOff)
                            const estSave   = perOff * (item.quantity + delta)
                            return (
                              <>
                                <div className="ct-tier-text" style={{ color: '#f97316' }}>
                                  Add {delta} more to save ₹{safeNum(estSave).toLocaleString()} (₹{safeNum(effUnit).toLocaleString()}/unit)
                                </div>
                                <button className="ct-tier-add-btn"
                                  style={{ background: '#f97316' }}
                                  onClick={() => updateQuantity(itemId, itemSku, next.quantity)}>
                                  Add {delta} units
                                </button>
                              </>
                            )
                          })() : (
                            <div className="ct-tier-max" style={{ color: '#059669' }}>✓ Max bulk savings applied</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* qty + actions */}
                    <div className="ct-qty-row" style={{ pointerEvents: isOutOfStock ? 'none' : 'auto' }}>
                      <div className="ct-qty-ctrl" style={{ opacity: isOutOfStock ? 0.4 : 1 }}>
                        <button className="ct-qty-btn"
                          disabled={isOutOfStock || item.quantity <= Math.max(1, Number(item.minOrderQty||0))}
                          onClick={() => updateQuantity(itemId, itemSku, Math.max(Number(item.minOrderQty||1), item.quantity-1))}>−</button>
                        <input 
                          className="ct-qty-val" 
                          type="number"
                          value={item.quantity} 
                          disabled={isOutOfStock}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 0
                            updateQuantity(itemId, itemSku, Math.max(0, v))
                          }}
                          onBlur={(e) => {
                            const min = Math.max(1, Number(item.minOrderQty||0))
                            const v = parseInt(e.target.value) || min
                            updateQuantity(itemId, itemSku, Math.max(min, v))
                          }}
                        />
                        <button className="ct-qty-btn"
                          disabled={isOutOfStock || item.quantity >= itemStock}
                          onClick={() => updateQuantity(itemId, itemSku, item.quantity+1)}>+</button>
                      </div>

                      <button className="ct-action-btn remove"
                        style={{ pointerEvents: 'auto' }}
                        onClick={() => removeFromCart(itemId, itemSku)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* line total */}
                  <div className="ct-line-total">
                    <div className="ct-line-price">₹{safeNum(lineTotal(item)).toLocaleString()}</div>
                    {(() => {
                      const it = (item.bulkTiers || item.bulkDiscountQuantity) ? item : (item.productId && typeof item.productId === 'object' ? item.productId : item);
                      const bulkQty = it.bulkDiscountQuantity || (it.bulkTiers && it.bulkTiers[0]?.quantity);
                      if (bulkQty > 0 && item.quantity < bulkQty) {
                        return (
                          <div className="ct-line-unlock">
                            Add {bulkQty - item.quantity} more to unlock bulk price
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                </div>
              )
            })}

            {/* SUGGESTIONS */}
            {suggestions.length > 0 && (
              <div className="ct-sugg-section" style={{ animationDelay:`${cart.length*50}ms` }}>
                <div className="ct-sugg-label">Frequently Bought Together</div>
                <div className="ct-sugg-grid">
                  {suggestions.map(p => (
                    <div key={p._id||p.id} className="ct-sugg-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${p._id || p.id}`)}>
                      <div className="ct-sugg-img">
                        {p.images?.[0]?.url
                          ? <img src={getImageUrl(p.images[0].url, 200)} alt={p.name} loading="lazy" width="60" height="60" />
                          : <span style={{fontSize:18}}>📦</span>
                        }
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="ct-sugg-name">{p.name}</div>
                        <div className="ct-sugg-price">{p.price!=null?`₹${safeNum(p.price).toLocaleString()}`:'—'}</div>
                      </div>
                      <button className="ct-sugg-add" onClick={(e) => { e.stopPropagation(); addToCart(p); }}>Add</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── STICKY CHECKOUT BAR ── */}
        <div className="ct-checkout-bar">
          <div className="ct-checkout-wrap">
            <div className="ct-checkout-total">
              <span className="ct-checkout-label">Total Amount</span>
              <span className="ct-checkout-price">₹{safeNum(totalPayable).toLocaleString()}</span>
              <div className="ct-min-text">
                {totalPayable < minAmount
                  ? <>Add <b>₹{safeNum(minLeft).toLocaleString()}</b> more to place order</>
                  : <span className="met">✓ Min order requirement met</span>
                }
              </div>
            </div>
            <button
              className={`ct-checkout-btn ${totalPayable >= minAmount && !cart.every(item => {
                const itemStock = item.variantSku 
                  ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock)
                  : (item.productId?.stock ?? item.stock);
                return itemStock <=0;
              }) ? '' : 'disabled'}`}
              disabled={totalPayable < minAmount || cart.every(item => {
                const itemStock = item.variantSku 
                  ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock)
                  : (item.productId?.stock ?? item.stock);
                return itemStock <=0;
              })}
              onClick={handleCheckout}
            >
              Proceed to Buy
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
