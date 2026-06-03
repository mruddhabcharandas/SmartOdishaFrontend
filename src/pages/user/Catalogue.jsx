import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
import { useAuth } from '../../lib/AuthContext'
import { setSEO } from '../../shared/lib/seo.js'
import ProductCard from '../../components/ProductCard'
import LoadingSpinner from '../../components/LoadingSpinner'

function SuggestList({ items, setQ }) {
  const navigate = useNavigate()
  return (
    <div className="ct-suggest">
      {items.map((item, i) => (
        <div
          key={i}
          className="ct-suggest-item"
          onClick={() => {
            setQ(item.name)
            navigate(`/products/${item.id || item._id}`)
          }}
        >
          <div className="ct-sug-thumb">
            {item.image && <img src={getCloudinaryUrl(item.image, 200)} alt="" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ct-sug-name">{item.name}</div>
            {item.category?.name && <div className="ct-sug-cat">{item.category.name}</div>}
          </div>
          <div className="ct-sug-fill">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Catalogue() {
  const { addToCart } = useCart()
  const { token } = useAuth()
  const authed = !!token
  const navigate = useNavigate()
  const location = useLocation()

  const [q, setQ] = useState('')
  const [sug, setSug] = useState([])
  const [showSug, setShowSug] = useState(false)
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [store, setStore] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const searchRef = useRef(null)
  const limit = 20

  const fetchProducts = async ({ pageParam = 1 }) => {
    const { data } = await api.get('/api/products', {
      params: { q, page: pageParam, limit, brand: brand || undefined, category: category || undefined, subCategory: subCategory || undefined, store: store || undefined }
    })
    return data
  }

  const {
    data: productData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingProducts
  } = useInfiniteQuery({
    queryKey: ['products', { q, brand, category, subCategory, store, limit, authed }],
    queryFn: fetchProducts,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1
      return next <= Math.ceil(lastPage.total / limit) ? next : undefined
    },
    staleTime: 1000 * 60 * 30
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/api/brands', { params: { active: true } }).then(res => res.data || []),
    staleTime: 1000 * 60 * 60 * 24
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories', { params: { active: true } }).then(res => res.data || []),
    staleTime: 1000 * 60 * 60 * 24
  })

  const items = useMemo(() => {
    return productData?.pages.flatMap(page => page.items) || []
  }, [productData])

  const total = productData?.pages[0]?.total || 0

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const cat = params.get('category')
    const br = params.get('brand')
    const sc = params.get('subCategory')
    const st = params.get('store')
    const query = params.get('q') || params.get('search')
    const mn = params.get('minPrice')
    const mx = params.get('maxPrice')

    if (cat) setCategory(cat)
    if (br) setBrand(br)
    if (sc) setSubCategory(sc)
    if (st) setStore(st)
    if (query) setQ(query)
    if (mn) setMinPrice(mn)
    if (mx) setMaxPrice(mx)
  }, [])

  useEffect(() => {
    let t
    if (q.trim().length >= 2) {
      t = setTimeout(async () => {
        try {
          const { data } = await api.get('/api/products/suggest', { params: { q } })
          setSug(data || [])
          setShowSug(true)
        } catch {
          setSug([])
        }
      }, 250)
    } else {
      setSug([])
      setShowSug(false)
    }
    return () => t && clearTimeout(t)
  }, [q])

  useEffect(() => {
    const title = category ? `${category} · Shop | SmartOdisha` : q ? `Search: ${q} | SmartOdisha` : 'Products | SmartOdisha'
    setSEO(title, 'Discover quality products with best prices, fast delivery across Odisha.')
  }, [q, category])

  const filteredSorted = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val)
      return isNaN(num) || !isFinite(num) ? 0 : num
    }
    const getMinPrice = (p) => {
      if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.price || 0)
      const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.price || 0) > 0)
      if (activeVariants.length === 0) return safeNumber(p.price || 0)
      return Math.min(...activeVariants.map(v => safeNumber(v.price || 0)))
    }

    let list = [...items]
    const mn = Number(minPrice)
    const mx = Number(maxPrice)
    if (!isNaN(mn) && minPrice !== '') list = list.filter(p => getMinPrice(p) >= mn)
    if (!isNaN(mx) && maxPrice !== '') list = list.filter(p => getMinPrice(p) <= mx)
    switch (sortBy) {
      case 'price-low':
        list.sort((a, b) => getMinPrice(a) - getMinPrice(b))
        break
      case 'price-high':
        list.sort((a, b) => getMinPrice(b) - getMinPrice(a))
        break
      case 'newest':
      default:
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }
    return list
  }, [items, minPrice, maxPrice, sortBy])

  const capitalizeText = (text) => {
    if (!text) return ''
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }

  if (loadingProducts && items.length === 0) {
    return (
      <div className="ct-loading flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Loading products..." />
      </div>
    )
  }

  return (
    <div className="ct-wrapper">
      <style jsx>{`
        .ct-wrapper {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 150px, #f1f5f9 150px);
          color: #0f172a;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .ct-hero {
          padding: 32px 20px 40px;
          margin: 0 -12px;
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .ct-hero {
            padding: 56px 40px 56px;
            margin: 0 -24px;
          }
        }

        .ct-hero::before {
          content: '';
          position: absolute;
          top: -60%;
          left: -40%;
          width: 150%;
          height: 200%;
          background: radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 60%);
          animation: rotate 45s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .ct-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 12px 48px;
          position: relative;
          z-index: 1;
        }

        @media (min-width: 768px) {
          .ct-container {
            padding: 0 24px 64px;
          }
        }

        .ct-search-wrap {
          max-width: 720px;
          margin: 0 auto;
          position: relative;
        }

        .ct-search-input {
          width: 100%;
          padding: 18px 26px;
          border: 2px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          font-size: 16px;
          font-weight: 600;
          outline: none;
          background: rgba(255,255,255,0.08);
          color: white;
          backdrop-filter: blur(24px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }

        .ct-search-input::placeholder {
          color: rgba(255,255,255,0.65);
        }

        .ct-search-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.25), 0 12px 48px rgba(0,0,0,0.25);
          background: rgba(255,255,255,0.12);
        }

        .ct-suggest {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-radius: 20px;
          margin-top: 12px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          z-index: 1000;
          border: 1px solid rgba(248,250,252);
        }

        .ct-suggest-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .ct-suggest-item:hover {
          background: #f1f5f9;
        }

        .ct-sug-thumb {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: linear-gradient(135deg, #fef3c7, #f97316);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .ct-sug-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ct-sug-name {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .ct-sug-cat {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }

        .ct-sug-fill {
          margin-left: auto;
          color: #f97316;
        }

        .ct-categories {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          margin: 36px 0 40px;
          padding: 6px 2px;
          scrollbar-width: none;
        }

        .ct-categories::-webkit-scrollbar {
          display: none;
        }

        .ct-category-chip {
          padding: 14px 26px;
          border: 2px solid rgba(15,23,42,0.06);
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #fef9f5 100%);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          color: #475569;
          box-shadow: 0 8px 28px rgba(15,23,42,0.06);
          letter-spacing: 0.05em;
        }

        .ct-category-chip:hover {
          border-color: #f97316;
          color: #f97316;
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(249,115,22,0.18);
        }

        .ct-category-chip.active {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 18px 52px rgba(249,115,22,0.35);
          transform: translateY(-4px);
        }

        .ct-header-section {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 32px;
          background: white;
          padding: 28px;
          border-radius: 28px;
          box-shadow: 0 8px 36px rgba(15,23,42,0.06);
          border: 1px solid rgba(248,250,252);
        }

        @media (min-width: 768px) {
          .ct-header-section {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 30px 36px;
          }
        }

        .ct-title {
          font-size: clamp(22px, 4vw, 36px);
          font-weight: 900;
          background: linear-gradient(135deg, #0f172a 0%, #f97316 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.04em;
        }

        .ct-count {
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
          margin-top: 4px;
        }

        .ct-filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ct-filter-select {
          padding: 12px 18px;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          background: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .ct-filter-select:focus, .ct-filter-select:hover {
          border-color: #f97316;
          color: #f97316;
        }

        .ct-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }

        @media (min-width: 550px) {
          .ct-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 22px;
          }
        }

        @media (min-width: 900px) {
          .ct-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (min-width: 1200px) {
          .ct-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 28px;
          }
        }

        .ct-loading {
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 150px, #f1f5f9 150px);
          min-height: 100vh;
          padding: 40px 12px;
        }

        .ct-loading-grid {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }

        @media (min-width: 550px) {
          .ct-loading-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 22px;
          }
        }

        @media (min-width: 900px) {
          .ct-loading-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (min-width: 1200px) {
          .ct-loading-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 28px;
          }
        }

        .ct-loading-card {
          aspect-ratio: 1;
          background: white;
          border-radius: 28px;
          box-shadow: 0 8px 36px rgba(0,0,0,0.06);
          animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .ct-load-more {
          text-align: center;
          margin: 60px 0 24px;
        }

        .ct-load-btn {
          padding: 18px 56px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 14px 44px rgba(249,115,22,0.35);
        }

        .ct-load-btn:hover:not(:disabled) {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 22px 60px rgba(249,115,22,0.5);
        }

        .ct-load-btn:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .ct-empty {
          text-align: center;
          padding: 100px 40px;
          background: linear-gradient(180deg, #ffffff 0%, #fef9f5 100%);
          border-radius: 32px;
          margin-top: 32px;
          border: 1px solid rgba(248,250,252);
          box-shadow: 0 12px 40px rgba(15,23,42,0.06);
        }

        .ct-empty-icon {
          font-size: 84px;
          margin-bottom: 24px;
        }

        .ct-empty-title {
          font-size: 26px;
          font-weight: 900;
          background: linear-gradient(135deg, #0f172a 0%, #f97316 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }

        .ct-empty-desc {
          font-size: 15px;
          color: #64748b;
          max-width: 420px;
          margin: 0 auto;
        }
      `}</style>

      <div className="ct-container">
        <div className="ct-hero">
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <h2 style={{ 
              fontSize: 'clamp(24px, 3.5vw, 40px)', 
              fontWeight: 900, 
              background: 'linear-gradient(135deg, #ffffff 0%, #fed7aa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 10,
              letterSpacing: '-0.04em'
            }}>
              Discover Premium Products for Odisha
            </h2>
            <p style={{ 
              fontSize: 'clamp(13px, 1.8vw, 16px)', 
              color: 'rgba(255,255,255,0.7)', 
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
              Quality you can trust, fast delivery across Odisha
            </p>
          </div>

          <div className="ct-search-wrap">
            <div style={{ position: 'relative' }}>
              <input
                ref={searchRef}
                className="ct-search-input"
                placeholder="🔍 Search for products, brands, categories..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {showSug && sug.length > 0 && <SuggestList items={sug} setQ={setQ} />}
            </div>
          </div>
        </div>

        <div className="ct-categories">
          <button
            className={`ct-category-chip${category === '' ? ' active' : ''}`}
            onClick={() => { setCategory(''); setSubCategory('') }}
          >
            ✨ All Products
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              className={`ct-category-chip${category === c._id ? ' active' : ''}`}
              onClick={() => { setCategory(c._id); setSubCategory('') }}
            >
              {capitalizeText(c.name)}
            </button>
          ))}
        </div>

        <div className="ct-header-section">
          <div>
            <h1 className="ct-title">
              {q ? `Search: "${q}"` : (category ? categories.find(c => c._id === category)?.name : 'All Products')}
            </h1>
            <div className="ct-count">
              {total} {total === 1 ? 'product' : 'products'} available
            </div>
          </div>

          <div className="ct-filters">
            <select
              className="ct-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price-low">Sort: Price Low → High</option>
              <option value="price-high">Sort: Price High → Low</option>
            </select>
          </div>
        </div>

        {filteredSorted.length === 0 && !loadingProducts ? (
          <div className="ct-empty">
            <div className="ct-empty-icon">📦</div>
            <div className="ct-empty-title">No products found</div>
            <div className="ct-empty-desc">Try adjusting your search or filters to find what you're looking for! New products are added regularly!</div>
          </div>
        ) : (
          <>
            <div className="ct-grid">
              {filteredSorted.map((product, idx) => (
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
            {hasNextPage && (
              <div className="ct-load-more">
                <button
                  className="ct-load-btn"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading More Products...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
