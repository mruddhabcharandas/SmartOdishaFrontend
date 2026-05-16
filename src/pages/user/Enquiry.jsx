import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
import { useToast } from '../../components/Toast'
import logo from '../../click2kart.png'

export default function Enquiry() {
  const { notify }  = useToast()
  const nav         = useNavigate()
  const loc         = useLocation()
  const { cart, clearCart, cartTotal } = useCart()
  const minAmount   = Number(import.meta.env.VITE_MIN_ORDER_AMOUNT || 5000)

  const mapCartItem = (item) => {
    const it = (item.bulkTiers || item.bulkDiscountQuantity) ? item : (item.productId && typeof item.productId === 'object' ? item.productId : item);
    let attributes = item.attributes;
    if (!attributes && item.productId && typeof item.productId === 'object' && item.variantSku && item.productId.variants) {
      const variant = item.productId.variants.find(v => v.sku === item.variantSku);
      if (variant && variant.attributes) attributes = variant.attributes;
    }
    return {
      productId: item.productId || item._id,
      variantSku: item.variantSku,
      quantity:  item.quantity,
      name:      item.name,
      price:     item.price,
      gst:       item.gst || 0,
      mrp:       item.mrp || item.price,
      image:     item.image || item.images?.[0]?.url,
      attributes: attributes,
      bulkQty:   it.bulkDiscountQuantity || it.bulkQty || 0,
      bulkRed:   it.bulkDiscountPriceReduction || it.bulkRed || 0,
      bulkTiers: it.bulkTiers,
      weight:    item.weight || 0,
    };
  };

  const initialItems = cart.length > 0
    ? cart.map(mapCartItem)
    : (loc.state?.productId ? [{ productId: loc.state.productId, quantity: 1, name: loc.state.name, mrp: loc.state.mrp || loc.state.price, price: loc.state.price, gst: loc.state.gst || 0 }] : [])

  const [items,          setItems]          = useState(initialItems)
  const [profile,        setProfile]        = useState({ name:'', phone:'', email:'', kyc:{} })
  const [svc,            setSvc]            = useState({ loading:true, available:null, cod:null, etaStart:null, etaEnd:null, error:'' })
  const [ship,           setShip]           = useState({ loading:false, amount:0, discount:0, final:0 })
  const [paymentMethod,  setPaymentMethod]  = useState('RAZORPAY')
  const [codAdvMethod,   setCodAdvMethod]   = useState('RAZORPAY')
  const [loading,        setLoading]        = useState(false)
  const [couponCode,     setCouponCode]     = useState('')
  const [appliedCoupon,  setAppliedCoupon]  = useState(loc.state?.appliedCoupon || null)
  const [couponError,    setCouponError]    = useState('')
  const [isApplying,     setIsApplying]     = useState(false)

  /* ── helpers ── */
  const computeEtaRange = () => {
    const add = (d,n) => { const x=new Date(d); for(let i=0;i<n;i++) x.setDate(x.getDate()+1); return x }
    const t = new Date(); return { start: add(t,3), end: add(t,6) }
  }
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{ weekday:'short', day:'2-digit', month:'short' }) : '—'

  const loadServiceability = async (pin) => {
    if (!pin) { setSvc({ loading:false, available:null, cod:null, etaStart:null, etaEnd:null, error:'no_pin' }); return }
    setSvc(p => ({ ...p, loading:true, error:'' }))
    try {
      const { data } = await api.get('/api/shipping/check-pincode', { params:{ pincode:pin } })
      const etaStart = data?.etaStart ? new Date(data.etaStart) : computeEtaRange().start
      const etaEnd   = data?.etaEnd   ? new Date(data.etaEnd)   : computeEtaRange().end
      setSvc({ loading:false, available:!!data.delivery_available, cod:!!data.cod_available, etaStart, etaEnd, error:'' })
      if (data.delivery_available) {
        setShip(s => ({ ...s, loading:true }))
        try {
          const totalWeightGrams = items.reduce((s, it) => s + (Number(it.weight || 0) * Number(it.quantity || 1)), 0)
          const weightKg = totalWeightGrams > 0 ? (totalWeightGrams / 1000) : 0.5
          const { data:calc } = await api.post('/api/shipping/calculate', { destination_pin:pin, weight:weightKg, order_amount:cartTotal })
          setShip({ loading:false, amount:calc?.shipping??calc?.amount??85, discount:calc?.discount??85, final:calc?.final??0 })
        } catch { setShip({ loading:false, amount:85, discount:85, final:0 }) }
      } else { setShip({ loading:false, amount:0, discount:0, final:0 }) }
    } catch {
      const { start, end } = computeEtaRange()
      setSvc({ loading:false, available:null, cod:null, etaStart:start, etaEnd:end, error:'failed' })
    }
  }

  useEffect(() => {
    if (cart.length > 0) setItems(cart.map(mapCartItem))
  }, [cart])

  useEffect(() => {
    const pin = String(profile?.kyc?.pincode || '').trim()
    if (pin && items.length > 0) loadServiceability(pin)
  }, [items])

  useEffect(() => {
    if (!localStorage.getItem('token')) { nav('/login', { state: { from: loc.pathname + loc.search } }); return }
    ;(async () => {
      try {
        const { data } = await api.get('/api/user/me')
        if (!data.isKycComplete) { notify('Complete your KYC to place orders','error'); nav('/profile'); return }
        const prof = { name:data.name||'', phone:data.phone||'', email:data.email||'', kyc:data.kyc||{} }
        setProfile(prof)
        const pin = String(prof?.kyc?.pincode||'').trim()
        if (pin) loadServiceability(pin)
      } catch { nav('/login') }
    })()
  }, [])

  const ensureRazorpayLoaded = async () => {
    if (window.Razorpay) return true
    return new Promise((res,rej) => {
      const ex = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
      if (ex) { ex.addEventListener('load',()=>res(true),{once:true}); ex.addEventListener('error',()=>rej(new Error('razorpay_load_failed')),{once:true}); return }
      const s = document.createElement('script')
      s.src='https://checkout.razorpay.com/v1/checkout.js'; s.async=true
      s.onload=()=>res(true); s.onerror=()=>rej(new Error('razorpay_load_failed'))
      document.body.appendChild(s)
    })
  }

  const getLineDetails = (it) => {
    let p = Number(it.price||0)
    const qty = Math.max(1, Number(it.quantity||1))
    if (Array.isArray(it.bulkTiers)&&it.bulkTiers.length) {
      const tiers = it.bulkTiers.slice().sort((a,b)=>Number(a.quantity||0)-Number(b.quantity||0))
      const app = tiers.filter(t=>qty>=Number(t.quantity||0)).pop()
      if (app) p = Math.max(0, p - Number(app.priceReduction??app.price_reduction??0))
    } else if (Number(it.bulkQty||it.bulkDiscountQuantity)>0) {
      if (qty >= Number(it.bulkQty||it.bulkDiscountQuantity)) p = Math.max(0, p - Number(it.bulkRed||it.bulkDiscountPriceReduction||0))
    }
    const lineTotal = p * qty
    const rate = Number(it.gst||0)
    const lineGst = rate > 0 ? Number((lineTotal - (lineTotal / (1 + rate / 100))).toFixed(2)) : 0
    const lineSubtotal = Number((lineTotal - lineGst).toFixed(2))
    return { unitBase: p, lineSubtotal, lineGst, lineTotal }
  }

  const unitPrice = (it) => getLineDetails(it).unitBase
  
  const lineTotal = (it) => getLineDetails(it).lineTotal
  const computedVisibleTotal = (arr) => arr.filter(it=>typeof it.productId==='string'&&it.productId.length>=12).reduce((s,it)=>s+lineTotal(it),0)
  const subTotal = computedVisibleTotal(items)
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0
  const totalPayable = subTotal - couponDiscount + ship.final

  const handleApplyCoupon = async (e) => {
    e?.preventDefault()
    if (!couponCode.trim()) return
    setIsApplying(true)
    setCouponError('')
    try {
      const { data } = await api.post('/api/coupons/validate', { 
        code: couponCode.trim().toUpperCase(),
        amount: subTotal 
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

  const handleRazorpay = async ({ items, paymentMethod, razorpayOrderId, amountPaise }) => {
    try { await ensureRazorpayLoaded() } catch { notify('Unable to load payment gateway. Please try again.','error'); return }
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID||"rzp_test_placeholder",
      amount: amountPaise, currency:"INR", name:"Click2Kart", description:"B2B Order Payment",
      image: logo, order_id: razorpayOrderId,
      handler: async (response) => {
        try {
          await api.post('/api/orders/create-after-verify', { razorpay_order_id:response.razorpay_order_id, razorpay_payment_id:response.razorpay_payment_id, razorpay_signature:response.razorpay_signature, items, paymentMethod })
          notify('Payment Successful!','success'); clearCart(); nav('/orders')
        } catch { notify('Payment verification failed','error') }
      },
      prefill: { name:profile.name, email:profile.email, contact:profile.phone },
      theme: { color:"#7c3aed" }
    }
    try { const rzp = new window.Razorpay(options); rzp.open() }
    catch { notify('Payment initialization failed. Please retry.','error') }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (cartTotal < minAmount) { notify(`Minimum order amount is ₹${minAmount.toLocaleString()}`,'error'); return }
    try {
      const pin = String(profile?.kyc?.pincode||'').trim()
      if (!pin) { notify('Please add delivery pincode in KYC','error'); nav('/profile'); return }
      const { data:sv } = await api.get('/api/shipping/check-pincode',{ params:{ pincode:pin } })
      if (!sv?.delivery_available) { notify('Delivery not available for your pincode','error'); return }
      if (paymentMethod==='COD'&&!sv?.cod_available) { notify('COD not available for your pincode','error'); return }
    } catch { notify('Unable to verify serviceability right now','error'); return }
    setLoading(true)
    try {
      const cleanItems = items.filter(it=>typeof it.productId==='string'&&it.productId.length>=12).map(it=>({ productId:it.productId, variantSku:it.variantSku, quantity:Math.max(1,Number(it.quantity||1)) }))
      const visibleTotal = computedVisibleTotal(items)
      if (visibleTotal < minAmount) { notify(`Minimum order amount is ₹${minAmount.toLocaleString()}`,'error'); setLoading(false); return }
      if (paymentMethod==='MANUAL') { setLoading(false); nav('/manual-payment',{ state:{ items:cleanItems, amount:totalPayable, couponCode:appliedCoupon?.code || '' } }); return }
      if (paymentMethod==='RAZORPAY') {
        try { const { data } = await api.post('/api/orders/prepare-payment',{ items:cleanItems, paymentMethod:'RAZORPAY', couponCode:appliedCoupon?.code || '' }); await handleRazorpay({ items:cleanItems, paymentMethod:'RAZORPAY', razorpayOrderId:data.razorpayOrderId, amountPaise:data.amountPaise }) }
        catch { notify('Payment initialization failed. Please retry.','error') }
      } else if (paymentMethod==='COD') {
        if (codAdvMethod==='MANUAL') { setLoading(false); nav('/manual-payment',{ state:{ items:cleanItems, amount:Math.round(totalPayable*0.2), cod20:true, couponCode:appliedCoupon?.code || '' } }); return }
        try { const { data } = await api.post('/api/orders/prepare-payment',{ items:cleanItems, paymentMethod:'COD_20', couponCode:appliedCoupon?.code || '' }); await handleRazorpay({ items:cleanItems, paymentMethod:'COD_20', razorpayOrderId:data.razorpayOrderId, amountPaise:data.amountPaise }) }
        catch { notify('Payment initialization failed. Please retry.','error') }
      }
    } catch (err) {
      const code = err?.response?.data?.error
      const lower = typeof code==='string' ? code.toLowerCase() : ''
      const serverMin = Number(err?.response?.data?.minAmount||minAmount)
      const message =
        code==='kyc_required'                                   ? 'Please complete KYC to place orders' :
        code==='product_not_found'                              ? 'Some items are no longer available' :
        code==='insufficient_stock'||lower.includes('insufficient stock') ? 'Insufficient stock for one of the items' :
        code==='min_order_not_met'                              ? `Minimum order amount is ₹${serverMin.toLocaleString()}` :
        code==='invalid_payment_method'                         ? 'Invalid payment method selected' :
        code==='service_unavailable'                            ? 'Delivery not available for your pincode' :
        code==='cod_unavailable'                                ? 'COD not available for your pincode' :
        code==='razorpay_not_configured'                        ? 'Payment gateway configuration missing. Please contact support.' :
        code==='invalid_amount'                                 ? 'Invalid payable amount. Please refresh and try again.' :
        code==='payment_initiation_failed'                      ? 'Payment gateway error. Please try again.' :
        code==='delhivery_not_configured'                       ? 'Shipping configuration is incomplete. Please contact support.' :
        'Failed to place order. If amount is deducted, please contact support with your payment ID.'
      notify(message,'error')
    } finally { setLoading(false) }
  }

  const visibleTotal = computedVisibleTotal(items)
  const minLeft      = Math.max(0, minAmount - visibleTotal)
  
  const mrpTotal     = items.reduce((s, it) => {
    const qty = Math.max(1, Number(it.quantity || 1))
    const baseMrp = Number(it.mrp || it.price || 0)
    return s + (baseMrp * qty)
  }, 0)
  const bulkSavings  = Math.max(0, mrpTotal - subTotal)
  const totalSavings = bulkSavings + couponDiscount + (ship.amount || 0)

  /* ── EMPTY ── */
  if (items.length === 0) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .eq-empty {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: linear-gradient(135deg, #faf8ff 0%, #f5f0ff 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          isolation: isolate;
        }

        .eq-empty::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 50%, rgba(124, 58, 237, 0.03) 0%, transparent 50%),
                      radial-gradient(circle at 80% 50%, rgba(124, 58, 237, 0.03) 0%, transparent 50%);
          pointer-events: none;
        }

        .eq-empty-box {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(124, 58, 237, 0.15);
          border-radius: 32px;
          padding: 64px 48px;
          text-align: center;
          max-width: 440px;
          width: 90%;
          position: relative;
          box-shadow: 
            0 25px 50px -12px rgba(124, 58, 237, 0.25),
            inset 0 1px 1px rgba(255, 255, 255, 0.8);
        }

        .eq-empty-ico {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed10, #8b5cf610);
          border: 2px solid rgba(124, 58, 237, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          margin: 0 auto 24px;
          position: relative;
        }

        .eq-empty-ico::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          opacity: 0.1;
          z-index: -1;
        }

        .eq-empty-h {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 900;
          background: linear-gradient(135deg, #1e1b2e, #2d2a44);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .eq-empty-p {
          font-size: 15px;
          color: #6b7280;
          margin-bottom: 32px;
          line-height: 1.6;
        }

        .eq-empty-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: #7c3aed;
          color: white;
          padding: 16px 32px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          box-shadow: 
            0 10px 20px -5px rgba(124, 58, 237, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .eq-empty-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .eq-empty-btn:hover::before {
          left: 100%;
        }

        .eq-empty-btn:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 20px 30px -8px rgba(124, 58, 237, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.2) inset;
        }
      `}</style>
      <div className="eq-empty">
        <div className="eq-empty-box">
          <div className="eq-empty-ico">🛒</div>
          <div className="eq-empty-h">Your Cart Awaits</div>
          <p className="eq-empty-p">Start your B2B journey with quality products and exclusive bulk discounts.</p>
          <Link to="/products" className="eq-empty-btn">
            Explore Collection
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
          </Link>
        </div>
      </div>
    </>
  )

  /* ── MAIN ── */
  const payIsReady = !loading && visibleTotal >= minAmount && svc.available

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        :root {
          --primary: #7c3aed;
          --primary-dark: #6d28d9;
          --primary-light: #8b5cf6;
          --secondary: #059669;
          --accent: #2563eb;
          --bg-gradient: linear-gradient(135deg, #faf8ff 0%, #f5f0ff 100%);
          --glass-bg: rgba(255, 255, 255, 0.85);
          --glass-border: rgba(124, 58, 237, 0.15);
          --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          --shadow-md: 0 10px 25px -5px rgba(124, 58, 237, 0.1), 0 8px 10px -6px rgba(124, 58, 237, 0.02);
          --shadow-lg: 0 25px 50px -12px rgba(124, 58, 237, 0.25);
          --shadow-inner: inset 0 1px 1px rgba(255, 255, 255, 0.8);
        }

        .eq-root {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: var(--bg-gradient);
          min-height: 100vh;
          color: #1e1b2e;
          position: relative;
          isolation: isolate;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .eq-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.03) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(124, 58, 237, 0.03) 0%, transparent 40%);
          pointer-events: none;
          z-index: 0;
        }

        .eq-blob {
          position: fixed;
          top: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
        }

        .eq-blob-2 {
          position: fixed;
          bottom: -200px;
          left: -200px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(5, 150, 105, 0.06) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
        }

        .eq-wrap {
          max-width: 1400px;
          margin: 0 auto;
          padding: 48px 24px 80px;
          position: relative;
          z-index: 2;
        }

        /* Premium Header */
        .eq-hd {
          margin-bottom: 48px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .eq-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 16px 6px 12px;
          border-radius: 100px;
          background: rgba(124, 58, 237, 0.08);
          border: 1px solid rgba(124, 58, 237, 0.15);
          backdrop-filter: blur(4px);
          margin-bottom: 16px;
        }

        .eq-edot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary);
          animation: pulse 2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .eq-eyebrow-text {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--primary);
        }

        .eq-h1 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(42px, 6vw, 64px);
          font-weight: 900;
          background: linear-gradient(135deg, #1e1b2e 0%, #2d2a44 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .eq-h1 span {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .eq-sub {
          font-size: 15px;
          color: #6b7280;
          font-weight: 400;
        }

        /* Main Grid */
        .eq-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }

        @media (min-width: 1024px) {
          .eq-grid {
            grid-template-columns: 440px 1fr;
            align-items: start;
            gap: 32px;
          }
        }

        /* ===== PREMIUM ORDER SUMMARY ===== */
        .eq-summary {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: var(--shadow-lg), var(--shadow-inner);
          position: sticky;
          top: 100px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .eq-summary:hover {
          box-shadow: 0 30px 60px -15px rgba(124, 58, 237, 0.3), var(--shadow-inner);
        }

        /* Premium Header with Gradient */
        .eq-summary-head {
          padding: 28px 28px 20px;
          border-bottom: 1px solid rgba(124, 58, 237, 0.1);
          background: linear-gradient(180deg, rgba(124, 58, 237, 0.02) 0%, transparent 100%);
        }

        .eq-summary-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 900;
          background: linear-gradient(135deg, #1e1b2e, #2d2a44);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.01em;
          margin-bottom: 4px;
        }

        .eq-summary-sub {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .eq-summary-sub::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--primary);
          opacity: 0.5;
        }

        /* Items List - Premium Scrollbar */
        .eq-items-list {
          padding: 20px 24px;
          max-height: 420px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .eq-items-list::-webkit-scrollbar {
          width: 4px;
        }

        .eq-items-list::-webkit-scrollbar-track {
          background: rgba(124, 58, 237, 0.05);
          border-radius: 4px;
        }

        .eq-items-list::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.2);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .eq-items-list::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 58, 237, 0.3);
        }

        /* Premium Item Card */
        .eq-item {
          display: flex;
          gap: 16px;
          padding: 12px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(124, 58, 237, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeIn 0.5s ease;
        }

        .eq-item:hover {
          background: white;
          border-color: rgba(124, 58, 237, 0.15);
          transform: translateX(4px);
          box-shadow: var(--shadow-sm);
        }

        .eq-item-img {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f9f7ff, #f5f0ff);
          border: 1px solid rgba(124, 58, 237, 0.12);
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        .eq-item-img img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
          transition: transform 0.3s ease;
        }

        .eq-item:hover .eq-item-img img {
          transform: scale(1.05);
        }

        .eq-item-content {
          flex: 1;
          min-width: 0;
        }

        .eq-item-name {
          font-size: 14px;
          font-weight: 700;
          color: #1e1b2e;
          line-height: 1.4;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .eq-item-meta {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .eq-item-meta-badge {
          background: rgba(124, 58, 237, 0.08);
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          color: var(--primary);
          border: 1px solid rgba(124, 58, 237, 0.15);
        }

        /* Premium Bulk Tier Indicator */
        .eq-tier-container {
          margin-top: 8px;
          padding: 8px 10px;
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.04), rgba(5, 150, 105, 0.02));
          border-radius: 12px;
          border: 1px solid rgba(5, 150, 105, 0.1);
        }

        .eq-tier-bar {
          height: 4px;
          background: rgba(5, 150, 105, 0.1);
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .eq-tier-fill {
          height: 4px;
          background: linear-gradient(90deg, var(--secondary), #10b981);
          border-radius: 100px;
          position: relative;
          animation: fillWidth 0.6s ease;
        }

        @keyframes fillWidth {
          from { width: 0; }
          to { width: var(--target-width); }
        }

        .eq-tier-fill::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 8px;
          height: 4px;
          background: white;
          border-radius: 50%;
          filter: blur(2px);
        }

        .eq-tier-hint {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
        }

        .eq-tier-hint-next {
          font-weight: 700;
          color: var(--secondary);
        }

        .eq-tier-hint-current {
          font-weight: 600;
          color: #1e1b2e;
          background: rgba(5, 150, 105, 0.1);
          padding: 2px 8px;
          border-radius: 20px;
        }

        .eq-item-price {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: var(--primary);
          flex-shrink: 0;
          margin-left: auto;
          padding-left: 12px;
        }

        /* Premium Summary Footer */
        .eq-summary-footer {
          padding: 24px 28px 28px;
          border-top: 1px solid rgba(124, 58, 237, 0.1);
          background: linear-gradient(180deg, transparent, rgba(124, 58, 237, 0.02));
        }

        .eq-sumrow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          padding: 6px 0;
        }

        .eq-sumrow-label {
          color: #6b7280;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .eq-sumrow-label-icon {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(124, 58, 237, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: var(--primary);
        }

        .eq-sumrow-val {
          font-weight: 700;
          color: #1e1b2e;
        }

        .eq-sumrow-val.green {
          color: var(--secondary);
          background: rgba(5, 150, 105, 0.1);
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 13px;
        }

        .eq-sum-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.2), transparent);
          margin: 16px 0;
        }

        .eq-total-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-top: 8px;
        }

        .eq-total-label {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #6b7280;
        }

        .eq-total-val {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: var(--primary);
          line-height: 1;
        }

        /* Minimum Order Alert - Premium */
        .eq-min-alert {
          margin-top: 16px;
          padding: 14px 16px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.04));
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          backdrop-filter: blur(4px);
        }

        .eq-min-alert-icon {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .eq-min-alert-text {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: #b45309;
        }

        .eq-min-alert-amount {
          font-weight: 800;
          font-size: 16px;
          color: #b45309;
        }

        /* Right Form Card */
        .eq-form-card {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 32px;
          overflow: hidden;
          box-shadow: var(--shadow-lg), var(--shadow-inner);
          animation: slideUp 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .eq-form-body {
          padding: 32px;
        }

        @media (max-width: 480px) {
          .eq-form-body { padding: 24px; }
        }

        /* Step Headers */
        .eq-step-head {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .eq-step-num {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.1em;
          box-shadow: 
            0 8px 16px -4px rgba(124, 58, 237, 0.3),
            inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }

        .eq-step-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 900;
          background: linear-gradient(135deg, #1e1b2e, #2d2a44);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Profile Info Grid */
        .eq-profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .eq-info-cell {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(124, 58, 237, 0.1);
          border-radius: 16px;
          padding: 14px 16px;
          transition: all 0.2s ease;
        }

        .eq-info-cell:hover {
          background: white;
          border-color: rgba(124, 58, 237, 0.2);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .eq-info-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 6px;
        }

        .eq-info-val {
          font-size: 14px;
          font-weight: 700;
          color: #1e1b2e;
        }

        /* Address & Serviceability */
        .eq-addr-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }

        @media (min-width: 768px) {
          .eq-addr-row {
            grid-template-columns: 320px 1fr;
          }
        }

        .eq-addr-cell {
          background: white;
          border: 1.5px solid rgba(124, 58, 237, 0.1);
          border-radius: 24px;
          padding: 24px;
          box-shadow: var(--shadow-sm);
          transition: all 0.3s ease;
        }

        .eq-addr-cell:hover {
          border-color: var(--primary-light);
          box-shadow: var(--shadow-md);
        }

        .eq-addr-line {
          font-size: 15px;
          font-weight: 800;
          color: #1e1b2e;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .eq-addr-sub {
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Serviceability Badge - Premium */
        .eq-svc-badge {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 24px;
          border-radius: 24px;
          background: white;
          border: 1.5px solid rgba(124, 58, 237, 0.1);
          box-shadow: var(--shadow-sm);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .eq-svc-badge::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: #c4b5fd;
        }

        .eq-svc-badge.avail {
          border-color: rgba(5, 150, 105, 0.2);
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.03), white);
        }

        .eq-svc-badge.avail::before {
          background: var(--secondary);
        }

        .eq-svc-badge.unavail {
          border-color: rgba(220, 38, 38, 0.2);
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.03), white);
        }

        .eq-svc-badge.unavail::before {
          background: #ef4444;
        }

        .eq-svc-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .eq-svc-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          position: relative;
        }

        .eq-svc-main {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        @media (max-width: 768px) {
          .eq-svc-badge {
            padding: 20px;
            margin-top: 8px;
          }
          .eq-svc-main {
            font-size: 13px;
          }
          .eq-info-cell {
            padding: 12px;
          }
          .eq-info-val {
            font-size: 13px;
          }
        }

        .eq-svc-main.green { color: var(--secondary); }
        .eq-svc-main.red { color: #dc2626; }
        .eq-svc-main.gray { color: #6b7280; }

        .eq-svc-detail {
          font-size: 11px;
          color: #6b7280;
          font-weight: 500;
          line-height: 1.5;
        }

        .eq-svc-free {
          font-size: 12px;
          font-weight: 700;
          color: var(--secondary);
          margin-top: 6px;
          padding: 2px 8px;
          background: rgba(5, 150, 105, 0.1);
          border-radius: 20px;
          display: inline-block;
        }

        /* Section Divider */
        .eq-section-div {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.2), transparent);
          margin: 32px 0;
        }

        /* Premium Payment Options */
        .eq-pay-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .eq-pay-opt {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 20px;
          border: 1.5px solid rgba(124, 58, 237, 0.12);
          background: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Plus Jakarta Sans', sans-serif;
          text-align: left;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .eq-pay-opt::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.02), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .eq-pay-opt:hover:not(:disabled) {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -8px rgba(124, 58, 237, 0.2);
        }

        .eq-pay-opt:hover::before {
          opacity: 1;
        }

        .eq-pay-opt.active-violet {
          border-color: var(--primary);
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.04), rgba(124, 58, 237, 0.02));
          box-shadow: 0 8px 20px -6px rgba(124, 58, 237, 0.2);
        }

        .eq-pay-opt.active-green {
          border-color: var(--secondary);
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.04), rgba(5, 150, 105, 0.02));
        }

        .eq-pay-opt.active-blue {
          border-color: var(--accent);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.04), rgba(37, 99, 235, 0.02));
        }

        .eq-pay-opt:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: rgba(243, 244, 246, 0.5);
          border-color: #e5e7eb;
        }

        .eq-pay-lock {
          font-size: 14px;
          opacity: 0.5;
        }

        .disabled-opt:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        .eq-pay-ico {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          position: relative;
          z-index: 1;
        }

        .eq-pay-ico.violet {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(124, 58, 237, 0.08));
          color: var(--primary);
        }

        .eq-pay-ico.green {
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.12), rgba(5, 150, 105, 0.08));
          color: var(--secondary);
        }

        .eq-pay-ico.blue {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.08));
          color: var(--accent);
        }

        .eq-pay-info {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .eq-pay-name {
          font-size: 16px;
          font-weight: 700;
          color: #1e1b2e;
          margin-bottom: 4px;
        }

        .eq-pay-desc {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .eq-pay-desc.violet { color: var(--primary); }
        .eq-pay-desc.green { color: var(--secondary); }
        .eq-pay-desc.blue { color: var(--accent); }

        .eq-pay-radio {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid rgba(124, 58, 237, 0.2);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
          z-index: 1;
        }

        .eq-pay-opt.active-violet .eq-pay-radio,
        .eq-pay-opt.active-green .eq-pay-radio,
        .eq-pay-opt.active-blue .eq-pay-radio {
          border-color: var(--primary);
        }

        .eq-pay-radio-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--primary);
          transform: scale(0);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .eq-pay-opt.active-violet .eq-pay-radio-dot,
        .eq-pay-opt.active-green .eq-pay-radio-dot,
        .eq-pay-opt.active-blue .eq-pay-radio-dot {
          transform: scale(1);
        }

        /* COD Sub-method */
        .eq-cod-sub {
          margin-top: 8px;
          margin-left: 72px;
          display: inline-flex;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(124, 58, 237, 0.15);
          border-radius: 14px;
          padding: 4px;
          gap: 4px;
        }

        .eq-cod-sub-btn {
          padding: 8px 16px;
          border-radius: 12px;
          border: none;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .eq-cod-sub-btn.active {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }

        .eq-cod-sub-btn.inactive {
          background: transparent;
          color: #9ca3af;
        }

        .eq-cod-sub-btn.inactive:hover {
          color: var(--primary);
          background: rgba(124, 58, 237, 0.05);
        }

        /* Premium Submit Button */
        .eq-submit {
          width: 100%;
          padding: 20px;
          border-radius: 20px;
          border: none;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 28px;
          position: relative;
          overflow: hidden;
        }

        .eq-submit::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .eq-submit.ready {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          box-shadow: 
            0 15px 30px -8px rgba(124, 58, 237, 0.4),
            inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }

        .eq-submit.ready:hover {
          transform: translateY(-3px);
          box-shadow: 0 25px 40px -12px rgba(124, 58, 237, 0.5);
        }

        .eq-submit.ready:hover::before {
          left: 100%;
        }

        .eq-submit.ready:active {
          transform: translateY(-1px);
        }

        .eq-submit.blocked {
          background: linear-gradient(135deg, #e5e7eb, #d1d5db);
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Spinner */
        .eq-spin {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Secure Note */
        .eq-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 20px;
          font-weight: 500;
          padding: 12px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 100px;
          backdrop-filter: blur(4px);
        }

        /* Animations */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        /* Loading Skeleton Animation */
        .eq-shimmer {
          background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.05), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      <div className="eq-root">
        <div className="eq-blob" />
        <div className="eq-blob-2" />
        <div className="eq-wrap">

          {/* Page Header */}
          <div className="eq-hd">
            <div className="eq-eyebrow">
              <span className="eq-edot" />
              <span className="eq-eyebrow-text">Secure Checkout</span>
            </div>
            <h1 className="eq-h1">
              Complete Your <span>Order</span> in this page
            </h1>
            <p className="eq-header-sub">
              B2B checkout with exclusive bulk discounts
            </p>
          </div>

          <div className="eq-grid">

            {/* ── ORDER SUMMARY ── */}
            <div className="eq-summary">
              <div className="eq-summary-head">
                <div className="eq-summary-title">Order Summary</div>
                <div className="eq-summary-sub">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="eq-items-list">
                {items.map((item, idx) => {
                  const tiers = Array.isArray(item.bulkTiers) && item.bulkTiers.length
                    ? item.bulkTiers.slice().sort((a, b) => a.quantity - b.quantity)
                    : (item.bulkQty > 0 ? [{ quantity: item.bulkQty, priceReduction: item.bulkRed || 0 }] : [])
                  
                  const next = tiers.find(t => item.quantity < t.quantity)
                  const maxQ = tiers.length ? Math.max(item.quantity, tiers[tiers.length - 1].quantity) : item.quantity
                  const pct = tiers.length ? Math.min(100, Math.round((item.quantity / maxQ) * 100)) : 100
                  
                  const getAttrs = (attr) => {
                    if (!attr) return {};
                    return attr instanceof Map ? Object.fromEntries(attr) : attr;
                  };
                  const displayAttributes = getAttrs(item.attributes);
                  const hasAttributes = displayAttributes && Object.entries(displayAttributes).filter(([, v]) => v).length > 0;

                  return (
                    <div key={idx} className="eq-item" style={{ cursor: 'pointer' }} onClick={() => nav(`/products/${item.productId || item._id || item.id}`)}>
                      <div className="eq-item-img">
                        {item.image ? (
                          <img src={getCloudinaryUrl(item.image, 100)} alt={item.name} loading="lazy" width="60" height="60" />
                        ) : (
                          <span style={{ fontSize: 24, opacity: 0.3 }}>📦</span>
                        )}
                      </div>
                      
                      <div className="eq-item-content">
                        <div className="eq-item-name">
                          {item.name}
                          {hasAttributes && (
                            <span style={{ marginLeft: 8, color: '#6b7280', fontSize: '0.9em', fontWeight: 500 }}>
                              ({Object.values(displayAttributes).filter(v => v).map(v => String(v).toUpperCase()).join(', ')})
                            </span>
                          )}
                        </div>
                        
                        <div className="eq-item-meta">
                          <span>Qty: {item.quantity}</span>
                          <span>·</span>
                          <span>₹{unitPrice(item).toLocaleString()}/unit</span>
                        </div>

                        {tiers.length > 0 && (
                          <div className="eq-tier-container">
                            <div className="eq-tier-bar">
                              <div 
                                className="eq-tier-fill" 
                                style={{ 
                                  width: `${pct}%`,
                                  ['--target-width']: `${pct}%`
                                }}
                              />
                            </div>
                            <div className="eq-tier-hint">
                              <span className="eq-tier-hint-current">
                                {pct}% to max discount
                              </span>
                              {next && (
                                <span className="eq-tier-hint-next">
                                  +{next.quantity - item.quantity} more → -₹{Number(next.priceReduction).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="eq-item-price">
                        ₹{lineTotal(item).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="eq-summary-footer">
                <div className="eq-sumrow">
                  <span className="eq-sumrow-label">
                    <span className="eq-sumrow-label-icon">💰</span>
                    MRP Total
                  </span>
                  <span className="eq-sumrow-val">₹{mrpTotal.toLocaleString()}</span>
                </div>

                {bulkSavings > 0 && (
                  <div className="eq-sumrow">
                    <span className="eq-sumrow-label">
                      <span className="eq-sumrow-label-icon">🎉</span>
                      Bulk Discount
                    </span>
                    <span className="eq-sumrow-val green">
                      -₹{bulkSavings.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="eq-sumrow">
                  <span className="eq-sumrow-label">
                    <span className="eq-sumrow-label-icon">🚚</span>
                    Delivery Fee
                  </span>
                  <span className="eq-sumrow-val">
                    {ship.loading ? (
                      <span className="eq-shimmer">...</span>
                    ) : (
                      <>
                        <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 8 }}>
                          ₹{(ship.amount || 85).toLocaleString()}
                        </span>
                        <span className="green">FREE</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="eq-sumrow">
                  <span className="eq-sumrow-label">
                    <span className="eq-sumrow-label-icon">📋</span>
                    GST
                  </span>
                  <span className="eq-sumrow-val">Included</span>
                </div>

                {/* Coupon Section */}
                <div style={{ marginTop: 24, marginBottom: 16 }}>
                  {!appliedCoupon ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        className="eq-coupon-input"
                        placeholder="COUPON CODE"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        style={{
                          flex: 1,
                          background: 'rgba(255,255,255,0.8)',
                          border: '1.5px solid rgba(124, 58, 237, 0.15)',
                          borderRadius: 14,
                          padding: '10px 16px',
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: '0.1em',
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        disabled={isApplying || !couponCode.trim()}
                        style={{
                          padding: '10px 20px',
                          background: '#7c3aed',
                          color: 'white',
                          borderRadius: 14,
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: (isApplying || !couponCode.trim()) ? 0.5 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isApplying ? '...' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(5, 150, 105, 0.08)',
                      border: '1.5px solid rgba(5, 150, 105, 0.2)',
                      padding: '12px 16px',
                      borderRadius: 16,
                      animation: 'fadeIn 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>🎟️</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#059669', letterSpacing: '0.05em' }}>{appliedCoupon.code} APPLIED</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#059669', opacity: 0.8 }}>₹{couponDiscount.toLocaleString()} SAVED</div>
                        </div>
                      </div>
                      <button 
                        onClick={handleRemoveCoupon}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#059669',
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          padding: 4
                        }}
                      >
                        REMOVE
                      </button>
                    </div>
                  )}
                  {couponError && <div style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', marginTop: 6, paddingLeft: 4 }}>{couponError}</div>}
                </div>

                <div className="eq-sum-divider" />

                {couponDiscount > 0 && (
                  <div className="eq-sumrow" style={{ marginBottom: 12 }}>
                    <span className="eq-sumrow-label">
                      <span className="eq-sumrow-label-icon">🎟️</span>
                      Coupon Discount
                    </span>
                    <span className="eq-sumrow-val green">
                      -₹{couponDiscount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="eq-total-row">
                  <span className="eq-total-label">Total Payable</span>
                  <span className="eq-total-val">₹{totalPayable.toLocaleString()}</span>
                </div>

                {totalSavings > 0 && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'rgba(5, 150, 105, 0.08)',
                    border: '1px dashed rgba(5, 150, 105, 0.3)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    animation: 'eqPulse 2s ease infinite'
                  }}>
                    <span style={{ fontSize: 18 }}>💰</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                      You saved ₹{totalSavings.toLocaleString()} on this order!
                    </span>
                  </div>
                )}

                {minLeft > 0 && (
                  <div className="eq-min-alert">
                    <span className="eq-min-alert-icon">⚠️</span>
                    <span className="eq-min-alert-text">
                      Add <span className="eq-min-alert-amount">₹{minLeft.toLocaleString()}</span> more to reach minimum order
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── REST OF THE FORM (unchanged but with updated styling) ── */}
            <div className="eq-form-card">
              <form onSubmit={submit}>
                <div className="eq-form-body">

                  {/* STEP 1: Contact & Delivery */}
                  <div className="eq-step-head">
                    <div className="eq-step-num">01</div>
                    <div className="eq-step-title">Contact & Delivery</div>
                  </div>

                  <div className="eq-profile-grid">
                    <div className="eq-info-cell">
                      <div className="eq-info-label">Contact Person</div>
                      <div className="eq-info-val">
                        <span style={{ marginRight: 8 }}>👤</span>
                        {profile.name || '—'}
                      </div>
                    </div>
                    <div className="eq-info-cell">
                      <div className="eq-info-label">Phone Number</div>
                      <div className="eq-info-val">
                        <span style={{ marginRight: 8 }}>📞</span>
                        {profile.phone || '—'}
                      </div>
                    </div>
                    <div className="eq-info-cell">
                      <div className="eq-info-label">Email Address</div>
                      <div className="eq-info-val">
                        <span style={{ marginRight: 8 }}>✉️</span>
                        {profile.email || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="eq-addr-row">
                    <div className={`eq-svc-badge ${svc.loading ? '' : svc.available ? 'avail' : 'unavail'}`}>
                      <div className="eq-svc-header">
                        <span 
                          className="eq-svc-dot" 
                          style={{ 
                            background: svc.loading 
                              ? '#c4b5fd' 
                              : svc.available 
                                ? '#059669' 
                                : '#ef4444' 
                          }} 
                        />
                        <div className={`eq-svc-main ${svc.loading ? 'gray' : svc.available ? 'green' : 'red'}`}>
                          {svc.loading 
                            ? 'Checking serviceability…' 
                            : svc.available 
                              ? `PIN ${String(profile?.kyc?.pincode || '').trim()} · Serviceable` 
                              : 'Delivery Unavailable'}
                        </div>
                      </div>
                      
                      {!svc.loading && svc.available && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div className="eq-svc-detail">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 14 }}>{svc.cod ? '✅' : '❌'}</span>
                              <span style={{ fontWeight: 700, color: svc.cod ? '#059669' : '#6b7280' }}>
                                {svc.cod ? 'Cash on Delivery Available' : 'COD Not Available'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14 }}>🕒</span>
                              <span>Expected Delivery: {fmtDate(svc.etaStart)} – {fmtDate(svc.etaEnd)}</span>
                            </div>
                          </div>
                          {ship.loading && (
                            <div className="eq-svc-free">Calculating…</div>
                          )}
                          {!ship.loading && ship.final > 0 && (
                            <div className="eq-svc-free">Shipping Fee: ₹{ship.final}</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="eq-addr-cell">
                      <div className="eq-info-label">Delivery Destination</div>
                      <div className="eq-addr-line">
                        {profile?.kyc?.addressLine1 || '—'}
                        {profile?.kyc?.addressLine2 ? `, ${profile.kyc.addressLine2}` : ''}
                      </div>
                      <div className="eq-addr-sub">
                        <span>📍</span>
                        {profile?.kyc?.city || '—'}, {profile?.kyc?.state || '—'} — {profile?.kyc?.pincode || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="eq-section-div" />

                  {/* STEP 2: Payment */}
                  <div className="eq-step-head">
                    <div className="eq-step-num">02</div>
                    <div className="eq-step-title">Payment Method</div>
                  </div>

                  <div className="eq-pay-options">
                    {/* Razorpay */}
                    <button
                      type="button"
                      disabled={!svc.available}
                      className={`eq-pay-opt ${paymentMethod === 'RAZORPAY' ? 'active-violet' : ''}`}
                      onClick={() => setPaymentMethod('RAZORPAY')}
                    >
                      <div className="eq-pay-ico violet">💳</div>
                      <div className="eq-pay-info">
                        <div className="eq-pay-name">Razorpay</div>
                        <div className="eq-pay-desc violet">Online Payment · Auto Confirmation</div>
                      </div>
                      <div className="eq-pay-radio">
                        <div className="eq-pay-radio-dot" />
                      </div>
                    </button>

                    {/* Manual */}
                    <button
                      type="button"
                      disabled={!svc.available}
                      className={`eq-pay-opt ${paymentMethod === 'MANUAL' ? 'active-green' : ''}`}
                      onClick={() => setPaymentMethod('MANUAL')}
                    >
                      <div className="eq-pay-ico green">📱</div>
                      <div className="eq-pay-info">
                        <div className="eq-pay-name">Manual Payment</div>
                        <div className="eq-pay-desc green">UPI / Bank Transfer · Manual Approval</div>
                      </div>
                      <div className="eq-pay-radio">
                        <div className="eq-pay-radio-dot" />
                      </div>
                    </button>

                    {/* COD */}
                    <button
                      type="button"
                      disabled={!svc.available || !svc.cod}
                      className={`eq-pay-opt ${paymentMethod === 'COD' ? 'active-blue' : ''} ${(!svc.available || !svc.cod) ? 'disabled-opt' : ''}`}
                      onClick={() => setPaymentMethod('COD')}
                    >
                      <div className="eq-pay-ico blue">
                        {svc.cod ? '🚚' : '🚫'}
                      </div>
                      <div className="eq-pay-info">
                        <div className="eq-pay-name" style={{ color: (!svc.available || !svc.cod) ? '#9ca3af' : '#1e1b2e' }}>
                          Cash on Delivery
                        </div>
                        <div className={`eq-pay-desc ${svc.cod ? 'blue' : 'gray'}`}>
                          {svc.cod ? 'Pay 20% now · Rest on delivery' : 'Not available for this location'}
                        </div>
                      </div>
                      {svc.available && svc.cod ? (
                        <div className="eq-pay-radio">
                          <div className="eq-pay-radio-dot" />
                        </div>
                      ) : (
                        <div className="eq-pay-lock">🔒</div>
                      )}
                    </button>

                    {paymentMethod === 'COD' && (
                      <div className="eq-cod-sub">
                        <button
                          type="button"
                          className={`eq-cod-sub-btn ${codAdvMethod === 'RAZORPAY' ? 'active' : 'inactive'}`}
                          onClick={() => setCodAdvMethod('RAZORPAY')}
                        >
                          Pay 20% via Razorpay
                        </button>
                        <button
                          type="button"
                          className={`eq-cod-sub-btn ${codAdvMethod === 'MANUAL' ? 'active' : 'inactive'}`}
                          onClick={() => setCodAdvMethod('MANUAL')}
                        >
                          Pay 20% via UPI/Bank
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Premium Submit Button */}
                  <button
                    type="submit"
                    className={`eq-submit ${payIsReady && !loading ? 'ready' : 'blocked'}`}
                    disabled={!payIsReady || loading}
                  >
                    {loading ? (
                      <>
                        <div className="eq-spin" />
                        Processing Order...
                      </>
                    ) : !svc.available ? (
                      'Delivery Not Available'
                    ) : visibleTotal < minAmount ? (
                      `Add ₹${minLeft.toLocaleString()} more`
                    ) : paymentMethod === 'RAZORPAY' ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Pay & Confirm Order
                      </>
                    ) : paymentMethod === 'MANUAL' ? (
                      'Proceed to Manual Payment →'
                    ) : codAdvMethod === 'RAZORPAY' ? (
                      'Pay 20% Advance & Confirm COD'
                    ) : (
                      'Submit UTR for COD Advance'
                    )}
                  </button>

                  <div className="eq-secure">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secure checkout · 256-bit SSL encrypted
                  </div>

                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
