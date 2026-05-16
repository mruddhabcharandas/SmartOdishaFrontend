import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { getCloudinaryUrl } from '../lib/cloudinary';
import { getStockStatus, useCart } from '../lib/CartContext'

export default function ProductCard({ p, authed, addToCart, navigate, index, setRecOpen, setRecItems }) {
  const { refreshCart } = useCart()
  const location = useLocation()
  const queryClient = useQueryClient()

  const productIdOrSlug = p.slug || p._id

  const prefetchProduct = () => {
    queryClient.prefetchQuery({
      queryKey: ['product', productIdOrSlug],
      queryFn: () => api.get(`/api/products/${productIdOrSlug}`).then(res => res.data),
      staleTime: 1000 * 60 * 5,
    })
  }

  // Calculate overall stock status based on variants
  const totalStock = Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p.stock || 0)

  // Find the lowest price among active variants
  const minPrice = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.price || 0);
    const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.price || 0) > 0);
    if (activeVariants.length === 0) return safeNumber(p.price || 0);
    return Math.min(...activeVariants.map(v => safeNumber(v.price || 0)));
  }, [p.variants, p.price]);

  // Find the MRP corresponding to the min price or the highest MRP
  const displayMrp = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.mrp || p.price || 0);
    const variantWithMinPrice = p.variants.find(v => v.isActive !== false && safeNumber(v.price || 0) === minPrice);
    return safeNumber(variantWithMinPrice?.mrp || p.mrp || minPrice || 0);
  }, [p.variants, minPrice, p.mrp]);

  const hasMultiplePrices = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!Array.isArray(p.variants) || p.variants.length <= 1) return false;
    const prices = new Set(p.variants.filter(v => v.isActive !== false && safeNumber(v.price) > 0).map(v => safeNumber(v.price)));
    return prices.size > 1;
  }, [p.variants]);

  const status = getStockStatus(totalStock)
  const hasBulk = p.bulkDiscountQuantity > 0
  const discount = displayMrp > minPrice
    ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0

  const share = (e) => {
    e.stopPropagation(); e.preventDefault()
    const url = `${window.location.origin}/products/${productIdOrSlug}`
    if (navigator.share) navigator.share({ title: p.name, url }).catch(() => { })
    else navigator.clipboard?.writeText(url)
  }

  return (
    <div 
      className="ct-card group" 
      style={{ 
        animationDelay: `${index * 38}ms`,
        background: 'white',
        borderRadius: '16px',
        border: '1px solid rgba(124, 58, 237, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={() => navigate(`/products/${productIdOrSlug}`)}
      onMouseEnter={prefetchProduct}
    >
      <style>{`
        @media (max-width: 640px) {
          .ct-card { border-radius: 12px !important; }
          .ct-card-img-wrap { padding: 12px !important; }
          .ct-verified-badge { padding: 2px 6px !important; border-radius: 4px !important; bottom: 6px !important; left: 6px !important; }
          .ct-verified-id { display: none !important; }
          .ct-card-body { padding: 10px !important; }
          .ct-card-name { font-size: 12px !important; margin-bottom: 8px !important; min-height: 2.8em !important; }
          .ct-card-price { font-size: 16px !important; }
          .ct-card-mrp { font-size: 9px !important; }
          .ct-card-off { font-size: 8px !important; padding: 1px 4px !important; }
          .ct-card-atc { width: 32px !important; height: 32px !important; border-radius: 8px !important; }
          .ct-card-atc svg { width: 14px !important; height: 14px !important; }
          .ct-card-tags { display: none !important; }
          .ct-card-bulk { padding: 2px 6px !important; font-size: 7px !important; }
        }
      `}</style>

      {/* Image Section */}
      <div style={{ 
        position: 'relative', 
        aspectRatio: '1', 
        background: '#fcfaff', 
        overflow: 'hidden'
      }}>
        {/* Top Badges Row */}
        <div style={{ 
          position: 'absolute', top: 10, left: 10, right: 10, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          zIndex: 10 
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {authed && hasBulk && (
              <div className="ct-card-bulk" style={{ 
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: 'white', padding: '4px 10px', borderRadius: '6px',
                fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)'
              }}>
                Bulk Offer
              </div>
            )}
            {authed && !hasBulk && discount >= 10 && (
              <div className="ct-card-bulk" style={{ 
                background: '#059669', color: 'white', 
                padding: '4px 10px', borderRadius: '6px',
                fontSize: '9px', fontWeight: 900, textTransform: 'uppercase'
              }}>
                {discount}% OFF
              </div>
            )}
          </div>
        </div>

        {/* Product Image */}
        <div className="ct-card-img-wrap" style={{ width: '100%', height: '100%', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {p.images?.length ? (
            <img 
              src={getCloudinaryUrl(p.images[0].url, 400)} 
              alt="" 
              loading="lazy" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
              className="group-hover:scale-110"
            />
          ) : (
            <span style={{ fontSize: '40px', opacity: 0.1 }}>📦</span>
          )}
        </div>

        {/* Verified Badge - Floating inside image at bottom */}
        <div className="ct-verified-badge" style={{ 
          position: 'absolute', bottom: 10, left: 10, 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(124, 58, 237, 0.12)',
          padding: '3px 8px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 5,
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
        }}>
          <span className="ct-verified-id" style={{ fontSize: '8px', fontWeight: 800, color: '#9ca3af' }}>
            {p._id?.toString().slice(-8).toUpperCase()}
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#7c3aed">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span style={{ fontSize: '8px', fontWeight: 900, color: '#7c3aed', letterSpacing: '0.05em' }}>VERIFIED</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="ct-card-body" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 6 }} className="ct-card-tags">
          {p.category?.name && (
            <span style={{ 
              fontSize: '8px', fontWeight: 900, color: '#7c3aed', 
              background: 'rgba(124, 58, 237, 0.05)', 
              padding: '2px 6px', borderRadius: '4px', 
              textTransform: 'uppercase', letterSpacing: '0.08em' 
            }}>
              {p.category.name}
            </span>
          )}
        </div>

        <Link 
          to={`/products/${productIdOrSlug}`} 
          onClick={e => e.stopPropagation()} 
          style={{ 
            fontSize: '14px', fontWeight: 700, color: '#111827', 
            lineHeight: 1.4, marginBottom: 12, display: '-webkit-box', 
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            minHeight: '2.8em', textDecoration: 'none', transition: 'color 0.2s'
          }}
          className="ct-card-name hover:text-purple-600"
        >
          {p.name}
        </Link>

        {/* Pricing & CTA */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1 }}>
            {authed ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                  <span className="ct-card-price" style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                    ₹{Number(minPrice).toLocaleString()}
                  </span>
                  {displayMrp > minPrice && (
                    <span className="ct-card-off" style={{ 
                      fontSize: '10px', fontWeight: 800, color: '#059669', 
                      background: 'rgba(5, 150, 105, 0.08)', 
                      padding: '1px 5px', borderRadius: '4px' 
                    }}>
                      -{Math.round(((displayMrp - minPrice) / displayMrp) * 100)}%
                    </span>
                  )}
                </div>
                {displayMrp > minPrice && (
                  <div className="ct-card-mrp" style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                    MRP ₹{Number(displayMrp).toLocaleString()}
                  </div>
                )}
              </>
            ) : (
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: 5, 
                  background: '#f9fafb', border: '1px solid #f3f4f6', 
                  padding: '5px 10px', borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#7c3aed' }}>₹</span>
                  <span style={{ filter: 'blur(3px)', fontWeight: 900, color: '#7c3aed', letterSpacing: '1px' }}>****</span>
                  <svg width="10" height="10" fill="none" stroke="#7c3aed" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div style={{ fontSize: '8px', fontWeight: 800, color: '#7c3aed', marginTop: 3, textTransform: 'uppercase' }}>Login for Price</div>
              </Link>
            )}
          </div>

          <button
            className="ct-card-atc"
            disabled={!authed || totalStock <= 0}
            style={{ 
              width: 40, height: 40, borderRadius: '12px', 
              background: totalStock <= 0 ? '#f3f4f6' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: totalStock <= 0 ? '#9ca3af' : 'white',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: totalStock <= 0 ? 'not-allowed' : 'pointer',
              boxShadow: totalStock <= 0 ? 'none' : '0 4px 12px rgba(124, 58, 237, 0.2)',
              transition: 'all 0.2s'
            }}
            onClick={async e => {
              e.stopPropagation(); e.preventDefault()
              if (!authed) { navigate('/login', { state: { from: location.pathname + location.search } }); return }
              if (p.variants?.length > 0) { navigate(`/products/${productIdOrSlug}`); return }
              const ok = await addToCart(p)
              if (ok) {
                await refreshCart()
                if (typeof setRecOpen === 'function') {
                  try {
                    const { data } = await api.get(`/api/recommendations/frequently-bought/${p._id}`)
                    const filtered = (data || []).filter(i => (i._id || i.id) !== p._id)
                    setRecItems(filtered)
                    if (filtered.length > 0) setRecOpen(true)
                  } catch { }
                }
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d={p.variants?.length > 0 ? "M9 5l7 7-7 7" : "M12 4v16m8-8H4"} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Clean Bottom Tags Row */}
        <div className="ct-card-tags" style={{ 
          marginTop: 14, paddingTop: 10, 
          borderTop: '1px solid #f3f4f6',
          display: 'flex', gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 4, height: 4, background: '#059669', borderRadius: '50%' }} />
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>In Stock</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: '10px' }}>⚡</span>
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>Fast</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: '10px' }}>🧾</span>
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>GST</span>
          </div>
        </div>
      </div>
    </div>
  )
}
