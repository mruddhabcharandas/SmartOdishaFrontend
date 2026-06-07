import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import { getImageUrl } from '../../lib/cloudinary'
import { useCart, getStockStatus } from '../../lib/CartContext'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/AuthContext'

// Indian States
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep',
  'Puducherry'
]

export default function Enquiry() {
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { cart, clearCart, refreshCart, updateQuantity, removeFromCart } = useCart()
  const { user, refreshProfile } = useAuth()
  const minAmount = Number(import.meta.env.VITE_MIN_ORDER_AMOUNT || 5000)

  // Price Helpers (same as Cart.jsx)
  const getBulkTiers = (item) => {
    const it = (item.bulkTiers || item.bulkDiscountQuantity) ? item : (item.productId && typeof item.productId === 'object' ? item.productId : item)
    if (Array.isArray(it.bulkTiers) && it.bulkTiers.length)
      return it.bulkTiers.slice().sort((a,b) => a.quantity - b.quantity)
    if (it.bulkDiscountQuantity > 0)
      return [{ quantity: it.bulkDiscountQuantity, priceReduction: it.bulkDiscountPriceReduction || 0 }]
    return []
  }
  const getNextTier = (qty, tiers) => tiers.find(t => qty < t.quantity) || null
  const unitPrice = (it) => {
    let p = Number(it.price || 0)
    const qty = Math.max(1, Number(it.quantity || 1))
    const tiers = getBulkTiers(it)
    if (tiers.length) {
      const applicable = tiers.filter(t => qty >= Number(t.quantity || 0)).pop()
      if (applicable) p = Math.max(0, p - Number(applicable.priceReduction || 0))
    }
    return p
  }
  const lineTotal = (it) => unitPrice(it) * Math.max(1, Number(it.quantity || 1))
  const mrpTotal = cart.reduce((s,it) => s + Number(it.mrp||it.price||0) * Math.max(1,Number(it.quantity||1)), 0)
  const effTotal = cart.reduce((s,it) => {
    const itemStock = it.variantSku 
      ? (it.productId?.variants?.find(v => v.sku === it.variantSku)?.stock ?? it.stock)
      : (it.productId?.stock ?? it.stock);
    if (itemStock <= 0) return s;
    return s + lineTotal(it);
  }, 0)
  const bulkDiscount = Math.max(0, mrpTotal - effTotal)
  const subTotal = effTotal

  // Coupon State
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null)
  const [couponError, setCouponError] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0

  // Address State
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    isDefault: false
  })

  // Shipping & Payment
  const [shippingInfo, setShippingInfo] = useState({
    loading: false,
    deliveryCharge: 0,
    codCharge: 0,
    codAvailable: true,
    isFreeDelivery: false,
    deliveryAvailable: true
  })
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('prepaid') // 'prepaid' or 'cod'

  // Serviceability
  const [svc, setSvc] = useState({ loading: false, available: null, cod: null, etaStart: null, etaEnd: null, error: '' })

  // Loading
  const [loading, setLoading] = useState(false)
  const [prepareData, setPrepareData] = useState(null)

  // SDK
  const cashfreeSdkLoaded = useRef(false)

  // Total Payable
  const totalPayable = (appliedCoupon ? appliedCoupon.payable : subTotal) + shippingInfo.finalCharge
  const minLeft = Math.max(0, minAmount - subTotal)

  // Address Functions
  const loadAddresses = async () => {
    if (!localStorage.getItem('token')) return
    try {
      const { data } = await api.get('/api/user/addresses')
      setSavedAddresses(data)
      if (data.length > 0) {
        const defaultAddr = data.find(a => a.isDefault) || data[0]
        setSelectedAddress(defaultAddr)
        loadServiceability(defaultAddr.pincode)
      }
    } catch (err) {
      console.error('Failed to load addresses:', err)
    }
  }

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
        await calculateShipping(pin, subTotal, selectedPaymentMethod)
      } else { setShippingInfo({ loading: false, deliveryCharge: 0, codCharge: 0, finalCharge: 0, codAvailable: true, isFreeDelivery: false, deliveryAvailable: false }) }
    } catch {
      const { start, end } = computeEtaRange()
      setSvc({ loading: false, available: null, cod: null, etaStart: start, etaEnd: end, error: 'failed' })
    }
  }

  const calculateShipping = async (pin, orderAmt, paymentMethod) => {
    if (!pin) return
    try {
      setShippingInfo(prev => ({ ...prev, loading: true }))
      const totalWeight = cart.reduce((sum, item) => sum + (Number(item.weight) || 0.5) * item.quantity, 0)
      const firstItem = cart[0]
      const storeId = firstItem?.store?._id || firstItem?.store
      
      const { data } = await api.post('/api/shipping/calculate', {
        destination_pin: pin,
        weight: totalWeight,
        order_amount: orderAmt,
        payment_method: paymentMethod,
        store_id: storeId
      })
      
      setShippingInfo({
        loading: false,
        deliveryCharge: data.delivery_charge || 0,
        codCharge: data.cod_charge || 0,
        finalCharge: data.final_charge || 0,
        codAvailable: data.cod_available !== false,
        isFreeDelivery: data.final_charge === 0 && paymentMethod === 'prepaid',
        deliveryAvailable: true
      })
    } catch (err) {
      console.error('Failed to calculate shipping:', err)
      const freeDeliveryAbove = 999
      const isPrepaidFree = orderAmt >= freeDeliveryAbove && paymentMethod === 'prepaid'
      const deliveryCharge = isPrepaidFree ? 0 : 85
      const codCharge = paymentMethod === 'cod' ? Math.min(Math.max(Math.round(orderAmt * 0.05), 40), 100) : 0
      const finalCharge = deliveryCharge + codCharge
      
      setShippingInfo({
        loading: false,
        deliveryCharge,
        codCharge,
        finalCharge,
        codAvailable: true,
        isFreeDelivery: finalCharge === 0 && paymentMethod === 'prepaid',
        deliveryAvailable: true
      })
    }
  }

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

  // Address Modal Functions
  const handleAddAddress = () => {
    setEditingAddress(null)
    setAddressForm({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      isDefault: savedAddresses.length === 0
    })
    setShowAddressModal(true)
  }
  const handleEditAddress = (address) => {
    setEditingAddress(address)
    setAddressForm({
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      district: address.district,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault
    })
    setShowAddressModal(true)
  }
  const handleSaveAddress = async (e) => {
    e.preventDefault()
    try {
      if (editingAddress) {
        await api.put(`/api/user/addresses/${editingAddress._id}`, addressForm)
        notify('Address updated successfully!', 'success')
      } else {
        await api.post('/api/user/addresses', addressForm)
        notify('Address added successfully!', 'success')
      }
      await loadAddresses()
      await refreshProfile()
      setShowAddressModal(false)
    } catch (err) {
      console.error('Failed to save address:', err)
      notify(err?.response?.data?.error || 'Failed to save address', 'error')
    }
  }
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    try {
      await api.delete(`/api/user/addresses/${addressId}`)
      if (selectedAddress?._id === addressId) {
        setSelectedAddress(null)
      }
      await loadAddresses()
      await refreshProfile()
      notify('Address deleted successfully!', 'success')
    } catch (err) {
      console.error('Failed to delete address:', err)
      notify(err?.response?.data?.error || 'Failed to delete address', 'error')
    }
  }
  const handleSetDefault = async (addressId) => {
    try {
      await api.post(`/api/user/addresses/${addressId}/set-default`)
      await loadAddresses()
      await refreshProfile()
      notify('Default address updated!', 'success')
    } catch (err) {
      console.error('Failed to set default address:', err)
      notify(err?.response?.data?.error || 'Failed to set default address', 'error')
    }
  }

  const [pincodeLoading, setPincodeLoading] = useState(false);
  
  const handleAddressInputChange = async (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10)
      setAddressForm(prev => ({ ...prev, [name]: cleaned }))
    } else if (name === 'pincode') {
      const cleaned = value.replace(/\D/g, '').slice(0, 6)
      
      if (cleaned.length === 6) {
        setPincodeLoading(true)
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`)
          const data = await response.json()
          
          if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const postOffice = data[0].PostOffice[0]
            setAddressForm(prev => ({
              ...prev,
              pincode: cleaned,
              district: postOffice.District,
              state: postOffice.State
            }))
            setPincodeLoading(false)
            return
          } else {
            notify('Invalid pincode', 'error')
          }
        } catch (err) {
          console.error('Failed to fetch pincode details', err)
        } finally {
          setPincodeLoading(false)
        }
      }
      
      setAddressForm(prev => ({ ...prev, [name]: cleaned }))
    } else {
      setAddressForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  // Payment Functions
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
  const handleCashfreeCheckout = async (paymentSessionId, cashfreeMode) => {
    try {
      await loadCashfreeSdk()
      const mode = cashfreeMode || (import.meta.env.PROD ? 'production' : 'sandbox')
      const cashfree = window.Cashfree({ mode })
      cashfree.checkout({
        paymentSessionId: paymentSessionId,
        returnUrl: `${window.location.origin}/orders?order_id={order_id}`
      })
    } catch (err) {
      notify(err?.message || 'Payment gateway error', 'error')
      setLoading(false)
    }
  }

  // Submit Order
  const submit = async (e) => {
    e.preventDefault()
    if (subTotal < minAmount) { notify(`Minimum order amount is ₹${minAmount.toLocaleString()}`, 'error'); return }
    if (!selectedAddress) { notify('Please select a delivery address', 'error'); return }
    
    try {
      const { data: svcData } = await api.get('/api/shipping/check-pincode', { params: { pincode: selectedAddress.pincode } })
      if (!svcData?.delivery_available) { notify('Delivery not available for your pincode', 'error'); return }
    } catch { notify('Unable to verify serviceability right now', 'error'); return }

    setLoading(true)
    try {
      const cleanItems = cart.filter(it => {
        const itemStock = it.variantSku 
          ? (it.productId?.variants?.find(v => v.sku === it.variantSku)?.stock ?? it.stock)
          : (it.productId?.stock ?? it.stock);
        return itemStock > 0;
      }).map(it => ({ 
        productId: it.productId || it._id, 
        variantSku: it.variantSku, 
        quantity: Math.max(1, Number(it.quantity || 1)) 
      }))
      
      if (cleanItems.length === 0) {
        notify('No items available to order', 'error')
        setLoading(false)
        return
      }

      // Prepare payment
      const { data } = await api.post('/api/orders/prepare-payment', {
        items: cleanItems,
        paymentMethod: selectedPaymentMethod,
        couponCode: appliedCoupon?.code || '',
        deliveryAddress: selectedAddress
      })

      setPrepareData({ ...data, items: cleanItems, deliveryAddress: selectedAddress, couponCode: appliedCoupon?.code || '' })

      if (data.paymentSessionId) {
        // Open Cashfree checkout
        await handleCashfreeCheckout(data.paymentSessionId, data.cashfreeMode)
      } else if (selectedPaymentMethod === 'cod') {
        // Create order directly for COD
        await api.post('/api/orders/create-cod', {
          items: cleanItems,
          deliveryAddress: selectedAddress,
          couponCode: appliedCoupon?.code || ''
        })
        notify('Order placed successfully!', 'success')
        clearCart()
        navigate('/orders')
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to place order. Please try again.'
      notify(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle cashfree callback
  useEffect(() => {
    const handleCashfreeCallback = async () => {
      const queryParams = new URLSearchParams(location.search)
      const orderId = queryParams.get('order_id')
      const cashfreePaymentId = queryParams.get('payment_id')
      const cashfreeSignature = queryParams.get('signature')
      
      if (orderId && cashfreePaymentId && cashfreeSignature && prepareData) {
        try {
          setLoading(true)
          await api.post('/api/orders/create-after-verify', {
            ...prepareData,
            cashfreeOrderId: orderId,
            cashfreePaymentId,
            cashfreeSignature
          })
          notify('Order placed successfully!', 'success')
          clearCart()
          navigate('/orders')
        } catch (err) {
          notify(err?.response?.data?.error || 'Order failed', 'error')
        } finally {
          setLoading(false)
          setPrepareData(null)
        }
      }
    }
    handleCashfreeCallback()
  }, [location.search, prepareData, clearCart, navigate, notify])

  // Load initial data
  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login', { state: { from: '/checkout' } }); return }
    refreshCart()
    loadAddresses()
  }, [])

  // Recalculate shipping when payment method changes
  useEffect(() => {
    if (selectedAddress) {
      calculateShipping(selectedAddress.pincode, subTotal, selectedPaymentMethod)
    }
  }, [selectedAddress, subTotal, selectedPaymentMethod])

  // Empty Cart
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
          <div className="ct-empty-h">Your Cart is Empty</div>
          <p className="ct-empty-p">Add products to your cart before checking out.</p>
          <Link to="/products" className="ct-empty-btn">
            Explore Products
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
          </Link>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ct-root{
          font-family:'DM Sans',system-ui,sans-serif;
          background:#f0f9ff; min-height:100vh; color:#1e1b2e;
          position:relative; overflow-x:hidden;
          padding-bottom:32px;
        }
        .ct-root::before{
          content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:linear-gradient(rgba(30,58,138,.04)1px,transparent 1px),linear-gradient(90deg,rgba(30,58,138,.04)1px,transparent 1px);
          background-size:60px 60px;
        }
        .ct-blob{position:fixed;top:-180px;left:50%;transform:translateX(-50%);width:800px;height:500px;border-radius:50%;pointer-events:none;z-index:0;background:radial-gradient(ellipse,rgba(30,58,138,.07),transparent 65%);}

        .ct-wrap{max-width:1200px;margin:0 auto;padding:36px 16px 24px;position:relative;z-index:1;}
        @media(min-width:600px){.ct-wrap{padding:48px 24px 24px;}}

        .ct-hd{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:32px;animation:ctUp .5s ease both;}
        .ct-eyebrow{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:100px;background:rgba(30,58,138,.1);border:1px solid rgba(30,58,138,.22);color:#f97316;font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin-bottom:10px;}
        .ct-edot{width:5px;height:5px;border-radius:50%;background:#f97316;box-shadow:0 0 5px rgba(124,58,237,.5);animation:ctPulse 2s ease infinite;}
        @keyframes ctPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
        .ct-h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,50px);color:#1e1b2e;letter-spacing:.02em;line-height:1;margin-bottom:6px;}
        .ct-h1 span{color:#f97316;}
        .ct-sub{font-size:13px;color:#6b7280;}

        .ct-grid{display:grid;grid-template-columns:1fr;gap:20px;}
        @media(min-width:960px){.ct-grid{grid-template-columns:1fr 360px;align-items:start;gap:24px;}}

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
          .ct-item{grid-template-columns:72px 1fr;padding:14px;gap:12px;}
          .ct-line-total{grid-column:1 / -1;flex-direction:row;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px dashed rgba(30,58,138,0.1);margin-top:4px;}
          .ct-line-price{font-size:18px;}
          .ct-item-name{font-size:13px;}
          .ct-qty-ctrl{scale:0.9;transform-origin:left;}
        }

        .ct-img{width:88px;height:88px;flex-shrink:0;background:#f9f7ff;border:1px solid rgba(30,58,138,.1);border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;}
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

        .ct-qty-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .ct-qty-ctrl{display:inline-flex;align-items:center;background:white;border:1.5px solid rgba(30,58,138,.25);border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(124,58,237,0.06);}
        .ct-qty-btn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#f97316;background:none;border:none;cursor:pointer;transition:all .2s cubic-bezier(0.4,0,0.2,1);font-family:'DM Sans',sans-serif;}
        .ct-qty-btn:hover:not(:disabled){background:rgba(30,58,138,.08);color:#6d28d9;}
        .ct-qty-btn:active:not(:disabled){transform:scale(0.9);}
        .ct-qty-btn:disabled{opacity:.3;cursor:not-allowed;}
        .ct-qty-val{width:44px;text-align:center;font-size:14px;font-weight:800;color:#1e1b2e;border-left:1px solid rgba(30,58,138,.12);border-right:1px solid rgba(30,58,138,.12);line-height:36px;background:white;border-top:none;border-bottom:none;outline:none;}
        .ct-action-btn{font-size:11px;font-weight:800;letter-spacing:.08em;background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:8px;font-family:'DM Sans',sans-serif;transition:all .25s cubic-bezier(0.4,0,0.2,1);}
        .ct-action-btn.remove{color:#ef4444;background:rgba(239,68,68,.05);}
        .ct-action-btn.remove:hover{color:white;background:#ef4444;transform:translateY(-1px);box-shadow:0 4px 12px rgba(239,68,68,.2);}

        .ct-tier-nudge{margin-top:12px;padding:14px 16px;border-radius:14px;background:rgba(5,150,105,.04);border:1px solid rgba(5,150,105,.12);box-shadow:0 2px 10px rgba(5,150,105,0.03);}
        .ct-tier-bar-track{height:6px;background:rgba(5,150,105,.1);border-radius:100px;overflow:hidden;margin-bottom:10px;}
        .ct-tier-bar-fill{height:6px;background:#059669;border-radius:100px;transition:width .4s cubic-bezier(0.34,1.56,0.64,1);}
        .ct-tier-nudge-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}
        .ct-tier-text{font-size:11px;font-weight:700;color:#059669;line-height:1.4;}
        .ct-tier-add-btn{flex-shrink:0;padding:8px 18px;border-radius:10px;background:#059669;color:white;border:none;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all .3s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 4px 12px rgba(5,150,105,.25);}
        .ct-tier-add-btn:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 8px 20px rgba(5,150,105,.4);}
        .ct-tier-add-btn:active{transform:translateY(-1px) scale(0.96);}
        .ct-tier-max{font-size:11px;font-weight:700;color:#059669;}

        .ct-line-total{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:4px;}
        .ct-line-price{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#f97316;letter-spacing:.03em;}
        .ct-line-unlock{font-size:10px;font-weight:700;color:#d97706;text-align:right;max-width:120px;line-height:1.4;}
        @media(max-width:500px){.ct-line-total{flex-direction:row;align-items:center;justify-content:space-between;}}

        .ct-section{background:white;border:1px solid rgba(30,58,138,.1);border-radius:18px;padding:24px;margin-bottom:16px;animation:ctUp .5s ease both;box-shadow:0 2px 12px rgba(30,58,138,.04);}
        .ct-section-title{font-size:18px;font-weight:800;color:#1e1b2e;margin-bottom:16px;display:flex;align-items:center;gap:10px;}
        .ct-section-title span{width:28px;height:28px;border-radius:10px;background:linear-gradient(135deg,#f97316,#1e3a8a);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:800;}

        .ct-address-option{border:2px solid rgba(30,58,138,.15);border-radius:16px;padding:16px;cursor:pointer;transition:all .2s;margin-bottom:12px;}
        .ct-address-option.selected{border-color:#f97316;background:rgba(249,115,22,.05);}
        .ct-address-option:hover{border-color:rgba(30,58,138,.3);}
        .ct-address-name{font-weight:800;color:#1e1b2e;margin-bottom:4px;}
        .ct-address-text{font-size:13px;color:#6b7280;line-height:1.5;}
        .ct-address-actions{display:flex;gap:8px;margin-top:12px;}
        .ct-address-btn{font-size:11px;font-weight:700;letter-spacing:.08em;padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:none;}
        .ct-address-btn.edit{color:#1e3a8a;background:rgba(30,58,138,.05);}
        .ct-address-btn.delete{color:#ef4444;background:rgba(239,68,68,.05);}
        .ct-address-btn.default{color:#059669;background:rgba(5,150,105,.05);}
        .ct-add-address-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:14px;border:2px dashed rgba(30,58,138,.2);background:white;color:#1e3a8a;font-size:12px;font-weight:800;letter-spacing:.08em;cursor:pointer;transition:all .2s;}
        .ct-add-address-btn:hover{border-color:#f97316;color:#f97316;background:rgba(249,115,22,.03);}

        .ct-payment-option{border:2px solid rgba(30,58,138,.15);border-radius:16px;padding:18px;cursor:pointer;transition:all .2s;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px;}
        .ct-payment-option.selected{border-color:#f97316;background:rgba(249,115,22,.05);}
        .ct-payment-option:hover{border-color:rgba(30,58,138,.3);}
        .ct-payment-icon{width:40px;height:40px;border-radius:12px;background:rgba(30,58,138,.08);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
        .ct-payment-info{flex:1;}
        .ct-payment-title{font-weight:800;color:#1e1b2e;margin-bottom:4px;}
        .ct-payment-desc{font-size:12px;color:#6b7280;}

        .ct-summary{
          background:white; border:1px solid rgba(30,58,138,.14);
          border-radius:20px; padding:24px; position:relative; overflow:hidden;
          box-shadow:0 4px 32px rgba(30,58,138,.07);
          animation:ctUp .5s ease both;
          @media(min-width:960px){position:sticky;top:24px;}
        }
        .ct-summary::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#f97316,transparent);}
        .ct-summary-title{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#1e1b2e;letter-spacing:.03em;margin-bottom:20px;}

        .ct-summary-rows{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
        .ct-summary-row{display:flex;align-items:center;justify-content:space-between;font-size:13px;}
        .ct-summary-label{color:#6b7280;font-weight:500;}
        .ct-summary-val{font-weight:700;color:#1e1b2e;}
        .ct-summary-val.green{color:#059669;}
        .ct-summary-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(30,58,138,.15),transparent);margin:12px 0;}
        .ct-summary-total-row{display:flex;align-items:baseline;justify-content:space-between;}
        .ct-summary-total-label{font-size:13px;font-weight:700;color:#1e1b2e;text-transform:uppercase;letter-spacing:.08em;}
        .ct-summary-total-val{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#f97316;letter-spacing:.03em;}

        .ct-savings-badge{display:flex;align-items:center;gap:8px;background:rgba(5,150,105,.07);border:1px solid rgba(5,150,105,.18);border-radius:12px;padding:12px 14px;margin-bottom:16px;}
        .ct-savings-ico{width:32px;height:32px;border-radius:8px;background:rgba(5,150,105,.12);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
        .ct-savings-text{font-size:13px;font-weight:700;color:#059669;}
        .ct-savings-sub{font-size:11px;font-weight:500;color:#6b7280;}

        .ct-min-progress{margin:16px 0;}
        .ct-min-track{height:5px;background:rgba(30,58,138,.12);border-radius:100px;overflow:hidden;margin-bottom:7px;}
        .ct-min-fill{height:5px;border-radius:100px;transition:width .4s;background:linear-gradient(90deg,#f97316,#f97316);}
        .ct-min-text{font-size:11px;font-weight:600;color:#9ca3af;}
        .ct-min-text b{color:#f97316;}
        .ct-min-text.met{color:#059669;font-weight:700;}

        .ct-checkout-btn{
          width:100%;padding:16px;border-radius:14px;border:none;
          font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
          cursor:pointer;font-family:'DM Sans',sans-serif;
          transition:all .3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display:flex;align-items:center;justify-content:center;gap:10px;
          position:relative;overflow:hidden;
        }
        .ct-checkout-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);transform:translateX(-100%);transition:transform 0.6s;}
        .ct-checkout-btn.ready{background:linear-gradient(135deg,#f97316,#1e3a8a);color:white;box-shadow:0 8px 24px rgba(124,58,237,.3);}
        .ct-checkout-btn.ready:hover{transform:translateY(-4px) scale(1.02);box-shadow:0 16px 48px rgba(124,58,237,.45);}
        .ct-checkout-btn.ready:hover::after{transform:translateX(100%);}
        .ct-checkout-btn.disabled{background:#f3f4f6;color:#d1d5db;cursor:not-allowed;}

        .ct-secure-note{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:#9ca3af;margin-top:12px;font-weight:500;}

        .ct-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;}
        .ct-modal{background:white;border-radius:20px;max-width:500px;width:100%;max-height:90vh;overflow:auto;animation:ctUp 0.3s ease;}
        .ct-modal-header{padding:20px 24px;border-bottom:1px solid rgba(30,58,138,.1);display:flex;align-items:center;justify-content:space-between;}
        .ct-modal-title{font-family:'Bebas Neue',sans-serif;font-size:24px;color:#1e1b2e;}
        .ct-modal-close{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:none;background:rgba(30,58,138,.08);cursor:pointer;font-size:18px;color:#1e1b2e;}
        .ct-modal-body{padding:24px;}
        .ct-form-group{margin-bottom:16px;}
        .ct-form-label{display:block;font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;}
        .ct-form-input{width:100%;padding:12px 16px;border:1.5px solid rgba(30,58,138,.15);border-radius:12px;font-size:14px;font-family:'DM Sans',sans-serif;background:white;outline:none;transition:all .2s;}
        .ct-form-input:focus{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.15);}
        .ct-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .ct-checkbox-row{display:flex;align-items:center;gap:8px;margin-top:8px;}
        .ct-checkbox{width:18px;height:18px;accent-color:#f97316;}
        .ct-checkbox-label{font-size:13px;color:#1e1b2e;font-weight:600;}
        .ct-modal-footer{padding:16px 24px;border-top:1px solid rgba(30,58,138,.1);display:flex;justify-content:flex-end;gap:12px;}
        .ct-modal-btn{padding:12px 24px;border-radius:12px;border:none;font-size:12px;font-weight:800;letter-spacing:.08em;cursor:pointer;transition:all .2s;}
        .ct-modal-btn.cancel{background:rgba(30,58,138,.08);color:#1e1b2e;}
        .ct-modal-btn.save{background:linear-gradient(135deg,#f97316,#1e3a8a);color:white;}

        @keyframes ctUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}

        .ct-cart-items-title{font-size:18px;font-weight:800;color:#1e1b2e;margin-bottom:16px;}
      `}</style>

      <div className="ct-root">
        <div className="ct-blob" />
        <div className="ct-wrap">
          {/* Header */}
          <div className="ct-hd">
            <div>
              <div className="ct-eyebrow"><span className="ct-edot"/> My Account</div>
              <h1 className="ct-h1">Checkout</h1>
              <p className="ct-sub">Complete your order</p>
            </div>
            <Link to="/cart" className="ct-count-pill" style={{textDecoration:'none'}}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              Back to Cart
            </Link>
          </div>

          {/* Main Grid */}
          <div className="ct-grid">
            {/* Left Column */}
            <div>
              {/* Cart Items (Editable) */}
              <div className="ct-section">
                <div className="ct-cart-items-title">Your Items</div>
                <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                  {cart.map((item, idx) => {
                    const tiers = getBulkTiers(item)
                    const next = getNextTier(item.quantity, tiers)
                    const maxQ = tiers.length ? Math.max(item.quantity, tiers[tiers.length-1].quantity) : item.quantity
                    const pct = tiers.length ? Math.min(100, Math.round((item.quantity/maxQ)*100)) : 100
                    const itemStock = item.variantSku 
                      ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock)
                      : (item.productId?.stock ?? item.stock)
                    const stockSt = getStockStatus(itemStock)
                    const isOutOfStock = itemStock <= 0
                    const imgSrc = item.image || item.images?.[0]?.url
                    const itemId = item.productId || item._id
                    const itemSku = item.variantSku || ''

                    const getAttrs = (it) => {
                      if (it.attributes) {
                        return it.attributes instanceof Map ? Object.fromEntries(it.attributes) : it.attributes
                      }
                      if (it.productId && typeof it.productId === 'object' && it.variantSku && it.productId.variants) {
                        const variant = it.productId.variants.find(v => v.sku === it.variantSku)
                        if (variant && variant.attributes) {
                          return variant.attributes instanceof Map ? Object.fromEntries(variant.attributes) : variant.attributes
                        }
                      }
                      return {}
                    }
                    const displayAttributes = getAttrs(item)
                    const hasAttributes = displayAttributes && Object.entries(displayAttributes).filter(([,v]) => v).length > 0

                    return (
                      <div key={`${itemId}-${itemSku}`} className={`ct-item ${isOutOfStock ? 'ct-oos' : ''}`} style={{animationDelay:`${idx*50}ms`,opacity:isOutOfStock?0.6:1,filter:isOutOfStock?'grayscale(0.4)':'none'}}>
                        {isOutOfStock && (
                          <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(255,255,255,0.4)',zIndex:5,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                            <div style={{background:'#ef4444',color:'white',padding:'4px 12px',borderRadius:'8px',fontSize:'10px',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.1em'}}>Currently Unavailable</div>
                          </div>
                        )}
                        
                        <div className="ct-img">
                          {imgSrc ? <img src={getImageUrl(imgSrc, 200)} alt={item.name} loading="lazy" /> : <span className="ct-img-ph">📦</span>}
                        </div>
                        
                        <div className="ct-item-body">
                          <div className="ct-item-name">{item.name}{hasAttributes && <span style={{marginLeft:8,color:'#6b7280',fontSize:'0.9em',fontWeight:500}}>({Object.values(displayAttributes).filter(v => v).map(v => String(v).toUpperCase()).join(', ')})</span>}</div>
                          <div className="ct-item-meta">
                            <span className="ct-unit-price">₹{unitPrice(item).toLocaleString()} / unit</span>
                            <span style={{fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',padding:'2px 8px',borderRadius:100,background:isOutOfStock?'rgba(239,68,68,.1)':itemStock<=5?'rgba(245,158,11,.1)':'rgba(5,150,105,.1)',color:isOutOfStock?'#ef4444':itemStock<=5?'#d97706':'#059669',border:`1px solid ${isOutOfStock?'rgba(239,68,68,.2)':itemStock<=5?'rgba(245,158,11,.2)':'rgba(5,150,105,.2)'}`}}>
                              {stockSt.text}
                            </span>
                          </div>
                          
                          {tiers.length>0 && (
                            <div className="ct-tier-nudge" style={{background:'rgba(124,58,237,.05)',border:'1px solid rgba(124,58,237,.15)'}}>
                              <div className="ct-tier-bar-track" style={{background:'rgba(124,58,237,.1)'}}>
                                <div className="ct-tier-bar-fill" style={{width:`${pct}%`,background:'#f97316'}} />
                              </div>
                              <div className="ct-tier-nudge-row">
                                {next ? (() => {
                                  const delta = next.quantity - item.quantity
                                  const perOff = Number(next.priceReduction||0)
                                  const effUnit = Math.max(0, Number(item.price||0) - perOff)
                                  const estSave = perOff * (item.quantity + delta)
                                  return (
                                    <>
                                      <div className="ct-tier-text" style={{color:'#f97316'}}>Add {delta} more to save ₹{estSave.toLocaleString()} (₹{effUnit.toLocaleString()}/unit)</div>
                                      <button className="ct-tier-add-btn" style={{background:'#f97316'}} onClick={() => updateQuantity(itemId, itemSku, next.quantity)}>Add {delta} units</button>
                                    </>
                                  )
                                })() : <div className="ct-tier-max" style={{color:'#059669'}}>✓ Max bulk savings applied</div>}
                              </div>
                            </div>
                          )}
                          
                          <div className="ct-qty-row" style={{pointerEvents:isOutOfStock?'none':'auto'}}>
                            <div className="ct-qty-ctrl" style={{opacity:isOutOfStock?0.4:1}}>
                              <button className="ct-qty-btn" disabled={isOutOfStock || item.quantity <= Math.max(1, Number(item.minOrderQty||0))} onClick={() => updateQuantity(itemId, itemSku, Math.max(Number(item.minOrderQty||1), item.quantity-1))}>−</button>
                              <input className="ct-qty-val" type="number" value={item.quantity} disabled={isOutOfStock} onChange={(e) => { const v = parseInt(e.target.value) || 0; updateQuantity(itemId, itemSku, Math.max(0, v)); }} onBlur={(e) => { const min = Math.max(1, Number(item.minOrderQty||0)); const v = parseInt(e.target.value) || min; updateQuantity(itemId, itemSku, Math.max(min, v)); }} />
                              <button className="ct-qty-btn" disabled={isOutOfStock || item.quantity >= itemStock} onClick={() => updateQuantity(itemId, itemSku, item.quantity+1)}>+</button>
                            </div>
                            <button className="ct-action-btn remove" onClick={() => removeFromCart(itemId, itemSku)}>Remove</button>
                          </div>
                        </div>
                        
                        <div className="ct-line-total">
                          <div className="ct-line-price">₹{lineTotal(item).toLocaleString()}</div>
                          {(() => {
                            const it = (item.bulkTiers || item.bulkDiscountQuantity) ? item : (item.productId && typeof item.productId === 'object' ? item.productId : item)
                            const bulkQty = it.bulkDiscountQuantity || (it.bulkTiers && it.bulkTiers[0]?.quantity)
                            if (bulkQty>0 && item.quantity < bulkQty) {
                              return <div className="ct-line-unlock">Add {bulkQty - item.quantity} more to unlock bulk price</div>
                            }
                            return null
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="ct-section">
                <div className="ct-section-title"><span>1</span> Delivery Address</div>
                {savedAddresses.map(addr => (
                  <div key={addr._id} className={`ct-address-option ${selectedAddress?._id === addr._id ? 'selected' : ''}`} onClick={() => { setSelectedAddress(addr); loadServiceability(addr.pincode); }}>
                    <div className="ct-address-name">{addr.fullName} {addr.isDefault && <span style={{fontSize:'11px',fontWeight:700,color:'#059669',background:'rgba(5,150,105,.1)',padding:'2px 8px',borderRadius:'6px',marginLeft:'8px'}}>DEFAULT</span>}</div>
                    <div className="ct-address-text">{addr.phone}<br/>{addr.addressLine1}{addr.addressLine2 && <>, {addr.addressLine2}</>}<br/>{addr.city}, {addr.district}, {addr.state} - {addr.pincode}</div>
                    <div className="ct-address-actions">
                      <button className="ct-address-btn edit" onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }}>Edit</button>
                      {!addr.isDefault && <button className="ct-address-btn default" onClick={(e) => { e.stopPropagation(); handleSetDefault(addr._id); }}>Set Default</button>}
                      <button className="ct-address-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr._id); }}>Remove</button>
                    </div>
                  </div>
                ))}
                <button className="ct-add-address-btn" onClick={handleAddAddress}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Add New Address
                </button>
              </div>

              {/* Payment Method */}
              <div className="ct-section">
                <div className="ct-section-title"><span>2</span> Payment Method</div>
                <div className={`ct-payment-option ${selectedPaymentMethod === 'prepaid' ? 'selected' : ''}`} onClick={() => setSelectedPaymentMethod('prepaid')}>
                  <div className="ct-payment-icon">💳</div>
                  <div className="ct-payment-info">
                    <div className="ct-payment-title">Prepaid (Online)</div>
                    <div className="ct-payment-desc">Pay using UPI, Credit/Debit Card, Netbanking, or Wallets</div>
                  </div>
                </div>
                <div className={`ct-payment-option ${selectedPaymentMethod === 'cod' ? 'selected' : ''}`} onClick={() => setSelectedPaymentMethod('cod')} style={{opacity:svc.cod === false ? 0.5 : 1,pointerEvents:svc.cod === false ? 'none' : 'auto'}}>
                  <div className="ct-payment-icon">💵</div>
                  <div className="ct-payment-info">
                    <div className="ct-payment-title">Cash on Delivery</div>
                    <div className="ct-payment-desc">Pay in cash when your order arrives {svc.cod === false && ' (Not available for this pincode)'}</div>
                  </div>
                </div>
              </div>

              {/* Mobile Summary & Checkout Button */}
              <div className="lg:hidden ct-summary" style={{marginTop:'16px'}}>
                <div className="ct-summary-title">Order Summary</div>
                <div className="ct-summary-rows">
                  <div className="ct-summary-row"><span className="ct-summary-label">Total MRP</span><span className="ct-summary-val">₹{mrpTotal.toLocaleString()}</span></div>
                  {bulkDiscount > 0 && <div className="ct-summary-row"><span className="ct-summary-label">Bulk Discount</span><span className="ct-summary-val green">-₹{bulkDiscount.toLocaleString()}</span></div>}
                  <div className="ct-summary-row"><span className="ct-summary-label">Subtotal</span><span className="ct-summary-val">₹{subTotal.toLocaleString()}</span></div>
                  {appliedCoupon && <div className="ct-summary-row"><span className="ct-summary-label">Coupon Discount</span><span className="ct-summary-val green">-₹{couponDiscount.toLocaleString()}</span></div>}
                  <div className="ct-summary-row"><span className="ct-summary-label">Delivery Charge</span><span className="ct-summary-val">{shippingInfo.isFreeDelivery ? <span className="green">FREE</span> : `₹${shippingInfo.finalCharge.toLocaleString()}`}</span></div>
                </div>
                <div className="ct-summary-divider" />
                <div className="ct-summary-total-row">
                  <span className="ct-summary-total-label">Total Payable</span>
                  <span className="ct-summary-total-val">₹{totalPayable.toLocaleString()}</span>
                </div>
                
                {!appliedCoupon && (
                  <div style={{marginTop:'16px'}}>
                    <div style={{display:'flex',gap:'8px'}}>
                      <input type="text" placeholder="COUPON CODE" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="ct-form-input" style={{flex:1,textTransform:'uppercase',letterSpacing:'0.1em'}} />
                      <button className="ct-checkout-btn ready" disabled={isApplying || !couponCode.trim()} style={{padding:'12px 20px',fontSize:'11px'}} onClick={handleApplyCoupon}>{isApplying ? '...' : 'Apply'}</button>
                    </div>
                    {couponError && <div style={{color:'#ef4444',fontSize:'12px',fontWeight:600,marginTop:'8px'}}>{couponError}</div>}
                  </div>
                )}
                
                {appliedCoupon && (
                  <div className="ct-savings-badge" style={{marginTop:'16px',background:'rgba(249,115,22,.07)',borderColor:'rgba(249,115,22,.18)'}}>
                    <div className="ct-savings-ico" style={{background:'rgba(249,115,22,.12)'}}>🎟️</div>
                    <div>
                      <div className="ct-savings-text" style={{color:'#f97316'}}>{appliedCoupon.code} Applied</div>
                      <div className="ct-savings-sub">₹{couponDiscount.toLocaleString()} saved</div>
                    </div>
                    <button style={{marginLeft:'auto',background:'none',border:'none',color:'#ef4444',fontWeight:800,fontSize:'11px',letterSpacing:'0.08em',cursor:'pointer'}} onClick={handleRemoveCoupon}>REMOVE</button>
                  </div>
                )}

                {mrpTotal > subTotal && (
                  <div className="ct-savings-badge" style={{marginTop:'16px'}}>
                    <div className="ct-savings-ico">🎉</div>
                    <div>
                      <div className="ct-savings-text">You're Saving!</div>
                      <div className="ct-savings-sub">₹{Math.max(bulkDiscount, mrpTotal - subTotal).toLocaleString()} on this order</div>
                    </div>
                  </div>
                )}
                
                <div className="ct-min-progress">
                  <div className="ct-min-track"><div className="ct-min-fill" style={{width:`${Math.min(100, (subTotal / minAmount) * 100)}%`}} /></div>
                  <div className={`ct-min-text ${subTotal >= minAmount ? 'met' : ''}`}>
                    {subTotal >= minAmount ? '✓ Min order amount met!' : `Add ₹${minLeft.toLocaleString()} more to place order`}
                  </div>
                </div>

                <button className={`ct-checkout-btn ${subTotal >= minAmount && selectedAddress && svc.available !== false && !cart.every(item => { const itemStock = item.variantSku ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock) : (item.productId?.stock ?? item.stock); return itemStock <=0; }) ? 'ready' : 'disabled'}`} disabled={subTotal < minAmount || !selectedAddress || svc.available === false || cart.every(item => { const itemStock = item.variantSku ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock) : (item.productId?.stock ?? item.stock); return itemStock <=0; })} onClick={submit}>
                  {loading ? (
                    <>
                      <div style={{width:'18px',height:'18px',border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid white',borderRadius:'50%',animation:'ctPulse 1s linear infinite'}} />
                      Processing...
                    </>
                  ) : selectedPaymentMethod === 'cod' ? `Pay ${Math.round(totalPayable * 0.15) > 0 ? `₹${Math.round(totalPayable * 0.15).toLocaleString()} Advance & ` : ''}Place Order` : `Pay ₹{totalPayable.toLocaleString()}`}
                </button>
                <div className="ct-secure-note">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Secure payment powered by Cashfree
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary (Desktop) */}
            <div className="hidden lg:block">
              <div className="ct-summary">
                <div className="ct-summary-title">Order Summary</div>
                <div className="ct-summary-rows">
                  <div className="ct-summary-row"><span className="ct-summary-label">Total MRP</span><span className="ct-summary-val">₹{mrpTotal.toLocaleString()}</span></div>
                  {bulkDiscount > 0 && <div className="ct-summary-row"><span className="ct-summary-label">Bulk Discount</span><span className="ct-summary-val green">-₹{bulkDiscount.toLocaleString()}</span></div>}
                  <div className="ct-summary-row"><span className="ct-summary-label">Subtotal</span><span className="ct-summary-val">₹{subTotal.toLocaleString()}</span></div>
                  {appliedCoupon && <div className="ct-summary-row"><span className="ct-summary-label">Coupon Discount</span><span className="ct-summary-val green">-₹{couponDiscount.toLocaleString()}</span></div>}
                  <div className="ct-summary-row"><span className="ct-summary-label">Delivery Charge</span><span className="ct-summary-val">{shippingInfo.isFreeDelivery ? <span className="green">FREE</span> : `₹{shippingInfo.finalCharge.toLocaleString()}`}</span></div>
                </div>
                <div className="ct-summary-divider" />
                <div className="ct-summary-total-row">
                  <span className="ct-summary-total-label">Total Payable</span>
                  <span className="ct-summary-total-val">₹{totalPayable.toLocaleString()}</span>
                </div>
                
                {!appliedCoupon && (
                  <div style={{marginTop:'16px'}}>
                    <div style={{display:'flex',gap:'8px'}}>
                      <input type="text" placeholder="COUPON CODE" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="ct-form-input" style={{flex:1,textTransform:'uppercase',letterSpacing:'0.1em'}} />
                      <button className="ct-checkout-btn ready" disabled={isApplying || !couponCode.trim()} style={{padding:'12px 20px',fontSize:'11px'}} onClick={handleApplyCoupon}>{isApplying ? '...' : 'Apply'}</button>
                    </div>
                    {couponError && <div style={{color:'#ef4444',fontSize:'12px',fontWeight:600,marginTop:'8px'}}>{couponError}</div>}
                  </div>
                )}
                
                {appliedCoupon && (
                  <div className="ct-savings-badge" style={{marginTop:'16px',background:'rgba(249,115,22,.07)',borderColor:'rgba(249,115,22,.18)'}}>
                    <div className="ct-savings-ico" style={{background:'rgba(249,115,22,.12)'}}>🎟️</div>
                    <div>
                      <div className="ct-savings-text" style={{color:'#f97316'}}>{appliedCoupon.code} Applied</div>
                      <div className="ct-savings-sub">₹{couponDiscount.toLocaleString()} saved</div>
                    </div>
                    <button style={{marginLeft:'auto',background:'none',border:'none',color:'#ef4444',fontWeight:800,fontSize:'11px',letterSpacing:'0.08em',cursor:'pointer'}} onClick={handleRemoveCoupon}>REMOVE</button>
                  </div>
                )}

                {mrpTotal > subTotal && (
                  <div className="ct-savings-badge" style={{marginTop:'16px'}}>
                    <div className="ct-savings-ico">🎉</div>
                    <div>
                      <div className="ct-savings-text">You're Saving!</div>
                      <div className="ct-savings-sub">₹{Math.max(bulkDiscount, mrpTotal - subTotal).toLocaleString()} on this order</div>
                    </div>
                  </div>
                )}
                
                <div className="ct-min-progress">
                  <div className="ct-min-track"><div className="ct-min-fill" style={{width:`${Math.min(100, (subTotal / minAmount) * 100)}%`}} /></div>
                  <div className={`ct-min-text ${subTotal >= minAmount ? 'met' : ''}`}>
                    {subTotal >= minAmount ? '✓ Min order amount met!' : `Add ₹${minLeft.toLocaleString()} more to place order`}
                  </div>
                </div>

                <button className={`ct-checkout-btn ${subTotal >= minAmount && selectedAddress && svc.available !== false && !cart.every(item => { const itemStock = item.variantSku ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock) : (item.productId?.stock ?? item.stock); return itemStock <=0; }) ? 'ready' : 'disabled'}`} disabled={subTotal < minAmount || !selectedAddress || svc.available === false || cart.every(item => { const itemStock = item.variantSku ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock) : (item.productId?.stock ?? item.stock); return itemStock <=0; })} onClick={submit}>
                  {loading ? (
                    <>
                      <div style={{width:'18px',height:'18px',border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid white',borderRadius:'50%',animation:'ctPulse 1s linear infinite'}} />
                      Processing...
                    </>
                  ) : selectedPaymentMethod === 'cod' ? `Pay ${Math.round(totalPayable * 0.15) > 0 ? `₹${Math.round(totalPayable * 0.15).toLocaleString()} Advance & ` : ''}Place Order` : `Pay ₹{totalPayable.toLocaleString()}`}
                </button>
                <div className="ct-secure-note">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Secure payment powered by Cashfree
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="ct-modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ct-modal-header">
              <div className="ct-modal-title">{editingAddress ? 'Edit Address' : 'Add New Address'}</div>
              <button className="ct-modal-close" onClick={() => setShowAddressModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveAddress} className="ct-modal-body">
              <div className="ct-form-group">
                <label className="ct-form-label">Full Name</label>
                <input type="text" className="ct-form-input" value={addressForm.fullName} onChange={handleAddressInputChange} name="fullName" required placeholder="John Doe" />
              </div>
              <div className="ct-form-group">
                <label className="ct-form-label">Phone Number</label>
                <input type="tel" className="ct-form-input" value={addressForm.phone} onChange={handleAddressInputChange} name="phone" required placeholder="10-digit phone number" maxLength={10} />
              </div>
              <div className="ct-form-group">
                <label className="ct-form-label">Address Line 1</label>
                <input type="text" className="ct-form-input" value={addressForm.addressLine1} onChange={handleAddressInputChange} name="addressLine1" required placeholder="House No, Street, Area" />
              </div>
              <div className="ct-form-group">
                <label className="ct-form-label">Address Line 2 (Optional)</label>
                <input type="text" className="ct-form-input" value={addressForm.addressLine2} onChange={handleAddressInputChange} name="addressLine2" placeholder="Landmark, Colony, etc." />
              </div>
              <div className="ct-form-row">
                <div className="ct-form-group">
                  <label className="ct-form-label">City</label>
                  <input type="text" className="ct-form-input" value={addressForm.city} onChange={handleAddressInputChange} name="city" required placeholder="City" />
                </div>
                <div className="ct-form-group">
                  <label className="ct-form-label">District</label>
                  <input type="text" className="ct-form-input" value={addressForm.district} onChange={handleAddressInputChange} name="district" required placeholder="District" />
                </div>
              </div>
              <div className="ct-form-row">
                <div className="ct-form-group">
                  <label className="ct-form-label">State</label>
                  <select className="ct-form-input" value={addressForm.state} onChange={handleAddressInputChange} name="state" required>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                  </select>
                </div>
                <div className="ct-form-group">
                  <label className="ct-form-label">Pincode</label>
                  <input type="text" className="ct-form-input" value={addressForm.pincode} onChange={handleAddressInputChange} name="pincode" required placeholder="6-digit pincode" maxLength={6} />
                </div>
              </div>
              <div className="ct-checkbox-row">
                <input type="checkbox" className="ct-checkbox" id="isDefault" checked={addressForm.isDefault} onChange={handleAddressInputChange} name="isDefault" />
                <label className="ct-checkbox-label" htmlFor="isDefault">Set as default address</label>
              </div>
            </form>
            <div className="ct-modal-footer">
              <button type="button" className="ct-modal-btn cancel" onClick={() => setShowAddressModal(false)}>Cancel</button>
              <button type="submit" className="ct-modal-btn save" onClick={handleSaveAddress}>{editingAddress ? 'Update Address' : 'Save Address'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
