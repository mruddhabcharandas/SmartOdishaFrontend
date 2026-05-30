import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart, getStockStatus } from '../../lib/CartContext'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'
import { useToast } from '../../components/Toast'
import RecommendationModal from '../../components/RecommendationModal'
import ProductCard from '../../components/ProductCard'
import { useAuth } from '../../lib/AuthContext'

function sortVariantValues(lowKey, values) {
  const arr = [...values]
  const storageLike = /ram|rom|storage|memory|capacity|variant|model/i.test(lowKey) && !/screen|display|camera|inch|hz|refresh/i.test(lowKey)
  if (storageLike) {
    return arr.sort((a, b) => {
      const na = parseFloat(String(a).replace(/[^\d.]/g, '')) || 0
      const nb = parseFloat(String(b).replace(/[^\d.]/g, '')) || 0
      if (na !== nb) return na - nb
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
    })
  }
  return arr.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }))
}

function variantAttrIconEmoji(lowKey) {
  const k = String(lowKey || '').toLowerCase()
  if (k === 'option') return '🛒'
  if (k.includes('color') || k.includes('colour') || k === 'finish' || k.includes('shade')) return '🎨'
  if (k.includes('ram')) return '🧠'
  if (k.includes('rom') || k.includes('storage') || k.includes('memory')) return '💾'
  if (k.includes('size') && !k.includes('screen')) return '📏'
  if (k.includes('watt') || k.includes('power')) return '⚡'
  if (k.includes('material')) return '🧵'
  if (k.includes('model') || k.includes('variant')) return '📱'
  if (k.includes('screen') || k.includes('display')) return '🖥'
  return '🔧'
}

