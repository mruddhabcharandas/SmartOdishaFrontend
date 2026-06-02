
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
import { useToast } from '../../components/Toast'

export default function Enquiry() {
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { cart, clearCart, cartTotal } = useCart()
  const minAmount = Number(import.meta.env.VITE_MIN_ORDER_AMOUNT || 5000)

  const mapCartItem = (item) => {
    const it = (item.bulkTiers || item.bulkDiscountQuantity) ? item : (item.productId && typeof item.productId === 'object' ? item.productId : item)
    let attributes = item.attributes
    if (!attributes && item.productId && typeof item.productId === 'object' && item.variantSku && item.productId.variants) {
      const variant = item.productId.variants.find(v => v.sku === item.variantSku)
      if (variant && variant.attributes) attributes = variant.attributes
    }
    return {
      productId: item.productId || item._id,
      variantSku: item.variantSku,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      gst: item.gst || 0,
      mrp: item.mrp || item.price,
      image: item.image || item.images?.[0]?.url,
      attributes: attributes,
      bulkQty: it.bulkDiscountQuantity || it.bulkQty || 0,
      bulkRed: it.bulkDiscountPriceReduction || it.bulkRed || 0,
      bulkTiers: it.bulkTiers,
      weight: item.weight || 0,
    }
  }

  const initialItems = cart.length > 0
    ? cart.map(mapCartItem)
    : (location.state?.productId ? [{ productId: location.state.productId, quantity: 1, name: location.state.name, mrp: location.state.mrp || location.state.price, price: location.state.price, gst: location.state.gst || 0 }] : [])

  const [items, setItems] = useState(initialItems)
  const [profile, setProfile] = useState({ name: '', phone: '', email: '', kyc: {} })
  const [svc, setSvc] = useState({ loading: true, available: null, cod: null, etaStart: null, etaEnd: null, error: '' })
  const [ship, setShip] = useState({ loading: false, amount: 0, discount: 0, final: 0 })
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null)
  const [couponError, setCouponError] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const cashfreeSdkLoaded = useRef(false)

  const computeEtaRange = () => {
    const add = (d, n) => { const x = new Date(d); for (let i = 0; i < n; i++) x.setDate(x.getDate() + 1); return x }
    const t = new Date(); return { start: add(t, 3), end: add(t, 6) }
  }

  const loadServiceability = async (pin) => {
    if (!pin) { setSvc({ loading: false, available: null, cod: null, etaStart: null, etaEnd: null, error: 'no_pin' }); return }
    setSvc(p => ({ ...p, loading: true, error: '' }))
    try {
      const { data } = await api.get('/api/shipping/check-pincode', { params: { pincode: pin } })
      const etaStart = data?.etaStart ? new Date(data.etaStart) : computeEtaRange().start
      const etaEnd = data?.etaEnd ? new Date(data.etaEnd) : computeEtaRange().end
      setSvc({ loading: false, available: !!data.delivery_available, cod: !!data.cod_available, etaStart, etaEnd, error: '' })
      if (data.delivery_available) {
        setShip(s => ({ ...s, loading: true }))
        try {
          const totalWeightGrams = items.reduce((s, it) => s + (Number(it.weight || 0) * Number(it.quantity || 1)), 0)
          const weightKg = totalWeightGrams > 0 ? (totalWeightGrams / 1000) : 0.5
          const { data: calc } = await api.post('/api/shipping/calculate', { destination_pin: pin, weight: weightKg, order_amount: cartTotal })
          setShip({ loading: false, amount: calc?.shipping ?? calc?.amount ?? 85, discount: calc?.discount ?? 85, final: calc?.final ?? 0 })
        } catch { setShip({ loading: false, amount: 85, discount: 85, final: 0 }) }
      } else { setShip({ loading: false, amount: 0, discount: 0, final: 0 }) }
    } catch {
      const { start, end } = computeEtaRange()
      setSvc({ loading: false, available: null, cod: null, etaStart: start, etaEnd: end, error: 'failed' })
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
    if (!localStorage.getItem('token')) { navigate('/login', { state: { from: location.pathname + location.search } }); return }
    (async () => {
      try {
        const { data } = await api.get('/api/user/me')
        if (!data.isKycComplete) { notify('Complete your KYC to place orders', 'error'); navigate('/profile'); return }
        const prof = { name: data.name || '', phone: data.phone || '', email: data.email || '', kyc: data.kyc || {} }
        setProfile(prof)
        const pin = String(prof?.kyc?.pincode || '').trim()
        if (pin) loadServiceability(pin)
      } catch { navigate('/login') }
    })()
  }, [])

  const getLineDetails = (it) => {
    let p = Number(it.price || 0)
    const qty = Math.max(1, Number(it.quantity || 1))
    if (Array.isArray(it.bulkTiers) && it.bulkTiers.length) {
      const tiers = it.bulkTiers.slice().sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
      const app = tiers.filter(t => qty >= Number(t.quantity || 0)).pop()
      if (app) p = Math.max(0, p - Number(app.priceReduction ?? app.price_reduction ?? 0))
    } else if (Number(it.bulkQty || it.bulkDiscountQuantity) > 0) {
      if (qty >= Number(it.bulkQty || it.bulkDiscountQuantity)) p = Math.max(0, p - Number(it.bulkRed || it.bulkDiscountPriceReduction || 0))
    }
    const lineTotal = p * qty
    const rate = Number(it.gst || 0)
    const lineGst = rate > 0 ? Number((lineTotal - (lineTotal / (1 + rate / 100))).toFixed(2)) : 0
    const lineSubtotal = Number((lineTotal - lineGst).toFixed(2))
    return { unitBase: p, lineSubtotal, lineGst, lineTotal }
  }

  const unitPrice = (it) => getLineDetails(it).unitBase
  const lineTotal = (it) => getLineDetails(it).lineTotal
  const computedVisibleTotal = (arr) => arr.filter(it => typeof it.productId === 'string' && it.productId.length >= 12).reduce((s, it) => s + lineTotal(it), 0)
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

  const loadCashfreeSdk = async () => {
    if (cashfreeSdkLoaded.current) return true
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
      script.async = true
      script.onload = () => {
        cashfreeSdkLoaded.current = true
        if (window.Cashfree) {
          resolve(true)
        } else {
          reject(new Error('Failed to load Cashfree SDK'))
        }
      }
      script.onerror = () => reject(new Error('Failed to load Cashfree SDK'))
      document.body.appendChild(script)
    })
  }

  const handleCashfreeCheckout = async (paymentSessionId) => {
    try {
      await loadCashfreeSdk()
      const cashfree = window.Cashfree({ mode: 'sandbox' })
      cashfree.checkout({
        paymentSessionId: paymentSessionId,
        returnUrl: `${window.location.origin}/orders?order_id={order_id}`
      })
    } catch (err) {
      notify(err?.message || 'Payment gateway error', 'error')
      setLoading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (cartTotal < minAmount) { notify(`Minimum order amount is ₹${minAmount.toLocaleString()}`, 'error'); return }
    try {
      const pin = String(profile?.kyc?.pincode || '').trim()
      if (!pin) { notify('Please add delivery pincode in KYC', 'error'); navigate('/profile'); return }
      const { data: svcData } = await api.get('/api/shipping/check-pincode', { params: { pincode: pin } })
      if (!svcData?.delivery_available) { notify('Delivery not available for your pincode', 'error'); return }
    } catch { notify('Unable to verify serviceability right now', 'error'); return }

    setLoading(true)
    try {
      const cleanItems = items.filter(it => typeof it.productId === 'string' && it.productId.length >= 12).map(it => ({ productId: it.productId, variantSku: it.variantSku, quantity: Math.max(1, Number(it.quantity || 1)) }))
      const visibleTotal = computedVisibleTotal(items)
      if (visibleTotal < minAmount) { notify(`Minimum order amount is ₹${minAmount.toLocaleString()}`, 'error'); setLoading(false); return }

      // Prepare payment
      const { data } = await api.post('/api/orders/prepare-payment', {
        items: cleanItems,
        paymentMethod: 'CASHFREE',
        couponCode: appliedCoupon?.code || ''
      })

      if (data.paymentSessionId) {
        // Open Cashfree checkout
        await handleCashfreeCheckout(data.paymentSessionId)
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to place order. Please try again.'
      notify(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const visibleTotal = computedVisibleTotal(items)
  const minLeft = Math.max(0, minAmount - visibleTotal)
  const mrpTotal = items.reduce((s, it) => {
    const qty = Math.max(1, Number(it.quantity || 1))
    const baseMrp = Number(it.mrp || it.price || 0)
    return s + (baseMrp * qty)
  }, 0)
  const bulkSavings = Math.max(0, mrpTotal - subTotal)
  const totalSavings = bulkSavings + couponDiscount + (ship.amount || 0)

  if (items.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Cart Awaits</h2>
        <p className="text-slate-600 mb-6">Start your shopping with quality products</p>
        <Link to="/products" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all">
          Explore Products
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
            Complete Your <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Order</span>
          </h1>
          <p className="text-slate-600">Secure checkout with Cashfree Payments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">👤</span> Customer Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Full Name</div>
                  <div className="text-lg font-semibold text-slate-900">{profile.name}</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Email</div>
                  <div className="text-lg font-semibold text-slate-900">{profile.email}</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Phone</div>
                  <div className="text-lg font-semibold text-slate-900">+91 {profile.phone}</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Pincode</div>
                  <div className="text-lg font-semibold text-slate-900">{profile.kyc?.pincode}</div>
                </div>
              </div>

              {profile.kyc && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                  <h4 className="font-semibold text-slate-900 mb-3">Delivery Address</h4>
                  <p className="text-slate-700 leading-relaxed">
                    {profile.kyc.addressLine1}{profile.kyc.addressLine2 ? `, ${profile.kyc.addressLine2}` : ''}<br />
                    {profile.kyc.city}, {profile.kyc.district}, {profile.kyc.state} - {profile.kyc.pincode}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="text-3xl">💳</span> Payment Method
              </h3>

              <div className="space-y-4">
                <button
                  type="button"
                  className="w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center gap-4 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl text-white shadow-md">
                    💳
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-slate-900">Cashfree Payments</div>
                    <div className="text-sm text-slate-600">UPI, Cards, Netbanking, Wallets</div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center border-blue-600">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  </div>
                </button>
              </div>

              <button
                onClick={submit}
                disabled={loading || visibleTotal < minAmount || !svc.available}
                className={`w-full mt-8 py-5 rounded-2xl font-bold text-lg uppercase tracking-widest transition-all ${
                  loading || visibleTotal < minAmount || !svc.available
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {loading ? 'Processing...' :
                  visibleTotal < minAmount ? `Add ₹${minLeft.toLocaleString()} More` :
                  `Pay ₹${totalPayable.toLocaleString()}`}
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 sticky top-10 overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50">
                <h3 className="text-2xl font-bold text-slate-900">Order Summary</h3>
                <p className="text-slate-600 text-sm mt-1">{items.length} items</p>
              </div>

              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {items.map((it, idx) => {
                  return (
                    <div key={idx} className="flex items-start gap-4 pb-4 border-b border-slate-100">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                        {it.image ? (
                          <img
                            src={getCloudinaryUrl(it.image, 100)}
                            alt={it.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-slate-400 text-xl">📦</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{it.name}</div>
                        <div className="text-sm text-slate-500 mt-1">Qty: {it.quantity} × ₹{unitPrice(it).toLocaleString()}</div>
                      </div>
                      <div className="text-right font-bold text-slate-900">
                        ₹{lineTotal(it).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-8 border-t border-slate-100">
                <div className="space-y-4">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold">MRP Total</span>
                    <span className="font-semibold">₹{mrpTotal.toLocaleString()}</span>
                  </div>

                  {bulkSavings > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span className="font-semibold">Bulk Discount</span>
                      <span className="font-semibold">-₹{bulkSavings.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-700">
                    <span className="font-semibold">Delivery Fee</span>
                    <span className="font-semibold">
                      <span className="text-slate-400 line-through mr-2">₹{(ship.amount || 85).toLocaleString()}</span>
                      <span className="text-green-700">FREE</span>
                    </span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span className="font-semibold">Coupon Discount</span>
                      <span className="font-semibold">-₹{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="h-px bg-slate-200 my-4"></div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Total Payable</div>
                    </div>
                    <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      ₹{totalPayable.toLocaleString()}
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="mt-6">
                    {!appliedCoupon ? (
                      <div className="flex gap-3">
                        <input
                          type="text"
                          className="flex-1 px-5 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-semibold uppercase tracking-widest text-sm"
                          placeholder="COUPON CODE"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={isApplying || !couponCode.trim()}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 hover:shadow-lg transition-all"
                        >
                          {isApplying ? '...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🎟️</span>
                          <div>
                            <div className="text-xs font-bold text-green-700 uppercase tracking-widest">{appliedCoupon.code} Applied</div>
                            <div className="text-sm font-bold text-green-600">₹{couponDiscount.toLocaleString()} Saved</div>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-red-600 font-bold text-sm uppercase tracking-widest hover:text-red-800 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {couponError && (
                      <div className="mt-3 text-sm font-semibold text-red-600">{couponError}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
