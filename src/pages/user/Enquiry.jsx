import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
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
  const { cart, clearCart, cartTotal, refreshCart } = useCart()
  const { user, refreshProfile } = useAuth()
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
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null)
  const [couponError, setCouponError] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const cashfreeSdkLoaded = useRef(false)
  
  // Address management
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

  // Serviceability
  const [svc, setSvc] = useState({ loading: false, available: null, cod: null, etaStart: null, etaEnd: null, error: '' })
  const [ship, setShip] = useState({ loading: false, amount: 0, discount: 0, final: 0 })

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
    if (!localStorage.getItem('token')) { navigate('/login', { state: { from: location.pathname + location.search } }); return }
    refreshCart()
    loadAddresses()
  }, [])

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/api/user/addresses')
      setSavedAddresses(data)
      if (data.length > 0) {
        const defaultAddress = data.find(addr => addr.isDefault) || data[0]
        setSelectedAddress(defaultAddress)
        loadServiceability(defaultAddress.pincode)
      }
    } catch (err) {
      console.error('Failed to load addresses:', err)
    }
  }

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
    // Clean phone number to exactly 10 digits
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10)
      setAddressForm(prev => ({
        ...prev,
        [name]: cleaned
      }))
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
      
      setAddressForm(prev => ({
        ...prev,
        [name]: cleaned
      }))
    } else {
      setAddressForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (cartTotal < minAmount) { notify(`Minimum order amount is ₹${minAmount.toLocaleString()}`, 'error'); return }
    if (!selectedAddress) { notify('Please select a delivery address', 'error'); return }
    
    try {
      const { data: svcData } = await api.get('/api/shipping/check-pincode', { params: { pincode: selectedAddress.pincode } })
      if (!svcData?.delivery_available) { notify('Delivery not available for your pincode', 'error'); return }
    } catch { notify('Unable to verify serviceability right now', 'error'); return }

    setLoading(true)
    try {
      const cleanItems = items.filter(it => typeof it.productId === 'string' && it.productId.length >= 12).map(it => ({ productId: it.productId, variantSku: it.variantSku, quantity: Math.max(1, Number(it.quantity || 1)) }))
      const visibleTotal = computedVisibleTotal(items)
      if (visibleTotal < minAmount) { notify(`Minimum order value is ₹${minAmount.toLocaleString()}`, 'error'); setLoading(false); return }

      // Prepare payment
      const { data } = await api.post('/api/orders/prepare-payment', {
        items: cleanItems,
        paymentMethod: 'CASHFREE',
        couponCode: appliedCoupon?.code || '',
        deliveryAddress: selectedAddress
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
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Checkout</h1>
          <p className="text-slate-600">Complete your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Address & Payment */}
          <div className="lg:col-span-2 space-y-4">
            {/* Delivery Address Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  1. Delivery Address
                </h2>
                <button
                  onClick={handleAddAddress}
                  className="text-blue-600 font-medium hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <span className="text-lg">+</span> Add New Address
                </button>
              </div>

              {savedAddresses.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <div className="text-4xl mb-3 text-slate-400">🏠</div>
                  <p className="text-slate-600 mb-4">No saved addresses</p>
                  <button
                    onClick={handleAddAddress}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((address) => (
                    <div
                      key={address._id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedAddress?._id === address._id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                      onClick={() => {
                        setSelectedAddress(address)
                        loadServiceability(address.pincode)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">{address.fullName}</span>
                            {address.isDefault && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <p className="text-slate-700 text-sm">{address.phone}</p>
                          <p className="text-slate-700 text-sm mt-1">{address.addressLine1}</p>
                          {address.addressLine2 && <p className="text-slate-700 text-sm">{address.addressLine2}</p>}
                          <p className="text-slate-700 text-sm">
                            {address.city}, {address.district}, {address.state} - {address.pincode}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditAddress(address); }}
                            className="text-blue-600 text-sm hover:text-blue-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteAddress(address._id); }}
                            className="text-red-600 text-sm hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      {selectedAddress?._id === address._id && (
                        <div className="mt-3 flex items-center text-green-700 text-sm font-medium">
                          <span className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center mr-2">
                            <span className="w-2 h-2 bg-white rounded-full"></span>
                          </span>
                          Delivering here
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                2. Payment Method
              </h2>

              <div className="space-y-3">
                <div className="border-2 border-blue-600 bg-blue-50 rounded-lg p-4 flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      Cashfree Payments
                      <div className="flex items-center gap-1">
                        <img src="https://images.crunchbase.com/image/upload/c_lpad,h_170,w_170,f_auto,b_white,q_auto:eco,dpr_1/dzgyedhczoapqcdpsb1j" alt="Cashfree" className="h-5 w-auto" />
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">UPI, Cards, Netbanking, Wallets</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Mobile */}
            <div className="lg:hidden bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Price Details
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-700">
                  <span>Total MRP</span>
                  <span>₹{mrpTotal.toLocaleString()}</span>
                </div>
                {bulkSavings > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount on MRP</span>
                    <span>-₹{bulkSavings.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Convenience Fee</span>
                  <div>
                    <span className="text-slate-400 line-through mr-2">₹{(ship.amount || 85).toLocaleString()}</span>
                    <span className="text-green-700 font-medium">FREE</span>
                  </div>
                </div>
                <div className="h-px bg-slate-200 my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg text-slate-900">Total Amount</span>
                  <span className="text-xl font-bold text-slate-900">₹{totalPayable.toLocaleString()}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="text-green-700 font-medium text-sm mt-2">
                    You will save ₹{totalSavings.toLocaleString()} on this order
                  </div>
                )}
              </div>

              {/* Place Order Button Mobile */}
              <button
                onClick={submit}
                disabled={loading || visibleTotal < minAmount || !svc.available || !selectedAddress}
                className={`w-full mt-6 py-4 rounded-lg font-bold text-lg transition-all ${
                  loading || visibleTotal < minAmount || !svc.available || !selectedAddress
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
                }`}
              >
                {loading ? 'Processing...' :
                  visibleTotal < minAmount ? `Add ₹${minLeft.toLocaleString()} More` :
                  `Place Order`}
              </button>
            </div>
          </div>

          {/* Right Column - Order Summary Desktop */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-lg shadow-sm sticky top-6">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">Price Details</h3>
                <p className="text-slate-600 text-sm mt-1">{items.length} items</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between text-slate-700">
                  <span>Total MRP</span>
                  <span>₹{mrpTotal.toLocaleString()}</span>
                </div>
                {bulkSavings > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount on MRP</span>
                    <span>-₹{bulkSavings.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Convenience Fee</span>
                  <div>
                    <span className="text-slate-400 line-through mr-2">₹{(ship.amount || 85).toLocaleString()}</span>
                    <span className="text-green-700 font-medium">FREE</span>
                  </div>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg text-slate-900">Total Amount</span>
                  <span className="text-xl font-bold text-slate-900">₹{totalPayable.toLocaleString()}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="text-green-700 font-medium text-sm">
                    You will save ₹{totalSavings.toLocaleString()} on this order
                  </div>
                )}

                {/* Coupon Section */}
                <div className="pt-4 border-t border-slate-100">
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-medium uppercase tracking-widest text-sm"
                        placeholder="COUPON CODE"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={isApplying || !couponCode.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm uppercase tracking-widest disabled:opacity-50 hover:bg-blue-700 transition-colors"
                      >
                        {isApplying ? '...' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎟️</span>
                        <div>
                          <div className="text-xs font-bold text-green-700 uppercase tracking-widest">{appliedCoupon.code} Applied</div>
                          <div className="text-sm font-bold text-green-600">₹{couponDiscount.toLocaleString()} Saved</div>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-600 font-bold text-sm uppercase tracking-widest hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <div className="mt-2 text-sm font-semibold text-red-600">{couponError}</div>
                  )}
                </div>

                {/* Place Order Button Desktop */}
                <button
                  onClick={submit}
                  disabled={loading || visibleTotal < minAmount || !svc.available || !selectedAddress}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all mt-4 ${
                    loading || visibleTotal < minAmount || !svc.available || !selectedAddress
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
                  }`}
                >
                  {loading ? 'Processing...' :
                    visibleTotal < minAmount ? `Add ₹${minLeft.toLocaleString()} More` :
                    `Place Order`}
                </button>
              </div>

              {/* Order Items */}
              <div className="p-6 border-t border-slate-100 max-h-96 overflow-y-auto">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="w-16 h-16 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
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
                      <div className="font-medium text-slate-900 text-sm line-clamp-2">{it.name}</div>
                      <div className="text-sm text-slate-500 mt-1">Qty: {it.quantity}</div>
                    </div>
                    <div className="text-right font-semibold text-slate-900">
                      ₹{lineTotal(it).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number * (10 digits)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressInputChange}
                    required
                    maxLength={10}
                    placeholder="Enter 10 digit phone number"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1 *</label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={addressForm.addressLine1}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={addressForm.addressLine2}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    name="district"
                    value={addressForm.district}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                  <select
                    name="state"
                    value={addressForm.state}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pincode * (6 digits)</label>
                  <input
                    type="text"
                    name="pincode"
                    value={addressForm.pincode}
                    onChange={handleAddressInputChange}
                    required
                    maxLength={6}
                    placeholder="Enter 6 digit pincode"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={addressForm.isDefault}
                  onChange={handleAddressInputChange}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-slate-700">
                  Make this my default address
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
