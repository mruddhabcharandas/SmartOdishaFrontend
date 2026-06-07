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
    // Apply store percentage markup
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
    const baseMrp = safeNumber(variantWithMinPrice?.mrp || p?.mrp || minPrice || 0)
    return baseMrp
  }, [p, minPrice])

  const discount = displayMrp > minPrice
    ? Math.round(((displayMrp - minPrice) / displayMrp) * 100)
    : 0

  return (
    <div
      className="pc-premium-card group"
      onClick={() => navigate(`/products/${productIdOrSlug}`)}
      onMouseEnter={prefetchProduct}
    >
      <style>{`
        .pc-premium-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .pc-premium-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.08), 0 8px 10px -6px rgba(2, 132, 199, 0.08);
          border-color: rgba(2, 132, 199, 0.15);
        }
        .pc-img-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1/1;
          background: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-bottom: 1px solid #f8fafc;
        }
        .pc-img-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transition: transform 0.35s ease;
        }
        .pc-premium-card:hover .pc-img-container img {
          transform: scale(1.04);
        }
        .pc-badge-discount {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #388e3c;
          color: white;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          z-index: 10;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 4px rgba(56,142,60,0.2);
        }
        .pc-content {
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pc-title {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          line-height: 1.4;
          height: 38px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-decoration: none;
          transition: color 0.15s;
        }
        .pc-title:hover {
          color: #0284c7;
        }
        .pc-rating-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 1px;
        }
        .pc-rating-badge {
          background: #388e3c;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .pc-rating-count {
          font-size: 11px;
          color: #878787;
          font-weight: 500;
        }
        .pc-assured-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          margin-left: auto;
          background: rgba(2, 132, 199, 0.05);
          border: 1px solid rgba(2, 132, 199, 0.1);
          color: #0284c7;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .pc-price-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .pc-price-selling {
          font-size: 17px;
          font-weight: 700;
          color: #212121;
        }
        .pc-price-mrp {
          font-size: 12px;
          color: #878787;
          text-decoration: line-through;
          font-weight: 400;
        }
        .pc-price-discount {
          font-size: 12px;
          font-weight: 700;
          color: #388e3c;
        }
        .pc-info-row {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }
        .pc-info-row b {
          color: #059669;
        }
        .pc-action-btn {
          width: 100%;
          padding: 9px 12px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
        }
        .pc-action-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
        }
        .pc-action-btn:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>

      {/* Image Container */}
      <div className="pc-img-container">
        {discount > 0 && (
          <div className="pc-badge-discount">
            {discount}% OFF
          </div>
        )}

        {p.images?.length ? (
          <img
            src={getImageUrl(p.images[0].url, 400)}
            alt={p.name}
            loading="lazy"
          />
        ) : (
          <span style={{ fontSize: '36px', opacity: '0.2' }}>📦</span>
        )}
      </div>

      {/* Content */}
      <div className="pc-content">
        <Link
          to={`/products/${productIdOrSlug}`}
          onClick={e => e.stopPropagation()}
          className="pc-title"
        >
          {p.name}
        </Link>

        {/* Rating & Assured Check */}
        <div className="pc-rating-row">
          <div className="pc-rating-badge">
            {Number(p.ratingAvg || 4.2).toFixed(1)} ★
          </div>
          <span className="pc-rating-count">
            ({Number(p.ratingCount || 12).toLocaleString()})
          </span>
          <span className="pc-assured-badge">
            ✓ Assured
          </span>
        </div>

        {/* Price Row */}
        <div className="pc-price-row">
          <span className="pc-price-selling">
            ₹{Number(minPrice).toLocaleString()}
          </span>
          {displayMrp > minPrice && (
            <>
              <span className="pc-price-mrp">
                ₹{Number(displayMrp).toLocaleString()}
              </span>
              <span className="pc-price-discount">
                {discount}% off
              </span>
            </>
          )}
        </div>

        {/* Stock / Delivery Status */}
        <div className="pc-info-row">
          {totalStock <= 0 ? (
            <span style={{ color: '#ef4444', fontWeight: 600 }}>Out of Stock</span>
          ) : totalStock <= 5 ? (
            <span style={{ color: '#f97316', fontWeight: 600 }}>Only {totalStock} left</span>
          ) : (
            <span>Free Delivery</span>
          )}
        </div>

        {/* Button */}
        <button
          disabled={!authed || totalStock <= 0}
          className="pc-action-btn"
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
          {p.variants?.length > 0 ? '👁️ View Options' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  )
}
