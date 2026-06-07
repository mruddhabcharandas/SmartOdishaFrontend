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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
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
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (subCategory) params.set('subCategory', subCategory)
    if (brand) params.set('brand', brand)
    if (store) params.set('store', store)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    const next = params.toString()
    const current = location.search.replace(/^\?/, '')
    if (next !== current) {
      navigate({ pathname: '/products', search: next ? `?${next}` : '' }, { replace: true })
    }
  }, [q, category, subCategory, brand, store, minPrice, maxPrice, navigate, location.search])

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
    const title = category ? `${categories.find(c => c._id === category)?.name || 'Category'} · Shop | SmartOdisha` : q ? `Search: ${q} | SmartOdisha` : 'Products | SmartOdisha'
    setSEO(title, 'Discover quality products with best prices, fast delivery across Odisha.')
  }, [q, category, categories])

  const filteredSorted = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val)
      return isNaN(num) || !isFinite(num) ? 0 : num
    }
    const getMinPrice = (p) => {
      const storePct = safeNumber(p?.store?.storePercentage ?? 0)
      const applyStore = (base) => base * (1 + storePct / 100)
      if (!Array.isArray(p.variants) || p.variants.length === 0) {
        return applyStore(safeNumber(p.originalStorePrice ?? p.price ?? 0))
      }
      const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.originalStorePrice ?? v.price ?? 0) > 0)
      if (activeVariants.length === 0) return applyStore(safeNumber(p.originalStorePrice ?? p.price ?? 0))
      return applyStore(Math.min(...activeVariants.map(v => safeNumber(v.originalStorePrice ?? v.price ?? 0))))
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

  const clearAllFilters = () => {
    setCategory('')
    setSubCategory('')
    setBrand('')
    setStore('')
    setMinPrice('')
    setMaxPrice('')
    setQ('')
  }

  const activeFilters = useMemo(() => {
    const chips = []
    if (category) chips.push({ key: 'category', label: categories.find(c => c._id === category)?.name || 'Category', clear: () => { setCategory(''); setSubCategory('') } })
    if (subCategory) chips.push({ key: 'subCategory', label: subCategories.find(s => s._id === subCategory)?.name || 'Subcategory', clear: () => setSubCategory('') })
    if (brand) chips.push({ key: 'brand', label: brands.find(b => b._id === brand)?.name || 'Brand', clear: () => setBrand('') })
    if (store) chips.push({ key: 'store', label: stores.find(s => s._id === store)?.name || 'Store', clear: () => setStore('') })
    if (minPrice) chips.push({ key: 'minPrice', label: `Min ₹${minPrice}`, clear: () => setMinPrice('') })
    if (maxPrice) chips.push({ key: 'maxPrice', label: `Max ₹${maxPrice}`, clear: () => setMaxPrice('') })
    if (q) chips.push({ key: 'q', label: `"${q}"`, clear: () => setQ('') })
    return chips
  }, [category, subCategory, brand, store, minPrice, maxPrice, q, categories, subCategories, brands, stores])

  const applyPricePreset = (min, max) => {
    setMinPrice(min !== null ? String(min) : '')
    setMaxPrice(max !== null ? String(max) : '')
  }

  return (
    <div className="ct-premium-wrapper">
      <style>{`
        .ct-premium-wrapper {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
          color: #0f172a;
          min-height: 100vh;
          padding: 12px 0 40px;
        }
        .ct-main-container {
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          gap: 12px;
          padding: 0 8px;
        }
        
        /* Sidebar - Premium SmartOdisha */
        .ct-sidebar {
          width: 280px;
          flex-shrink: 0;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(79, 70, 229, 0.06);
          border: 1px solid rgba(226, 232, 240, 0.8);
          height: fit-content;
          position: sticky;
          top: 12px;
          display: none;
        }
        @media (min-width: 1024px) {
          .ct-sidebar {
            display: block;
          }
        }
        .ct-sidebar-header {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ct-sidebar-title {
          font-size: 16px;
          font-weight: 700;
          color: #212121;
        }
        .ct-clear-link {
          font-size: 12px;
          color: #4f46e5;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: none;
        }
        .ct-filter-section {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        .ct-filter-lbl {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #212121;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }
        .ct-filter-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }
        .ct-filter-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #212121;
          cursor: pointer;
        }
        .ct-filter-item input {
          width: 15px;
          height: 15px;
          cursor: pointer;
          accent-color: #4f46e5;
        }
        .ct-price-inputs {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ct-price-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .ct-price-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
        }
        .ct-price-preset {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ct-price-preset:hover, .ct-price-preset.active {
          border-color: #4f46e5;
          background: #eef2ff;
          color: #4f46e5;
        }
        .ct-active-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 16px 12px;
        }
        .ct-filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          color: #4338ca;
        }
        .ct-filter-chip button {
          background: none;
          border: none;
          color: #6366f1;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0;
        }
        .ct-price-to {
          font-size: 12px;
          color: #878787;
        }

        /* Products Section Styles */
        .ct-content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        /* Top Search & Category Panel */
        .ct-top-panel {
          background: #ffffff;
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 4px 24px rgba(79, 70, 229, 0.06);
          border: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ct-search-row {
          display: flex;
          gap: 12px;
          align-items: center;
          position: relative;
        }
        .ct-search-box {
          flex: 1;
          position: relative;
        }
        .ct-search-input {
          width: 100%;
          padding: 11px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .ct-search-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
        .ct-mobile-filter-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 700;
          background: #ffffff;
          cursor: pointer;
        }
        @media (min-width: 1024px) {
          .ct-mobile-filter-trigger {
            display: none;
          }
        }
        
        .ct-category-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 2px;
        }
        .ct-category-chips::-webkit-scrollbar {
          display: none;
        }
        .ct-chip {
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #e0e0e0;
          background: #ffffff;
          color: #666666;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .ct-chip:hover {
          border-color: #4f46e5;
          color: #4f46e5;
        }
        .ct-chip.active {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          border-color: transparent;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
        }

        /* Results List Section */
        .ct-results-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 24px rgba(79, 70, 229, 0.06);
          border: 1px solid rgba(226, 232, 240, 0.8);
          min-height: 400px;
          display: flex;
          flex-direction: column;
        }
        .ct-results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ct-results-title {
          font-size: 16px;
          font-weight: 700;
          color: #212121;
        }
        .ct-results-count {
          font-size: 12px;
          color: #878787;
          font-weight: 500;
          margin-top: 2px;
        }
        .ct-sorting-widgets {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .ct-sort-label {
          font-size: 12px;
          font-weight: 700;
          color: #878787;
          text-transform: uppercase;
        }
        .ct-sort-select {
          padding: 6px 12px;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          font-size: 13px;
          font-weight: 600;
          color: #212121;
          outline: none;
          background: white;
          cursor: pointer;
        }

        /* Responsive Grid */
        .ct-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        @media (min-width: 640px) {
          .ct-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        @media (min-width: 1200px) {
          .ct-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
        }
        
        /* Suggest Box UI */
        .ct-suggest {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #ffffff;
          border-radius: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          z-index: 1000;
          border: 1px solid #e0e0e0;
          margin-top: 4px;
          max-height: 320px;
          overflow-y: auto;
        }
        .ct-suggest-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ct-suggest-item:hover {
          background: #f8fafc;
        }
        .ct-sug-thumb {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .ct-sug-thumb img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .ct-sug-name {
          font-size: 13px;
          font-weight: 600;
          color: #212121;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ct-sug-cat {
          font-size: 11px;
          color: #878787;
        }
        .ct-sug-fill {
          margin-left: auto;
          color: #c2c2c2;
        }

        /* Mobile Filter Modal */
        .ct-mobile-drawer {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 2000;
          display: flex;
          justify-content: flex-end;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .ct-mobile-drawer.open {
          opacity: 1;
          pointer-events: auto;
        }
        .ct-mobile-drawer-content {
          width: 85%;
          max-width: 320px;
          background: white;
          height: 100%;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
        }
        .ct-mobile-drawer.open .ct-mobile-drawer-content {
          transform: translateX(0);
        }

        .ct-load-btn {
          width: 100%;
          max-width: 240px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }
        .ct-load-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
          transform: translateY(-1px);
        }
      `}</style>

      <div className="ct-main-container">
        
        {/* Desktop Sidebar (Flipkart Filters Panel) */}
        <aside className="ct-sidebar">
          <div className="ct-sidebar-header">
            <span className="ct-sidebar-title">Filters</span>
            <button className="ct-clear-link" onClick={clearAllFilters}>CLEAR ALL</button>
          </div>

          {/* Categories */}
          <div className="ct-filter-section">
            <div className="ct-filter-lbl">Categories</div>
            <div className="ct-filter-list">
              <label className="ct-filter-item">
                <input
                  type="radio"
                  name="sidebar-cat"
                  checked={category === ''}
                  onChange={() => { setCategory(''); setSubCategory('') }}
                />
                <span>All Categories</span>
              </label>
              {categories.map(c => (
                <label key={c._id} className="ct-filter-item">
                  <input
                    type="radio"
                    name="sidebar-cat"
                    checked={category === c._id}
                    onChange={() => { setCategory(c._id); setSubCategory('') }}
                  />
                  <span>{capitalizeText(c.name)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Subcategories (Dynamic) */}
          {category && subCategories.length > 0 && (
            <div className="ct-filter-section">
              <div className="ct-filter-lbl">Subcategories</div>
              <div className="ct-filter-list">
                <label className="ct-filter-item">
                  <input
                    type="radio"
                    name="sidebar-subcat"
                    checked={subCategory === ''}
                    onChange={() => setSubCategory('')}
                  />
                  <span>All in Category</span>
                </label>
                {subCategories.map(s => (
                  <label key={s._id} className="ct-filter-item">
                    <input
                      type="radio"
                      name="sidebar-subcat"
                      checked={subCategory === s._id}
                      onChange={() => setSubCategory(s._id)}
                    />
                    <span>{capitalizeText(s.name)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Brands */}
          {brands.length > 0 && (
            <div className="ct-filter-section">
              <div className="ct-filter-lbl">Brand</div>
              <div className="ct-filter-list">
                <label className="ct-filter-item">
                  <input
                    type="radio"
                    name="sidebar-brand"
                    checked={brand === ''}
                    onChange={() => setBrand('')}
                  />
                  <span>All Brands</span>
                </label>
                {brands.map(b => (
                  <label key={b._id} className="ct-filter-item">
                    <input
                      type="radio"
                      name="sidebar-brand"
                      checked={brand === b._id}
                      onChange={() => setBrand(b._id)}
                    />
                    <span>{capitalizeText(b.name)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Stores */}
          {stores.length > 0 && (
            <div className="ct-filter-section">
              <div className="ct-filter-lbl">Sellers & Stores</div>
              <div className="ct-filter-list">
                <label className="ct-filter-item">
                  <input
                    type="radio"
                    name="sidebar-store"
                    checked={store === ''}
                    onChange={() => setStore('')}
                  />
                  <span>All Stores</span>
                </label>
                {stores.map(s => (
                  <label key={s._id} className="ct-filter-item">
                    <input
                      type="radio"
                      name="sidebar-store"
                      checked={store === s._id}
                      onChange={() => setStore(s._id)}
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Filters */}
          <div className="ct-filter-section">
            <div className="ct-filter-lbl">Price Range</div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" className={`ct-price-preset${!minPrice && !maxPrice ? ' active' : ''}`} onClick={() => applyPricePreset(null, null)}>All</button>
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(0, 500)}>Under ₹500</button>
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(500, 1000)}>₹500–₹1000</button>
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(1000, 2500)}>₹1000–₹2500</button>
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(2500, null)}>Above ₹2500</button>
            </div>
            <div className="ct-price-inputs">
              <input
                type="number"
                placeholder="Min ₹"
                className="ct-price-input"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
              />
              <span className="ct-price-to">to</span>
              <input
                type="number"
                placeholder="Max ₹"
                className="ct-price-input"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="ct-content-area">
          
          {/* Top Panel (Search & Mobile Filters) */}
          <div className="ct-top-panel">
            <div className="ct-search-row">
              <div className="ct-search-box">
                <input
                  ref={searchRef}
                  className="ct-search-input"
                  placeholder="Search for premium products, categories, stores..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {showSug && sug.length > 0 && <SuggestList items={sug} setQ={setQ} />}
              </div>
              
              <button 
                className="ct-mobile-filter-trigger"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M3 12h18M3 20h18"/></svg>
                Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
              </button>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="ct-active-filters">
                {activeFilters.map(chip => (
                  <span key={chip.key} className="ct-filter-chip">
                    {capitalizeText(chip.label)}
                    <button type="button" onClick={chip.clear} aria-label="Remove filter">×</button>
                  </span>
                ))}
                <button type="button" className="ct-clear-link" onClick={clearAllFilters}>Clear all</button>
              </div>
            )}

            {/* Category horizontal scrolling bar */}
            <div className="ct-category-chips">
              <button
                className={`ct-chip${category === '' ? ' active' : ''}`}
                onClick={() => { setCategory(''); setSubCategory('') }}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c._id}
                  className={`ct-chip${category === c._id ? ' active' : ''}`}
                  onClick={() => { setCategory(c._id); setSubCategory('') }}
                >
                  {capitalizeText(c.name)}
                </button>
              ))}
            </div>
          </div>

          {/* Results Block */}
          <div className="ct-results-card">
            
            <div className="ct-results-header">
              <div>
                <h1 className="ct-results-title">
                  {q ? `Results for "${q}"` : (subCategory ? subCategories.find(s => s._id === subCategory)?.name : (category ? categories.find(c => c._id === category)?.name : 'Shop Products'))}
                </h1>
                <div className="ct-results-count">
                  Showing {filteredSorted.length} of {total} products
                </div>
              </div>

              {/* Sorting options */}
              <div className="ct-sorting-widgets">
                <span className="ct-sort-label">Sort By:</span>
                <select
                  className="ct-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {filteredSorted.length === 0 && !loadingProducts ? (
              <div className="ct-empty" style={{ margin: 'auto', border: 'none', boxShadow: 'none' }}>
                <div className="ct-empty-icon">📦</div>
                <div className="ct-empty-title">No products matches found</div>
                <div className="ct-empty-desc">We couldn't find any items matching your filters. Try clearing some filters or search query to explore products.</div>
                <button 
                  className="ct-load-btn" 
                  style={{ marginTop: 20 }}
                  onClick={clearAllFilters}
                >
                  Reset Filters
                </button>
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
                  <div style={{ textAlign: 'center', marginTop: 32 }}>
                    <button
                      className="ct-load-btn"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Load More Products'}
                    </button>
                  </div>
                )}
              </>
            )}

          </div>

        </main>
      </div>

      {/* Mobile Filters Drawer Modal */}
      <div className={`ct-mobile-drawer${mobileFiltersOpen ? ' open' : ''}`} onClick={() => setMobileFiltersOpen(false)}>
        <div className="ct-mobile-drawer-content" onClick={e => e.stopPropagation()}>
          <div className="ct-sidebar-header">
            <span className="ct-sidebar-title">Filters</span>
            <button className="ct-clear-link" onClick={() => { clearAllFilters(); setMobileFiltersOpen(false); }}>RESET</button>
          </div>
          
          <div className="ct-filter-section">
            <div className="ct-filter-lbl">Category</div>
            <select
              className="ct-price-input"
              value={category}
              onChange={e => { setCategory(e.target.value); setSubCategory(''); }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{capitalizeText(c.name)}</option>
              ))}
            </select>
          </div>

          {category && subCategories.length > 0 && (
            <div className="ct-filter-section">
              <div className="ct-filter-lbl">Subcategory</div>
              <select
                className="ct-price-input"
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
              >
                <option value="">All in Category</option>
                {subCategories.map(s => (
                  <option key={s._id} value={s._id}>{capitalizeText(s.name)}</option>
                ))}
              </select>
            </div>
          )}

          {brands.length > 0 && (
            <div className="ct-filter-section">
              <div className="ct-filter-lbl">Brand</div>
              <select
                className="ct-price-input"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              >
                <option value="">All Brands</option>
                {brands.map(b => (
                  <option key={b._id} value={b._id}>{capitalizeText(b.name)}</option>
                ))}
              </select>
            </div>
          )}

          {stores.length > 0 && (
            <div className="ct-filter-section">
              <div className="ct-filter-lbl">Store / Seller</div>
              <select
                className="ct-price-input"
                value={store}
                onChange={e => setStore(e.target.value)}
              >
                <option value="">All Stores</option>
                {stores.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="ct-filter-section">
            <div className="ct-filter-lbl">Price Range</div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(0, 500)}>Under ₹500</button>
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(500, 1000)}>₹500–₹1000</button>
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(1000, 2500)}>₹1000–₹2500</button>
              <button type="button" className="ct-price-preset" onClick={() => applyPricePreset(2500, null)}>Above ₹2500</button>
            </div>
            <div className="ct-price-inputs" style={{ marginBottom: 12 }}>
              <input
                type="number"
                placeholder="Min ₹"
                className="ct-price-input"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
              />
              <span className="ct-price-to">to</span>
              <input
                type="number"
                placeholder="Max ₹"
                className="ct-price-input"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <button 
              className="ct-load-btn" 
              style={{ width: '100%', maxWidth: 'none' }}
              onClick={() => setMobileFiltersOpen(false)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
