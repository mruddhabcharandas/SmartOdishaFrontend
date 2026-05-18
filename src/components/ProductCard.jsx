import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { getCloudinaryUrl } from '../lib/cloudinary';
import { getStockStatus, useCart } from '../lib/CartContext'
import { useWishlist } from '../lib/WishlistContext'

export default function ProductCard({ p, authed, addToCart, navigate, index, setRecOpen, setRecItems }) {
  const { refreshCart } = useCart()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
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

  const totalStock = Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p.stock || 0)

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
      className="product-card group" 
      style={{ 
        animationDelay: `${index * 38}ms`,
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={() => navigate(`/products/${productIdOrSlug}`)}
      onMouseEnter={prefetchProduct}
    >
      <style>{`
        .product-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        @media (max-width: 640px) {
          .product-card { border-radius: 6px; }
        }
      `}</style>

      <div style={{ 
        position: 'relative', 
        aspectRatio: '1', 
        background: '#f8fafc', 
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', top: 8, left: 8, right: 8, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', 
          zIndex: 10 
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {discount >= 10 && (
              <div style={{ 
                background: '#2874f0', 
                color: 'white', 
                padding: '4px 8px', 
                borderRadius: '2px',
                fontSize: '11px', 
                fontWeight: 700, 
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}>
                {discount}% OFF
              </div>
            )}
            {authed && hasBulk && (
              <div style={{ 
                background: '#ff9f00', 
                color: 'white', 
                padding: '4px 8px', 
                borderRadius: '2px',
                fontSize: '10px', 
                fontWeight: 700, 
                textTransform: 'uppercase',
                letterSpacing: '0.02em'
              }}>
                BULK OFFER
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const productId = p._id || p.id;
              if (isInWishlist(productId)) {
                removeFromWishlist(productId);
              } else {
                addToWishlist(p);
              }
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'white',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
            }}
            className="hover:bg-orange-50 hover:border-orange-200"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isInWishlist(p._id || p.id) ? '#ff4343' : 'none'}
              stroke="#64748b"
              strokeWidth="2"
              style={{ transition: 'all 0.2s' }}
            >
              <path
                d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div style={{ width: '100%', height: '100%', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {p.images?.length ? (
            <img 
              src={getCloudinaryUrl(p.images[0].url, 400)} 
              alt={p.name}
              loading="lazy" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.3s ease' }}
              className="group-hover:scale-105"
            />
          ) : (
            <span style={{ fontSize: '40px', opacity: 0.1 }}>📦</span>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {p.category?.name && (
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 600, 
              color: '#878787', 
              textTransform: 'uppercase', 
              letterSpacing: '0.04em' 
            }}>
              {p.category.name}
            </span>
          )}
        </div>

        <Link 
          to={`/products/${productIdOrSlug}`} 
          onClick={e => e.stopPropagation()} 
          style={{ 
            fontSize: '14px', 
            fontWeight: 500, 
            color: '#212121', 
            lineHeight: 1.4, 
            display: '-webkit-box', 
            WebkitLineClamp: 2, 
            WebkitBoxOrient: 'vertical', 
            overflow: 'hidden',
            minHeight: '2.8em', 
            textDecoration: 'none', 
            transition: 'color 0.2s'
          }}
          className="hover:text-blue-600"
        >
          {p.name}
        </Link>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#212121', letterSpacing: '-0.02em' }}>
              ₹{Number(minPrice).toLocaleString()}
            </span>
            {displayMrp > minPrice && (
              <>
                <span style={{ fontSize: '14px', color: '#878787', textDecoration: 'line-through' }}>
                  ₹{Number(displayMrp).toLocaleString()}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#388e3c' }}>
                  Save ₹{Number(displayMrp - minPrice).toLocaleString()}
                </span>
              </>
            )}
          </div>

          {totalStock > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#388e3c', fontWeight: 600 }}>
              <span>✓</span>
              <span>Free Delivery</span>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#ff4343', fontWeight: 600 }}>
              Out of Stock
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
