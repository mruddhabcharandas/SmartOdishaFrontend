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
          if (parts.length >= 2) {
            result.model = parts[1].toLowerCase();
            if (parts.length >= 3) {
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

  if (error) return (
    <div style={{ padding: '20px' }}>
      <h2>Oops!</h2>
      <p>{error}</p>
      <Link to="/products">Back to Catalogue</Link>
    </div>
  )

  if (!p) return <div style={{ padding: '20px' }}>Loading...</div>

  const currentPrice = matchedVariant?.price ?? p?.price
  const currentMrp = matchedVariant?.mrp ?? p?.mrp
  const basePrice = Number(currentPrice || 0) || 0
  const mrp = Number(currentMrp || 0) || 0
  const unitSave = mrp > 0 ? Math.max(0, mrp - basePrice) : 0
  const effPrice = basePrice
  const savingsTotal = Math.max(0, (basePrice - effPrice) * qty)
  const gstRate = Number(p.gst || 0)

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          {imgs.length > 0 && (
            <img 
              src={getCloudinaryUrl(imgs[0], 800)} 
              alt={p.name} 
              style={{ width: '100%', borderRadius: '12px' }} 
            />
          )}
        </div>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <h1 style={{ margin: '0 0 10px' }}>{p.name}</h1>
          <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>₹{effPrice.toLocaleString()}</div>
          {mrp > 0 && <div style={{ textDecoration: 'line-through', color: '#6b7280' }}>MRP ₹{mrp.toLocaleString()}</div>}
          {unitSave > 0 && <div style={{ color: '#10b981', margin: '5px 0' }}>Save ₹{unitSave.toLocaleString()}</div>}
          <div style={{ color: '#6b7280', margin: '10px 0' }}>Inclusive of {gstRate}% GST</div>
          <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{p.description || 'No description available.'}</p>
          <div style={{ marginTop: '20px' }}>
            <Link to="/products" style={{ display: 'inline-block', padding: '10px 20px', background: '#7c3aed', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
              Back to Catalogue
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
