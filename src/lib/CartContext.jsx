import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useToast } from '../components/Toast'
import { useAuth } from './AuthContext'
import api from './api'

const CartContext = createContext()

export const getStockStatus = (stock) => {
  if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' }
  if (stock <= 5) return { text: `Only ${stock} left`, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' }
  if (stock <= 20) return { text: 'Limited Stock', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
  return { text: 'In Stock', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
}

export function CartProvider({ children }) {
  const { notify } = useToast()
  const { token, user } = useAuth()
  const [cart, setCart] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cart') : null
    return saved ? JSON.parse(saved) : []
  })
  const [mode, setMode] = useState((token && user?.role === 'customer') ? 'server' : 'guest')
  const mergedRef = useRef(false)

  useEffect(() => {
    if (mode === 'guest') {
      localStorage.setItem('cart', JSON.stringify(cart))
    }
  }, [cart, mode])

  useEffect(() => {
    if (!token || user?.role !== 'customer') {
      setMode('guest')
      mergedRef.current = false
      if (!token) {
        const saved = localStorage.getItem('cart')
        setCart(saved ? JSON.parse(saved) : [])
      }
      return
    }

    setMode('server')

    const syncServerCart = async () => {
      try {
        const saved = !mergedRef.current ? localStorage.getItem('cart') : null
        const localItems = saved ? JSON.parse(saved) : []

        if (localItems.length) {
          for (const item of localItems) {
            await api.post('/api/cart/add', {
              productId: item._id,
              variantSku: item.variantSku,
              quantity: item.quantity || 1
            })
          }
          localStorage.removeItem('cart')
          mergedRef.current = true
        }

        const { data } = await api.get('/api/cart')
        setCart(data.items || [])
      } catch (e) {
        console.error('Failed to sync server cart', e)
      }
    }

    syncServerCart()
  }, [token, user])

  const addToCart = async (product, variant, requestedQuantity) => {
    console.log('=== CartContext.addToCart called ===')
    console.log('product:', product)
    console.log('variant:', variant)
    console.log('requestedQuantity:', requestedQuantity)
    
    if (mode === 'guest') {
      let success = true
      setCart(prev => {
        const pid = product._id || product.id
        const vsku = variant?.sku || undefined
        const existing = prev.find(item => item._id === pid && (item.variantSku || '') === (vsku || ''))
        const currentQty = existing ? existing.quantity : 0
        const available = vsku ? (variant?.stock ?? 0) : (product.stock ?? 0)
        const minQty = Math.max(1, Number(product.minOrderQty || 0))
        const addQty = requestedQuantity ? Math.max(minQty, Number(requestedQuantity)) : (existing ? 1 : Math.max(1, minQty))

        if (currentQty + addQty > available) {
          notify(`Only ${available} units available in stock`, 'error')
          success = false
          return prev
        }

        if (existing) {
          return prev.map(item => 
            (item._id === pid && (item.variantSku || '') === (vsku || '')) ? { ...item, quantity: item.quantity + addQty } : item
          )
        }
        const price = vsku ? (variant?.price ?? product.price) : product.price
        const image = vsku ? (variant?.images?.[0] || product.images?.[0]) : product.images?.[0]
        const attributes = variant?.attributes
        return [...prev, { ...product, _id: pid, variantSku: vsku, attributes, price, image, quantity: addQty, stock: available, minOrderQty: minQty, weight: product.weight }]
      })
      return success
    }

    try {
      const minQty = Math.max(1, Number(product.minOrderQty || 0))
      const qtyToAdd = requestedQuantity ? Math.max(minQty, Number(requestedQuantity)) : Math.max(1, minQty)
      
      const payload = {
        productId: product._id,
        variantSku: variant?.sku,
        quantity: qtyToAdd
      }
      
      console.log('Sending API request with payload:', payload)
      
      const { data } = await api.post('/api/cart/add', payload)
      console.log('API response:', data)
      
      setCart(data.items || [])
      notify('Added to cart', 'success')
      return true
    } catch (err) {
      console.error('addToCart error:', err)
      console.error('err.response:', err.response)
      notify(err?.response?.data?.error || 'Could not add to cart', 'error')
      return false
    }
  }

  const removeFromCart = async (productId, variantSku) => {
    if (mode === 'guest') {
      setCart(prev => prev.filter(item => !(item._id === productId && (item.variantSku || '') === (variantSku || ''))))
      return
    }
    try {
      const { data } = await api.delete('/api/cart/remove', {
        data: { productId, variantSku }
      })
      setCart(data.items || [])
    } catch (err) {
      notify(err?.response?.data?.error || 'Could not remove item', 'error')
    }
  }

  const updateQuantity = async (productId, variantSku, quantity) => {
    if (quantity < 1) return

    if (mode === 'guest') {
      setCart(prev => {
        const item = prev.find(x => x._id === productId && (x.variantSku || '') === (variantSku || ''))
        if (!item) return prev
        const minQty = Math.max(1, Number(item.minOrderQty || 0))
        const nextQty = Math.max(minQty, quantity)

        if (nextQty > item.stock) {
          notify(`Only ${item.stock} units available in stock`, 'error')
          return prev
        }

        return prev.map(x => (x._id === productId && (x.variantSku || '') === (variantSku || '')) ? { ...x, quantity: nextQty } : x)
      })
      return
    }

    try {
      const { data } = await api.put('/api/cart/update', { productId, variantSku, quantity })
      setCart(data.items || [])
    } catch (err) {
      notify(err?.response?.data?.error || 'Could not update quantity', 'error')
    }
  }

  const clearCart = async () => {
    if (mode === 'guest') {
      setCart([])
      return
    }
    try {
      // remove all items one by one
      for (const item of cart) {
        await api.delete('/api/cart/remove', { 
          data: { 
            productId: item.productId || item._id,
            variantSku: item.variantSku
          } 
        })
      }
      setCart([])
    } catch (err) {
      notify(err?.response?.data?.error || 'Could not clear cart', 'error')
    }
  }

  const refreshCart = async () => {
    if (mode === 'server' && token) {
      try {
        const { data } = await api.get('/api/cart')
        setCart(data.items || [])
      } catch (e) {
        console.error('Failed to refresh cart', e)
      }
    }
  }

  const cartCount = cart.reduce((total, item) => {
    // Only count items that are in stock
    const itemStock = item.variantSku 
      ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock)
      : (item.productId?.stock ?? item.stock);
    if (itemStock <= 0) return total;
    return total + item.quantity;
  }, 0)

  const cartTotal = cart.reduce((total, item) => {
    let p = Number(item.price || 0)
    const qty = Math.max(1, Number(item.quantity || 1))
    
    if (isNaN(p) || !isFinite(p)) p = 0
    
    // Skip out-of-stock items in total
    const itemStock = item.variantSku 
      ? (item.productId?.variants?.find(v => v.sku === item.variantSku)?.stock ?? item.stock)
      : (item.productId?.stock ?? item.stock);
    if (Number(itemStock || 0) <= 0) return total;
    
    // Check for bulk pricing at item level or product level
    const it = (item.bulkTiers || item.bulkDiscountQuantity) ? item : (item.productId && typeof item.productId === 'object' ? item.productId : item);
    
    // Apply bulk pricing
    if (Array.isArray(it.bulkTiers) && it.bulkTiers.length) {
      const tiers = it.bulkTiers.slice().sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
      const app = tiers.filter(t => qty >= Number(t.quantity || 0)).pop()
      if (app) p = Math.max(0, p - Number(app.priceReduction ?? app.price_reduction ?? 0))
    } else if (Number(it.bulkDiscountQuantity || it.bulkQty) > 0) {
      if (qty >= Number(it.bulkDiscountQuantity || it.bulkQty)) {
        p = Math.max(0, p - Number(it.bulkDiscountPriceReduction || it.bulkRed || 0))
      }
    }
    
    return total + (p * qty)
  }, 0)

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
