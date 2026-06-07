import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { getImageUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
import { useAuth } from '../../lib/AuthContext'
import { setSEO } from '../../shared/lib/seo.js'
import ProductCard from '../../components/ProductCard'
import LoadingSpinner from '../../components/LoadingSpinner'

/* ── Tiny icon helper (reuse same pattern as Profile) ── */
const Ico = ({ n, cls = 'w-5 h-5' }) => {
  const paths = {
    search:   'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    filter:   'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z',
    close:    'M6 18L18 6M6 6l12 12',
    chevD:    'M19 9l-7 7-7-7',
    chevR:    'M9 5l7 7-7 7',
    x:        'M6 18L18 6M6 6l12 12',
    sort:     'M3 7h18M6 12h12M9 17h6',
    pkg:      'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    tag:      'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
    store:    'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    arrow:    'M5 12h14M12 5l7 7-7 7',
    reset:    'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    grid2:    'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    grid3:    'M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z',
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      {paths[n]?.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  )
}

/* ── Suggest Dropdown ── */
function SuggestList({ items, setQ, onPick }) {
  const navigate = useNavigate()
  return (
    <div className="cat-suggest">
      {items.map((item, i) => (
        <div key={i} className="cat-sug-item"
          onClick={() => { setQ(item.name); onPick(); navigate(`/products/${item.id || item._id}`) }}>
          <div className="cat-sug-thumb">
            {item.image && <img src={getImageUrl(item.image, 200)} alt="" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cat-sug-name">{item.name}</div>
            {item.category?.name && <div className="cat-sug-cat">{item.category.name}</div>}
          </div>
          <Ico n="arrow" cls="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

/* ── Filter Section (sidebar) ── */
function FilterBlock({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="cat-filter-block">
      <button className="cat-filter-block-header" onClick={() => setOpen(!open)}>
        <span className="cat-filter-block-title">{title}</span>
        <Ico n="chevD" cls={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="cat-filter-block-body">{children}</div>}
    </div>
  )
}

/* ════ MAIN ════ */
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [gridCols, setGridCols] = useState(2) // mobile toggle: 2 or 1
  const searchRef = useRef(null)
  const limit = 20

  /* ── Data fetching ── */
  const fetchProducts = async ({ pageParam = 1 }) => {
    const { data } = await api.get('/api/products', {
      params: { q, page: pageParam, limit, brand: brand || undefined, category: category || undefined, subCategory: subCategory || undefined, store: store || undefined }
    })
    return data
  }

  const { data: productData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: loadingProducts } = useInfiniteQuery({
    queryKey: ['products', { q, brand, category, subCategory, store, limit, authed }],
    queryFn: fetchProducts,
    getNextPageParam: (last) => { const n = last.page + 1; return n <= Math.ceil(last.total / limit) ? n : undefined },
    staleTime: 1000 * 60 * 30
  })
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/api/brands', { params: { active: true } }).then(r => r.data || []), staleTime: 86400000 })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/api/categories', { params: { active: true } }).then(r => r.data || []), staleTime: 86400000 })
  const { data: subCategories = [] } = useQuery({ queryKey: ['subCategories', category], queryFn: () => category ? api.get('/api/subcategories', { params: { category, active: true } }).then(r => r.data || []) : [], staleTime: 86400000 })
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: () => api.get('/api/public/stores').then(r => r.data || []), staleTime: 86400000 })

  const items = useMemo(() => productData?.pages.flatMap(p => p.items) || [], [productData])
  const total = productData?.pages[0]?.total || 0

  /* ── URL sync ── */
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    if (p.get('category')) setCategory(p.get('category'))
    if (p.get('brand')) setBrand(p.get('brand'))
    if (p.get('subCategory')) setSubCategory(p.get('subCategory'))
    if (p.get('store')) setStore(p.get('store'))
    const qv = p.get('q') || p.get('search')
    if (qv) setQ(qv)
    if (p.get('minPrice')) setMinPrice(p.get('minPrice'))
    if (p.get('maxPrice')) setMaxPrice(p.get('maxPrice'))
  }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (category) p.set('category', category)
    if (subCategory) p.set('subCategory', subCategory)
    if (brand) p.set('brand', brand)
    if (store) p.set('store', store)
    if (minPrice) p.set('minPrice', minPrice)
    if (maxPrice) p.set('maxPrice', maxPrice)
    const next = p.toString()
    if (next !== location.search.replace(/^\?/, ''))
      navigate({ pathname: '/products', search: next ? `?${next}` : '' }, { replace: true })
  }, [q, category, subCategory, brand, store, minPrice, maxPrice])

  /* ── Suggestions ── */
  useEffect(() => {
    let t
    if (q.trim().length >= 2) {
      t = setTimeout(async () => {
        try { const { data } = await api.get('/api/products/suggest', { params: { q } }); setSug(data || []); setShowSug(true) }
        catch { setSug([]) }
      }, 250)
    } else { setSug([]); setShowSug(false) }
    return () => t && clearTimeout(t)
  }, [q])

  /* ── SEO ── */
  useEffect(() => {
    const title = category ? `${categories.find(c => c._id === category)?.name || 'Category'} · Shop | SmartOdisha` : q ? `Search: ${q} | SmartOdisha` : 'Products | SmartOdisha'
    setSEO(title, 'Discover quality products with best prices, fast delivery across Odisha.')
  }, [q, category, categories])

  /* ── Filter & sort ── */
  const filteredSorted = useMemo(() => {
    const safe = v => { const n = Number(v); return isNaN(n) || !isFinite(n) ? 0 : n }
    const getMin = (p) => {
      const pct = safe(p?.store?.storePercentage ?? 0)
      const apply = (b) => b * (1 + pct / 100)
      if (!Array.isArray(p.variants) || !p.variants.length) return apply(safe(p.originalStorePrice ?? p.price ?? 0))
      const active = p.variants.filter(v => v.isActive !== false && safe(v.originalStorePrice ?? v.price ?? 0) > 0)
      if (!active.length) return apply(safe(p.originalStorePrice ?? p.price ?? 0))
      return apply(Math.min(...active.map(v => safe(v.originalStorePrice ?? v.price ?? 0))))
    }
    let list = [...items]
    const mn = Number(minPrice), mx = Number(maxPrice)
    if (!isNaN(mn) && minPrice !== '') list = list.filter(p => getMin(p) >= mn)
    if (!isNaN(mx) && maxPrice !== '') list = list.filter(p => getMin(p) <= mx)
    if (sortBy === 'price-low') list.sort((a, b) => getMin(a) - getMin(b))
    else if (sortBy === 'price-high') list.sort((a, b) => getMin(b) - getMin(a))
    else list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return list
  }, [items, minPrice, maxPrice, sortBy])

  const cap = (t) => t?.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()) || ''

  const clearAll = () => { setCategory(''); setSubCategory(''); setBrand(''); setStore(''); setMinPrice(''); setMaxPrice(''); setQ('') }

  const activeFilters = useMemo(() => {
    const chips = []
    if (category) chips.push({ key: 'cat', label: categories.find(c => c._id === category)?.name || 'Category', clear: () => { setCategory(''); setSubCategory('') } })
    if (subCategory) chips.push({ key: 'sub', label: subCategories.find(s => s._id === subCategory)?.name || 'Subcategory', clear: () => setSubCategory('') })
    if (brand) chips.push({ key: 'br', label: brands.find(b => b._id === brand)?.name || 'Brand', clear: () => setBrand('') })
    if (store) chips.push({ key: 'st', label: stores.find(s => s._id === store)?.name || 'Store', clear: () => setStore('') })
    if (minPrice) chips.push({ key: 'mn', label: `Min ₹${minPrice}`, clear: () => setMinPrice('') })
    if (maxPrice) chips.push({ key: 'mx', label: `Max ₹${maxPrice}`, clear: () => setMaxPrice('') })
    if (q) chips.push({ key: 'q', label: `"${q}"`, clear: () => setQ('') })
    return chips
  }, [category, subCategory, brand, store, minPrice, maxPrice, q, categories, subCategories, brands, stores])

  const applyPrice = (mn, mx) => { setMinPrice(mn != null ? String(mn) : ''); setMaxPrice(mx != null ? String(mx) : '') }

  /* ── Filter panel shared content ── */
  const FilterPanelContent = () => (
    <>
      <FilterBlock title="Categories">
        <div className="cat-radio-list">
          <label className="cat-radio-item">
            <input type="radio" name="cat" checked={category === ''} onChange={() => { setCategory(''); setSubCategory('') }} />
            <span>All Categories</span>
          </label>
          {categories.map(c => (
            <label key={c._id} className="cat-radio-item">
              <input type="radio" name="cat" checked={category === c._id} onChange={() => { setCategory(c._id); setSubCategory('') }} />
              <span>{cap(c.name)}</span>
            </label>
          ))}
        </div>
      </FilterBlock>

      {category && subCategories.length > 0 && (
        <FilterBlock title="Subcategories">
          <div className="cat-radio-list">
            <label className="cat-radio-item"><input type="radio" name="sub" checked={subCategory === ''} onChange={() => setSubCategory('')} /><span>All</span></label>
            {subCategories.map(s => (
              <label key={s._id} className="cat-radio-item"><input type="radio" name="sub" checked={subCategory === s._id} onChange={() => setSubCategory(s._id)} /><span>{cap(s.name)}</span></label>
            ))}
          </div>
        </FilterBlock>
      )}

      {brands.length > 0 && (
        <FilterBlock title="Brand">
          <div className="cat-radio-list">
            <label className="cat-radio-item"><input type="radio" name="br" checked={brand === ''} onChange={() => setBrand('')} /><span>All Brands</span></label>
            {brands.map(b => (
              <label key={b._id} className="cat-radio-item"><input type="radio" name="br" checked={brand === b._id} onChange={() => setBrand(b._id)} /><span>{cap(b.name)}</span></label>
            ))}
          </div>
        </FilterBlock>
      )}

      {stores.length > 0 && (
        <FilterBlock title="Sellers & Stores">
          <div className="cat-radio-list">
            <label className="cat-radio-item"><input type="radio" name="st" checked={store === ''} onChange={() => setStore('')} /><span>All Stores</span></label>
            {stores.map(s => (
              <label key={s._id} className="cat-radio-item"><input type="radio" name="st" checked={store === s._id} onChange={() => setStore(s._id)} /><span>{s.name}</span></label>
            ))}
          </div>
        </FilterBlock>
      )}

      <FilterBlock title="Price Range">
        <div className="cat-price-presets">
          {[
            [null, null, 'All'],
            [0, 500, 'Under ₹500'],
            [500, 1000, '₹500–1K'],
            [1000, 2500, '₹1K–2.5K'],
            [2500, null, 'Above ₹2.5K'],
          ].map(([mn, mx, label]) => (
            <button key={label} type="button"
              onClick={() => applyPrice(mn, mx)}
              className={`cat-price-preset-btn ${!minPrice && !maxPrice && mn === null ? 'active' : (String(mn ?? '') === minPrice && String(mx ?? '') === maxPrice ? 'active' : '')}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="cat-price-row">
          <input type="number" placeholder="Min ₹" className="cat-price-inp" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          <span className="cat-price-sep">–</span>
          <input type="number" placeholder="Max ₹" className="cat-price-inp" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        </div>
      </FilterBlock>
    </>
  )

  /* ════ RENDER ════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        .cat-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          color: #0f172a;
        }
        .cat-display { font-family: 'Sora', system-ui, sans-serif; }

        @keyframes catFadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .cat-fade { animation: catFadeUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }

        /* ── Layout ── */
        .cat-layout {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 12px 60px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        /* ── Sticky Search Bar (top) ── */
        .cat-searchbar {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(248,250,252,0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226,232,240,0.7);
          padding: 10px 12px;
        }
        .cat-searchbar-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .cat-search-wrap {
          flex: 1;
          position: relative;
        }
        .cat-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .cat-search-inp {
          width: 100%;
          padding: 11px 16px 11px 42px;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          font-size: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 500;
          outline: none;
          background: #fff;
          color: #0f172a;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .cat-search-inp::placeholder { color: #94a3b8; }
        .cat-search-inp:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
        }
        .cat-filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 11px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          background: #fff;
          font-size: 13px;
          font-weight: 700;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          flex-shrink: 0;
        }
        .cat-filter-btn:hover { border-color: #7c3aed; color: #7c3aed; }
        .cat-filter-btn.has-filters { border-color: #7c3aed; background: #f5f3ff; color: #7c3aed; }
        .cat-filter-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: #7c3aed;
          color: #fff;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }
        @media (min-width: 1024px) { .cat-filter-btn { display: none; } }

        /* ── Suggest ── */
        .cat-suggest {
          position: absolute;
          top: calc(100% + 6px);
          left: 0; right: 0;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          z-index: 100;
          overflow: hidden;
          max-height: 300px;
          overflow-y: auto;
        }
        .cat-sug-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .cat-sug-item:hover { background: #f8fafc; }
        .cat-sug-thumb {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .cat-sug-thumb img { width: 100%; height: 100%; object-fit: contain; }
        .cat-sug-name { font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cat-sug-cat { font-size: 11px; color: #94a3b8; margin-top: 1px; }

        /* ── Sidebar ── */
        .cat-sidebar {
          width: 256px;
          flex-shrink: 0;
          display: none;
          position: sticky;
          top: 70px;
          max-height: calc(100vh - 90px);
          overflow-y: auto;
        }
        .cat-sidebar::-webkit-scrollbar { width: 4px; }
        .cat-sidebar::-webkit-scrollbar-track { background: transparent; }
        .cat-sidebar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        @media (min-width: 1024px) { .cat-sidebar { display: block; } }

        .cat-sidebar-card {
          background: #fff;
          border: 1px solid #e8ecf0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .cat-sidebar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid #f1f5f9;
        }
        .cat-sidebar-head-title {
          font-family: 'Sora', system-ui, sans-serif;
          font-weight: 800;
          font-size: 15px;
          color: #1e293b;
        }
        .cat-clear-btn {
          font-size: 11px;
          font-weight: 800;
          color: #7c3aed;
          background: none;
          border: none;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 8px;
          border-radius: 8px;
          transition: background 0.12s;
        }
        .cat-clear-btn:hover { background: #f5f3ff; }

        /* Filter blocks */
        .cat-filter-block { border-bottom: 1px solid #f1f5f9; }
        .cat-filter-block:last-child { border-bottom: none; }
        .cat-filter-block-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          transition: background 0.12s;
        }
        .cat-filter-block-header:hover { background: #fafafa; }
        .cat-filter-block-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #475569;
        }
        .cat-filter-block-body { padding: 0 18px 14px; }

        .cat-radio-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 180px;
          overflow-y: auto;
        }
        .cat-radio-list::-webkit-scrollbar { width: 3px; }
        .cat-radio-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .cat-radio-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          color: #334155;
          font-weight: 500;
          transition: background 0.12s;
        }
        .cat-radio-item:hover { background: #f8fafc; }
        .cat-radio-item input { accent-color: #7c3aed; width: 14px; height: 14px; cursor: pointer; flex-shrink: 0; }

        /* Price */
        .cat-price-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .cat-price-preset-btn {
          padding: 5px 10px;
          border-radius: 99px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.12s;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .cat-price-preset-btn:hover, .cat-price-preset-btn.active {
          border-color: #7c3aed;
          background: #f5f3ff;
          color: #7c3aed;
        }
        .cat-price-row { display: flex; align-items: center; gap: 8px; }
        .cat-price-inp {
          flex: 1;
          padding: 8px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 13px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 500;
          outline: none;
          background: #fff;
          color: #1e293b;
          transition: border-color 0.12s;
        }
        .cat-price-inp:focus { border-color: #7c3aed; }
        .cat-price-sep { color: #94a3b8; font-size: 13px; font-weight: 600; }

        /* ── Main content ── */
        .cat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }

        /* Category strip */
        .cat-cat-strip {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 0 6px;
          scrollbar-width: none;
        }
        .cat-cat-strip::-webkit-scrollbar { display: none; }
        .cat-cat-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 99px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
          font-family: 'DM Sans', system-ui, sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          flex-shrink: 0;
        }
        .cat-cat-chip:hover { border-color: #7c3aed; color: #7c3aed; background: #fafbff; }
        .cat-cat-chip.active {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 12px rgba(124,58,237,0.25);
        }

        /* Active filter chips */
        .cat-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .cat-active-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px 4px 12px;
          background: #f5f3ff;
          border: 1.5px solid #ddd6fe;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 700;
          color: #6d28d9;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .cat-active-chip-x {
          background: none;
          border: none;
          color: #a78bfa;
          cursor: pointer;
          font-size: 15px;
          line-height: 1;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.12s;
        }
        .cat-active-chip-x:hover { color: #7c3aed; }

        /* Results card */
        .cat-results-card {
          background: #fff;
          border: 1px solid #e8ecf0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .cat-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid #f1f5f9;
          flex-wrap: wrap;
        }
        .cat-results-title {
          font-family: 'Sora', system-ui, sans-serif;
          font-weight: 800;
          font-size: 16px;
          color: #1e293b;
        }
        .cat-results-count {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
          margin-top: 2px;
        }
        .cat-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cat-sort-select {
          padding: 7px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #334155;
          background: #fff;
          outline: none;
          cursor: pointer;
          transition: border-color 0.12s;
        }
        .cat-sort-select:focus { border-color: #7c3aed; }
        .cat-grid-toggle {
          display: flex;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }
        .cat-grid-toggle-btn {
          padding: 6px 9px;
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.12s;
          display: flex;
          align-items: center;
        }
        .cat-grid-toggle-btn.active { background: #f5f3ff; color: #7c3aed; }
        @media (min-width: 640px) { .cat-grid-toggle { display: none; } }

        /* Product grid */
        .cat-grid {
          display: grid;
          gap: 1px;
          background: #f1f5f9;
        }
        .cat-grid.cols-1 { grid-template-columns: 1fr; }
        .cat-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 500px) { .cat-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (min-width: 768px) { .cat-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 1200px) { .cat-grid { grid-template-columns: repeat(4, 1fr) !important; } }
        .cat-grid > * { background: #fff; }

        /* Load more */
        .cat-load-more {
          display: flex;
          justify-content: center;
          padding: 24px 18px;
          border-top: 1px solid #f1f5f9;
        }
        .cat-load-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 16px rgba(124,58,237,0.25);
          letter-spacing: 0.2px;
        }
        .cat-load-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.3); }
        .cat-load-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Empty state */
        .cat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          gap: 12px;
          text-align: center;
        }
        .cat-empty-icon { font-size: 48px; line-height: 1; }
        .cat-empty-title { font-family: 'Sora', system-ui, sans-serif; font-weight: 800; font-size: 18px; color: #1e293b; }
        .cat-empty-desc { font-size: 14px; color: #94a3b8; max-width: 300px; line-height: 1.6; }

        /* ── Mobile bottom filter drawer ── */
        .cat-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.5);
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s;
          backdrop-filter: blur(2px);
        }
        .cat-drawer-overlay.open { opacity: 1; pointer-events: auto; }
        .cat-drawer {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: #fff;
          border-radius: 24px 24px 0 0;
          z-index: 201;
          max-height: 85vh;
          overflow-y: auto;
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
        }
        .cat-drawer.open { transform: translateY(0); }
        .cat-drawer::-webkit-scrollbar { width: 0; }
        .cat-drawer-handle {
          width: 40px; height: 4px;
          background: #e2e8f0;
          border-radius: 99px;
          margin: 12px auto 0;
        }
        .cat-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px 12px;
          border-bottom: 1px solid #f1f5f9;
          position: sticky;
          top: 0;
          background: #fff;
          z-index: 1;
        }
        .cat-drawer-title {
          font-family: 'Sora', system-ui, sans-serif;
          font-weight: 800;
          font-size: 16px;
          color: #1e293b;
        }
        .cat-drawer-apply {
          padding: 16px 20px;
          position: sticky;
          bottom: 0;
          background: #fff;
          border-top: 1px solid #f1f5f9;
        }
        .cat-drawer-apply-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          border: none;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 800;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(124,58,237,0.25);
          transition: all 0.15s;
          letter-spacing: 0.2px;
        }
        .cat-drawer-apply-btn:active { transform: scale(0.98); }
      `}</style>

      <div className="cat-root">
        {/* ── Sticky top searchbar ── */}
        <div className="cat-searchbar">
          <div className="cat-searchbar-inner">
            <div className="cat-search-wrap">
              <span className="cat-search-icon"><Ico n="search" cls="w-4 h-4" /></span>
              <input
                ref={searchRef}
                className="cat-search-inp"
                placeholder="Search products, brands, categories…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onFocus={() => sug.length && setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
              />
              {showSug && sug.length > 0 && <SuggestList items={sug} setQ={setQ} onPick={() => setShowSug(false)} />}
            </div>
            <button
              className={`cat-filter-btn ${activeFilters.length > 0 ? 'has-filters' : ''}`}
              onClick={() => setDrawerOpen(true)}>
              <Ico n="filter" cls="w-4 h-4" />
              Filters
              {activeFilters.length > 0 && <span className="cat-filter-badge">{activeFilters.length}</span>}
            </button>
          </div>
        </div>

        <div className="cat-layout">
          {/* ── Desktop Sidebar ── */}
          <aside className="cat-sidebar">
            <div className="cat-sidebar-card">
              <div className="cat-sidebar-head">
                <span className="cat-sidebar-head-title cat-display">Filters</span>
                {activeFilters.length > 0 && (
                  <button className="cat-clear-btn" onClick={clearAll}>Clear all</button>
                )}
              </div>
              <FilterPanelContent />
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="cat-main">
            {/* Category strip */}
            <div className="cat-cat-strip">
              <button
                className={`cat-cat-chip ${category === '' ? 'active' : ''}`}
                onClick={() => { setCategory(''); setSubCategory('') }}>
                All
              </button>
              {categories.map(c => (
                <button key={c._id}
                  className={`cat-cat-chip ${category === c._id ? 'active' : ''}`}
                  onClick={() => { setCategory(c._id); setSubCategory('') }}>
                  {cap(c.name)}
                </button>
              ))}
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="cat-chip-row cat-fade">
                {activeFilters.map(chip => (
                  <span key={chip.key} className="cat-active-chip">
                    {cap(chip.label)}
                    <button className="cat-active-chip-x" onClick={chip.clear} aria-label="Remove">
                      <Ico n="x" cls="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
                  onClick={clearAll}>Clear all</button>
              </div>
            )}

            {/* Results card */}
            <div className="cat-results-card">
              <div className="cat-results-header">
                <div>
                  <h1 className="cat-results-title cat-display">
                    {q ? `Results for "${q}"` : (subCategory ? subCategories.find(s => s._id === subCategory)?.name : (category ? categories.find(c => c._id === category)?.name : 'All Products'))}
                  </h1>
                  <div className="cat-results-count">
                    {loadingProducts ? 'Loading…' : `${filteredSorted.length} of ${total} products`}
                  </div>
                </div>
                <div className="cat-header-right">
                  {/* Mobile grid toggle */}
                  <div className="cat-grid-toggle">
                    <button className={`cat-grid-toggle-btn ${gridCols === 2 ? 'active' : ''}`} onClick={() => setGridCols(2)}>
                      <Ico n="grid2" cls="w-4 h-4" />
                    </button>
                    <button className={`cat-grid-toggle-btn ${gridCols === 1 ? 'active' : ''}`} onClick={() => setGridCols(1)}>
                      <Ico n="sort" cls="w-4 h-4" />
                    </button>
                  </div>
                  <select className="cat-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low → High</option>
                    <option value="price-high">Price: High → Low</option>
                  </select>
                </div>
              </div>

              {/* Grid or loading or empty */}
              {loadingProducts ? (
                <div style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center' }}>
                  <LoadingSpinner text="Loading products…" />
                </div>
              ) : filteredSorted.length === 0 ? (
                <div className="cat-empty">
                  <div className="cat-empty-icon">📦</div>
                  <div className="cat-empty-title cat-display">No products found</div>
                  <div className="cat-empty-desc">Try adjusting your filters or search query to find what you're looking for.</div>
                  <button className="cat-load-btn" style={{ marginTop: 8 }} onClick={clearAll}>
                    <Ico n="reset" cls="w-4 h-4" /> Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className={`cat-grid cols-${gridCols}`}>
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
                    <div className="cat-load-more">
                      <button className="cat-load-btn" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                        {isFetchingNextPage
                          ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Loading…</>
                          : <><Ico n="pkg" cls="w-4 h-4" /> Load More Products</>
                        }
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>

        {/* ── Mobile Filter Drawer (bottom sheet) ── */}
        <div className={`cat-drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} />
        <div className={`cat-drawer ${drawerOpen ? 'open' : ''}`}>
          <div className="cat-drawer-handle" />
          <div className="cat-drawer-head">
            <span className="cat-drawer-title cat-display">Filters</span>
            {activeFilters.length > 0 && (
              <button className="cat-clear-btn" onClick={() => { clearAll(); setDrawerOpen(false) }}>Reset all</button>
            )}
          </div>
          <FilterPanelContent />
          <div className="cat-drawer-apply">
            <button className="cat-drawer-apply-btn" onClick={() => setDrawerOpen(false)}>
              Apply Filters {activeFilters.length > 0 ? `(${activeFilters.length} active)` : ''}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  )
}