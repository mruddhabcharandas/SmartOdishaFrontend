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
import VariantMatrix from '../../components/VariantMatrix'
import { useAuth } from '../../lib/AuthContext'

/** Stable sort for RAM/ROM/Storage etc.; otherwise locale + numeric aware. */
function sortVariantValues(lowKey, values) {
  const arr = [...values]
  const lk = String(lowKey || '').toLowerCase()
  const storageLike =
    /ram|rom|storage|memory|capacity|variant|model/i.test(lk) &&
    !/screen|display|camera|inch|hz|refresh/i.test(lk)
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

/* ═══════════════════════════════════════════════
   PRODUCT DETAIL  –  Click2Kart B2B
   Variant selector: any attribute count; many values → horizontal scroll rail
═══════════════════════════════════════════════ */
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
    staleTime: 1000 * 60 * 5, // 5 minutes (reduced from 30 to reflect changes faster)
    gcTime: 1000 * 60 * 60 * 24, // 24 hours in cache
  })

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['recommendations', idOrSlug],
    queryFn: () => api.get(`/api/products/${idOrSlug}/recommendations?limit=8`).then(res => res.data || []),
    enabled: !!idOrSlug,
    staleTime: 1000 * 60 * 60, // 1 hour for recommendations
  })

  // Normalize an attributes object to lowercase keys
  const normalizeAttrs = (attrs, sku = '', productAttributes = []) => {
    const result = {}
    if (attrs && typeof attrs === 'object') {
      const obj = attrs instanceof Map ? Object.fromEntries(attrs) : attrs
      Object.entries(obj).forEach(([k, v]) => {
        if (k && k !== 'sku') result[k.toLowerCase().trim()] = String(v || '').trim()
      })
    }

    // SKU parsing when variant.attributes is empty:
    // - Try to match with defined attributes from p.attributes
    const targetSku = sku || (attrs && typeof attrs === 'object' ? attrs.sku : null);
    if (Object.keys(result).length === 0 && targetSku) {
      const parts = String(targetSku).split('-').map(s => s.trim()).filter(Boolean);

      // Get predefined attribute keys (lowercase)
      const attrKeys = (Array.isArray(productAttributes) ? productAttributes : [])
        .map(a => a.split(':')[0]?.toLowerCase().trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        // If we have parts from SKU and predefined attributes, try to map them
        if (attrKeys.length > 0) {
          attrKeys.forEach((key, idx) => {
            if (parts[idx + 1]) result[key] = parts[idx + 1].toLowerCase();
          });
        } else {
          // Fallback to model if no attributes defined
          if (parts.length >= 2) {
            // For 2 or more parts, use 'model' as the primary variant type
            // This prevents 'model' variants from showing as 'color'
            result.model = parts[1].toLowerCase();
            if (parts.length >= 3) {
              // If there are more parts, add them as a generic 'variant' attribute
              result.variant = parts.slice(2).join('-').toLowerCase();
            }
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

    // 1) Order from product.attributes (e.g. RAM:8GB,12GB — key only; values come from variants)
    const attrs = Array.isArray(p.attributes) ? p.attributes : []
    attrs.forEach(a => {
      const parts = a.split(':')
      if (parts[0]) add(parts[0].trim())
    })

    // 2) Any other keys from variants (normalizeAttrs includes SKU-derived color/watt)
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

    // Special case for virtual 'Option' attribute
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

  /* KYC / pincode */
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

  /* countdown */
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

  /* load product effect (syncing state from query) */
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

  /* variant selection logic (Flipkart Style) */
  useEffect(() => {
    if (!p || !Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return }

    // URL Sync: Load initial selection from URL params
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

    // On first load, find the variant with the highest stock among active variants
    if (Object.keys(selected).length === 0) {
      const bestVariant = [...p.variants]
        .filter(v => v.isActive !== false)
        .sort((a, b) => (b.stock || 0) - (a.stock || 0))[0]

      if (bestVariant) {
        // FALLBACK: If we're using the virtual 'Option' attribute, set it accordingly
        if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') {
          setSelected({ option: bestVariant.sku || bestVariant._id });
        } else {
          setSelected(normalizeAttrs(bestVariant.attributes, bestVariant.sku))
        }
      }
    }
  }, [p, variantAttrs])

  // Update URL when selection changes
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
    // Remove params that are no longer selected
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

    // Find variant that exactly matches current selection
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

    // If no exact match (selection became invalid), find the first active variant 
    // that matches as many attributes as possible from the top down (Flipkart style)
    if (!v && Object.keys(selected).length > 0) {
      let currentMatch = null
      // Try to match attributes one by one from first to last
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
    if (v) setActiveImg(0) // Reset image to first of variant if variant changed
  }, [selected, p, variantAttrs])

  /* SEO */
  useEffect(() => {
    if (!p) return
    setSEO(`${p.name} Wholesale Price | Click2Kart`, `Buy ${p.name} at wholesale B2B rates with GST invoice and fast delivery.`)
    const cleanup = injectJsonLd({
      "@context": "https://schema.org/", "@type": "Product", "name": p.name,
      "brand": { "@type": "Brand", "name": p.brand?.name || p.brand || "Click2Kart" },
      "image": (p.images || []).map(i => i.url).filter(Boolean), "category": p.category?.name || p.category || "General",
      "offers": {
        "@type": "Offer", "priceCurrency": "INR", "price": String(p.price || 0),
        "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", "url": `${window.location.origin}/products/${p.slug || p._id}`
      },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": String(p.ratingAvg || 0), "reviewCount": String(p.ratingCount || 0) }
    })
    return cleanup
  }, [p])

  /* ── LOADING & ERROR ── */
  if (error) return (
    <div className="pd-error-root">
      <style>{`
        .pd-error-root { font-family:'DM Sans',sans-serif; background:#f5f3ff; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; }
        .pd-error-box { background:white; padding:40px; border-radius:24px; box-shadow:0 10px 40px rgba(0,0,0,.05); border:1px solid rgba(124,58,237,.1); max-width:400px; width:100%; }
        .pd-error-ico { font-size:40px; margin-bottom:20px; display:block; }
        .pd-error-h { font-family:'Bebas Neue',sans-serif; font-size:32px; color:#1e1b2e; margin-bottom:10px; }
        .pd-error-p { font-size:14px; color:#6b7280; margin-bottom:24px; line-height:1.6; }
        .pd-error-btn { background:#7c3aed; color:white; padding:12px 24px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; text-decoration:none; display:inline-block; transition:all .2s; }
        .pd-error-btn:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(124,58,237,.3); }
      `}</style>
      <div className="pd-error-box">
        <span className="pd-error-ico">🛍️</span>
        <h2 className="pd-error-h">Oops!</h2>
        <p className="pd-error-p">{error}</p>
        <Link to="/products" className="pd-error-btn">Back to Catalogue</Link>
      </div>
    </div>
  )

  if (!p) return (
    <div className="pd-skel-root">
      <style>{`
        .pd-skel-root { font-family:'DM Sans',sans-serif; background:#f5f3ff; min-height:100vh; padding:20px; }
        .pd-skel-container { max-width:1200px; margin:0 auto; display:grid; grid-template-columns:1fr; gap:40px; }
        @media (min-width:1024px) { .pd-skel-container { grid-template-columns:1fr 1fr; padding-top:40px; } }
        .pd-skel-img-box { aspect-ratio:1/1; background:white; border-radius:32px; position:relative; overflow:hidden; border:1px solid rgba(124,58,237,.1); }
        .pd-skel-info { display:flex; flex-direction:column; gap:20px; }
        .pd-skel-line { height:20px; background:white; border-radius:10px; position:relative; overflow:hidden; border:1px solid rgba(124,58,237,.05); }
        .pd-skel-shim { position:absolute; inset:0; background:linear-gradient(90deg, transparent, rgba(124,58,237,0.05), transparent); transform:translateX(-100%); animation:pdSkelShim 1.5s infinite; }
        @keyframes pdSkelShim { 100% { transform:translateX(100%); } }
      `}</style>
      <div className="pd-skel-container">
        <div className="pd-skel-img-box"><div className="pd-skel-shim" /></div>
        <div className="pd-skel-info">
          <div className="pd-skel-line" style={{ width: '30%' }}><div className="pd-skel-shim" /></div>
          <div className="pd-skel-line" style={{ width: '80%', height: 40 }}><div className="pd-skel-shim" /></div>
          <div className="pd-skel-line" style={{ width: '40%', height: 30 }}><div className="pd-skel-shim" /></div>
          <div className="pd-skel-line" style={{ width: '100%', height: 100 }}><div className="pd-skel-shim" /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="pd-skel-line" style={{ width: '120px', height: 50 }}><div className="pd-skel-shim" /></div>
            <div className="pd-skel-line" style={{ width: '120px', height: 50 }}><div className="pd-skel-shim" /></div>
          </div>
        </div>
      </div>
    </div>
  )

  /* variant helpers */
  // Variant selection helper: get available values for a specific attribute key
  const variantOpts = (key) => {
    const set = new Set()
    const lowKey = key.toLowerCase().trim()

    // FALLBACK: Special case for virtual 'Option' when attributes are missing
    if (lowKey === 'option' && Array.isArray(p?.variants)) {
      p.variants.forEach(v => {
        if (v.isActive !== false) set.add(v.sku || v._id)
      })
      return sortVariantValues(lowKey, Array.from(set))
    }

    // 1. Get from predefined values in product.attributes (Format: "Color:Black,Blue")
    const attrEntry = (p?.attributes || []).find(a => {
      const parts = a.split(':');
      return parts[0]?.toLowerCase().trim() === lowKey;
    })
    if (attrEntry) {
      const vals = attrEntry.split(':')[1]?.split(',').filter(Boolean) || []
      vals.forEach(v => set.add(v.trim()))
    }

    // 2. Add from variants that actually exist
    if (p?.variants?.length) {
      p.variants.forEach(v => {
        if (v.isActive === false) return;
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)
        // Check all keys in vAttrs for a case-insensitive match with lowKey
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowKey && vv) {
            set.add(vv.trim())
          }
        })
      })
    }
    return sortVariantValues(lowKey, Array.from(set))
  }

  // Flipkart Style Logic: Check if an option is enabled based on current other selections
  const isOptEnabled = (key, val) => {
    if (!p?.variants?.length) return true
    const lowKey = key.toLowerCase().trim()

    // FALLBACK: Special case for virtual 'Option'
    if (lowKey === 'option') {
      return p.variants.some(v => v.isActive !== false && v.stock > 0 && (v.sku === val || v._id === val));
    }

    const otherSelections = { ...selected };
    delete otherSelections[lowKey];

    return p.variants.some(v => {
      if (v.isActive === false || v.stock <= 0) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes)

      // Must match the value we're checking
      let matchVal = false;
      Object.entries(vAttrs).forEach(([vk, vv]) => {
        if (vk.toLowerCase().trim() === lowKey && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) {
          matchVal = true;
        }
      });

      if (matchVal) {
        // Must match all other selected attributes
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

  /* ── PRICE CALCULATIONS ── */
  const basePrice = Number(currentPrice || 0) || 0
  const mrp = Number(currentMrp || 0) || 0

  // Calculate savings based on the actual price (variant or base)
  const unitSave = mrp > 0 ? Math.max(0, mrp - basePrice) : 0

  const sortedAsc = Array.isArray(p.bulkTiers) ? p.bulkTiers.slice().sort((a, b) => a.quantity - b.quantity) : []
  const sortedDesc = Array.isArray(p.bulkTiers) ? p.bulkTiers.slice().sort((a, b) => b.quantity - a.quantity) : []
  const minTierQty = sortedAsc.length > 0 ? Math.max(1, Number(sortedAsc[0].quantity || 1)) : (Number(p.bulkDiscountQuantity) || 1)
  let effPrice = basePrice
  const hitTier = sortedDesc.find(t => qty >= Number(t.quantity || 0))
  if (hitTier) {
    const reduction = Number(hitTier.priceReduction || 0) || 0
    effPrice = Math.max(0, basePrice - reduction)
  } else if (Number(p.bulkDiscountQuantity || 0) > 0 && qty >= Number(p.bulkDiscountQuantity)) {
    const reduction = Number(p.bulkDiscountPriceReduction || 0) || 0
    effPrice = Math.max(0, basePrice - reduction)
  }
  const savingsTotal = Math.max(0, (basePrice - effPrice) * qty)

  const gstRate = Number(p.gst || 0)
  const isBestseller = (p.ratingCount || 0) >= 50
  const isHotDeal = mrp > 0 && ((mrp - (p.price || 0)) / mrp) * 100 >= 20

  const currentImg = imgs[activeImg]?.url || imgs[0]?.url
  const stock = currentStock ?? 0
  const stockStRaw = getStockStatus(stock)
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

    // Construct simplified product object for cart
    const cartProduct = {
      productId: p._id,
      sku: matchedVariant?.sku || p.sku,
      quantity: qty
    };

    const ok = await addToCart({ ...p, minOrderQty: Math.max(minTierQty, qty) }, matchedVariant || undefined)
    if (ok) {
      await refreshCart()
      try {
        const { data } = await api.get(`/api/recommendations/similar/${idOrSlug}`)
        const filtered = (data || []).filter(item => (item._id || item.id) !== (p._id || idOrSlug))
        setRecItems(filtered)
        if (filtered.length > 0) setRecOpen(true)
      } catch { }
    }
  }

  /* ── RENDER ── */
  return (
    <>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=Outfit:wght@400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ─── ROOT ─── */
      .pd {
        font-family: 'Outfit', 'DM Sans', system-ui, sans-serif;
        background:
          radial-gradient(ellipse 120% 80% at 0% 0%, rgba(124,58,237,.12), transparent 50%),
          radial-gradient(ellipse 90% 70% at 100% 10%, rgba(99,102,241,.09), transparent 45%),
          linear-gradient(180deg, #faf9ff 0%, #f3f0ff 38%, #ebe7f7 100%);
        color: #1e1b2e;
        min-height: 100vh; overflow-x: hidden;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      .pd::before {
        content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background-image:
          linear-gradient(rgba(139,92,246,.028) 1px, transparent 1px),
          linear-gradient(90deg, rgba(139,92,246,.028) 1px, transparent 1px);
        background-size: 72px 72px;
        opacity: .85;
      }
      .pd-glow1 { position:fixed;top:-220px;left:-180px;width:640px;height:640px;border-radius:50%;background:radial-gradient(ellipse,rgba(139,92,246,.14),transparent 68%);pointer-events:none;z-index:0;filter:blur(2px); }
      .pd-glow2 { position:fixed;bottom:-200px;right:-140px;width:520px;height:520px;border-radius:50%;background:radial-gradient(ellipse,rgba(79,70,229,.1),transparent 68%);pointer-events:none;z-index:0;filter:blur(3px); }

      /* ─── TOPBAR ─── */
      .pd-topbar {
        position: sticky; top: 0; z-index: 50;
        background: rgba(255,255,255,.72); backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 1px solid rgba(139,92,246,.1);
        box-shadow: 0 4px 30px rgba(15,23,42,.06), 0 1px 0 rgba(255,255,255,.8) inset;
        padding: 13px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
      }
      @media (min-width: 768px) { .pd-topbar { padding: 14px 32px; } }
      .pd-back {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
        color: #7c3aed; background: white;
        border: 1.5px solid rgba(124,58,237,.25); padding: 8px 18px; border-radius: 12px;
        cursor: pointer; transition: all .3s cubic-bezier(0.4, 0, 0.2, 1); 
        font-family: 'DM Sans', sans-serif;
        text-decoration: none; white-space: nowrap;
        box-shadow: 0 2px 8px rgba(124,58,237,.06);
      }
      .pd-back:hover { 
        background: #fdfcff; 
        border-color: #7c3aed;
        transform: translateX(-4px); 
        box-shadow: 0 4px 12px rgba(124,58,237,.12);
      }
      .pd-back:active { transform: translateX(-2px) scale(0.96); }
      .pd-breadcrumb {
        display: flex; align-items: center; gap: 6px; overflow: hidden;
        font-size: 11px; font-weight: 600; color: #9ca3af;
      }
      .pd-breadcrumb-sep { color: rgba(124,58,237,.3); }
      .pd-breadcrumb span:last-child { color: #7c3aed; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

      /* ─── MAIN LAYOUT ─── */
      .pd-wrap {
        max-width: 1260px; margin: 0 auto;
        padding: 24px 16px 60px; position: relative; z-index: 1;
      }
      @media (min-width: 768px) { .pd-wrap { padding: 28px 24px 80px; } }
      .pd-grid {
        display: grid; grid-template-columns: 1fr; gap: 24px;
      }
      @media (min-width: 900px) {
        .pd-grid { grid-template-columns: 460px 1fr; gap: 40px; align-items: start; }
      }
      @media (min-width: 1100px) {
        .pd-grid { grid-template-columns: 520px 1fr; gap: 56px; }
      }

      @media (min-width: 900px) {
        .pd-info {
          background: rgba(255,255,255,.78);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(255,255,255,.85);
          border-radius: 28px;
          padding: 28px 26px 32px;
          box-shadow:
            0 1px 0 rgba(255,255,255,.95) inset,
            0 20px 50px -12px rgba(76,29,149,.12),
            0 8px 24px -8px rgba(15,23,42,.06);
        }
      }

      /* Tablet: larger type & tap targets (not phone-sized in landscape / ~600–899px) */
      @media (min-width: 600px) and (max-width: 899px) {
        .pd-topbar { padding: 16px 22px; }
        .pd-back { font-size: 12px; padding: 9px 18px; gap: 8px; border-radius: 11px; }
        .pd-breadcrumb { font-size: 12px; }
        .pd-breadcrumb span:last-child { max-width: min(48vw, 320px); }
        .pd-wrap { padding: 26px 22px 72px; }
        .pd-grid { gap: 28px; }
        .pd-img-main { border-radius: 26px; }
        .pd-fullview { font-size: 10px; padding: 7px 14px; border-radius: 10px; }
        .pd-img-chip { font-size: 9px; padding: 4px 10px; }
        .pd-thumb { width: 80px; height: 80px; border-radius: 14px; padding: 7px; }
        .pd-thumbs { gap: 10px; padding: 14px 0 22px; }
        .pd-img-dots { margin-top: 4px; margin-bottom: 2px; }
        .pd-img-dot { width: 7px; height: 7px; }
        .pd-variants { padding: 26px 22px; border-radius: 26px; gap: 22px; }
        .pd-var-name { font-size: 12px; }
        .pd-var-selected { font-size: 11px; }
        .pd-var-btn { min-width: 96px; padding: 15px 20px; font-size: 11px; }
        .pd-var-img-btn { min-width: 84px; }
        .pd-info {
          padding: 22px 20px 26px;
          border-radius: 24px;
          background: rgba(255,255,255,.82);
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border: 1px solid rgba(124,58,237,.1);
          box-shadow:
            0 1px 0 rgba(255,255,255,.9) inset,
            0 16px 40px -12px rgba(76,29,149,.1);
        }
        .pd-badge { font-size: 9px; padding: 4px 10px; }
        .pd-name { font-size: clamp(30px, 6.5vw, 44px); }
        .pd-price-main { font-size: clamp(34px, 7vw, 50px); }
        .pd-rat-row .pd-rat-ct { font-size: 13px; }
        .pd-del-inp { padding: 12px 16px; font-size: 14px; }
        .pd-del-check { padding: 12px 20px; font-size: 11px; }
        .pd-btn-primary { padding: 16px 24px; font-size: 12px; }
        .pd-trust-item { font-size: 11px; }
        .pd-delivery-head { padding: 16px 18px; }
        .pd-del-label { font-size: 11px; }
        .pd-del-ships-lbl { font-size: 10px; }
      }

      .pd-reveal {
        animation: pdRevealIn 0.72s cubic-bezier(.22, 1, .36, 1) both;
      }
      .pd-reveal-delay { animation-delay: .14s; }
      @keyframes pdRevealIn {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* ─── IMAGE PANEL ─── */
      .pd-img-panel { position: relative; }
      @media (min-width: 900px) { .pd-img-panel { position: sticky; top: 76px; } }

      .pd-img-main {
        background: linear-gradient(145deg, #ffffff 0%, #faf9ff 50%, #f5f3ff 100%);
        border: 1px solid rgba(124,58,237,.12);
        border-radius: 28px; overflow: hidden; aspect-ratio: 1;
        position: relative; cursor: zoom-in;
        display: flex; align-items: center; justify-content: center;
        touch-action: pan-y;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        transition: box-shadow .4s cubic-bezier(.34,1.2,.64,1), border-color .3s, transform .35s;
        box-shadow:
          0 1px 0 rgba(255,255,255,.9) inset,
          0 12px 40px -8px rgba(76,29,149,.15),
          0 4px 16px rgba(124,58,237,.08);
      }
      .pd-img-main:hover {
        box-shadow:
          0 1px 0 rgba(255,255,255,.95) inset,
          0 24px 56px -10px rgba(76,29,149,.22),
          0 8px 24px rgba(124,58,237,.12);
        border-color: rgba(124,58,237,.28);
        transform: translateY(-2px);
      }
      .pd-img-main img.pd-main-photo {
        width: 100%; height: 100%; object-fit: contain; padding: 20px;
        transition: transform .35s cubic-bezier(.34,1.2,.64,1);
        animation: pdImgSwap .38s cubic-bezier(.22, 1, .36, 1) both;
      }
      @keyframes pdImgSwap {
        from { opacity: 0; transform: scale(1.02); }
        to { opacity: 1; transform: scale(1); }
      }

      .pd-img-dots {
        display: flex; justify-content: center; align-items: center; gap: 7px;
        margin-top: 10px; margin-bottom: 4px;
      }
      .pd-img-dot {
        width: 6px; height: 6px; border-radius: 50%;
        border: none; padding: 0; cursor: pointer;
        background: rgba(124,58,237,.22);
        transition: transform .22s ease, background .22s ease, box-shadow .22s ease;
      }
      .pd-img-dot.on {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        transform: scale(1.2);
        box-shadow: 0 2px 8px rgba(124,58,237,.35);
      }
      .pd-img-main::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(124,58,237,.03) 0%, transparent 60%);
        pointer-events: none;
      }

      /* fullview btn */
      .pd-fullview {
        position: absolute; bottom: 12px; right: 12px; z-index: 2;
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(255,255,255,.92); backdrop-filter: blur(8px);
        border: 1px solid rgba(124,58,237,.18);
        border-radius: 9px; padding: 6px 13px;
        font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
        color: #7c3aed; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .2s;
      }
      .pd-fullview:hover { background: white; border-color: rgba(124,58,237,.35); }

      /* badge chips on image */
      .pd-img-chips { position: absolute; top: 12px; left: 12px; z-index: 2; display: flex; flex-direction: column; gap: 5px; }
      .pd-img-chip {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 9px; border-radius: 7px;
        font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
        color: white;
      }
      .pd-img-chip.bs { background: linear-gradient(135deg, #ec4899, #db2777); box-shadow: 0 3px 10px rgba(219,39,119,.3); }
      .pd-img-chip.hd { background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 3px 10px rgba(217,119,6,.3); }

      /* thumbnails */
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
      .pd-thumb:not(.on):hover { border-color: rgba(124,58,237,.35); }
      .pd-thumb img { width: 100%; height: 100%; object-fit: contain; }

      /* ============================================
         ULTRA PREMIUM VARIANT SELECTOR
         ============================================ */
      .pd-variants {
        display: flex;
        flex-direction: column;
        gap: 28px;
        margin-top: 24px;
        padding: 32px 28px;
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 16px 40px -8px rgba(124, 58, 237, 0.12),
                    inset 0 1px 1px rgba(255, 255, 255, 1);
        position: relative;
        z-index: 10;
        overflow: hidden;
      }
      
      .pd-variants::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 200px;
        background: radial-gradient(ellipse at top, rgba(124, 58, 237, 0.08) 0%, transparent 70%);
        pointer-events: none;
      }
      
      .pd-var-sec {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      
      .pd-var-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .pd-var-lbl {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.03em;
        color: #1e1b2e;
      }
      
      .pd-var-icon {
        width: 28px;
        height: 28px;
        background: rgba(124, 58, 237, 0.08);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      
      .pd-var-name {
        text-transform: uppercase;
        font-weight: 800;
        color: #6b7280;
        letter-spacing: 0.06em;
        font-size: 11px;
      }
      
      .pd-var-selected {
        color: #7c3aed;
        font-weight: 800;
        text-transform: none;
        letter-spacing: 0;
        font-size: 13px;
        background: rgba(124, 58, 237, 0.08);
        padding: 4px 12px;
        border-radius: 20px;
      }
      
      /* Option rows: wrap for few; horizontal rail for many (RAM/ROM / 10+ values) */
      .pd-var-opts {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: stretch;
      }
      .pd-var-scroll-hint {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #a1a1aa;
        margin-top: 4px;
      }
      .pd-var-opts.has-many {
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        gap: 10px;
        padding: 4px 2px 12px;
        margin: 0 -2px;
        scroll-snap-type: x proximity;
        scrollbar-width: thin;
      }
      .pd-var-opts.has-many::-webkit-scrollbar {
        height: 5px;
      }
      .pd-var-opts.has-many::-webkit-scrollbar-track {
        background: rgba(124, 58, 237, 0.06);
        border-radius: 100px;
      }
      .pd-var-opts.has-many::-webkit-scrollbar-thumb {
        background: rgba(124, 58, 237, 0.35);
        border-radius: 100px;
      }
      .pd-var-opts.has-many .pd-var-btn,
      .pd-var-opts.has-many .pd-var-img-btn {
        flex: 0 0 auto;
        scroll-snap-align: start;
        min-width: 76px;
        max-width: min(220px, 52vw);
      }
      .pd-var-opts.has-very-many .pd-var-btn,
      .pd-var-opts.has-very-many .pd-var-img-btn {
        min-width: 64px;
        padding: 10px 14px;
        border-radius: 14px;
      }
      .pd-var-opts.has-very-many .pd-var-val {
        font-size: 12px;
      }
      .pd-var-opts.has-many .pd-var-img-btn img {
        width: 44px;
        height: 44px;
      }
      
      /* Premium Option Button */
      .pd-var-btn {
        min-width: 80px;
        padding: 14px 24px;
        background: rgba(255, 255, 255, 0.8);
        border: 1.5px solid rgba(124, 58, 237, 0.1);
        border-radius: 18px;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        position: relative;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.015);
        overflow: hidden;
      }
      
      .pd-var-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.4s ease;
      }
      
      .pd-var-btn:hover:not(.disabled):not(.on) {
        border-color: rgba(124, 58, 237, 0.4);
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-3px);
        box-shadow: 0 12px 24px -6px rgba(124, 58, 237, 0.15);
      }
      
      .pd-var-btn.on {
        background: linear-gradient(135deg, #7c3aed, #5b21b6);
        border-color: #7c3aed;
        box-shadow: 0 12px 32px -8px rgba(124, 58, 237, 0.4),
                    inset 0 1px 1px rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }
      
      .pd-var-btn.on::before {
        opacity: 1;
      }
      
      .pd-var-btn.on .pd-var-val {
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      }
      
      .pd-var-btn.on .pd-var-price {
        color: rgba(255, 255, 255, 0.85);
      }
      
      .pd-var-val {
        font-size: 14px;
        font-weight: 800;
        color: #1e1b2e;
        transition: color 0.3s;
        position: relative;
        z-index: 2;
      }
      
      .pd-var-price {
        font-size: 11px;
        font-weight: 700;
        color: #7c3aed;
        letter-spacing: 0.02em;
        position: relative;
        z-index: 2;
      }
      
      .pd-var-btn.on .pd-var-price {
        color: rgba(255, 255, 255, 0.9);
      }
      
      /* Disabled state with strikethrough */
      .pd-var-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #f9fafb;
        border-color: rgba(156, 163, 175, 0.3);
        position: relative;
        overflow: hidden;
      }
      
      .pd-var-btn.disabled::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: 1.5px;
        background: #9ca3af;
        transform: rotate(-20deg);
        pointer-events: none;
      }
      
      .pd-var-oos {
        font-size: 9px;
        color: #ef4444;
        font-weight: 700;
        margin-top: 2px;
        letter-spacing: 0.03em;
      }
      
      /* Color/Image option button */
      .pd-var-img-btn {
        min-width: 80px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.8);
        border: 1.5px solid rgba(124, 58, 237, 0.1);
        border-radius: 16px;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.015);
      }
      
      .pd-var-img-btn img {
        width: 52px;
        height: 52px;
        object-fit: contain;
        border-radius: 12px;
        transition: transform 0.4s ease;
      }
      
      .pd-var-img-btn:hover:not(.disabled):not(.on) img {
        transform: scale(1.1);
      }
      
      .pd-var-img-btn .pd-var-val {
        font-size: 12px;
      }
      
      .pd-var-img-btn.on {
        border-color: #7c3aed;
        background: rgba(124, 58, 237, 0.04);
        box-shadow: 0 12px 24px -8px rgba(124, 58, 237, 0.25),
                    0 0 0 1px #7c3aed;
        transform: translateY(-2px);
      }
      
      .pd-var-img-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(0.3);
      }
      
      .pd-var-img-btn.disabled::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: 1.5px;
        background: #9ca3af;
        transform: rotate(-20deg);
        pointer-events: none;
      }
      
      .pd-var-msg {
        font-size: 8px;
        color: #ef4444;
        text-align: center;
        font-weight: 700;
        text-transform: uppercase;
      }
      
      /* ─── INFO PANEL ─── */
      .pd-info { display: flex; flex-direction: column; gap: 0; }

      /* badges row */
      .pd-meta-compact {
        display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px;
        margin-bottom: 10px;
      }
      .pd-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0; align-items: center; }
      .pd-badge {
        display: inline-flex; align-items: center; gap: 3px;
        font-size: 8px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        padding: 3px 8px; border-radius: 100px; line-height: 1.2;
      }
      .pd-badge-v  { background: rgba(124,58,237,.09); border: 1px solid rgba(124,58,237,.2); color: #7c3aed; }
      .pd-badge-g  { background: rgba(5,150,105,.09);  border: 1px solid rgba(5,150,105,.2);  color: #059669; }
      .pd-badge-a  { background: rgba(245,158,11,.09); border: 1px solid rgba(245,158,11,.2); color: #d97706; }

      /* product name */
      .pd-name {
        font-family: 'Bebas Neue', sans-serif;
        font-size: clamp(30px, 4.5vw, 46px);
        color: #1e1b2e; letter-spacing: .02em; line-height: 1.05;
        margin-bottom: 12px;
      }
      .pd-name-variant { color: #7c3aed; font-size: clamp(20px, 3vw, 32px); opacity: 0.8; font-family: 'DM Sans', sans-serif; font-weight: 600; }

      /* rating row */
      .pd-rat-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
      .pd-stars { display: flex; gap: 2px; }
      .pd-star { width: 15px; height: 15px; }
      .pd-rat-ct { font-size: 12px; color: #6b7280; font-weight: 600; }
      .pd-rev-btn {
        font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        color: #7c3aed; background: none; border: none; cursor: pointer;
        font-family: 'DM Sans', sans-serif; text-decoration: underline; text-underline-offset: 3px; padding: 0;
        transition: color .15s;
      }
      .pd-rev-btn:hover { color: #6d28d9; }

      /* ─── PRICE BLOCK ─── */
      .pd-price-block {
        background: linear-gradient(165deg, rgba(255,255,255,.95) 0%, rgba(250,245,255,.92) 100%);
        border: 1px solid rgba(124,58,237,.14);
        border-radius: 22px; padding: 22px 24px 20px;
        margin-bottom: 20px; position: relative; overflow: hidden;
        box-shadow:
          0 1px 0 rgba(255,255,255,.9) inset,
          0 12px 32px -8px rgba(76,29,149,.12);
      }
      .pd-price-block::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
        background: linear-gradient(90deg, transparent, #7c3aed 25%, #c4b5fd 55%, #7c3aed 75%, transparent);
        opacity: .95;
      }
      .pd-price-main {
        font-family: 'Bebas Neue', sans-serif;
        font-size: clamp(34px, 5.5vw, 52px);
        color: #7c3aed; letter-spacing: .03em; line-height: 1;
      }
      .pd-price-main .pd-unit { font-size: 45%; opacity: .55; margin-left: 2px; }
      .pd-price-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
      .pd-price-mrp { font-size: 13px; color: #9ca3af; text-decoration: line-through; font-weight: 500; }
      .pd-price-save { font-size: 12px; color: #059669; font-weight: 700; background: rgba(5,150,105,.08); border: 1px solid rgba(5,150,105,.18); padding: 2px 10px; border-radius: 6px; }
      .pd-price-gst { font-size: 11px; color: #9ca3af; font-weight: 600; margin-top: 4px; }
      .pd-price-trend {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 7px;
      }
      .pd-trend-down { background: rgba(5,150,105,.1); color: #059669; }
      .pd-trend-up   { background: rgba(239,68,68,.1);  color: #dc2626; }

      /* masked price */
      .pd-price-mask {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 10px 16px; border-radius: 12px;
        background: linear-gradient(135deg, rgba(124,58,237,.09), rgba(99,102,241,.07));
        border: 1px solid rgba(124,58,237,.2);
        cursor: pointer; text-decoration: none; transition: all .2s;
        position: relative; overflow: hidden; margin-bottom: 4px;
      }
      .pd-price-mask::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
        transform: translateX(-100%); animation: pdSheen 3.5s ease infinite;
      }
      .pd-price-mask:hover { background: rgba(124,58,237,.14); border-color: rgba(124,58,237,.35); }
      .pd-mask-rupee { font-size: 18px; font-weight: 800; color: #7c3aed; }
      .pd-mask-stars {
        font-family: monospace; font-size: 20px; font-weight: 900;
        color: #7c3aed; letter-spacing: 4px; filter: blur(5px);
        user-select: none; animation: pdMaskPulse 4s ease infinite;
      }
      .pd-mask-eye { color: #7c3aed; }
      .pd-mask-hint { font-size: 11px; color: #7c3aed; font-weight: 600; margin-top: 6px; }

      /* qty controller */
      .pd-qty-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
      .pd-qty {
        display: inline-flex; align-items: center;
        background: white; border: 1.5px solid rgba(124,58,237,.25); border-radius: 14px; 
        overflow: hidden; box-shadow: 0 2px 8px rgba(124,58,237,0.06);
      }
      .pd-qty-btn {
        width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 700; color: #7c3aed;
        background: none; border: none; cursor: pointer; 
        transition: all .2s cubic-bezier(0.4, 0, 0.2, 1); 
        font-family: 'DM Sans', sans-serif;
      }
      .pd-qty-btn:hover:not(:disabled) { background: #f5f3ff; color: #6d28d9; }
      .pd-qty-btn:active:not(:disabled) { transform: scale(0.9); }
      .pd-qty-btn:disabled { opacity: .3; cursor: not-allowed; }
      .pd-qty-val {
        min-width: 50px; text-align: center; font-size: 16px; font-weight: 800; color: #1e1b2e;
        border-left: 1px solid rgba(124,58,237,.12); border-right: 1px solid rgba(124,58,237,.12);
        padding: 0 10px; line-height: 42px; background: white;
      }
      .pd-save-tag {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 700; color: #059669;
        background: rgba(5,150,105,.08); border: 1px solid rgba(5,150,105,.18);
        padding: 5px 12px; border-radius: 8px;
      }
      .pd-mintier-tag {
        font-size: 11px; font-weight: 700; color: #d97706;
        background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.18);
        padding: 5px 12px; border-radius: 8px;
      }

      /* ─── STOCK STATUS ─── */
      .pd-stock {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 8px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        padding: 3px 10px; border-radius: 100px; margin-bottom: 0; line-height: 1.25;
        max-width: 100%;
      }
      .pd-stock-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

      /* ─── HIGHLIGHTS / SPECS (single card, tabbed) ─── */
      .pd-hl-spec-tabs {
        display: flex; gap: 0;
        padding: 0 10px;
        border-bottom: 1px solid rgba(124,58,237,.08);
        background: linear-gradient(180deg, rgba(124,58,237,.04), transparent);
      }
      .pd-hl-spec-tabs button {
        flex: 1;
        padding: 9px 12px;
        border: none; background: transparent; cursor: pointer; font-family: 'DM Sans', sans-serif;
        font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase;
        color: #a1a1aa;
        border-bottom: 2px solid transparent; margin-bottom: -1px;
        transition: color .2s, border-color .2s;
      }
      .pd-hl-spec-tabs button.on {
        color: #7c3aed;
        border-bottom-color: #7c3aed;
      }
      .pd-hl-spec-card .pd-card-body { padding: 14px 16px 16px; }
      .pd-hl-spec-card .pd-hl-item {
        padding: 10px 12px;
        font-size: 12px;
        gap: 8px;
      }
      .pd-hl-spec-card .pd-hl-dot { width: 6px; height: 6px; margin-top: 4px; }
      .pd-hl-spec-card .pd-spec-table td { padding: 8px 0; font-size: 12px; }
      .pd-hl-spec-card .pd-spec-table td:first-child { font-size: 11px; width: 40%; }
      @keyframes pdStockPulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.4;transform:scale(.65);} }

      /* ─── CTA BUTTONS ─── */
      .pd-cta { display: flex; gap: 12px; flex-wrap: wrap; }
      .pd-btn-primary {
        flex: 1; min-width: 160px;
        background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; border: none;
        padding: 16px 32px; border-radius: 14px;
        font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase;
        cursor: pointer; font-family: 'DM Sans', sans-serif; 
        transition: all .3s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 8px 24px rgba(124,58,237,.3);
        display: flex; align-items: center; justify-content: center; gap: 10px;
        position: relative; overflow: hidden;
      }
      .pd-btn-primary::after {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transform: translateX(-100%); transition: transform 0.6s;
      }
      .pd-btn-primary:hover:not(:disabled) { 
        transform: translateY(-4px) scale(1.02); 
        box-shadow: 0 16px 48px rgba(124,58,237,.45); 
      }
      .pd-btn-primary:hover::after { transform: translateX(100%); }
      .pd-btn-primary:active:not(:disabled) { transform: translateY(-1px) scale(0.97); }
      .pd-btn-primary:disabled { background: #f3f4f6; color: #d1d5db; box-shadow: none; cursor: not-allowed; transform: none; }

      /* ─── TRUST STRIP ─── */
      .pd-trust { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 16px; border-top: 1px solid rgba(124,58,237,.08); margin-top: 16px; }
      .pd-trust-item { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; color: #6b7280; }

      /* ─── DELIVERY PANEL ─── */
      .pd-delivery {
        background: white; border: 1px solid rgba(124,58,237,.12);
        border-radius: 18px; overflow: hidden; margin-bottom: 18px;
        box-shadow: 0 4px 20px rgba(124,58,237,.05);
      }
      .pd-delivery-head {
        background: linear-gradient(135deg, rgba(124,58,237,.05), rgba(99,102,241,.04));
        border-bottom: 1px solid rgba(124,58,237,.08);
        padding: 14px 18px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .pd-delivery-head-left { display: flex; align-items: center; gap: 12px; }
      .pd-del-ico { width: 38px; height: 38px; border-radius: 10px; background: white; border: 1px solid rgba(124,58,237,.12); display: flex; align-items: center; justify-content: center; color: #7c3aed; box-shadow: 0 2px 8px rgba(124,58,237,.08); flex-shrink: 0; }
      .pd-del-label { font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #9ca3af; }
      .pd-del-countdown { font-size: 13px; font-weight: 800; color: #dc2626; font-family: monospace; letter-spacing: .04em; }
      .pd-del-ships-lbl { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: #059669; text-align: right; }
      .pd-del-ships-val { font-size: 13px; font-weight: 800; color: #1e1b2e; text-align: right; }
      .pd-delivery-body { padding: 16px 18px; }
      .pd-del-pinput { display: flex; gap: 8px; }
      .pd-del-inp {
        flex: 1; padding: 10px 14px; border-radius: 11px;
        border: 1.5px solid rgba(124,58,237,.18);
        font-size: 13px; font-weight: 600; color: #1e1b2e;
        outline: none; font-family: 'DM Sans', sans-serif; transition: all .2s;
      }
      .pd-del-inp:focus { border-color: rgba(124,58,237,.45); box-shadow: 0 0 0 3px rgba(124,58,237,.08); }
      .pd-del-check {
        padding: 10px 22px; border-radius: 12px; border: none;
        background: #7c3aed; color: white;
        font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
        cursor: pointer; font-family: 'DM Sans', sans-serif; 
        transition: all .25s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(124,58,237,.25);
      }
      .pd-del-check:hover { background: #6d28d9; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(124,58,237,.35); }
      .pd-del-check:active { transform: translateY(0) scale(0.96); }

      .pd-del-result {
        margin-top: 12px; display: flex; align-items: center; gap: 10px;
        background: rgba(5,150,105,.06); border: 1px solid rgba(5,150,105,.18);
        border-radius: 14px; padding: 12px 16px;
      }
      .pd-del-res-ico { width: 34px; height: 34px; border-radius: 10px; background: rgba(5,150,105,.12); display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0; }
      .pd-del-res-lbl { font-size: 9px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: #059669; }
      .pd-del-res-date { font-size: 13px; font-weight: 800; color: #1e1b2e; margin-top: 1px; }
      .pd-del-addr { display: flex; align-items: center; justify-content: space-between; }
      .pd-del-addr-left { display: flex; align-items: center; gap: 10px; }
      .pd-del-addr-ico { width: 38px; height: 38px; border-radius: 10px; background: rgba(124,58,237,.08); display: flex; align-items: center; justify-content: center; color: #7c3aed; flex-shrink: 0; }
      .pd-del-change {
        font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
        color: #7c3aed; background: white; border: 1.5px solid rgba(124,58,237,.25);
        padding: 8px 16px; border-radius: 10px; cursor: pointer; font-family: 'DM Sans', sans-serif;
        transition: all .25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(124,58,237,.06);
      }
      .pd-del-change:hover { 
        background: #fdfcff; 
        border-color: #7c3aed;
        transform: translateY(-2px); 
        box-shadow: 0 4px 12px rgba(124,58,237,.12);
      }
      .pd-del-change:active { transform: translateY(0) scale(0.96); }

      /* ─── SECTION CARD ─── */
      .pd-card {
        background: linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(250,249,255,.96) 100%);
        border: 1px solid rgba(124,58,237,.11);
        border-radius: 22px; overflow: hidden; margin-bottom: 14px;
        box-shadow:
          0 1px 0 rgba(255,255,255,.9) inset,
          0 10px 36px -12px rgba(76,29,149,.1);
        position: relative;
      }
      .pd-card::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, rgba(124,58,237,.35), rgba(167,139,250,.4), transparent);
        opacity: .9;
      }
      .pd-card-head {
        padding: 18px 22px 15px; border-bottom: 1px solid rgba(124,58,237,.06);
        display: flex; align-items: center; gap: 12px;
        background: linear-gradient(180deg, rgba(124,58,237,.03), transparent);
      }
      .pd-card-head-ico {
        width: 40px; height: 40px; border-radius: 12px;
        background: linear-gradient(135deg, rgba(124,58,237,.14), rgba(99,102,241,.1));
        display: flex; align-items: center; justify-content: center; color: #6d28d9; flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(124,58,237,.12);
      }
      .pd-card-head-label { font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #a1a1aa; }
      .pd-card-head-title { font-family: 'Bebas Neue', sans-serif; font-size: 19px; font-weight: 400; color: #18181b; margin-top: 2px; letter-spacing: .04em; }
      .pd-card-body { padding: 20px 22px 22px; }

      /* ─── BULK PRICING TABLE ─── */
      .pd-bulk-table { width: 100%; border-collapse: separate; border-spacing: 0; }
      .pd-bulk-table thead tr { background: #f9f7ff; }
      .pd-bulk-table th {
        padding: 11px 16px; text-align: left;
        font-size: 9px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #9ca3af;
        border-bottom: 1px solid rgba(124,58,237,.08);
      }
      .pd-bulk-table th:last-child { text-align: right; }
      .pd-bulk-table td {
        padding: 14px 16px; font-size: 13px; font-weight: 600; color: #4b5563;
        border-bottom: 1px solid rgba(124,58,237,.05); transition: all .2s;
      }
      .pd-bulk-table td:last-child { text-align: right; }
      .pd-bulk-table tbody tr:last-child td { border-bottom: none; }
      /* active tier row */
      .pd-bulk-table tbody tr.pd-tier-hit td {
        background: linear-gradient(135deg, rgba(124,58,237,.06), rgba(99,102,241,.04));
        color: #1e1b2e;
      }
      .pd-bulk-table tbody tr.pd-tier-hit td:first-child { border-left: 3px solid #7c3aed; padding-left: 13px; }
      /* qty cell */
      .pd-tier-qty { font-weight: 800; color: #1e1b2e; display: flex; align-items: center; gap: 8px; }
      .pd-tier-current {
        display: inline-flex; align-items: center; gap: 3px;
        font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        color: white; background: #7c3aed; padding: 2px 7px; border-radius: 5px;
        animation: pdTierIn .35s cubic-bezier(.34,1.56,.64,1) both;
      }
      @keyframes pdTierIn { from{opacity:0;transform:scale(.7);} to{opacity:1;transform:scale(1);} }
      /* price cell */
      .pd-tier-price { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: #7c3aed; letter-spacing: .03em; }
      /* save cell */
      .pd-tier-save {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 11px; font-weight: 700;
        padding: 4px 10px; border-radius: 7px;
        float: right;
      }
      .pd-tier-save.active { background: #7c3aed; color: white; box-shadow: 0 3px 10px rgba(124,58,237,.3); }
      .pd-tier-save.normal { background: rgba(124,58,237,.08); color: #7c3aed; border: 1px solid rgba(124,58,237,.15); }
      /* bulk progress bar */
      .pd-bulk-progress { margin-top: 16px; padding: 14px 16px; background: rgba(124,58,237,.04); border: 1px solid rgba(124,58,237,.1); border-radius: 12px; }
      .pd-bulk-prog-label { font-size: 11px; font-weight: 700; color: #6b7280; margin-bottom: 8px; display: flex; justify-content: space-between; }
      .pd-bulk-prog-label span { color: #7c3aed; font-weight: 800; }
      .pd-bulk-prog-bar { height: 6px; background: rgba(124,58,237,.12); border-radius: 100px; overflow: hidden; }
      .pd-bulk-prog-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); border-radius: 100px; transition: width .4s cubic-bezier(.34,1.56,.64,1); }

      /* ─── HIGHLIGHTS ─── */
      .pd-hl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (max-width: 520px) { .pd-hl-grid { grid-template-columns: 1fr; } }
      .pd-hl-item {
        display: flex; align-items: flex-start; gap: 10px;
        font-size: 13px; color: #3f3f46; font-weight: 500; line-height: 1.45;
        padding: 14px 14px 14px 16px;
        background: linear-gradient(135deg, rgba(124,58,237,.06), rgba(255,255,255,.9));
        border-radius: 14px;
        border: 1px solid rgba(124,58,237,.1);
        box-shadow: 0 2px 8px rgba(124,58,237,.04);
      }
      .pd-hl-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: linear-gradient(135deg, #7c3aed, #a78bfa);
        margin-top: 5px; flex-shrink: 0;
        box-shadow: 0 0 0 3px rgba(124,58,237,.12);
      }

      /* ─── DESCRIPTION ─── */
      .pd-desc { font-size: 14.5px; color: #52525b; font-weight: 400; line-height: 1.92; white-space: pre-line; letter-spacing: .01em; }
      .pd-spec-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .pd-spec-table tr { border-bottom: 1px solid rgba(124,58,237,.07); transition: background .15s; }
      .pd-spec-table tr:hover { background: rgba(124,58,237,.03); }
      .pd-spec-table td { padding: 12px 0; vertical-align: top; }
      .pd-spec-table td:first-child { color: #71717a; font-weight: 600; width: 38%; padding-right: 14px; font-size: 12.5px; letter-spacing: .02em; }
      .pd-spec-table td:last-child { color: #18181b; font-weight: 600; }

      /* ─── BELOW SECTIONS ─── */
      .pd-below { max-width: 1260px; margin: 0 auto; padding: 0 16px 80px; position: relative; z-index: 1; }
      @media (min-width: 768px) { .pd-below { padding: 0 24px 80px; } }
      .pd-below-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
      .pd-below-title { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #1e1b2e; letter-spacing: .03em; line-height: 1; }
      .pd-view-all {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
        color: #7c3aed; text-decoration: none; transition: gap .2s;
      }
      .pd-view-all:hover { gap: 8px; }

      /* rec scroll */
      .pd-rec-scroll { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding-bottom: 8px; }
      @media (min-width: 500px) { .pd-rec-scroll { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      @media (min-width: 900px) { .pd-rec-scroll { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      @media (min-width: 1100px) { .pd-rec-scroll { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
      .pd-rec-item {
        background: white;
        border-radius: 18px; overflow: hidden;
        border: 1px solid rgba(124,58,237,.09);
        cursor: pointer; transition: all .28s;
        box-shadow: 0 2px 12px rgba(124,58,237,.05);
      }
      .pd-rec-item:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(124,58,237,.12); border-color: rgba(124,58,237,.2); }
      .pd-rec-img { aspect-ratio: 1; background: #f9f7ff; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .pd-rec-img img { width: 100%; height: 100%; object-fit: contain; padding: 16px; transition: transform .4s; }
      .pd-rec-item:hover .pd-rec-img img { transform: scale(1.08); }
      .pd-rec-body { padding: 12px 14px; }
      .pd-rec-cat { font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #9ca3af; margin-bottom: 3px; }
      .pd-rec-name { font-size: 12px; font-weight: 700; color: #1e1b2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pd-rec-price { font-family: 'Bebas Neue', sans-serif; font-size: 17px; color: #7c3aed; letter-spacing: .03em; margin-top: 4px; }

      /* ─── LIGHTBOX ─── */
      .pd-lightbox {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(0,0,0,.88); backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
        animation: pdFadeIn .2s ease both;
      }
      .pd-lb-inner { position: relative; max-width: 860px; width: 100%; }
      .pd-lb-img { width: 100%; max-height: 72vh; object-fit: contain; border-radius: 18px; background: white; padding: 16px; }
      .pd-lb-close {
        position: absolute; top: -12px; right: -12px;
        width: 38px; height: 38px; border-radius: 100px;
        background: white; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,.2); transition: transform .15s;
      }
      .pd-lb-close:hover { transform: scale(1.1); }
      .pd-lb-nav { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 8px; }
      .pd-lb-navbtn {
        padding: 8px 18px; border-radius: 10px; background: rgba(255,255,255,.9); border: none;
        font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s;
      }
      .pd-lb-navbtn:hover:not(:disabled) { background: white; }
      .pd-lb-navbtn:disabled { opacity: .3; cursor: not-allowed; }
      .pd-lb-thumbs { display: flex; gap: 6px; overflow-x: auto; flex: 1; justify-content: center; scrollbar-width: none; }
      .pd-lb-thumbs::-webkit-scrollbar { display: none; }
      .pd-lb-thumb {
        width: 50px; height: 50px; flex-shrink: 0; border-radius: 8px;
        overflow: hidden; border: 2px solid transparent; cursor: pointer; background: white;
      }
      .pd-lb-thumb.on { border-color: #7c3aed; }
      .pd-lb-thumb img { width: 100%; height: 100%; object-fit: contain; }

      /* ─── REVIEW MODAL ─── */
      .pd-modal-back {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(0,0,0,.6); backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .pd-modal {
        background: white; border-radius: 22px; padding: 28px;
        width: 100%; max-width: 400px; position: relative; overflow: hidden;
      }
      .pd-modal::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, #7c3aed, transparent); border-radius: 22px 22px 0 0;
      }
      .pd-modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #1e1b2e; letter-spacing: .03em; margin-bottom: 16px; }
      .pd-modal-stars { display: flex; gap: 6px; margin-bottom: 16px; }
      .pd-modal-star { background: none; border: none; padding: 0; cursor: pointer; transition: transform .15s; }
      .pd-modal-star:hover { transform: scale(1.2); }
      .pd-modal-ta {
        width: 100%; background: #f5f3ff; border: 1.5px solid rgba(124,58,237,.18);
        border-radius: 12px; padding: 12px 14px;
        font-size: 13px; font-weight: 500; color: #1e1b2e;
        font-family: 'DM Sans', sans-serif; resize: none; outline: none; margin-bottom: 16px;
        transition: all .2s;
      }
      .pd-modal-ta:focus { border-color: rgba(124,58,237,.4); background: white; box-shadow: 0 0 0 3px rgba(124,58,237,.08); }
      .pd-modal-btns { display: flex; gap: 10px; }
      .pd-modal-cancel {
        flex: 1; padding: 11px; border-radius: 10px;
        background: #f5f3ff; border: 1px solid rgba(124,58,237,.15); color: #6b7280;
        font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .2s;
      }
      .pd-modal-cancel:hover { background: rgba(124,58,237,.08); }
      .pd-modal-submit {
        flex: 1; padding: 11px; border-radius: 10px;
        background: #7c3aed; color: white; border: none;
        font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
        cursor: pointer; font-family: 'DM Sans', sans-serif;
        box-shadow: 0 4px 14px rgba(124,58,237,.28); transition: all .2s;
      }
      .pd-modal-submit:hover { background: #6d28d9; }

      /* ─── HIGHLIGHTS & SPECS ─── */
      .pd-hl-spec-card { border: none !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
      .pd-hl-spec-tabs { display: flex; gap: 24px; border-bottom: 1.5px solid rgba(124,58,237,.1); margin-bottom: 24px; padding-bottom: 2px; }
      .pd-hl-spec-tabs button {
        font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: .02em;
        color: #9ca3af; cursor: pointer; position: relative; padding: 8px 4px;
        transition: color .2s; border: none; background: none; outline: none;
      }
      .pd-hl-spec-tabs button.on { color: #7c3aed; }
      .pd-hl-spec-tabs button::after {
        content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 3px;
        background: #7c3aed; border-radius: 100px; transform: scaleX(0); transition: transform .3s;
      }
      .pd-hl-spec-tabs button.on::after { transform: scaleX(1); }

      .pd-spec-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
      @media (min-width: 640px) { .pd-spec-grid { grid-template-columns: 1fr 1fr; gap: 16px; } }
      .pd-spec-item {
        background: white; border: 1px solid rgba(124,58,237,.08); border-radius: 14px;
        padding: 14px 18px; display: flex; flex-direction: column; gap: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,.02); transition: transform .2s, border-color .2s;
      }
      .pd-spec-item:hover { border-color: rgba(124,58,237,.25); transform: translateY(-2px); }
      .pd-spec-k { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: .08em; }
      .pd-spec-v { font-size: 14px; font-weight: 600; color: #1e1b2e; }

      .pd-hl-item {
        display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px;
        background: rgba(124,58,237,.04); padding: 12px 16px; border-radius: 14px;
        border: 1px solid rgba(124,58,237,.06);
      }
      .pd-hl-dot { width: 6px; height: 6px; border-radius: 50%; background: #7c3aed; margin-top: 7px; flex-shrink: 0; }
      /* ─── ANIMATIONS ─── */
      @keyframes pdFadeIn  { from{opacity:0;} to{opacity:1;} }
      @keyframes pdFadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
      @keyframes pdSheen   { 0%,70%,100%{transform:translateX(-100%);} 35%{transform:translateX(200%);} }
      @keyframes pdMaskPulse { 0%,90%,100%{filter:blur(5px);} 94%{filter:blur(3px);} }
      @keyframes pdStockPulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.2);opacity:.7;} }
    `}</style>

      <div className="pd">
        <div className="pd-glow1" /><div className="pd-glow2" />

        {/* ── TOPBAR ── */}
        <div className="pd-topbar">
          <button className="pd-back" onClick={() => navigate(-1)}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Back
          </button>
          <div className="pd-breadcrumb">
            <span>Catalogue</span>
            <span className="pd-breadcrumb-sep">›</span>
            {p.category && <><span>{p.category?.name || p.category}</span><span className="pd-breadcrumb-sep">›</span></>}
            <span>{p.name}</span>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="pd-wrap">
          <div className="pd-grid">

            {/* ══ LEFT — IMAGE PANEL ══ */}
            <div className="pd-img-panel pd-reveal">
              <div
                className="pd-img-main"
                onMouseEnter={() => setZoom(z => ({ ...z, on: true }))}
                onMouseLeave={() => setZoom({ on: false, x: 50, y: 50 })}
                onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}
                onTouchStart={onMainImgTouchStart}
                onTouchEnd={onMainImgTouchEnd}
                onTouchCancel={onMainImgTouchCancel}
                onClick={onMainImgClick}
              >
                {currentImg
                  ? (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-3xl bg-gray-50">
                      {imgLoading && (
                        <img
                          src={getCloudinaryUrl(currentImg, 50, true)}
                          className="absolute inset-0 w-full h-full object-contain blur-2xl scale-110"
                          alt=""
                        />
                      )}
                      <img
                        key={activeImg}
                        className={`pd-main-photo transition-opacity duration-500 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
                        src={getCloudinaryUrl(currentImg, 800)}
                        alt={p.name}
                        draggable={false}
                        loading="lazy"
                        width="800"
                        height="800"
                        onLoad={() => setImgLoading(false)}
                        style={{ transform: zoom.on ? 'scale(1.55)' : 'scale(1)', transformOrigin: `${zoom.x}% ${zoom.y}%` }}
                      />
                    </div>
                  )
                  : <span style={{ fontSize: 80, opacity: .2 }}>📦</span>
                }
                {/* image corner chips */}
                {(isBestseller || isHotDeal) && (
                  <div className="pd-img-chips">
                    {isBestseller && <span className="pd-img-chip bs">⭐ Bestseller</span>}
                    {isHotDeal && <span className="pd-img-chip hd">🔥 Hot Deal</span>}
                  </div>
                )}
              </div>

              {imgs.length > 1 && (
                <div className="pd-img-dots" aria-hidden="true">
                  {imgs.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`pd-img-dot${i === activeImg ? ' on' : ''}`}
                      onClick={() => setActiveImg(i)}
                      aria-label={`Image ${i + 1}`}
                      aria-current={i === activeImg ? 'true' : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Variant rows: wrap or horizontal scroll when many values */}
              {/* Only show traditional selector when admin has NOT chosen matrix display */}
              {p.variantDisplayType !== 'matrix' && Array.isArray(p.variants) && p.variants.length > 0 && (
                <div className="pd-variants">
                  {variantAttrs.map(attrKey => {
                    const lowKey = attrKey.toLowerCase().trim()
                    const options = variantOpts(attrKey)
                    if (!options.length) return null
                    const currentVal = selected[lowKey]
                    const isManyOptions = options.length > 6
                    const isVeryManyOptions = options.length > 14
                    const useImageSwatch =
                      (/color|colour|finish|shade/i.test(lowKey) && !/temperature|connector/i.test(lowKey)) &&
                      options.length <= 14

                    return (
                      <div key={attrKey} className="pd-var-sec">
                        <div className="pd-var-header">
                          <div className="pd-var-lbl">
                            <span className="pd-var-icon">{variantAttrIconEmoji(lowKey)}</span>
                            <span className="pd-var-name">{attrKey === 'Option' ? 'SELECT OPTION' : attrKey.toUpperCase()}</span>
                          </div>
                          {currentVal && <span className="pd-var-selected">{String(currentVal).toUpperCase()}</span>}
                        </div>
                        {isManyOptions && (
                          <div className="pd-var-scroll-hint">Swipe sideways for more</div>
                        )}
                        <div className={`pd-var-opts${isManyOptions ? ' has-many' : ''}${isVeryManyOptions ? ' has-very-many' : ''}`}>
                          {options.map((opt, i) => {
                            const enabled = isOptEnabled(attrKey, opt)
                            const on = selected[lowKey] === opt

                            // Find a representative variant for this option to show price/image
                            const repVariant = p.variants?.find(v =>
                              v.isActive !== false &&
                              (lowKey === 'option' ? (v.sku === opt || v._id === opt) : (
                                String(normalizeAttrs(v.attributes, v.sku, p.attributes)[lowKey] || '').toLowerCase() === String(opt || '').toLowerCase() &&
                                Object.entries(selected).every(([k, vVal]) => {
                                  if (k.toLowerCase().trim() === lowKey || !vVal) return true
                                  const lk = k.toLowerCase().trim()
                                  return String(normalizeAttrs(v.attributes, v.sku, p.attributes)[lk] || '').toLowerCase() === String(vVal || '').toLowerCase();
                                })
                              ))
                            ) || p.variants?.find(v => v.isActive !== false && (lowKey === 'option' ? (v.sku === opt || v._id === opt) : String(normalizeAttrs(v.attributes, v.sku, p.attributes)[lowKey] || '').toLowerCase() === String(opt || '').toLowerCase()));

                            if (useImageSwatch) {
                              const imgUrl = (repVariant?.images?.[0]?.url) || (Array.isArray(p.images) ? p.images[0]?.url : null);
                              return (
                                <div
                                  key={i}
                                  className={`pd-var-img-btn${on ? ' on' : ''}${!enabled ? ' disabled' : ''}`}
                                  onClick={() => enabled && setSelected(prev => {
                                    const next = { ...prev };
                                    if (on) delete next[lowKey];
                                    else next[lowKey] = opt;
                                    return next;
                                  })}
                                  title={opt}
                                >
                                  {imgUrl ? <img src={getCloudinaryUrl(imgUrl, 100)} alt={opt} loading="lazy" width="40" height="40" /> : <span className="text-[10px] uppercase font-bold">{String(opt).charAt(0).toUpperCase()}</span>}
                                  <span className="pd-var-val">{String(opt).toUpperCase()}</span>
                                  {!enabled && <span className="pd-var-oos">OOS</span>}
                                </div>
                              )
                            }

                            return (
                              <button
                                key={i}
                                className={`pd-var-btn${on ? ' on' : ''}${!enabled ? ' disabled' : ''}`}
                                onClick={() => enabled && setSelected(prev => {
                                  const next = { ...prev };
                                  if (on) delete next[lowKey];
                                  else next[lowKey] = opt;
                                  return next;
                                })}
                              >
                                <span className="pd-var-val">{String(opt).toUpperCase()}</span>
                                {!enabled && <span className="pd-var-oos">OOS</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Variant Matrix — shown when admin chose matrix display */}
              {p.variantDisplayType === 'matrix' && Array.isArray(p.variants) && p.variants.length > 0 && (
                <VariantMatrix
                  variants={p.variants.filter(v => v.isActive !== false)}
                  product={p}
                  authed={authed}
                  addToCart={addToCart}
                  notify={notify}
                  navigate={navigate}
                  setRecItems={setRecItems}
                  setRecOpen={setRecOpen}
                />
              )}
            </div>

            {/* ══ RIGHT — INFO PANEL ══ */}
            <div className="pd-info pd-reveal pd-reveal-delay">

              {/* badges + stock — one compact strip */}
              <div className="pd-meta-compact">
                <div className="pd-badges">
                  {p.category && <span className="pd-badge pd-badge-v">{p.category?.name || p.category}</span>}
                  <span className="pd-badge pd-badge-g">✓ GST</span>
                  <span className="pd-badge pd-badge-a">⚡ Dispatch</span>
                </div>
                <div className="pd-stock" style={{
                  background: stock > 0 ? (stock <= 5 ? 'rgba(245,158,11,.1)' : 'rgba(5,150,105,.1)') : 'rgba(220,38,38,.1)',
                  border: `1px solid ${stock > 0 ? (stock <= 5 ? 'rgba(245,158,11,.25)' : 'rgba(5,150,105,.25)') : 'rgba(220,38,38,.25)'}`,
                  color: stock > 0 ? (stock <= 5 ? '#d97706' : '#059669') : '#dc2626',
                }}>
                  <span className="pd-stock-dot" style={{
                    background: stock > 0 ? (stock <= 5 ? '#d97706' : '#10b981') : '#ef4444',
                    boxShadow: `0 0 4px ${stock > 0 ? (stock <= 5 ? '#d97706' : '#10b981') : '#ef4444'}`,
                    animation: stock <= 5 && stock > 0 ? 'pdStockPulse 2s infinite' : 'none',
                  }} />
                  {stockSt.text}
                </div>
              </div>

              {/* name */}
              <h1 className="pd-name">
                {p.name}
                {matchedVariant && (
                  <span className="pd-name-variant">
                    {' '}({(() => {
                      const attrs = normalizeAttrs(matchedVariant.attributes, matchedVariant.sku, p.attributes);
                      const values = Object.values(attrs);
                      if (values.length > 0) return values.join(', ').toUpperCase();
                      if (matchedVariant.sku) return matchedVariant.sku.toUpperCase();
                      return 'SELECTED';
                    })()})
                  </span>
                )}
              </h1>

              {/* rating */}
              <div className="pd-rat-row">
                <div className="pd-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="pd-star" viewBox="0 0 24 24">
                      <path d="M12 .587l3.668 7.431L24 9.748l-6 5.848L19.335 24 12 19.771 4.665 24 6 15.596 0 9.748l8.332-1.73z"
                        fill={i < Math.round(p.ratingAvg || 0) ? '#f59e0b' : '#e5e7eb'} />
                    </svg>
                  ))}
                </div>
                <span className="pd-rat-ct">{Number(p.ratingAvg || 0).toFixed(1)} ({p.ratingCount || 0} ratings)</span>
              </div>

              {/* PRICE BLOCK */}
              <div className="pd-price-block">
                {authed ? (
                  <>
                    <div className="pd-price-row">
                      <div className="pd-price-main">
                        ₹{effPrice.toLocaleString()}<span className="pd-unit">/unit</span>
                      </div>
                      {mrp > 0 && <span className="pd-price-mrp">MRP ₹{mrp.toLocaleString()}</span>}
                      {unitSave > 0 && <span className="pd-price-save">Save ₹{unitSave.toLocaleString()}/unit</span>}
                      {p.priceTrend !== undefined && (
                        <div className={`pd-price-trend ${p.priceTrend === 0 ? 'pd-trend-down' : 'pd-trend-up'}`}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            {p.priceTrend === 0
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M7 13l5 5 5-5M12 18V6" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5 5 5M12 6v12" />}
                          </svg>
                          {p.priceTrend === 0 ? 'Price Drop' : 'Trending Up'}
                        </div>
                      )}
                    </div>
                    <div className="pd-price-gst">Inclusive of {gstRate}% GST</div>

                    {/* qty */}
                    <div className="pd-qty-row">
                      <div className="pd-qty">
                        <button className="pd-qty-btn"
                          disabled={qty <= Math.max(1, Number(p.minOrderQty || 1))}
                          onClick={() => {
                            const packSize = Number(p.packSize || 1)
                            setQty(q => Math.max(Math.max(1, Number(p.minOrderQty || 1)), q - packSize))
                          }}>−</button>
                        <div className="pd-qty-val">{qty}</div>
                        <button className="pd-qty-btn" onClick={() => {
                          const packSize = Number(p.packSize || 1)
                          setQty(q => q + packSize)
                        }}>+</button>
                      </div>
                      {p.packSize > 1 && (
                        <span className="pd-save-tag">
                          Pack size: {p.packSize} units
                        </span>
                      )}
                      {savingsTotal > 0 && (
                        <span className="pd-save-tag">
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Saving ₹{savingsTotal.toLocaleString()} total
                        </span>
                      )}
                      {sortedAsc.length > 0 && qty < minTierQty && (
                        <span className="pd-mintier-tag">Min {minTierQty} units for bulk price</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/login" state={{ from: location.pathname + location.search }} className="pd-price-mask" onClick={e => e.stopPropagation()}>
                      <span className="pd-mask-rupee">₹</span>
                      <span className="pd-mask-stars">*****</span>
                      <svg className="pd-mask-eye" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <div className="pd-mask-hint">🔒 Login to view B2B wholesale price</div>
                  </>
                )}
              </div>

              {/* DELIVERY PANEL */}
              <div className="pd-delivery">
                <div className="pd-delivery-head">
                  <div className="pd-delivery-head-left">
                    <div className="pd-del-ico">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="pd-del-label">Express Dispatch</div>
                      <div className="pd-del-countdown">
                        {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="pd-del-ships-lbl">Ships</div>
                    <div className="pd-del-ships-val">{new Date().getHours() < 18 ? 'Today' : 'Tomorrow'}</div>
                  </div>
                </div>

                <div className="pd-delivery-body">
                  {kycLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#f5f3ff', animation: 'pdFadeIn .5s ease infinite alternate' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, background: '#f5f3ff', borderRadius: 6, width: '40%', marginBottom: 6 }} />
                        <div style={{ height: 10, background: '#f5f3ff', borderRadius: 6, width: '60%' }} />
                      </div>
                    </div>
                  ) : kycData?.pincode ? (
                    <>
                      <div className="pd-del-addr">
                        <div className="pd-del-addr-left">
                          <div className="pd-del-addr-ico">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9ca3af' }}>Shipping to Business</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#1e1b2e', marginTop: 2 }}>{kycData.city || 'Your Hub'}, {pincode}</div>
                          </div>
                        </div>
                        <button className="pd-del-change" onClick={() => { setKycData(null); setPincode(''); setDeliveryDate(null) }}>Change</button>
                      </div>
                      {deliveryDate && (
                        <div className="pd-del-result" style={{ marginTop: 12 }}>
                          <div className="pd-del-res-ico">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <div className="pd-del-res-lbl">Estimated Delivery</div>
                            <div className="pd-del-res-date">by {deliveryDate}</div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>Check Delivery Availability</div>
                      <form className="pd-del-pinput" onSubmit={checkDelivery}>
                        <input
                          className="pd-del-inp" type="text" maxLength="6"
                          placeholder="Enter 6-digit Pincode"
                          value={pincode}
                          onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                        />
                        <button type="submit" className="pd-del-check">Check</button>
                      </form>
                      {deliveryDate && (
                        <div className="pd-del-result">
                          <div className="pd-del-res-ico">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <div>
                            <div className="pd-del-res-lbl">Estimated Delivery</div>
                            <div className="pd-del-res-date">by {deliveryDate}</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="pd-cta" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  className="pd-btn-primary"
                  style={{ flex: 1 }}
                  disabled={!authed || !isAvailable || (variantAttrs.length > 0 && !matchedVariant) || (sortedAsc.length > 0 && qty < minTierQty)}
                  onClick={handleAddToCart}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 6h13l-1.2 7H9.2L7 6Z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="10" cy="19" r="1.4" fill="currentColor" />
                    <circle cx="17" cy="19" r="1.4" fill="currentColor" />
                  </svg>
                  {!authed ? 'Login to Buy' : !isAvailable ? 'Out of Stock' : (variantAttrs.length > 0 && !matchedVariant) ? 'Choose Product Options' : (sortedAsc.length > 0 && qty < minTierQty) ? `Min Order ${minTierQty}` : 'Add to Cart'}
                </button>
              </div>

              {/* TRUST STRIP */}
              <div className="pd-trust">
                {[['🔒', 'Secure Payment'], ['✅', 'Verified Genuine'], ['🧾', 'GST Invoice'], ['⚡', 'Fast Dispatch'], ['📦', 'Pan India Delivery']].map(([ico, t]) => (
                  <div key={t} className="pd-trust-item"><span style={{ fontSize: 13 }}>{ico}</span><span>{t}</span></div>
                ))}
              </div>

              {/* BULK PRICING TABLE */}
              {authed && sortedAsc.length > 0 && (
                <div className="pd-card" style={{ marginTop: 22 }}>
                  <div className="pd-card-head">
                    <div className="pd-card-head-ico">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="pd-card-head-label">Wholesale Pricing</div>
                      <div className="pd-card-head-title">Bulk Purchase Tiers</div>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pd-bulk-table">
                      <thead>
                        <tr>
                          <th>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                              Qty Range
                            </div>
                          </th>
                          <th>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>
                              Price / Unit
                            </div>
                          </th>
                          <th>Your Savings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAsc.map((t, idx) => {
                          const next = sortedAsc[idx + 1]
                          const from = t.quantity
                          const to = next ? next.quantity - 1 : null
                          const label = to ? `${from} – ${to} units` : `${from}+ units`
                          const tierEff = Math.max(0, basePrice - Number(t.priceReduction || 0))
                          const perSave = Math.max(0, basePrice - tierEff)
                          const isHit = qty >= from && (!next || qty < next.quantity)
                          return (
                            <tr key={idx} className={isHit ? 'pd-tier-hit' : ''}>
                              <td>
                                <div className="pd-tier-qty">
                                  {label}
                                  {isHit && <span className="pd-tier-current">✓ Active</span>}
                                </div>
                              </td>
                              <td>
                                <div className="pd-tier-price">₹{tierEff.toLocaleString()}</div>
                              </td>
                              <td>
                                <span className={`pd-tier-save ${isHit ? 'active' : 'normal'}`}>
                                  {isHit && <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                  ₹{perSave.toLocaleString()} / unit
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Progress to next tier */}
                  {(() => {
                    const nextTier = sortedAsc.find(t => qty < Number(t.quantity))
                    if (!nextTier) return (
                      <div style={{ padding: '12px 16px', background: 'rgba(5,150,105,.05)', borderTop: '1px solid rgba(5,150,105,.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🎉</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>You're getting the best bulk price!</div>
                      </div>
                    )
                    const needed = Number(nextTier.quantity) - qty
                    const prevTier = sortedDesc.find(t => qty >= Number(t.quantity))
                    const from = prevTier ? Number(prevTier.quantity) : 1
                    const progress = Math.min(100, ((qty - from) / (Number(nextTier.quantity) - from)) * 100)
                    const nextEff = Math.max(0, basePrice - Number(nextTier.priceReduction || 0))
                    const extraSave = Math.max(0, effPrice - nextEff)
                    return (
                      <div className="pd-bulk-progress">
                        <div className="pd-bulk-prog-label">
                          <span>Add <span>{needed} more</span> units to unlock ₹{nextEff.toLocaleString()}/unit</span>
                          <span>Save extra ₹{extraSave}/unit</span>
                        </div>
                        <div className="pd-bulk-prog-bar">
                          <div className="pd-bulk-prog-fill" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* HIGHLIGHTS + SPECIFICATIONS — single card, tab toggle */}
              {(hasHighlights || hasSpecifications) && (
                <div className="pd-card pd-hl-spec-card" style={{ marginTop: 16 }}>
                  {hasHighlights && hasSpecifications && (
                    <div className="pd-hl-spec-tabs" role="tablist" aria-label="Product details">
                      <button type="button" role="tab" aria-selected={hlSpecTab === 'highlights'} className={hlSpecTab === 'highlights' ? 'on' : ''} onClick={() => setHlSpecTab('highlights')}>Highlights</button>
                      <button type="button" role="tab" aria-selected={hlSpecTab === 'specs'} className={hlSpecTab === 'specs' ? 'on' : ''} onClick={() => setHlSpecTab('specs')}>Specifications</button>
                    </div>
                  )}
                  <div className="pd-card-body" role="tabpanel">
                    {showHighlightsBlock && (
                      <div className="pd-hl-grid">
                        {p.highlights.map((h, i) => (
                          <div key={i} className="pd-hl-item">
                            <span className="pd-hl-dot" />
                            <span className="pd-hl-txt">{h}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {showSpecificationsBlock && (
                      <div className="pd-spec-grid">
                        {p.specifications.map((row, i) => (
                          <div key={i} className="pd-spec-item">
                            <span className="pd-spec-k">{row.key}</span>
                            <span className="pd-spec-v">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DESCRIPTION */}
              {p.description && (
                <div className="pd-card" style={{ marginTop: 16 }}>
                  <div className="pd-card-head">
                    <div className="pd-card-head-ico">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h12" />
                      </svg>
                    </div>
                    <div>
                      <div className="pd-card-head-label">Details</div>
                      <div className="pd-card-head-title">About This Product</div>
                    </div>
                  </div>
                  <div className="pd-card-body">
                    <p className="pd-desc">{p.description}</p>
                  </div>
                </div>
              )}

            </div>{/* end info panel */}
          </div>{/* end grid */}

          {/* ══ BELOW — RECOMMENDED ══ */}
          {similarProducts.length > 0 && (
            <div className="pd-below">
              <style>{`
                .pd-below { padding: 40px 0 60px; }
                .pd-below-header { 
                  margin-bottom: 24px; 
                  display: flex; 
                  flex-direction: column;
                  align-items: flex-start; 
                  gap: 16px;
                  border-bottom: 2px solid rgba(124,58,237,0.05);
                  padding-bottom: 20px;
                }
                .pd-below-title { 
                  font-family: 'Bebas Neue', sans-serif; 
                  font-size: 32px; 
                  line-height: 1;
                  letter-spacing: .01em; 
                  color: #1e1b2e; 
                }
                .pd-rec-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 10px;
                }
                
                @media (min-width: 640px) {
                  .pd-below { padding: 60px 0 80px; }
                  .pd-below-header { 
                    flex-direction: row;
                    align-items: flex-end; 
                    justify-content: space-between;
                    margin-bottom: 40px;
                    padding-bottom: 24px;
                  }
                  .pd-below-title { font-size: 42px; }
                  .pd-rec-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                  }
                }
                @media (min-width: 1024px) {
                  .pd-rec-grid {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                  }
                }
                @media (min-width: 1280px) {
                  .pd-rec-grid {
                    grid-template-columns: repeat(5, 1fr);
                  }
                }
              `}</style>
              
              <div className="pd-below-header">
                <div>
                  <div className="pd-below-eyebrow" style={{ 
                    fontSize: 10, 
                    fontWeight: 900, 
                    color: '#7c3aed', 
                    letterSpacing: '.3em', 
                    textTransform: 'uppercase', 
                    marginBottom: 12, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10 
                  }}>
                    <span style={{ width: 24, height: 2, background: '#7c3aed', borderRadius: 10 }} />
                    Based on your interest
                  </div>
                  <div className="pd-below-title">
                    Recommended <span style={{ color: '#7c3aed' }}>For You</span>
                  </div>
                </div>
                <Link to="/products" className="pd-view-all" style={{ 
                  padding: '12px 24px', 
                  borderRadius: '14px', 
                  background: 'white', 
                  border: '1.5px solid rgba(124,58,237,.25)', 
                  color: '#7c3aed', 
                  fontSize: 11, 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '.12em', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10, 
                  transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.1)'
                }}>
                  View All Products
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              <div className="pd-rec-grid">
                {similarProducts.map((item, idx) => (
                  <ProductCard
                    key={item._id || item.id}
                    p={item}
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

        </div>{/* end wrap */}

        {/* ══ LIGHTBOX ══ */}
        {lightbox && (
          <div className="pd-lightbox" onClick={() => setLightbox(false)}>
            <div className="pd-lb-inner" onClick={e => e.stopPropagation()}>
              <img src={getCloudinaryUrl(currentImg, 1200)} alt={p.name} className="pd-lb-img" loading="lazy" />
              <button className="pd-lb-close" onClick={() => setLightbox(false)}>✕</button>
              <div className="pd-lb-nav">
                <button className="pd-lb-navbtn" onClick={() => setActiveImg(i => Math.max(0, i - 1))} disabled={activeImg <= 0}>← Prev</button>
                <div className="pd-lb-thumbs">
                  {imgs.map((img, i) => (
                    <button key={i} className={`pd-lb-thumb${i === activeImg ? ' on' : ''}`} onClick={() => setActiveImg(i)}>
                      <img src={getCloudinaryUrl(img.url, 100)} alt={`${p.name} ${i + 1}`} loading="lazy" width="60" height="60" />
                    </button>
                  ))}
                </div>
                <button className="pd-lb-navbtn" onClick={() => setActiveImg(i => Math.min(imgs.length - 1, i + 1))} disabled={activeImg >= imgs.length - 1}>Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ RECOMMENDATION MODAL ══ */}
        <RecommendationModal
          open={recOpen} items={recItems}
          onClose={() => setRecOpen(false)}
          onAddToCart={async (item) => {
            await addToCart(item)
            const updated = recItems.filter(i => (i._id || i.id) !== (item._id || item.id))
            setRecItems(updated)
            if (updated.length === 0) setRecOpen(false)
          }}
        />

      </div>
    </>
  )
}