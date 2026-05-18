import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
import { useWishlist } from '../../lib/WishlistContext'
import { setSEO } from '../../shared/lib/seo.js'
import { useToast } from '../../components/Toast'
import ProductCard from '../../components/ProductCard'

export default function ProductDetail() {
  const { idOrSlug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const { notify } = useToast()
  const [activeImg, setActiveImg] = useState(0)
  const authed = !!localStorage.getItem('token')

  const { data: p, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['product', idOrSlug],
    queryFn: () => api.get(`/api/products/${idOrSlug}`).then(res => res.data),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  })

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['recommendations', idOrSlug],
    queryFn: () => api.get(`/api/products/${idOrSlug}/recommendations?limit=8`).then(res => res.data || []),
    enabled: !!idOrSlug,
    staleTime: 1000 * 60 * 60,
  })

  const minPrice = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!p) return 0;
    if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.price || 0);
    const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.price || 0) > 0);
    if (activeVariants.length === 0) return safeNumber(p.price || 0);
    return Math.min(...activeVariants.map(v => safeNumber(v.price || 0)));
  }, [p]);

  const displayMrp = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!p) return 0;
    if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.mrp || p.price || 0);
    const variantWithMinPrice = p.variants.find(v => v.isActive !== false && safeNumber(v.price || 0) === minPrice);
    return safeNumber(variantWithMinPrice?.mrp || p.mrp || minPrice || 0);
  }, [p, minPrice]);

  const discount = displayMrp > minPrice
    ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0

  useEffect(() => {
    if (p) {
      setSEO(`${p.name} | SmartOdisha`, `Buy ${p.name} at best prices with fast delivery across Odisha.`)
    }
  }, [p])

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '300px', aspectRatio: '1', background: '#f1f5f9', borderRadius: '8px' }}></div>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ height: '24px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '12px', width: '70%' }}></div>
            <div style={{ height: '32px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '16px', width: '40%' }}></div>
            <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '8px', width: '90%' }}></div>
            <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '8px', width: '80%' }}></div>
            <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '4px', width: '60%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (queryError || !p) {
    return (
      <div style={{ maxWidth: '600px', margin: '100px auto', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>😔</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>Product Not Found</h1>
        <p style={{ color: '#6b7280', marginBottom: '32px' }}>The product you're looking for doesn't exist or has been removed.</p>
        <Link
          to="/products"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #1e3a8a, #f97316)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 700
          }}
        >
          Back to Products
        </Link>
      </div>
    )
  }

  const totalStock = Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p.stock || 0)

  const imgs = Array.isArray(p?.images) ? p.images : []

  return (
    <div style={{ background: '#f1f3f6', minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', background: 'white', padding: '24px', borderRadius: '0' }}>
          <div style={{ flex: '0 0 40%', minWidth: '300px' }}>
            <div style={{ position: 'relative', background: 'white', padding: '20px', border: '1px solid #f0f0f0', marginBottom: '12px' }}>
              {imgs.length > 0 && (
                <img
                  src={getCloudinaryUrl(imgs[activeImg].url || imgs[activeImg], 800)}
                  alt={p.name}
                  style={{ width: '100%', height: '400px', objectFit: 'contain' }}
                />
              )}
            </div>
            {imgs.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {imgs.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    style={{
                      width: '64px',
                      height: '64px',
                      padding: '4px',
                      border: activeImg === idx ? '2px solid #2874f0' : '2px solid #f0f0f0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      background: 'white'
                    }}
                  >
                    <img
                      src={getCloudinaryUrl(img.url || img, 120)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  const productId = p._id || p.id;
                  if (isInWishlist(productId)) {
                    removeFromWishlist(productId);
                    notify('Removed from wishlist', 'success');
                  } else {
                    addToWishlist(p);
                    notify('Added to wishlist', 'success');
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  background: '#ff9f00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {isInWishlist(p._id || p.id) ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" />
                    </svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Wishlist
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  if (!authed) {
                    navigate('/login', { state: { from: `/products/${idOrSlug}` } });
                    return;
                  }
                  if (p.variants?.length > 0) {
                    notify('Please select a variant first', 'info');
                    return;
                  }
                  const ok = await addToCart(p);
                  if (ok) {
                    notify('Added to cart!', 'success');
                  }
                }}
                disabled={totalStock <= 0}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  background: totalStock <= 0 ? '#e0e0e0' : '#fb641b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: totalStock <= 0 ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {totalStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>

          <div style={{ flex: '1', minWidth: '300px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#212121', margin: '0 0 8px', lineHeight: '1.4' }}>
              {p.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#388e3c', color: 'white', padding: '2px 6px', borderRadius: '14px', fontSize: '12px', fontWeight: 600 }}>
                <span>{Number(p.ratingAvg || 4.3).toFixed(1)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
              <span style={{ color: '#878787', fontSize: '14px' }}>
                {Number(p.ratingCount || 128).toLocaleString()} Ratings
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '28px', fontWeight: 500, color: '#212121' }}>
                  ₹{minPrice.toLocaleString()}
                </span>
                {displayMrp > minPrice && (
                  <>
                    <span style={{ fontSize: '16px', color: '#878787', textDecoration: 'line-through' }}>
                      ₹{displayMrp.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#388e3c' }}>
                      {discount}% off
                    </span>
                  </>
                )}
              </div>
              {p.gst > 0 && (
                <p style={{ color: '#388e3c', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
                  Inclusive of all taxes
                </p>
              )}
            </div>

            {totalStock > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#26a541', fontSize: '14px', fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#26a541">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>Free Delivery</span>
              </div>
            )}

            {p.highlights && p.highlights.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#212121', marginBottom: '12px' }}>
                  Highlights
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {p.highlights.map((hl, idx) => (
                    <li key={idx} style={{ color: '#212121', fontSize: '14px', marginBottom: '8px', lineHeight: '1.5' }}>
                      {hl}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.description && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#212121', marginBottom: '12px' }}>
                  Description
                </h3>
                <p style={{ color: '#212121', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {p.description}
                </p>
              </div>
            )}

            {p.specifications && p.specifications.length > 0 && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#212121', marginBottom: '12px' }}>
                  Specifications
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {p.specifications.map((spec, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 0', color: '#878787', fontSize: '14px', width: '30%' }}>
                          {spec.key}
                        </td>
                        <td style={{ padding: '10px 0', color: '#212121', fontSize: '14px', fontWeight: 500 }}>
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {similarProducts.length > 0 && (
          <div style={{ background: 'white', marginTop: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#212121', marginBottom: '20px' }}>
              Similar Products
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {similarProducts.slice(0, 8).map((product, idx) => (
                <ProductCard
                  key={product._id || idx}
                  p={product}
                  authed={authed}
                  addToCart={addToCart}
                  navigate={navigate}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