export default function ProductDetail() {
  const { idOrSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { addToCart, refreshCart } = useCart()
  const { notify } = useToast()
  const { user } = useAuth()

  const { data: p, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['product', idOrSlug, user?._id],
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

  const normalizeAttrs = (attrs, sku = '', productAttributes = []) => {
    const result = {}
    if (attrs && typeof attrs === 'object') {
      const obj = attrs instanceof Map ? Object.fromEntries(attrs) : attrs
      Object.entries(obj).forEach(([k, v]) => {
        if (k && k !== 'sku') result[k.toLowerCase().trim()] = String(v || '').trim()
      })
    }

    const targetSku = sku || (attrs && typeof attrs === 'object' ? attrs.sku : null);
    if (Object.keys(result).length === 0 && targetSku) {
      const parts = String(targetSku).split('-').map(s => s.trim()).filter(Boolean);
      const attrKeys = (Array.isArray(productAttributes) ? productAttributes : [])
        .map(a => a.split(':')[0]?.toLowerCase().trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        if (attrKeys.length > 0) {
          attrKeys.forEach((key, idx) => {
            if (parts[idx + 1]) result[key] = parts[idx + 1].toLowerCase();
          });
        } else {
          result.model = parts[1].toLowerCase();
          if (parts.length >= 3) {
            result.variant = parts.slice(2).join('-').toLowerCase();
          }
        }
      }
    }
    return result
  }

  const [error, setError] = useState(null)
  const [selected, setSelected] = useState({})
  const [imgLoading, setImgLoading] = useState(true)
  const [activeVariant, setActiveVariant] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 })
  const [recOpen, setRecOpen] = useState(false)
  const [recItems, setRecItems] = useState([])
  const [qty, setQty] = useState(1)
  const [pincode, setPincode] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(null)
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 })
  const [kycData, setKycData] = useState(null)
  const [kycLoading, setKycLoading] = useState(false)
  const [hlSpecTab, setHlSpecTab] = useState('highlights')
  const authed = !!localStorage.getItem('token')

  const variantAttrs = useMemo(() => {
    if (!p) return []
    const ordered = []
    const seen = new Set()
    const add = (rawKey) => {
      if (!rawKey || typeof rawKey !== 'string') return
      const lk = rawKey.toLowerCase().trim()
      if (!lk || seen.has(lk)) return
      seen.add(lk)
      ordered.push(rawKey.trim())
    }

    const attrs = Array.isArray(p.attributes) ? p.attributes : []
    attrs.forEach(a => {
      const parts = a.split(':')
      if (parts[0]) add(parts[0].trim())
    })

    const extras = []
    if (Array.isArray(p.variants)) {
      p.variants.forEach(v => {
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)
        Object.keys(vAttrs || {}).forEach(k => {
          if (!k || typeof k !== 'string') return
          const lk = k.toLowerCase().trim()
          if (!seen.has(lk)) extras.push(k.trim())
        })
      })
    }
    const uniqExtra = [...new Map(extras.map(e => [e.toLowerCase().trim(), e])).values()]
    uniqExtra.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    uniqExtra.forEach(add)

    if (ordered.length === 0 && Array.isArray(p.variants) && p.variants.length > 0) return ['Option']
    return ordered
  }, [p])

  const matchedVariant = useMemo(() => {
    if (!p || !p.variants || !Array.isArray(p.variants) || !p.variants.length) return null

    if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') {
      const val = selected['option'];
      if (!val) return null;
      return p.variants.find(v => v.isActive !== false && (v.sku === val || v._id === val)) || null;
    }

    return p.variants.find(v => {
      if (v.isActive === false) return false
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)

      return variantAttrs.every(attr => {
        const lowAttr = attr.toLowerCase().trim()
        const val = selected[lowAttr];
        if (!val) return false;

        let match = false;
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowAttr && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) {
            match = true;
          }
        });
        return match;
      })
    })
  }, [p, selected, variantAttrs])

  useEffect(() => {
    setImgLoading(true)
  }, [activeImg, activeVariant, matchedVariant])

  const imgs = useMemo(() => {
    if (matchedVariant?.images?.length > 0) return matchedVariant.images
    return Array.isArray(p?.images) ? p.images : []
  }, [p, matchedVariant])

  const touchImgRef = useRef({ x0: 0, y0: 0, active: false })
  const skipMainImgClickRef = useRef(false)

  const onMainImgTouchStart = useCallback((e) => {
    if (imgs.length <= 1) return
    const t = e.touches[0]
    touchImgRef.current = { x0: t.clientX, y0: t.clientY, active: true }
  }, [imgs.length])

  const onMainImgTouchEnd = useCallback((e) => {
    if (!touchImgRef.current.active || imgs.length <= 1) return
    touchImgRef.current.active = false
    const t = e.changedTouches[0]
    const dx = t.clientX - touchImgRef.current.x0
    const dy = t.clientY - touchImgRef.current.y0
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.15) return
    skipMainImgClickRef.current = true
    window.setTimeout(() => { skipMainImgClickRef.current = false }, 450)
    if (dx < 0) setActiveImg(i => Math.min(imgs.length - 1, i + 1))
    else setActiveImg(i => Math.max(0, i - 1))
  }, [imgs.length])

  const onMainImgTouchCancel = useCallback(() => {
    touchImgRef.current.active = false
  }, [])

  const onMainImgClick = useCallback(() => {
    if (skipMainImgClickRef.current) return
    setLightbox(true)
  }, [])

  useEffect(() => {
    if (!authed) return
    setKycLoading(true)
    api.get('/api/user/me').then(({ data }) => {
      const kyc = data.kyc || {}
      if (kyc.pincode) {
        setPincode(kyc.pincode); setKycData(kyc)
        const days = 2 + (Number(kyc.pincode[0]) % 4)
        const d = new Date(); d.setDate(d.getDate() + days)
        setDeliveryDate(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' }))
      }
    }).catch(() => { }).finally(() => setKycLoading(false))
  }, [authed])

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date(), co = new Date()
      co.setHours(18, 0, 0, 0)
      let diff = co - now
      if (diff < 0) { co.setDate(co.getDate() + 1); diff = co - now }
      setCountdown({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const checkDelivery = (e) => {
    e?.preventDefault()
    if (pincode.length !== 6) return
    const days = 2 + (Number(pincode[0]) % 4)
    const d = new Date(); d.setDate(d.getDate() + days)
    setDeliveryDate(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' }))
  }

  useEffect(() => {
    if (p) {
      const packSize = Number(p.packSize || 1)
      const minQty = Math.max(1, Number(p.minOrderQty || 1))
      const initialQty = Math.ceil(minQty / packSize) * packSize
      setQty(initialQty)
      setError(null)
    }
    if (queryError) {
      const msg = queryError?.response?.data?.error || queryError.message || 'Product not found'
      setError(msg === 'not_found' ? 'This product is no longer available.' : msg)
    }
  }, [p, queryError])

  useEffect(() => {
    if (!p) return
    const hasH = Array.isArray(p.highlights) && p.highlights.length > 0
    const hasS = Array.isArray(p.specifications) && p.specifications.length > 0
    if (hasH) setHlSpecTab('highlights')
    else if (hasS) setHlSpecTab('specs')
  }, [p?._id])

  useEffect(() => {
    if (!p || !Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return }

    const params = new URLSearchParams(location.search)
    const initialSelected = {}
    let hasParams = false
    variantAttrs.forEach(attr => {
      const lowAttr = attr.toLowerCase().trim()
      const val = params.get(lowAttr)
      if (val) {
        initialSelected[lowAttr] = val
        hasParams = true
      }
    })

    if (hasParams) {
      setSelected(initialSelected)
      return
    }

    if (Object.keys(selected).length === 0) {
      const bestVariant = [...p.variants]
        .filter(v => v.isActive !== false)
        .sort((a, b) => (b.stock || 0) - (a.stock || 0))[0]

      if (bestVariant) {
        if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') {
          setSelected({ option: bestVariant.sku || bestVariant._id });
        } else {
          setSelected(normalizeAttrs(bestVariant.attributes, bestVariant.sku))
        }
      }
    }
  }, [p, variantAttrs])

  useEffect(() => {
    if (!p) return
    const params = new URLSearchParams(location.search)
    let changed = false
    Object.entries(selected).forEach(([k, v]) => {
      if (v && params.get(k) !== v) {
        params.set(k, v)
        changed = true
      }
    })
    const selectedKeys = Object.keys(selected)
    const paramsKeys = Array.from(params.keys())
    paramsKeys.forEach(pk => {
      if (!selectedKeys.includes(pk)) {
        params.delete(pk)
        changed = true
      }
    })

    if (changed) {
      navigate({ search: params.toString() }, { replace: true })
    }
  }, [selected, p, navigate, location.search])

  useEffect(() => {
    if (!p || !Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return }

    const v = p.variants.find(v => {
      if (v.isActive === false) return false
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)
      return variantAttrs.every(k => {
        const lk = k.toLowerCase().trim()
        const val = selected[lk];
        if (!val) return true;
        return String(vAttrs[lk] || '').toLowerCase() === String(val || '').toLowerCase()
      })
    }) || null

    if (!v && Object.keys(selected).length > 0) {
      let currentMatch = null
      for (let i = variantAttrs.length; i > 0; i--) {
        const subAttrs = variantAttrs.slice(0, i)
        const partialMatch = p.variants.find(vx => {
          if (vx.isActive === false) return false
          const vxAttrs = normalizeAttrs(vx.attributes, vx.sku, p.attributes)
          return subAttrs.every(k => {
            const lk = k.toLowerCase().trim()
            return String(vxAttrs[lk] || '').toLowerCase() === String(selected[lk] || '').toLowerCase()
          })
        })
        if (partialMatch) {
          currentMatch = partialMatch
          break
        }
      }

      if (currentMatch) {
        setSelected(normalizeAttrs(currentMatch.attributes, currentMatch.sku, p.attributes))
        return
      }
    }

    setActiveVariant(v);
    if (v) setActiveImg(0)
  }, [selected, p, variantAttrs])

  useEffect(() => {
    if (!p) return
    setSEO(`${p.name} | SmartOdisha`, `Buy ${p.name} at best prices with fast delivery across Odisha.`)
    const cleanup = injectJsonLd({
      "@context": "https://schema.org/", "@type": "Product", "name": p.name,
      "brand": { "@type": "Brand", "name": p.brand?.name || p.brand || "SmartOdisha" },
      "image": (p.images || []).map(i => i.url).filter(Boolean), "category": p.category?.name || p.category || "General",
      "offers": {
        "@type": "Offer", "priceCurrency": "INR", "price": String(p.price || 0),
        "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", "url": `${window.location.origin}/products/${p.slug || p._id}`
      },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": String(p.ratingAvg || 0), "reviewCount": String(p.ratingCount || 0) }
    })
    return cleanup
  }, [p])

  const variantOpts = (key) => {
    const set = new Set()
    const lowKey = key.toLowerCase().trim()

    if (lowKey === 'option' && Array.isArray(p?.variants)) {
      p.variants.forEach(v => {
        if (v.isActive !== false) set.add(v.sku || v._id)
      })
      return sortVariantValues(lowKey, Array.from(set))
    }

    const attrEntry = (p?.attributes || []).find(a => {
      const parts = a.split(':');
      return parts[0]?.toLowerCase().trim() === lowKey;
    })
    if (attrEntry) {
      const vals = attrEntry.split(':')[1]?.split(',').filter(Boolean) || []
      vals.forEach(v => set.add(v.trim()))
    }

    if (p?.variants?.length) {
      p.variants.forEach(v => {
        if (v.isActive === false) return;
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowKey && vv) {
            set.add(vv.trim())
          }
        })
      })
    }
    return sortVariantValues(lowKey, Array.from(set))
  }

  const isOptEnabled = (key, val) => {
    if (!p?.variants?.length) return true
    const lowKey = key.toLowerCase().trim()

    if (lowKey === 'option') {
      return p.variants.some(v => v.isActive !== false && v.stock > 0 && (v.sku === val || v._id === val));
    }

    const otherSelections = { ...selected };
    delete otherSelections[lowKey];

    return p.variants.some(v => {
      if (v.isActive === false || v.stock <= 0) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)

      let matchVal = false;
      Object.entries(vAttrs).forEach(([vk, vv]) => {
        if (vk.toLowerCase().trim() === lowKey && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) {
          matchVal = true;
        }
      });

      if (matchVal) {
        return Object.entries(otherSelections).every(([ok, ov]) => {
          if (!ov) return true;
          let matchOther = false;
          Object.entries(vAttrs).forEach(([vk, vv]) => {
            if (vk.toLowerCase().trim() === ok.toLowerCase().trim() && String(vv || '').toLowerCase().trim() === String(ov || '').toLowerCase().trim()) {
              matchOther = true;
            }
          });
          return matchOther;
        });
      }
      return false;
    });
  }

  const currentPrice = matchedVariant?.price ?? p?.price
  const currentMrp = matchedVariant?.mrp ?? p?.mrp
  const currentStock = matchedVariant?.stock ?? p?.stock
  const currentSku = matchedVariant?.sku
  const isAvailable = currentStock > 0

  const canAddToCart = variantAttrs.every(attr => !!selected[attr.toLowerCase().trim()]) && !!matchedVariant && isAvailable

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

  const discount = displayMrp > minPrice ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0

  const totalStock = Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p.stock || 0)

  const stockStRaw = getStockStatus(currentStock ?? totalStock)
  const stockSt = { ...stockStRaw, text: stockStRaw.text.includes('Only') ? 'Limited Stock' : stockStRaw.text }

  const hasHighlights = Array.isArray(p.highlights) && p.highlights.length > 0
  const hasSpecifications = Array.isArray(p.specifications) && p.specifications.length > 0
  const showHighlightsBlock = hasHighlights && (hlSpecTab === 'highlights' || !hasSpecifications)
  const showSpecificationsBlock = hasSpecifications && (hlSpecTab === 'specs' || !hasHighlights)

  const handleAddToCart = async () => {
    if (!authed) { navigate('/login', { state: { from: location.pathname + location.search } }); return }
    if (variantAttrs.length > 0 && !matchedVariant) {
      notify('Please select all options', 'error')
      return
    }
    if (matchedVariant && matchedVariant.stock <= 0) {
      notify('This variant is out of stock', 'error')
      return
    }

    const cartProduct = {
      productId: p._id,
      sku: matchedVariant?.sku || p.sku,
      quantity: qty
    };

    const ok = await addToCart({ ...p, minOrderQty: 1 }, matchedVariant || undefined)
    if (ok) {
      await refreshCart()
      try {
        const { data } = await api.get(`/api/recommendations/frequently-bought/${p._id}`)
        const filtered = (data || []).filter(item => (item._id || item.id) !== p._id)
        setRecItems(filtered)
        if (filtered.length > 0) setRecOpen(true)
      } catch { }
    }
  }

  if (error) return (
    <div className="pd-error-root" style={{ fontFamily: 'system-ui, sans-serif', background: '#f5f3ff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,.05)', border: '1px solid rgba(124,58,237,.1)', maxWidth: '400px', width: '100%' }}>
        <span style={{ fontSize: '40px', marginBottom: '20px', display: 'block' }}>🛍️</span>
        <h2 style={{ marginBottom: '10px' }}>Oops!</h2>
        <p style={{ marginBottom: '24px' }}>{error}</p>
        <Link to="/products" style={{ background: '#7c3aed', color: 'white', padding: '12px 24px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.1em', textDecoration: 'none', display: 'inline-block', transition: 'all .2s' }}>Back to Catalogue</Link>
      </div>
    </div>
  )

  if (!p) return (
    <div className="pd-skel-root" style={{ fontFamily: 'system-ui, sans-serif', background: '#f5f3ff', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
        <div style={{ aspectRatio: '1/1', background: 'white', borderRadius: '32px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(124,58,237,.1)' }}></div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        .pd {
          font-family: 'Outfit', system-ui, sans-serif;
          background: linear-gradient(180deg, #faf9ff 0%, #f3f0ff 38%, #ebe7f7 100%);
          color: #1e1b2e;
          min-height: 100vh; overflow-x: hidden;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        
        .pd-wrap { max-width: 1260px; margin: 0 auto; padding: 24px 16px 60px; position: relative; z-index: 1; }
        @media (min-width: 768px) { .pd-wrap { padding: 28px 24px 80px; } }
        
        .pd-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 900px) {
          .pd-grid { grid-template-columns: 460px 1fr; gap: 40px; align-items: start; }
        }
        
        @media (min-width: 900px) {
          .pd-info {
            background: rgba(255,255,255,.78);
            backdrop-filter: blur(20px) saturate(160%);
            border: 1px solid rgba(255,255,255,.85);
            border-radius: 28px;
            padding: 28px 26px 32px;
            box-shadow: 0 20px 50px -12px rgba(76,29,149,.12), 0 8px 24px -8px rgba(15,23,42,.06);
          }
        }
        
        .pd-img-main {
          background: linear-gradient(145deg, #ffffff 0%, #faf9ff 50%, #f5f3ff 100%);
          border: 1px solid rgba(124,58,237,.12);
          border-radius: 28px; overflow: hidden; aspect-ratio: 1;
          position: relative; cursor: zoom-in;
          display: flex; align-items: center; justify-content: center;
          touch-action: pan-y;
          user-select: none;
          transition: box-shadow .4s cubic-bezier(.34,1.2,.64,1), border-color .3s, transform .35s;
          box-shadow: 0 12px 40px -8px rgba(76,29,149,.15), 0 4px 16px rgba(124,58,237,.08);
        }
        .pd-img-main:hover {
          box-shadow: 0 24px 56px -10px rgba(76,29,149,.22), 0 8px 24px rgba(124,58,237,.12);
          border-color: rgba(124,58,237,.28);
          transform: translateY(-2px);
        }
        
        .pd-thumbs { display: flex; gap: 8px; padding: 12px 0 24px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid rgba(124,58,237,.05); margin-bottom: 24px; }
        .pd-thumbs::-webkit-scrollbar { display: none; }
        .pd-thumb {
          width: 68px; height: 68px; flex-shrink: 0; background: white;
          border: 2px solid rgba(124,58,237,.1);
          border-radius: 12px; overflow: hidden; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all .2s; padding: 6px;
        }
        .pd-thumb.on { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
        
        .pd-variants {
          display: flex; flex-direction: column; gap: 28px;
          margin-top: 24px; padding: 32px 26px;
          background: rgba(255,255,255,.65);
          backdrop-filter: blur(24px);
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,.8);
          box-shadow: 0 16px 40px -8px rgba(124,58,237,.12), inset 0 1px 1px rgba(255,255,255,1);
          position: relative; z-index: 10; overflow: hidden;
        }
        
        .pd-var-sec { display: flex; flex-direction: column; gap: 14px; }
        .pd-var-header { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .pd-var-lbl { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.03em; }
        .pd-var-icon {
          width: 28px; height: 28px; background: rgba(124,58,237,.08);
          border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px;
        }
        .pd-var-name { text-transform: uppercase; font-weight: 800; color: #6b7280; letter-spacing: 0.06em; font-size: 11px; }
        .pd-var-selected {
          color: #7c3aed; font-weight: 800; padding: 4px 12px; border-radius: 20px; background: rgba(124,58,237,.08);
        }
        
        .pd-var-opts { display: flex; flex-wrap: wrap; gap: 10px; align-items: stretch; }
        .pd-var-opts.has-many { flex-wrap: nowrap; overflow-x: auto; gap: 10px; padding: 4px 2px 12px; margin: 0 -2px; scroll-snap-type: x proximity; scrollbar-width: thin; }
        .pd-var-opts.has-many::-webkit-scrollbar { height: 5px; }
        .pd-var-opts.has-many::-webkit-scrollbar-track { background: rgba(124,58,237,.06); border-radius: 100px; }
        .pd-var-opts.has-many::-webkit-scrollbar-thumb { background: rgba(124,58,237,.35); border-radius: 100px; }
        
        .pd-var-btn {
          min-width: 80px; padding: 14px 24px; background: rgba(255,255,255,.8);
          border: 1.5px solid rgba(124,58,237,.1); border-radius: 18px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; position: relative; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.015); overflow: hidden;
        }
        .pd-var-btn:hover:not(.disabled):not(.on) { border-color: rgba(124,58,237,.4); background: rgba(255,255,255,.95); transform: translateY(-3px); box-shadow: 0 12px 24px -6px rgba(124,58,237,.15); }
        .pd-var-btn.on {
          background: linear-gradient(135deg, #7c3aed, #5b21b6); border-color: #7c3aed;
          box-shadow: 0 12px 32px -8px rgba(124,58,237,.4), inset 0 1px 1px rgba(255,255,255,.2);
          transform: translateY(-2px);
        }
        .pd-var-btn.on .pd-var-val { color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .pd-var-btn.on .pd-var-price { color: rgba(255,255,255,.85); }
        .pd-var-val { font-size: 14px; font-weight: 800; color: #1e1b2e; transition: color 0.3s; position: relative; z-index: 2; }
        .pd-var-price { font-size: 11px; font-weight: 700; color: #7c3aed; letter-spacing: 0.02em; position: relative; z-index: 2; }
        .pd-var-btn.disabled { opacity: 0.5; cursor: not-allowed; background: #f9fafb; border-color: rgba(156,163,175,.3); position: relative; overflow: hidden; }
        .pd-var-btn.disabled::after { content: ''; position: absolute; top: 50%; left: 0; width: 100%; height: 1.5px; background: #9ca3af; transform: rotate(-20deg); pointer-events: none; }
        
        .pd-name { font-size: clamp(24px, 5vw, 36px); font-weight: 800; margin-bottom: 8px; line-height: 1.2; }
        .pd-price-block {
          background: linear-gradient(165deg, rgba(255,255,255,.95) 0%, rgba(250,245,255,.92) 100%);
          border: 1px solid rgba(124,58,237,.14); border-radius: 22px; padding: 22px 24px 20px;
          margin-bottom: 20px; position: relative; overflow: hidden;
          box-shadow: 0 12px 32px -8px rgba(76,29,149,.12);
        }
        .pd-price-main { font-size: clamp(34px, 7vw, 50px); font-weight: 800; color: #7c3aed; }
        .pd-price-mrp { font-size: 13px; color: #9ca3af; text-decoration: line-through; font-weight: 500; }
        .pd-price-save { font-size: 12px; color: #059669; font-weight: 700; background: rgba(5,150,105,.08); border: 1px solid rgba(5,150,105,.18); padding: 2px 10px; border-radius: 6px; }
        
        .pd-stock { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 3px 10px; border-radius: 100px; }
        .pd-stock-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        
        .pd-hl-spec-tabs { display: flex; gap: 0; padding: 0 10px; border-bottom: 1px solid rgba(124,58,237,.08); background: linear-gradient(180deg, rgba(124,58,237,.04), transparent); }
        .pd-hl-spec-tabs button {
          flex: 1; padding: 9px 12px; border: none; background: transparent; cursor: pointer;
          font-family: inherit; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #a1a1aa;
          border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .2s, border-color .2s;
        }
        .pd-hl-spec-tabs button.on { color: #7c3aed; border-bottom-color: #7c3aed; }
        
        .pd-cta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
        .pd-btn-primary {
          flex: 1; min-width: 160px;
          background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; border: none;
          padding: 16px 32px; border-radius: 14px;
          font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase;
          cursor: pointer; font-family: inherit; transition: all .3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 24px rgba(124,58,237,.3); display: flex; align-items: center; justify-content: center; gap: 10px;
          position: relative; overflow: hidden;
        }
        .pd-btn-primary:hover:not(:disabled) { transform: translateY(-4px) scale(1.02); box-shadow: 0 16px 48px rgba(124,58,237,.45); }
        .pd-btn-primary:disabled { background: #f3f4f6; color: #d1d5db; box-shadow: none; cursor: not-allowed; transform: none; }
        
        .pd-trust { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 16px; border-top: 1px solid rgba(124,58,237,.08); margin-top: 16px; }
        .pd-trust-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #4b5563; font-weight: 600; background: rgba(255,255,255,.6); padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(124,58,237,.08); }
        
        .pd-delivery { margin-top: 24px; background: rgba(255,255,255,.7); border-radius: 18px; border: 1px solid rgba(124,58,237,.12); overflow: hidden; }
        .pd-delivery-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: rgba(124,58,237,.04); }
        .pd-delivery-form { padding: 14px 18px; display: flex; gap: 10px; align-items: center; }
        .pd-del-inp { flex: 1; min-width: 120px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid rgba(124,58,237,.2); background: white; font-size: 14px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; outline: none; transition: all .2s; }
        .pd-del-inp:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
        .pd-del-check { background: #7c3aed; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; transition: all .2s; }
        .pd-del-check:hover { background: #6b2fb5; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,58,237,.25); }
      `}</style>

      <div className="pd">
        <div className="pd-wrap">
          <div className="pd-grid">
            {/* Image Panel */}
            <div>
              <div
                className="pd-img-main"
                onClick={onMainImgClick}
                onTouchStart={onMainImgTouchStart}
                onTouchEnd={onMainImgTouchEnd}
                onTouchCancel={onMainImgTouchCancel}
              >
                {imgs.length > 0 && (
                  <img
                    src={getCloudinaryUrl(imgs[activeImg].url || imgs[activeImg], 800)}
                    alt={p.name}
                    className="pd-main-photo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }}
                    onLoad={() => setImgLoading(false)}
                    onError={() => setImgLoading(false)}
                  />
                )}
                {discount > 0 && (
                  <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '7px', fontSize: '8px', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'white', background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 3px 10px rgba(5,150,105,.3)' }}>
                      {discount}% OFF
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {imgs.length > 1 && (
                <div className="pd-thumbs">
                  {imgs.map((img, idx) => (
                    <button
                      key={idx}
                      className={`pd-thumb ${activeImg === idx ? 'on' : ''}`}
                      onClick={() => setActiveImg(idx)}
                    >
                      <img
                        src={getCloudinaryUrl(img.url || img, 120)}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Variants Selector */}
              {variantAttrs.length > 0 && (
                <div className="pd-variants">
                  {variantAttrs.map((attr, attrIdx) => {
                    const lowAttr = attr.toLowerCase().trim()
                    const opts = variantOpts(attr)
                    const isMany = opts.length >= 6
                    return (
                      <div key={attrIdx} className="pd-var-sec">
                        <div className="pd-var-header">
                          <div className="pd-var-lbl">
                            <span className="pd-var-icon">{variantAttrIconEmoji(lowAttr)}</span>
                            <span className="pd-var-name">{attr}</span>
                          </div>
                          {selected[lowAttr] && (
                            <span className="pd-var-selected">
                              {selected[lowAttr]}
                            </span>
                          )}
                        </div>
                        <div className={`pd-var-opts ${isMany ? 'has-many' : ''} ${opts.length > 10 ? 'has-very-many' : ''}`}>
                          {opts.map((optVal, optIdx) => {
                            const enabled = isOptEnabled(attr, optVal)
                            const isOn = selected[lowAttr]?.toLowerCase() === String(optVal).toLowerCase()
                            const thisVariant = p.variants?.find(v => {
                              const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)
                              return v.isActive !== false && Object.entries(vAttrs).some(([k, vv]) => k.toLowerCase() === lowAttr && String(vv).toLowerCase() === String(optVal).toLowerCase())
                            })
                            const vPrice = thisVariant?.price
                            return (
                              <button
                                key={optIdx}
                                className={`pd-var-btn ${!enabled ? 'disabled' : ''} ${isOn ? 'on' : ''}`}
                                onClick={() => {
                                  if (!enabled) return
                                  setSelected(s => ({ ...s, [lowAttr]: String(optVal) }))
                                }}
                                disabled={!enabled}
                              >
                                <span className="pd-var-val">{optVal}</span>
                                {vPrice && <span className="pd-var-price">₹{Number(vPrice).toLocaleString()}</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="pd-info">
              <div className="pd-meta-compact" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 8px', marginBottom: '10px' }}>
                <div className="pd-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 0, alignItems: 'center' }}>
                  <span className="pd-badge pd-badge-v" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '100px', background: 'rgba(124,58,237,.09)', border: '1px solid rgba(124,58,237,.2)', color: '#7c3aed' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    VERIFIED
                  </span>
                  {p.gst > 0 && (
                    <span className="pd-badge pd-badge-g" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '100px', background: 'rgba(5,150,105,.09)', border: '1px solid rgba(5,150,105,.2)', color: '#059669' }}>
                      GST
                    </span>
                  )}
                  <span className="pd-badge pd-badge-a" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '100px', background: 'rgba(245,158,11,.09)', border: '1px solid rgba(245,158,11,.2)', color: '#d97706' }}>
                    ⚡ Dispatch
                  </span>
                </div>
              </div>

              <h1 className="pd-name">{p.name}</h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{Number(p.ratingAvg || 0).toFixed(1)} ({Number(p.ratingCount || 0)} ratings)</span>
              </div>

              {/* Price Block */}
              <div className="pd-price-block">
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span className="pd-price-main">
                      ₹{Number(currentPrice || minPrice).toLocaleString()}
                    </span>
                    {Number(currentMrp || displayMrp) > Number(currentPrice || minPrice) && (
                      <>
                        <span className="pd-price-mrp">₹{Number(currentMrp || displayMrp).toLocaleString()}</span>
                        <span className="pd-price-save">Save ₹{(Number(currentMrp || displayMrp) - Number(currentPrice || minPrice)).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                  {p.gst > 0 && (
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                      Inclusive of all taxes
                    </div>
                  )}
                </>
              </div>

              {/* Stock */}
              <div>
                <span
                  className="pd-stock"
                  style={{
                    background: isAvailable ? 'rgba(5,150,105,.08)' : 'rgba(239,68,68,.08)',
                    color: isAvailable ? '#059669' : '#dc2626',
                    border: isAvailable ? '1px solid rgba(5,150,105,.2)' : '1px solid rgba(239,68,68,.2)'
                  }}
                >
                  <span className="pd-stock-dot" style={{ background: isAvailable ? '#059669' : '#dc2626', animation: isAvailable ? 'none' : 'pdStockPulse 1.2s infinite ease-in-out' }}></span>
                  {stockSt.text}
                </span>
              </div>

              {/* Express Dispatch Countdown */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.08em' }}>Express Dispatch</span>
                <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,.08)', padding: '4px 10px', borderRadius: '8px' }}>
                  {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
                </span>
              </div>

              {/* Delivery Check */}
              <div className="pd-delivery">
                <div className="pd-delivery-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" />
                    </svg>
                    <span className="pd-del-label" style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', letterSpacing: '.08em', textTransform: 'uppercase' }}>Check Delivery Availability</span>
                  </div>
                  {deliveryDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '11px', fontWeight: 700 }}>
                      <span className="pd-del-ships-lbl" style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Ships</span>
                      <span>{deliveryDate}</span>
                    </div>
                  )}
                </div>
                <form className="pd-delivery-form" onSubmit={checkDelivery}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="pd-del-inp"
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter Pincode"
                  />
                  <button type="submit" className="pd-del-check" disabled={pincode.length !== 6}>
                    Check
                  </button>
                </form>
              </div>

              {/* CTA Buttons */}
              <div className="pd-cta">
                {authed ? (
                  <>
                    <button
                      className="pd-btn-primary"
                      onClick={handleAddToCart}
                      disabled={!canAddToCart}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 6h15l-1.5 9h-12z" />
                        <path d="M6 6l-1-3H3" />
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="18" cy="21" r="1" />
                      </svg>
                      Add to Cart
                    </button>
                  </>
                ) : (
                  <button
                    className="pd-btn-primary"
                    onClick={() => navigate('/login', { state: { from: location.pathname + location.search } })}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Login to Buy
                  </button>
                )}
              </div>

              {/* Trust Badges */}
              <div className="pd-trust">
                <div className="pd-trust-item">
                  <span>🔒</span> Secure Payment
                </div>
                <div className="pd-trust-item">
                  <span>✅</span> Verified Genuine
                </div>
                <div className="pd-trust-item">
                  <span>🧾</span> GST Invoice
                </div>
                <div className="pd-trust-item">
                  <span>⚡</span> Fast Dispatch
                </div>
                <div className="pd-trust-item">
                  <span>📦</span> Pan India Delivery
                </div>
              </div>

              {/* Highlights / Specs Tabs */}
              {(hasHighlights || hasSpecifications) && (
                <div className="pd-hl-spec-card" style={{ marginTop: '24px', background: 'rgba(255,255,255,.65)', borderRadius: '18px', border: '1px solid rgba(124,58,237,.12)', overflow: 'hidden' }}>
                  <div className="pd-hl-spec-tabs">
                    {hasHighlights && (
                      <button
                        className={hlSpecTab === 'highlights' ? 'on' : ''}
                        onClick={() => setHlSpecTab('highlights')}
                      >
                        Highlights
                      </button>
                    )}
                    {hasSpecifications && (
                      <button
                        className={hlSpecTab === 'specs' ? 'on' : ''}
                        onClick={() => setHlSpecTab('specs')}
                      >
                        Specifications
                      </button>
                    )}
                  </div>
                  <div className="pd-card-body" style={{ padding: '14px 16px 16px' }}>
                    {showHighlightsBlock && (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {p.highlights.map((hl, i) => (
                          <li key={i} className="pd-hl-item" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', fontSize: '12px', color: '#374151' }}>
                            <div className="pd-hl-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', marginTop: '4px', flexShrink: 0 }}></div>
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {showSpecificationsBlock && (
                      <table className="pd-spec-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {p.specifications.map((spec, i) => (
                            <tr key={i} style={{ borderBottom: i !== p.specifications.length - 1 ? '1px solid rgba(124,58,237,.06)' : 'none' }}>
                              <td style={{ padding: '8px 0', fontSize: '12px', color: '#6b7280', width: '40%', fontWeight: 600 }}>{spec.key}</td>
                              <td style={{ padding: '8px 0', fontSize: '12px', color: '#1e1b2e', fontWeight: 700 }}>{spec.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {p.description && (
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#1e1b2e', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.08em' }}>Details</h3>
                  <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: '16px', border: '1px solid rgba(124,58,237,.1)', padding: '16px' }}>
                    <p style={{ color: '#4b5563', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {p.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <div style={{ marginTop: '48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1b2e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#7c3aed">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Based on your interest
                </h2>
                <Link to="/products" style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.08em', textDecoration: 'none' }}>
                  View All →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {similarProducts.slice(0, 4).map((product, idx) => (
                  <ProductCard
                    key={product._id || idx}
                    p={product}
                    authed={authed}
                    addToCart={addToCart}
                    navigate={navigate}
                    index={idx}
                    setRecOpen={setRecOpen}
                    setRecItems={setRecItems}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <RecommendationModal
        isOpen={recOpen}
        onClose={() => setRecOpen(false)}
        items={recItems}
        cartProduct={p}
        addToCart={addToCart}
        authed={authed}
        navigate={navigate}
      />
    </>
  )
}
