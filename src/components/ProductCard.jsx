import React, { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { getImageUrl } from '../lib/cloudinary'
import { useCart } from '../lib/CartContext'

export default function ProductCard({ p, authed = false, addToCart: propAddToCart, navigate: propNavigate, index, setRecOpen, setRecItems }) {
  const { refreshCart, addToCart: cartAddToCart } = useCart()
  const location = useLocation()
  const queryClient = useQueryClient()
  const navigate = propNavigate || useNavigate()
  const addToCart = propAddToCart || cartAddToCart

  const productIdOrSlug = p.slug || p._id

  const prefetchProduct = () => {
    queryClient.prefetchQuery({
      queryKey: ['product', productIdOrSlug],
      queryFn: () => api.get(`/api/products/${productIdOrSlug}`).then(res => res.data),
      staleTime: 1000 * 60 * 5
    })
  }

  const totalStock = p && Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p?.stock || 0)

  const minPrice = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val)
      return isNaN(num) || !isFinite(num) ? 0 : num
    }
    let basePrice
    if (!p || !Array.isArray(p.variants) || p.variants.length === 0) {
      basePrice = safeNumber(p?.originalStorePrice ?? p?.price ?? 0)
    } else {
      const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.originalStorePrice ?? v.price ?? 0) > 0)
      if (activeVariants.length === 0) {
        basePrice = safeNumber(p?.originalStorePrice ?? p?.price ?? 0)
      } else {
        basePrice = Math.min(...activeVariants.map(v => safeNumber(v.originalStorePrice ?? v.price ?? 0)))
      }
    }
    // Apply store percentage if available
    const storePercentage = safeNumber(p?.store?.storePercentage ?? 0)
    return basePrice * (1 + storePercentage / 100)
  }, [p])

  const displayMrp = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val)
      return isNaN(num) || !isFinite(num) ? 0 : num
    }
    if (!p || !Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p?.mrp || p?.price || 0)
    const variantWithMinPrice = p.variants.find(v => v.isActive !== false && safeNumber(v.price || 0) === minPrice)
    return safeNumber(variantWithMinPrice?.mrp || p?.mrp || minPrice || 0)
  }, [p, minPrice])

  const discount = displayMrp > minPrice
    ? Math.round(((displayMrp - minPrice) / displayMrp) * 100)
    : 0

  const capitalizeText = (text) => {
    if (!text) return ''
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }

  return (
    <div
      className="pc-card group"
      onClick={() => navigate(`/products/${productIdOrSlug}`)}
      onMouseEnter={prefetchProduct}
      style={{
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        cursor: 'pointer',
        position: 'relative',
        border: '1px solid rgba(148,163,184,0.1)'
      }}
    >
      <style jsx>{`
        .pc-card:hover {
          box-shadow: 0 12px 40px rgba(59,130,246,0.15);
          transform: translateY(-4px);
        }
      `}</style>

      <div style={{
        position: 'relative',
        aspectRatio: '1/1',
        background: 'linear-gradient(145deg, #f8fafc, #eff6ff)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        {discount > 0 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '11px',
            fontWeight: 800,
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            {discount}% OFF
          </div>
        )}

        {p.images?.length ? (
          <img
            src={getImageUrl(p.images[0].url, 500)}
            alt={p.name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)'
            }}
          />
        ) : (
          <span style={{ fontSize: '48px', opacity: '0.2' }}>📦</span>
        )}
      </div>

      <div style={{
        padding: '16px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <Link
          to={`/products/${productIdOrSlug}`}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textDecoration: 'none'
          }}
        >
          {p.name}
        </Link>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <span style={{ color: '#f59e0b' }}>★★★★☆</span>
          <span style={{ fontWeight: 600 }}>4.3</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: 'auto'
        }}>
          <span style={{
            fontSize: '18px',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ₹{Number(minPrice).toLocaleString()}
          </span>
          {displayMrp > minPrice && (
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#94a3b8',
              textDecoration: 'line-through'
            }}>
              ₹{Number(displayMrp).toLocaleString()}
            </span>
          )}
        </div>

        <button
          disabled={!authed || totalStock <= 0}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '16px',
            background: totalStock <= 0 ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #4f46e5)',
            color: totalStock <= 0 ? '#94a3b8' : 'white',
            border: 'none',
            fontSize: '13px',
            fontWeight: 800,
            cursor: totalStock <= 0 ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: totalStock <= 0 ? 'none' : '0 6px 20px rgba(59,130,246,0.35)',
            transition: 'all 0.2s'
          }}
          onClick={async e => {
            e.stopPropagation()
            e.preventDefault()
            if (!authed) {
              navigate('/login', { state: { from: location.pathname + location.search } })
              return
            }
            if (p.variants?.length > 0) {
              navigate(`/products/${productIdOrSlug}`)
              return
            }
            const ok = await addToCart(p)
            if (ok) {
              await refreshCart()
              if (typeof setRecOpen === 'function') {
                try {
                  const { data } = await api.get(`/api/recommendations/frequently-bought/${p._id}`)
                  const filtered = (data || []).filter(i => (i._id || i.id) !== p._id)
                  setRecItems(filtered)
                  if (filtered.length > 0) setRecOpen(true)
                } catch {}
              }
            }
          }}
        >
          {p.variants?.length > 0 ? '👁️ View Product' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  )
}
