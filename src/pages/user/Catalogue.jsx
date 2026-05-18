import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
import { useAuth } from '../../lib/AuthContext'
import { setSEO } from '../../shared/lib/seo.js'
import ProductCard from '../../components/ProductCard'

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

  if (loadingProducts && items.length === 0) return (
    <div style={{ padding: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '8px', height: '320px' }}></div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ background: '#f1f3f6', minHeight: '100vh', padding: '16px' }}>
      <style>{`
        .search-bar {
          max-width: 600px;
          margin: 0 auto 24px;
          position: relative;
        }
        .search-input {
          width: 100%;
          padding: 14px 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          background: white;
        }
        .search-input:focus {
          border-color: #2874f0;
          box-shadow: 0 0 0 3px rgba(40,116,240,0.1);
        }
        .category-chips {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin-bottom: 20px;
          padding-bottom: 4px;
        }
        .category-chip {
          padding: 10px 18px;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          background: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .category-chip:hover {
          border-color: #2874f0;
          color: #2874f0;
        }
        .category-chip.active {
          background: #2874f0;
          color: white;
          border-color: #2874f0;
        }
        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .product-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }
        @media (min-width: 1024px) {
          .product-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 1280px) {
          .product-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        .page-header {
          max-width: 1280px;
          margin: 0 auto 16px;
        }
        .page-title {
          font-size: 20px;
          font-weight: 600;
          color: #212121;
          margin-bottom: 8px;
        }
        .results-count {
          font-size: 14px;
          color: #878787;
        }
        .load-more {
          text-align: center;
          margin: 32px 0;
        }
        .load-more-btn {
          padding: 12px 40px;
          background: #2874f0;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .load-more-btn:hover {
          background: #1e5fcc;
        }
        .load-more-btn:disabled {
          background: #e0e0e0;
          cursor: not-allowed;
        }
        .empty-state {
          text-align: center;
          padding: 80px 20px;
        }
        .empty-ico {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .empty-title {
          font-size: 20px;
          font-weight: 600;
          color: #212121;
          margin-bottom: 8px;
        }
        .empty-desc {
          font-size: 14px;
          color: #878787;
          margin-bottom: 24px;
        }
      `}</style>

      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div className="search-bar">
          <div style={{ position: 'relative' }}>
            <input
              ref={searchRef}
              className="search-input"
              placeholder="Search for products..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {showSug && sug.length > 0 && <SuggestList items={sug} setQ={setQ} />}
          </div>
        </div>

        <div className="category-chips">
          <button
            className={`category-chip${category === '' ? ' active' : ''}`}
            onClick={() => { setCategory(''); setSubCategory('') }}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              className={`category-chip${category === c._id ? ' active' : ''}`}
              onClick={() => { setCategory(c._id); setSubCategory('') }}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="page-header">
          <h2 className="page-title">
            {q ? `Search results for "${q}"` : 'All Products'}
          </h2>
          <div className="results-count">
            {total} {total === 1 ? 'product' : 'products'} found
          </div>
        </div>

        {filteredSorted.length === 0 && !loadingProducts ? (
          <div className="empty-state">
            <div className="empty-ico">📦</div>
            <div className="empty-title">No products found</div>
            <div className="empty-desc">Try adjusting your search or filters</div>
          </div>
        ) : (
          <>
            <div className="product-grid">
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
              <div className="load-more">
                <button
                  className="load-more-btn"
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
