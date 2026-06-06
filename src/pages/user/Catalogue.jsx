import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { getImageUrl } from '../../lib/cloudinary'
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
            {item.image && <img src={getImageUrl(item.image, 200)} alt="" />}
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

  const { data: subCategories = [] } = useQuery({
    queryKey: ['subCategories', category],
    queryFn: () => category ? api.get('/api/subcategories', { params: { category, active: true } }).then(res => res.data || []) : [],
    staleTime: 1000 * 60 * 60 * 24
  })

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => api.get('/api/public/stores').then(res => res.data || []),
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
          background: #f8fafc;
          color: #0f172a;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .ct-hero {
          padding: 16px 12px 12px;
          margin: 0 -12px;
          position: relative;
          overflow: hidden;
          background: #f8fafc;
        }

        @media (min-width: 768px) {
          .ct-hero {
            padding: 16px 24px 12px;
            margin: 0 -24px;
          }
        }

        .ct-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 12px 40px;
          position: relative;
          z-index: 1;
        }

        @media (min-width: 768px) {
          .ct-container {
            padding: 0 24px 56px;
          }
        }

        .ct-search-wrap {
          max-width: 720px;
          margin: 0 auto;
          position: relative;
        }

        .ct-search-input {
          width: 100%;
          padding: 12px 18px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          background: white;
          color: #0f172a;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .ct-search-input::placeholder {
          color: #94a3b8;
        }

        .ct-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: white;
        }

        .ct-suggest {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-radius: 12px;
          margin-top: 8px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          z-index: 1000;
          border: 1px solid #e2e8f0;
        }

        .ct-suggest-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .ct-suggest-item:hover {
          background: #f1f5f9;
        }

        .ct-sug-thumb {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #f1f5f9;
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
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .ct-sug-cat {
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
        }

        .ct-sug-fill {
          margin-left: auto;
          color: #94a3b8;
        }

        .ct-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin: 12px auto 0;
          padding: 10px 0;
        }

        .ct-trust-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
        }

        .ct-categories {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin: 12px 0 16px;
          padding: 2px 2px 8px;
          scrollbar-width: none;
        }

        .ct-categories::-webkit-scrollbar {
          display: none;
        }

        .ct-category-chip {
          padding: 8px 16px;
          border: none;
          border-radius: 100px;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          color: #64748b;
        }

        .ct-category-chip:hover {
          color: #0f172a;
        }

        .ct-category-chip.active {
          background: #0f172a;
          color: white;
        }

        .ct-header-section {
          display: flex;
          flex-direction: row;
          gap: 16px;
          margin-bottom: 16px;
          align-items: center;
          justify-content: space-between;
          padding: 0;
          background: transparent;
        }

        .ct-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .ct-count {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        .ct-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ct-filter-select {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
        }

        .ct-filter-select:focus, .ct-filter-select:hover {
          border-color: #3b82f6;
          color: #0f172a;
        }

        .ct-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 550px) {
          .ct-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
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
            gap: 16px;
          }
        }

        .ct-loading {
          font-family: 'Inter', system-ui, sans-serif;
          background: #f8fafc;
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
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .ct-load-more {
          text-align: center;
          margin: 32px 0 20px;
        }

        .ct-load-btn {
          padding: 12px 32px;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ct-load-btn:hover:not(:disabled) {
          background: #1e293b;
        }

        .ct-load-btn:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .ct-empty {
          text-align: center;
          padding: 60px 24px;
          background: white;
          border-radius: 16px;
          margin-top: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .ct-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .ct-empty-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .ct-empty-desc {
          font-size: 13px;
          color: #64748b;
          max-width: 420px;
          margin: 0 auto;
        }
      `}</style>

      <div className="ct-container">
        <div className="ct-hero">
          <div className="ct-search-wrap">
            <div style={{ position: 'relative' }}>
              <input
                ref={searchRef}
                className="ct-search-input"
                placeholder="Search for products, brands, categories..."
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
            All
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

        {category && subCategories.length > 0 && (
          <div className="ct-categories">
            <button
              className={`ct-category-chip${subCategory === '' ? ' active' : ''}`}
              onClick={() => setSubCategory('')}
            >
              All {categories.find(c => c._id === category)?.name}
            </button>
            {subCategories.map((s) => (
              <button
                key={s._id}
                className={`ct-category-chip${subCategory === s._id ? ' active' : ''}`}
                onClick={() => setSubCategory(s._id)}
              >
                {capitalizeText(s.name)}
              </button>
            ))}
          </div>
        )}

        <div className="ct-header-section">
          <div>
            <h1 className="ct-title">
              {q ? `Search: "${q}"` : (subCategory ? subCategories.find(s => s._id === subCategory)?.name : (category ? categories.find(c => c._id === category)?.name : 'All Products'))}
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
              <option value="newest">Sort: Newest</option>
              <option value="price-low">Sort: Price Low</option>
              <option value="price-high">Sort: Price High</option>
            </select>
            <select
              className="ct-filter-select"
              value={store}
              onChange={(e) => setStore(e.target.value)}
            >
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
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
