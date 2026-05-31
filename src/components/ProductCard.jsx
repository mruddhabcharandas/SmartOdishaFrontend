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
  const totalStock = p && Array.isArray(p.variants) && p.variants.length > 0 
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0) 
    : (p?.stock || 0) 

  // Find the lowest price among active variants 
  const minPrice = useMemo(() => { 
    const safeNumber = (val) => { 
      const num = Number(val); 
      return isNaN(num) || !isFinite(num) ? 0 : num; 
    }; 
    if (!p || !Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p?.price || 0); 
    const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.price || 0) > 0); 
    if (activeVariants.length === 0) return safeNumber(p?.price || 0); 
    return Math.min(...activeVariants.map(v => safeNumber(v.price || 0))); 
  }, [p]); 

  // Find the MRP corresponding to the min price or the highest MRP 
  const displayMrp = useMemo(() => { 
    const safeNumber = (val) => { 
      const num = Number(val); 
      return isNaN(num) || !isFinite(num) ? 0 : num; 
    }; 
    if (!p || !Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p?.mrp || p?.price || 0); 
    const variantWithMinPrice = p.variants.find(v => v.isActive !== false && safeNumber(v.price || 0) === minPrice); 
    return safeNumber(variantWithMinPrice?.mrp || p?.mrp || minPrice || 0); 
  }, [p, minPrice]); 

  const hasMultiplePrices = useMemo(() => { 
    const safeNumber = (val) => { 
      const num = Number(val); 
      return isNaN(num) || !isFinite(num) ? 0 : num; 
    }; 
    if (!p || !Array.isArray(p.variants) || p.variants.length <= 1) return false; 
    const prices = new Set(p.variants.filter(v => v.isActive !== false && safeNumber(v.price) > 0).map(v => safeNumber(v.price))); 
    return prices.size > 1; 
  }, [p]); 

  const status = getStockStatus(totalStock) 
  const hasBulk = p?.bulkDiscountQuantity > 0 
  const discount = displayMrp > minPrice 
    ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0 

  const share = (e) => { 
    e.stopPropagation(); e.preventDefault() 
    const url = `${window.location.origin}/products/${productIdOrSlug}` 
    if (navigator.share) navigator.share({ title: p.name, url }).catch(() => { }) 
    else navigator.clipboard?.writeText(url) 
  } 

  // Capitalize function
  const capitalizeText = (text) => {
    if (!text) return ''
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }

  return ( 
    <div 
      className="pc-card group" 
      style={{ 
        animationDelay: `${index * 38}ms`, 
        background: 'white', 
        borderRadius: '24px', 
        border: '2px solid rgba(59, 130, 246, 0.08)', 
        boxShadow: '0 8px 40px -20px rgba(15, 23, 42, 0.2)', 
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
        .pc-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 60px -24px rgba(59,130,246,0.35);
          border-color: rgba(59,130,246,0.25);
        }

        @media (max-width: 640px) { 
          .pc-card { border-radius: 20px; } 
          .pc-img-wrap { padding: 16px !important; } 
          .pc-verified { padding: 4px 10px !important; border-radius: 10px !important; bottom: 8px !important; left: 8px !important; } 
          .pc-body { padding: 14px !important; } 
          .pc-name { font-size: 13px !important; margin-bottom: 8px !important; } 
          .pc-price { font-size: 18px !important; } 
        } 
      `}</style> 

      {/* Image Section */} 
      <div style={{ 
        position: 'relative', 
        aspectRatio: '1', 
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', 
        overflow: 'hidden' 
      }}> 
        {/* Top Badges Row */} 
        <div style={{ 
          position: 'absolute', top: 10px, left: 10px, right: 10px, 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          zIndex: 10 
        }}> 
          <div style={{ display: 'flex', gap: 8 }}> 
            {hasBulk && ( 
              <div style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
                color: 'white', padding: '6px 14px', borderRadius: '12px', 
                fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em',
                textTransform: 'uppercase', 
                boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)' 
              }}> 
                Bulk Offer
              </div> 
            )} 
            {!hasBulk && discount >= 10 && ( 
              <div style={{ 
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                color: 'white', padding: '6px 14px', borderRadius: '12px', 
                fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em',
                textTransform: 'uppercase', 
                boxShadow: '0 6px 20px rgba(5, 150, 105, 0.3)' 
              }}> 
                {discount}% OFF 
              </div> 
            )} 
          </div>
        </div> 

        {/* Product Image */} 
        <div className="pc-img-wrap" style={{ width: '100%', height: '100%', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}> 
          {p.images?.length ? ( 
            <img 
              src={getCloudinaryUrl(p.images[0].url, 500)} 
              alt={p.name} 
              loading="lazy" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} 
              className="group-hover:scale-110" 
            /> 
          ) : ( 
            <span style={{ fontSize: '56px', opacity: 0.3 }}>📦</span> 
          )} 
        </div> 

        {/* Verified Badge - Floating inside image at bottom */} 
        <div className="pc-verified" style={{ 
          position: 'absolute', bottom: 12px, left: 12px, 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(16px)', 
          border: '1px solid rgba(59, 130, 246, 0.12)', 
          padding: '6px 14px', 
          borderRadius: '14px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          zIndex: 5, 
          boxShadow: '0 4px 16px rgba(15,23,42,0.06)' 
        }}> 
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"> 
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /> 
          </svg> 
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Verified</span> 
        </div> 
      </div> 

      {/* Content Section */} 
      <div className="pc-body" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}> 
        {/* Category tag */}
        <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}> 
          {p.category?.name && ( 
            <span style={{ 
              fontSize: '11px', fontWeight: 900, color: '#3b82f6', 
              background: 'rgba(59, 130, 246, 0.08)', 
              padding: '5px 12px', borderRadius: '10px', 
              textTransform: 'uppercase', letterSpacing: '0.08em' 
            }}> 
              {capitalizeText(p.category.name)} 
            </span> 
          )} 
        </div> 

        <Link 
          to={`/products/${productIdOrSlug}`} 
          onClick={e => e.stopPropagation()} 
          className="pc-name"
          style={{ 
            fontSize: '14px', fontWeight: 800, color: '#0f172a', 
            lineHeight: 1.4, marginBottom: 14, display: '-webkit-box', 
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', 
            textDecoration: 'none', transition: 'color 0.2s' 
          }} 
        > 
          {p.name} 
        </Link> 

        {/* Pricing & CTA */} 
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}> 
          <div style={{ flex: 1 }}> 
            <> 
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}> 
                <span className="pc-price" style={{ fontSize: '22px', fontWeight: 900, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> 
                  ₹{Number(minPrice).toLocaleString()} 
                </span> 
                {displayMrp > minPrice && ( 
                  <span style={{ 
                    fontSize: '12px', fontWeight: 700, color: '#94a3b8', 
                    textDecoration: 'line-through' 
                  }}> 
                    ₹{Number(displayMrp).toLocaleString()} 
                  </span> 
                )} 
              </div> 
              {displayMrp > minPrice && ( 
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 800 }}> 
                  Save ₹{Number(displayMrp - minPrice).toLocaleString()}
                </div> 
              )} 
            </> 
          </div>

          <button 
            disabled={!authed || totalStock <= 0} 
            style={{ 
              width: 48, height: 48, borderRadius: '16px', 
              background: totalStock <= 0 ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
              color: totalStock <= 0 ? '#94a3b8' : 'white', 
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: totalStock <= 0 ? 'not-allowed' : 'pointer', 
              boxShadow: totalStock <= 0 ? 'none' : '0 8px 24px rgba(59, 130, 246, 0.3)', 
              transition: 'all 0.3s' 
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}> 
              <path d={p.variants?.length > 0 ? "M9 5l7 7-7 7" : "M12 4v16m8-8H4"} strokeLinecap="round" strokeLinejoin="round" /> 
            </svg> 
          </button> 
        </div> 

        {/* Small stock status indicator */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, background: totalStock > 0 ? '#059669' : '#dc2626', borderRadius: '50%' }} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: totalStock > 0 ? '#059669' : '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {totalStock > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div> 
    </div> 
  ) 
}
