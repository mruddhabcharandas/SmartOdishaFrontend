import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useToast } from '../components/Toast'
import { useAuth } from './AuthContext'
import api from './api'

const WishlistContext = createContext()

export function WishlistProvider({ children }) {
  const { notify } = useToast()
  const { token, user } = useAuth()
  const [wishlist, setWishlist] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('wishlist') : null
    return saved ? JSON.parse(saved) : []
  })
  const [mode, setMode] = useState((token && user?.role === 'customer') ? 'server' : 'guest')
  const mergedRef = useRef(false)

  useEffect(() => {
    if (mode === 'guest') {
      localStorage.setItem('wishlist', JSON.stringify(wishlist))
    }
  }, [wishlist, mode])

  useEffect(() => {
    if (!token || user?.role !== 'customer') {
      setMode('guest')
      mergedRef.current = false
      if (!token) {
        const saved = localStorage.getItem('wishlist')
        setWishlist(saved ? JSON.parse(saved) : [])
      }
      return
    }

    setMode('server')

    const syncServerWishlist = async () => {
      try {
        const saved = !mergedRef.current ? localStorage.getItem('wishlist') : null
        const localItems = saved ? JSON.parse(saved) : []

        if (localItems.length) {
          for (const item of localItems) {
            await api.post('/api/wishlist/add', {
              productId: item._id || item.id
            })
          }
          localStorage.removeItem('wishlist')
          mergedRef.current = true
        }

        const { data } = await api.get('/api/wishlist')
        setWishlist(data.items || [])
      } catch (e) {
        console.error('Failed to sync server wishlist', e)
      }
    }

    syncServerWishlist()
  }, [token, user])

  const addToWishlist = async (product) => {
    const pid = product._id || product.id

    if (mode === 'guest') {
      setWishlist(prev => {
        const existing = prev.find(item => (item._id || item.id) === pid)
        if (existing) {
          return prev
        }
        return [...prev, { ...product, _id: pid }]
      })
      notify('Added to wishlist', 'success')
      return true
    }

    try {
      const { data } = await api.post('/api/wishlist/add', { productId: pid })
      setWishlist(data.wishlist?.items || [])
      notify('Added to wishlist', 'success')
      return true
    } catch (err) {
      console.error('addToWishlist error:', err)
      notify(err?.response?.data?.error || 'Could not add to wishlist', 'error')
      return false
    }
  }

  const removeFromWishlist = async (productId) => {
    const pid = productId

    if (mode === 'guest') {
      setWishlist(prev => prev.filter(item => (item._id || item.id) !== pid))
      notify('Removed from wishlist', 'success')
      return
    }

    try {
      const { data } = await api.delete(`/api/wishlist/remove/${pid}`)
      setWishlist(data.wishlist?.items || [])
      notify('Removed from wishlist', 'success')
    } catch (err) {
      console.error('removeFromWishlist error:', err)
      notify(err?.response?.data?.error || 'Could not remove from wishlist', 'error')
    }
  }

  const isInWishlist = (productId) => {
    const pid = productId
    return wishlist.some(item => (item._id || item.id || item.product?._id) === pid)
  }

  const wishlistCount = wishlist.length

  return (
    <WishlistContext.Provider value={{ 
      wishlist, 
      setWishlist, 
      addToWishlist, 
      removeFromWishlist, 
      isInWishlist, 
      wishlistCount 
    }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => useContext(WishlistContext)
