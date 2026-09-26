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
    const storePercentage = safeNumber(p?.store?.storePercentage ?? 0)
    const getFinalPrice = (base) => Math.round(safeNumber(base) * (1 + storePercentage / 100))

    if (!p || !Array.isArray(p.variants) || p.variants.length === 0) {
      return getFinalPrice(p?.originalStorePrice ?? p?.price ?? 0)
    }

    const activeVariants = p.variants.filter(v => v.isActive !== false)
    if (activeVariants.length === 0) {
      return getFinalPrice(p?.originalStorePrice ?? p?.price ?? 0)
    }

    const variantFinalPrices = activeVariants.map(v => ({
      variant: v,
      finalPrice: getFinalPrice(v.originalStorePrice ?? v.price ?? 0)
    })).filter(vp => vp.finalPrice > 0)

    if (variantFinalPrices.length === 0) {
      return getFinalPrice(p?.originalStorePrice ?? p?.price ?? 0)
    }

    return Math.round(Math.min(...variantFinalPrices.map(vp => vp.finalPrice)))
  }, [p])

  const displayMrp = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val)
      return isNaN(num) || !isFinite(num) ? 0 : num
    }
    const storePercentage = safeNumber(p?.store?.storePercentage ?? 0)
    const getFinalPrice = (base) => Math.round(safeNumber(base) * (1 + storePercentage / 100))

    if (!p) return 0

    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      return Math.round(safeNumber(p.mrp) > 0 ? getFinalPrice(p.mrp) : (safeNumber(p.price) > 0 ? getFinalPrice(p.price) : minPrice))
    }

    const activeVariants = p.variants.filter(v => v.isActive !== false)
    if (activeVariants.length === 0) {
      return Math.round(safeNumber(p.mrp) > 0 ? getFinalPrice(p.mrp) : (safeNumber(p.price) > 0 ? getFinalPrice(p.price) : minPrice))
    }

    // Try to find the first variant that has an mrp
    const variantWithMrp = activeVariants.find(v => v.mrp != null && safeNumber(v.mrp) > 0)
    if (variantWithMrp) return getFinalPrice(variantWithMrp.mrp)

    // Fall back to product's mrp, then price, then minPrice
    return Math.round(safeNumber(p.mrp) > 0 ? getFinalPrice(p.mrp) : (safeNumber(p.price) > 0 ? getFinalPrice(p.price) : minPrice))
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
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          cursor: pointer;
          position: relative;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }
        .pc-premium-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 18px 36px -8px rgba(79, 70, 229, 0.16), 0 8px 16px -4px rgba(15, 23, 42, 0.06);
          border-color: rgba(99, 102, 241, 0.35);
        }
        .pc-img-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1/1;
          background: radial-gradient(circle at center, #ffffff 40%, #f8fafc 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          overflow: hidden;
          flex-shrink: 0;
        }
        .pc-img-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pc-premium-card:hover .pc-img-container img {
          transform: scale(1.07);
        }
        .pc-badge-discount {
          position: absolute;
          top: 10px;
          left: 10px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 3px 8px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 800;
          z-index: 10;
          letter-spacing: 0.03em;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
        }
        .pc-badge-top-assured {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          color: #4338ca;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 6px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 3px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        .pc-content {
          padding: 14px 14px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          background: #ffffff;
        }
        .pc-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pc-title {
          font-size: 13.5px;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.4;
          height: 38px;
          min-height: 38px;
          max-height: 38px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-decoration: none;
          transition: color 0.15s;
          letter-spacing: -0.01em;
        }
        .pc-title:hover {
          color: #4f46e5;
        }
        .pc-rating-row {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 20px;
          min-height: 20px;
        }
        .pc-rating-badge {
          background: #059669;
          color: white;
          padding: 1px 6px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .pc-rating-count {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 500;
        }
        .pc-free-del-pill {
          margin-left: auto;
          font-size: 10px;
          font-weight: 700;
          color: #0369a1;
          background: #f0f9ff;
          border: 1px solid #e0f2fe;
          padding: 1px 6px;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }
        .pc-price-box {
          height: 42px;
          min-height: 42px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          margin-top: 2px;
        }
        .pc-price-main {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .pc-price-selling {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .pc-price-sub {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 16px;
          min-height: 16px;
          margin-top: 2px;
        }
        .pc-price-mrp {
          font-size: 12px;
          color: #94a3b8;
          text-decoration: line-through;
          font-weight: 500;
          line-height: 1;
        }
        .pc-price-discount {
          font-size: 11px;
          font-weight: 700;
          color: #16a34a;
          line-height: 1;
          background: #dcfce7;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .pc-price-placeholder {
          font-size: 11px;
          visibility: hidden;
          line-height: 1;
        }
        .pc-info-row {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 600;
          height: 18px;
          min-height: 18px;
          display: flex;
          align-items: center;
        }
        .pc-stock-in {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #059669;
          font-weight: 600;
        }
        .pc-stock-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .pc-action-btn {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: none;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(49, 46, 129, 0.25);
          letter-spacing: 0.01em;
        }
        .pc-action-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #3730a3 100%);
          box-shadow: 0 6px 18px rgba(49, 46, 129, 0.35);
          transform: translateY(-1px);
        }
        .pc-action-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .pc-action-btn:disabled {
          background: #f1f5f9;
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

        <div className="pc-badge-top-assured">
          <span style={{ color: '#6366f1' }}>✦</span> Assured
        </div>

        {p.images?.length ? (
          <img
            src={getImageUrl(p.images[0].url, 400)}
            alt={p.name}
            loading={typeof index === 'number' && index < 4 ? 'eager' : 'lazy'}
            fetchPriority={typeof index === 'number' && index < 2 ? 'high' : 'auto'}
            decoding="async"
          />
        ) : (
          <span style={{ fontSize: '36px', opacity: '0.2' }}>📦</span>
        )}
      </div>

      {/* Content */}
      <div className="pc-content">
        <div className="pc-body">
          <Link
            to={`/products/${productIdOrSlug}`}
            onClick={e => e.stopPropagation()}
            className="pc-title"
          >
            {p.name}
          </Link>

          {/* Rating & Assured Check */}
          <div className="pc-rating-row">
            {Number(p.ratingCount || 0) > 0 ? (
              <>
                <div className="pc-rating-badge">
                  {Number(p.ratingAvg || 0).toFixed(1)} ★
                </div>
                <span className="pc-rating-count">
                  ({Number(p.ratingCount || 0).toLocaleString()})
                </span>
              </>
            ) : (
              <span className="pc-rating-count" style={{ fontSize: '11px', color: '#94a3b8' }}>
                Newly Added
              </span>
            )}
            <span className="pc-free-del-pill">
              Fast Delivery
            </span>
          </div>

          {/* Price Box with guaranteed identical height across all cards */}
          <div className="pc-price-box">
            <div className="pc-price-main">
              <span className="pc-price-selling">
                ₹{Number(minPrice).toLocaleString()}
              </span>
            </div>
            <div className="pc-price-sub">
              {displayMrp > minPrice ? (
                <>
                  <span className="pc-price-mrp">
                    ₹{Number(displayMrp).toLocaleString()}
                  </span>
                  <span className="pc-price-discount">
                    {discount}% off
                  </span>
                </>
              ) : (
                <span className="pc-price-placeholder">-</span>
              )}
            </div>
          </div>

          {/* Stock / Delivery Status */}
          <div className="pc-info-row">
            {totalStock <= 0 ? (
              <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="pc-stock-dot" style={{ background: '#ef4444' }} /> Out of Stock
              </span>
            ) : totalStock <= 5 ? (
              <span style={{ color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="pc-stock-dot" style={{ background: '#f59e0b' }} /> Only {totalStock} left
              </span>
            ) : (
              <span className="pc-stock-in">
                <span className="pc-stock-dot" /> In Stock & Ready to Ship
              </span>
            )}
          </div>
        </div>

        {/* Action Button pinned at bottom */}
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
          {p.variants?.length > 0 ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
              View Options
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  )
}
