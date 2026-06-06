import React, { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { getCloudinaryUrl } from '../lib/cloudinary'
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
    if (!p || !Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p?.price || 0)
    const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.price || 0) > 0)
    if (activeVariants.length === 0) return safeNumber(p?.price || 0)
    return Math.min(...activeVariants.map(v => safeNumber(v.price || 0)))
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
      className="pc-card"
      onClick={() => navigate(`/products/${productIdOrSlug}`)}
      onMouseEnter={prefetchProduct}
      style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      <style jsx>{`
        .pc-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      `}</style>

      <div style={{
        position: 'relative',
        aspectRatio: '1/1',
        background: '#f8fafc',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {discount > 0 && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: '#10b981',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '100px',
            fontSize: '10px',
            fontWeight: 700,
            zIndex: 10
          }}>
            {discount}% OFF
          </div>
        )}

        {p.images?.length ? (
          <img
            src={getCloudinaryUrl(p.images[0].url, 500)}
            alt={p.name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transition: 'transform 0.3s'
            }}
          />
        ) : (
          <span style={{ fontSize: '36px', opacity: '0.3' }}>📦</span>
        )}
      </div>

      <div style={{
        padding: '10px 12px 12px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <Link
          to={`/products/${productIdOrSlug}`}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: '13px',
            fontWeight: 500,
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
          gap: '4px',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          <span style={{ color: '#f59e0b' }}>★★★★☆</span>
          <span>4.3</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: 'auto'
        }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#0f172a'
          }}>
            ₹{Number(minPrice).toLocaleString()}
          </span>
          {displayMrp > minPrice && (
            <span style={{
              fontSize: '11px',
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
            padding: '8px 12px',
            borderRadius: '10px',
            background: totalStock <= 0 ? '#e2e8f0' : '#0f172a',
            color: totalStock <= 0 ? '#94a3b8' : 'white',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: totalStock <= 0 ? 'not-allowed' : 'pointer',
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
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
          {p.variants?.length > 0 ? 'View Product' : '🛒 Add'}
        </button>
      </div>
    </div>
  )
}
