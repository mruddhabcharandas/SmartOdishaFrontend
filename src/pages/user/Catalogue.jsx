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
            navigate(`/product/${item.id}`)
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
  const searchRef = useRef(null)
  const limit = 20

  const fetchProducts = async ({ pageParam = 1 }) => {
    const { data } = await api.get('/api/products', {
      params: { q, page: pageParam, limit, brand: brand || undefined, category: category || undefined, subCategory: subCategory || undefined, store: store || undefined },
    })
    return data
  }

  const {
    data: productData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingProducts,
  } = useInfiniteQuery({
    queryKey: ['products', { q, brand, category, subCategory, store, limit, authed }],
    queryFn: fetchProducts,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1
      return next <= Math.ceil(lastPage.total / limit) ? next : undefined
    },
    staleTime: 1000 * 60 * 30,
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/api/brands', { params: { active: true } }).then(res => res.data || []),
    staleTime: 1000 * 60 * 60 * 24,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories', { params: { active: true } }).then(res => res.data || []),
    staleTime: 1000 * 60 * 60 * 24,
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
    const query = params.get('q')
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
          setSug(data || []); setShowSug(true)
        } catch { setSug([]) }
      }, 250)
    } else { setSug([]); setShowSug(false) }
    return () => t && clearTimeout(t)
  }, [q])

  useEffect(() => {
    const title = category ? `${category} · Shop | SmartOdisha`
      : q ? `Search: ${q} | SmartOdisha` : 'Products | SmartOdisha'
    setSEO(title, 'Discover quality products with best prices, fast delivery across Odisha.')
  }, [q, category])

  const filteredSorted = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    const getMinPrice = (p) => {
      if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.price || 0);
      const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.price || 0) > 0);
      if (activeVariants.length === 0) return safeNumber(p.price || 0);
      return Math.min(...activeVariants.map(v => safeNumber(v.price || 0)));
    };

    let list = [...items]
    const mn = Number(minPrice), mx = Number(maxPrice)
    if (!isNaN(mn) && minPrice !== '') list = list.filter(p => getMinPrice(p) >= mn)
    if (!isNaN(mx) && maxPrice !== '') list = list.filter(p => getMinPrice(p) <= mx)
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return list
  }, [items, minPrice, maxPrice])

  // Capitalize function for categories
  const capitalizeText = (text) => {
    if (!text) return ''
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }

  if (loadingProducts && items.length === 0) return (
    <div className="ct-loading flex items-center justify-center min-h-screen">
      <LoadingSpinner text="Loading products..." />
    </div>
  )

  return (
    <div className="ct-wrapper">
      <style jsx>{`
        .ct-wrapper {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #020617 120px, #f8fafc 120px);
          color: #0f172a;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .ct-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 12px 48px;
        }

        @media (min-width: 768px) {
          .ct-container {
            padding: 32px 24px 64px;
          }
        }

        .ct-search-wrap {
          max-width: 640px;
          margin: 0 auto 32px;
          position: relative;
        }

        .ct-search-input {
          width: 100%;
          padding: 16px 24px;
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          font-size: 15px;
          font-weight: 600;
          outline: none;
          background: rgba(255,255,255,0.1);
          color: white;
          backdrop-filter: blur(12px);
          transition: all 0.3s;
        }

        .ct-search-input::placeholder {
          color: rgba(255,255,255,0.6);
        }

        .ct-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.2);
          background: rgba(255,255,255,0.15);
        }

        .ct-categories {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          margin-bottom: 28px;
          padding: 4px 0;
          scrollbar-width: none;
        }

        .ct-categories::-webkit-scrollbar {
          display: none;
        }

        .ct-category-chip {
          padding: 12px 24px;
          border: 2px solid rgba(15,23,42,0.08);
          border-radius: 20px;
          background: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          color: #475569;
          box-shadow: 0 4px 12px rgba(15,23,42,0.03);
        }

        .ct-category-chip:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.15);
        }

        .ct-category-chip.active {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 12px 36px rgba(59,130,246,0.3);
          transform: translateY(-3px);
        }

        .ct-header {
          margin-bottom: 24px;
        }

        .ct-title {
          font-size: clamp(20px, 4vw, 32px);
          font-weight: 900;
          background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .ct-count {
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
          margin-top: 6px;
        }

        .ct-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 550px) {
          .ct-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
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
            gap: 20px;
          }
        }

        .ct-loading {
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #020617 120px, #f8fafc 120px);
          min-height: 100vh;
          padding: 40px 12px;
        }

        .ct-loading-grid {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 550px) {
          .ct-loading-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
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
            gap: 20px;
          }
        }

        .ct-loading-card {
          aspect-ratio: 1;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .ct-load-more {
          text-align: center;
          margin: 48px 0 24px;
        }

        .ct-load-btn {
          padding: 16px 48px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.35s;
          box-shadow: 0 10px 32px rgba(59,130,246,0.3);
        }

        .ct-load-btn:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 0 18px 48px rgba(59,130,246,0.4);
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
          padding: 80px 20px;
          background: rgba(255,255,255,0.8);
          border-radius: 24px;
          margin-top: 24px;
          border: 1px solid rgba(255,255,255,0.9);
        }

        .ct-empty-icon {
          font-size: 72px;
          margin-bottom: 20px;
        }

        .ct-empty-title {
          font-size: 22px;
          font-weight: 900;
          background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }

        .ct-empty-desc {
          font-size: 14px;
          color: #64748b;
        }
      `}</style>

      <div className="ct-container">
        {/* Search */}
        <div className="ct-search-wrap">
          <div style={{ position: 'relative' }}>
            <input
              ref={searchRef}
              className="ct-search-input"
              placeholder="🔍 Search for products, brands..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {showSug && sug.length > 0 && <SuggestList items={sug} setQ={setQ} />}
          </div>
        </div>

        {/* Categories */}
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

        {/* Header */}
        <div className="ct-header">
          <h1 className="ct-title">
            {q ? `Search: "${q}"` : (category ? categories.find(c => c._id === category)?.name : 'All Products')}
          </h1>
          <div className="ct-count">
            {total} {total === 1 ? 'product' : 'products'} available
          </div>
        </div>

        {/* Products */}
        {filteredSorted.length === 0 && !loadingProducts ? (
          <div className="ct-empty">
            <div className="ct-empty-icon">📦</div>
            <div className="ct-empty-title">No products found</div>
            <div className="ct-empty-desc">Try adjusting your search or filters to find what you're looking for</div>
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
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
