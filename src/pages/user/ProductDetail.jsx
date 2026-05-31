import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { getCloudinaryUrl } from '../../lib/cloudinary';
import { useCart, getStockStatus } from '../../lib/CartContext';
import { useWishlist } from '../../lib/WishlistContext';
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js';
import { useToast } from '../../components/Toast';
import RecommendationModal from '../../components/RecommendationModal';
import ProductCard from '../../components/ProductCard';
import { useAuth } from '../../lib/AuthContext';

function sortVariantValues(lowKey, values) {
  const arr = [...values];
  const storageLike = /ram|rom|storage|memory|capacity|variant|model/i.test(lowKey) && !/screen|display|camera|inch|hz|refresh/i.test(lowKey);
  if (storageLike) {
    return arr.sort((a, b) => {
      const na = parseFloat(String(a).replace(/[^\d.]/g, '')) || 0;
      const nb = parseFloat(String(b).replace(/[^\d.]/g, '')) || 0;
      if (na !== nb) return na - nb;
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    });
  }
  return arr.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
}

function variantAttrIconEmoji(lowKey) {
  const k = String(lowKey || '').toLowerCase();
  if (k === 'option') return '🛒';
  if (k.includes('color') || k.includes('colour') || k === 'finish' || k.includes('shade')) return '🎨';
  if (k.includes('ram')) return '🧠';
  if (k.includes('rom') || k.includes('storage') || k.includes('memory')) return '💾';
  if (k.includes('size') && !k.includes('screen')) return '📏';
  if (k.includes('watt') || k.includes('power')) return '⚡';
  if (k.includes('material')) return '🧵';
  if (k.includes('model') || k.includes('variant')) return '📱';
  if (k.includes('screen') || k.includes('display')) return '🖥';
  return '🔧';
}

export default function ProductDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, refreshCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { notify } = useToast();
  const { user } = useAuth();

  const { data: p, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['product', idOrSlug, user?._id],
    queryFn: () => api.get(`/api/products/${idOrSlug}`).then(res => res.data),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['recommendations', idOrSlug],
    queryFn: () => api.get(`/api/products/${idOrSlug}/recommendations?limit=8`).then(res => res.data || []),
    enabled: !!idOrSlug,
    staleTime: 1000 * 60 * 60,
  });

  const normalizeAttrs = (attrs, sku = '', productAttributes = []) => {
    const result = {};
    if (attrs && typeof attrs === 'object') {
      const obj = attrs instanceof Map ? Object.fromEntries(attrs) : attrs;
      Object.entries(obj).forEach(([k, v]) => {
        if (k && k !== 'sku') result[k.toLowerCase().trim()] = String(v || '').trim();
      });
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
    return result;
  };

  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [imgLoading, setImgLoading] = useState(true);
  const [activeVariant, setActiveVariant] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });
  const [recOpen, setRecOpen] = useState(false);
  const [recItems, setRecItems] = useState([]);
  const [qty, setQty] = useState(1);
  const [pincode, setPincode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  const [kycData, setKycData] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [hlSpecTab, setHlSpecTab] = useState('highlights');
  const authed = !!localStorage.getItem('token');

  const variantAttrs = useMemo(() => {
    if (!p) return [];
    const ordered = [];
    const seen = new Set();
    const add = (rawKey) => {
      if (!rawKey || typeof rawKey !== 'string') return;
      const lk = rawKey.toLowerCase().trim();
      if (!lk || seen.has(lk)) return;
      seen.add(lk);
      ordered.push(rawKey.trim());
    };

    const attrs = Array.isArray(p.attributes) ? p.attributes : [];
    attrs.forEach(a => {
      const parts = a.split(':');
      if (parts[0]) add(parts[0].trim());
    });

    const extras = [];
    if (Array.isArray(p.variants)) {
      p.variants.forEach(v => {
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
        Object.keys(vAttrs || {}).forEach(k => {
          if (!k || typeof k !== 'string') return;
          const lk = k.toLowerCase().trim();
          if (!seen.has(lk)) extras.push(k.trim());
        });
      });
    }
    const uniqExtra = [...new Map(extras.map(e => [e.toLowerCase().trim(), e])).values()];
    uniqExtra.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    uniqExtra.forEach(add);

    if (ordered.length === 0 && Array.isArray(p.variants) && p.variants.length > 0) return ['Option'];
    return ordered;
  }, [p]);

  const matchedVariant = useMemo(() => {
    if (!p || !p.variants || !Array.isArray(p.variants) || !p.variants.length) return null;

    if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') {
      const val = selected['option'];
      if (!val) return null;
      return p.variants.find(v => v.isActive !== false && (v.sku === val || v._id === val)) || null;
    }

    return p.variants.find(v => {
      if (v.isActive === false) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);

      return variantAttrs.every(attr => {
        const lowAttr = attr.toLowerCase().trim();
        const val = selected[lowAttr];
        if (!val) return false;

        let match = false;
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowAttr && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) {
            match = true;
          }
        });
        return match;
      });
    });
  }, [p, selected, variantAttrs]);

  useEffect(() => {
    setImgLoading(true);
  }, [activeImg, activeVariant, matchedVariant]);

  const imgs = useMemo(() => {
    if (matchedVariant?.images?.length > 0) return matchedVariant.images;
    return Array.isArray(p?.images) ? p.images : [];
  }, [p, matchedVariant]);

  const touchImgRef = useRef({ x0: 0, y0: 0, active: false });
  const skipMainImgClickRef = useRef(false);

  const onMainImgTouchStart = useCallback((e) => {
    if (imgs.length <= 1) return;
    const t = e.touches[0];
    touchImgRef.current = { x0: t.clientX, y0: t.clientY, active: true };
  }, [imgs.length]);

  const onMainImgTouchEnd = useCallback((e) => {
    if (!touchImgRef.current.active || imgs.length <= 1) return;
    touchImgRef.current.active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchImgRef.current.x0;
    const dy = t.clientY - touchImgRef.current.y0;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    skipMainImgClickRef.current = true;
    window.setTimeout(() => { skipMainImgClickRef.current = false; }, 450);
    if (dx < 0) setActiveImg(i => Math.min(imgs.length - 1, i + 1));
    else setActiveImg(i => Math.max(0, i - 1));
  }, [imgs.length]);

  const onMainImgTouchCancel = useCallback(() => {
    touchImgRef.current.active = false;
  }, []);

  const onMainImgClick = useCallback(() => {
    if (skipMainImgClickRef.current) return;
    setLightbox(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    setKycLoading(true);
    api.get('/api/user/me').then(({ data }) => {
      const kyc = data.kyc || {};
      if (kyc.pincode) {
        setPincode(kyc.pincode);
        setKycData(kyc);
        const days = 2 + (Number(kyc.pincode[0]) % 4);
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDeliveryDate(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' }));
      }
    }).catch(() => { }).finally(() => setKycLoading(false));
  }, [authed]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date(), co = new Date();
      co.setHours(18, 0, 0, 0);
      let diff = co - now;
      if (diff < 0) { co.setDate(co.getDate() + 1); diff = co - now; }
      setCountdown({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000)
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const checkDelivery = (e) => {
    e?.preventDefault();
    if (pincode.length !== 6) return;
    const days = 2 + (Number(pincode[0]) % 4);
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeliveryDate(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' }));
  };

  useEffect(() => {
    if (p) {
      const packSize = Number(p.packSize || 1);
      const minQty = Math.max(1, Number(p.minOrderQty || 1));
      const initialQty = Math.ceil(minQty / packSize) * packSize;
      setQty(initialQty);
      setError(null);
    }
    if (queryError) {
      const msg = queryError?.response?.data?.error || queryError.message || 'Product not found';
      setError(msg === 'not_found' ? 'This product is no longer available.' : msg);
    }
  }, [p, queryError]);

  useEffect(() => {
    if (!p) return;
    const hasH = Array.isArray(p.highlights) && p.highlights.length > 0;
    const hasS = Array.isArray(p.specifications) && p.specifications.length > 0;
    if (hasH) setHlSpecTab('highlights');
    else if (hasS) setHlSpecTab('specs');
  }, [p?._id]);

  useEffect(() => {
    if (!p || !Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return; }

    const params = new URLSearchParams(location.search);
    const initialSelected = {};
    let hasParams = false;
    variantAttrs.forEach(attr => {
      const lowAttr = attr.toLowerCase().trim();
      const val = params.get(lowAttr);
      if (val) {
        initialSelected[lowAttr] = val;
        hasParams = true;
      }
    });

    if (hasParams) {
      setSelected(initialSelected);
      return;
    }

    if (Object.keys(selected).length === 0) {
      const bestVariant = [...p.variants]
        .filter(v => v.isActive !== false)
        .sort((a, b) => (b.stock || 0) - (a.stock || 0))[0];

      if (bestVariant) {
        if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') {
          setSelected({ option: bestVariant.sku || bestVariant._id });
        } else {
          setSelected(normalizeAttrs(bestVariant.attributes, bestVariant.sku));
        }
      }
    }
  }, [p, variantAttrs]);

  useEffect(() => {
    if (!p) return;
    const params = new URLSearchParams(location.search);
    let changed = false;
    Object.entries(selected).forEach(([k, v]) => {
      if (v && params.get(k) !== v) {
        params.set(k, v);
        changed = true;
      }
    });
    const selectedKeys = Object.keys(selected);
    const paramsKeys = Array.from(params.keys());
    paramsKeys.forEach(pk => {
      if (!selectedKeys.includes(pk)) {
        params.delete(pk);
        changed = true;
      }
    });

    if (changed) {
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [selected, p, navigate, location.search]);

  useEffect(() => {
    if (!p || !Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return; }

    const v = p.variants.find(v => {
      if (v.isActive === false) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
      return variantAttrs.every(k => {
        const lk = k.toLowerCase().trim();
        const val = selected[lk];
        if (!val) return true;
        return String(vAttrs[lk] || '').toLowerCase() === String(val || '').toLowerCase();
      });
    }) || null;

    if (!v && Object.keys(selected).length > 0) {
      let currentMatch = null;
      for (let i = variantAttrs.length; i > 0; i--) {
        const subAttrs = variantAttrs.slice(0, i);
        const partialMatch = p.variants.find(vx => {
          if (vx.isActive === false) return false;
          const vxAttrs = normalizeAttrs(vx.attributes, vx.sku, p.attributes);
          return subAttrs.every(k => {
            const lk = k.toLowerCase().trim();
            return String(vxAttrs[lk] || '').toLowerCase() === String(selected[lk] || '').toLowerCase();
          });
        });
        if (partialMatch) {
          currentMatch = partialMatch;
          break;
        }
      }

      if (currentMatch) {
        setSelected(normalizeAttrs(currentMatch.attributes, currentMatch.sku, p.attributes));
        return;
      }
    }

    setActiveVariant(v);
    if (v) setActiveImg(0);
  }, [selected, p, variantAttrs]);

  useEffect(() => {
    if (!p) return;
    setSEO(`${p.name} | SmartOdisha`, `Buy ${p.name} at best prices with fast delivery across Odisha.`);
    const cleanup = injectJsonLd({
      '@context': 'https://schema.org/', '@type': 'Product', name: p.name,
      brand: { '@type': 'Brand', name: p.brand?.name || p.brand || 'SmartOdisha' },
      image: (p.images || []).map(i => i.url).filter(Boolean), category: p.category?.name || p.category || 'General',
      offers: {
        '@type': 'Offer', priceCurrency: 'INR', price: String(p.price || 0),
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${window.location.origin}/products/${p.slug || p._id}`
      },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: String(p.ratingAvg || 0), reviewCount: String(p.ratingCount || 0) }
    });
    return cleanup;
  }, [p]);

  const variantOpts = (key) => {
    const set = new Set();
    const lowKey = key.toLowerCase().trim();

    if (lowKey === 'option' && Array.isArray(p?.variants)) {
      p.variants.forEach(v => {
        if (v.isActive !== false) set.add(v.sku || v._id);
      });
      return sortVariantValues(lowKey, Array.from(set));
    }

    const attrEntry = (p?.attributes || []).find(a => {
      const parts = a.split(':');
      return parts[0]?.toLowerCase().trim() === lowKey;
    });
    if (attrEntry) {
      const vals = attrEntry.split(':')[1]?.split(',').filter(Boolean) || [];
      vals.forEach(v => set.add(v.trim()));
    }

    if (p?.variants?.length) {
      p.variants.forEach(v => {
        if (v.isActive === false) return;
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowKey && vv) {
            set.add(vv.trim());
          }
        });
      });
    }
    return sortVariantValues(lowKey, Array.from(set));
  };

  const isOptEnabled = (key, val) => {
    if (!p?.variants?.length) return true;
    const lowKey = key.toLowerCase().trim();

    if (lowKey === 'option') {
      return p.variants.some(v => v.isActive !== false && v.stock > 0 && (v.sku === val || v._id === val));
    }

    const otherSelections = { ...selected };
    delete otherSelections[lowKey];

    return p.variants.some(v => {
      if (v.isActive === false || v.stock <= 0) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);

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
  };

  const currentPrice = matchedVariant?.price ?? p?.price;
  const currentMrp = matchedVariant?.mrp ?? p?.mrp;
  const currentStock = matchedVariant?.stock ?? p?.stock;
  const currentSku = matchedVariant?.sku;
  const isAvailable = currentStock > 0;

  const canAddToCart = variantAttrs.every(attr => !!selected[attr.toLowerCase().trim()]) && !!matchedVariant && isAvailable;

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

  const discount = displayMrp > minPrice ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0;

  const totalStock = p && Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p?.stock || 0);

  const stockStRaw = getStockStatus(currentStock ?? totalStock);
  const stockSt = { ...stockStRaw, text: stockStRaw.text.includes('Only') ? 'Limited Stock' : stockStRaw.text };

  const hasHighlights = p && Array.isArray(p.highlights) && p.highlights.length > 0;
  const hasSpecifications = p && Array.isArray(p.specifications) && p.specifications.length > 0;
  const showHighlightsBlock = hasHighlights && (hlSpecTab === 'highlights' || !hasSpecifications);
  const showSpecificationsBlock = hasSpecifications && (hlSpecTab === 'specs' || !hasHighlights);

  const handleAddToCart = async () => {
    if (!authed) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    if (variantAttrs.length > 0 && !matchedVariant) {
      notify('Please select all options', 'error');
      return;
    }
    if (matchedVariant && matchedVariant.stock <= 0) {
      notify('This variant is out of stock', 'error');
      return;
    }

    const ok = await addToCart({ ...p, minOrderQty: 1 }, matchedVariant || undefined);
    if (ok) {
      await refreshCart();
      try {
        const { data } = await api.get(`/api/recommendations/frequently-bought/${p._id}`);
        const filtered = (data || []).filter(item => (item._id || item.id) !== p._id);
        setRecItems(filtered);
        if (filtered.length > 0) setRecOpen(true);
      } catch { }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="aspect-square bg-white rounded-3xl shadow-sm animate-pulse"></div>
              <div className="flex gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-20 h-20 bg-white rounded-2xl shadow-sm animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-white rounded-xl shadow-sm w-3/4 animate-pulse"></div>
              <div className="h-6 bg-white rounded-xl shadow-sm w-1/2 animate-pulse"></div>
              <div className="h-10 bg-white rounded-xl shadow-sm w-1/3 animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-4 bg-white rounded-xl shadow-sm w-full animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-12 text-center border border-slate-100">
          <div className="text-7xl mb-6 bg-gradient-to-r from-purple-100 to-indigo-100 w-24 h-24 flex items-center justify-center rounded-full mx-auto">
            😔
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
            Oops!
          </h2>
          <p className="text-slate-600 mb-10 text-lg leading-relaxed">{error}</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  if (!p) return null;

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        * { box-sizing: border-box; }
        
        .pd {
          font-family: 'Plus Jakarta Sans', 'Poppins', system-ui, -apple-system, sans-serif;
          background: linear-gradient(180deg, #fafafc 0%, #f5f3ff 50%, #f1f0ff 100%);
          color: #1f2937;
          min-height: 100vh;
          overflow-x: hidden;
          width: 100%;
        }
        
        .pd::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(124, 58, 237, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.04) 0%, transparent 50%);
        }
        
        .pd-wrap {
          max-width: 1280px;
          margin: 0 auto;
          padding: 20px 12px 60px;
          position: relative;
          z-index: 1;
        }
        
        @media (min-width: 640px) {
          .pd-wrap { padding: 24px 16px 80px; }
        }
        
        @media (min-width: 768px) {
          .pd-wrap { padding: 32px 24px 100px; }
        }
        
        @media (min-width: 1024px) {
          .pd-wrap { padding: 40px 32px 120px; }
        }
        
        .pd-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        
        @media (min-width: 1024px) {
          .pd-grid {
            grid-template-columns: 520px 1fr;
            gap: 64px;
            align-items: start;
          }
        }
        
        .pd-img-main {
          background: linear-gradient(145deg, #ffffff 0%, #faf9ff 50%, #f5f3ff 100%);
          border: 1px solid rgba(124, 58, 237, 0.1);
          border-radius: 20px;
          overflow: hidden;
          aspect-ratio: 1;
          position: relative;
          cursor: zoom-in;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 10px 32px -8px rgba(76, 29, 149, 0.15),
            0 4px 12px -4px rgba(124, 58, 237, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
        }
        
        .pd-img-main img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 24px;
        }
        
        @media (min-width: 640px) {
          .pd-img-main {
            border-radius: 24px;
          }
          .pd-img-main img {
            padding: 28px;
          }
        }
        
        @media (min-width: 768px) {
          .pd-img-main {
            border-radius: 32px;
            box-shadow: 
              0 20px 60px -12px rgba(76, 29, 149, 0.15),
              0 8px 24px -8px rgba(124, 58, 237, 0.1);
          }
          .pd-img-main img {
            padding: 32px;
          }
        }
        
        .pd-img-main:hover {
          transform: translateY(-4px);
          box-shadow: 
            0 32px 80px -16px rgba(76, 29, 149, 0.25),
            0 12px 32px -12px rgba(124, 58, 237, 0.2);
          border-color: rgba(124, 58, 237, 0.25);
        }
        
        .pd-thumbs {
          display: flex;
          gap: 8px;
          padding: 16px 0 24px;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(124, 58, 237, 0.2) transparent;
        }
        
        @media (min-width: 768px) {
          .pd-thumbs {
            gap: 12px;
            padding: 20px 0 32px;
          }
        }
        
        .pd-thumbs::-webkit-scrollbar {
          height: 6px;
        }
        
        .pd-thumbs::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .pd-thumbs::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.2);
          border-radius: 100px;
        }
        
        .pd-thumb {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          background: white;
          border: 2px solid rgba(124, 58, 237, 0.1);
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }
        
        @media (min-width: 640px) {
          .pd-thumb {
            width: 72px;
            height: 72px;
            border-radius: 18px;
          }
        }
        
        @media (min-width: 768px) {
          .pd-thumb {
            width: 80px;
            height: 80px;
            border-radius: 20px;
          }
        }
        
        .pd-thumb:hover {
          border-color: rgba(124, 58, 237, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.15);
        }
        
        .pd-thumb.on {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12), 0 8px 24px rgba(124, 58, 237, 0.2);
          transform: translateY(-3px) scale(1.02);
        }
        
        .pd-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 12px;
        }
        
        .pd-variants {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 20px;
          padding: 24px 20px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 
            0 12px 32px -10px rgba(124, 58, 237, 0.12),
            inset 0 1px 1px rgba(255, 255, 255, 1);
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        
        @media (min-width: 768px) {
          .pd-variants {
            gap: 28px;
            padding: 32px 28px;
            border-radius: 28px;
          }
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
          position: relative;
          z-index: 1;
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
          gap: 12px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #374151;
        }
        
        .pd-var-icon {
          width: 36px;
          height: 36px;
          background: rgba(124, 58, 237, 0.08);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .pd-var-name {
          text-transform: uppercase;
          font-weight: 800;
          color: #6b7280;
          letter-spacing: 0.08em;
          font-size: 11px;
        }
        
        .pd-var-selected {
          color: #7c3aed;
          font-weight: 800;
          padding: 6px 14px;
          border-radius: 14px;
          background: rgba(124, 58, 237, 0.08);
          font-size: 13px;
        }
        
        .pd-var-opts {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: stretch;
        }
        
        .pd-var-opts.has-many {
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 10px;
          padding: 4px 2px 12px;
          margin: 0 -2px;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }
        
        .pd-var-btn {
          min-width: 80px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.85);
          border: 2px solid rgba(124, 58, 237, 0.12);
          border-radius: 16px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          position: relative;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }
        
        @media (min-width: 640px) {
          .pd-var-btn {
            min-width: 90px;
            padding: 14px 20px;
            border-radius: 18px;
          }
        }
        
        @media (min-width: 768px) {
          .pd-var-btn {
            min-width: 90px;
            padding: 16px 24px;
            border-radius: 20px;
            gap: 6px;
          }
        }
        
        .pd-var-btn:hover:not(.disabled):not(.on) {
          border-color: rgba(124, 58, 237, 0.35);
          background: white;
          transform: translateY(-4px);
          box-shadow: 0 12px 28px -8px rgba(124, 58, 237, 0.2);
        }
        
        .pd-var-btn.on {
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
          border-color: #7c3aed;
          box-shadow: 0 16px 40px -12px rgba(124, 58, 237, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.2);
          transform: translateY(-3px);
        }
        
        .pd-var-btn.on .pd-var-val {
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        .pd-var-btn.on .pd-var-price {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .pd-var-val {
          font-size: 14px;
          font-weight: 800;
          color: #1f2937;
          transition: color 0.3s;
          position: relative;
          z-index: 2;
        }
        
        .pd-var-price {
          font-size: 12px;
          font-weight: 700;
          color: #7c3aed;
          letter-spacing: 0.02em;
          position: relative;
          z-index: 2;
        }
        
        .pd-var-btn.disabled {
          opacity: 0.45;
          cursor: not-allowed;
          background: #f9fafb;
          border-color: rgba(156, 163, 175, 0.25);
        }
        
        .pd-var-btn.disabled::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 10%;
          width: 80%;
          height: 2px;
          background: #9ca3af;
          transform: rotate(-18deg);
          pointer-events: none;
        }
        
        .pd-info {
          margin-top: 12px;
        }
        
        @media (min-width: 1024px) {
          .pd-info {
            background: rgba(255, 255, 255, 0.78);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.85);
            border-radius: 32px;
            padding: 40px 36px 48px;
            margin-top: 0;
            box-shadow: 
              0 24px 60px -16px rgba(76, 29, 149, 0.15),
              0 8px 24px -8px rgba(15, 23, 42, 0.06);
          }
        }
        
        .pd-meta-compact {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .pd-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 0;
          align-items: center;
        }
        
        .pd-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 999px;
        }
        
        .pd-badge-v {
          background: rgba(124, 58, 237, 0.08);
          border: 1px solid rgba(124, 58, 237, 0.2);
          color: #7c3aed;
        }
        
        .pd-badge-g {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #059669;
        }
        
        .pd-badge-a {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #d97706;
        }
        
        .pd-name {
          font-size: clamp(22px, 5vw, 40px);
          font-weight: 800;
          line-height: 1.15;
          background: linear-gradient(135deg, #1f2937 0%, #4b5563 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
        }
        
        .pd-rating-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .pd-rating {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 700;
          box-shadow: 0 6px 20px rgba(5, 150, 105, 0.25);
        }
        
        .pd-price-block {
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 245, 255, 0.92) 100%);
          border: 1px solid rgba(124, 58, 237, 0.14);
          border-radius: 24px;
          padding: 20px 20px 16px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 36px -12px rgba(76, 29, 149, 0.12);
        }
        
        @media (min-width: 768px) {
          .pd-price-block {
            border-radius: 28px;
            padding: 28px 32px 24px;
            margin-bottom: 24px;
          }
        }
        
        .pd-price-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent 0%, #7c3aed 25%, #6366f1 50%, #7c3aed 75%, transparent 100%);
        }
        
        .pd-price-main {
          font-size: clamp(32px, 6vw, 56px);
          font-weight: 800;
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: 'Poppins', 'Plus Jakarta Sans', sans-serif;
        }
        
        .pd-price-mrp {
          font-size: 16px;
          color: #9ca3af;
          text-decoration: line-through;
          font-weight: 500;
        }
        
        .pd-price-save {
          font-size: 14px;
          color: #059669;
          font-weight: 800;
          background: rgba(5, 150, 105, 0.08);
          border: 1px solid rgba(5, 150, 105, 0.2);
          padding: 6px 14px;
          border-radius: 999px;
        }
        
        .pd-stock {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 8px 16px;
          border-radius: 999px;
        }
        
        .pd-stock-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .pd-countdown {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }
        
        @media (min-width: 640px) {
          .pd-countdown {
            flex-direction: row;
            align-items: center;
            gap: 16px;
          }
        }
        
        .pd-countdown-lbl {
          font-size: 13px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        
        .pd-countdown-val {
          display: flex;
          gap: 8px;
          font-family: 'Poppins', 'Plus Jakarta Sans', sans-serif;
        }
        
        .pd-countdown-item {
          background: rgba(124, 58, 237, 0.08);
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid rgba(124, 58, 237, 0.15);
          min-width: 56px;
          text-align: center;
        }
        
        @media (min-width: 640px) {
          .pd-countdown-item {
            padding: 10px 14px;
            min-width: 64px;
          }
        }
        
        .pd-countdown-num {
          font-size: 18px;
          font-weight: 800;
          color: #7c3aed;
        }
        
        @media (min-width: 640px) {
          .pd-countdown-num {
            font-size: 20px;
          }
        }
        
        .pd-countdown-label {
          font-size: 10px;
          color: #9ca3af;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        
        .pd-delivery {
          margin-top: 24px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 20px;
          border: 1px solid rgba(124, 58, 237, 0.12);
          overflow: hidden;
        }
        
        @media (min-width: 768px) {
          .pd-delivery {
            margin-top: 28px;
            border-radius: 24px;
          }
        }
        
        .pd-delivery-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: rgba(124, 58, 237, 0.04);
        }
        
        .pd-delivery-form {
          padding: 14px 16px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        @media (min-width: 640px) {
          .pd-delivery-form {
            padding: 16px 20px;
            gap: 12px;
          }
        }
        
        @media (min-width: 768px) {
          .pd-delivery-form {
            padding: 18px 20px;
          }
        }
        
        .pd-del-inp {
          flex: 1;
          min-width: 120px;
          padding: 14px 18px;
          border-radius: 16px;
          border: 2px solid rgba(124, 58, 237, 0.15);
          background: white;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          outline: none;
          transition: all 0.3s;
          font-family: 'Poppins', 'Plus Jakarta Sans', sans-serif;
        }
        
        .pd-del-inp:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12);
        }
        
        .pd-del-check {
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
        }
        
        .pd-del-check:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(124, 58, 237, 0.4);
        }
        
        .pd-del-check:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        .pd-cta {
          display: flex;
          gap: 10px;
          flex-direction: column;
          margin-top: 24px;
        }
        
        @media (min-width: 640px) {
          .pd-cta {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 12px;
          }
        }
        
        @media (min-width: 768px) {
          .pd-cta {
            margin-top: 28px;
          }
        }
        
        .pd-btn-primary {
          flex: 1;
          min-width: 140px;
          background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
          color: white;
          border: none;
          padding: 16px 28px;
          border-radius: 18px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Poppins', 'Plus Jakarta Sans', sans-serif;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 10px 28px rgba(124, 58, 237, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
          width: 100%;
        }
        
        @media (min-width: 640px) {
          .pd-btn-primary {
            min-width: 160px;
            padding: 18px 32px;
            border-radius: 20px;
            font-size: 13px;
            gap: 10px;
            box-shadow: 0 12px 32px rgba(124, 58, 237, 0.35);
          }
        }
        
        .pd-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        
        .pd-btn-primary:hover:not(:disabled) {
          transform: translateY(-5px) scale(1.01);
          box-shadow: 0 20px 48px rgba(124, 58, 237, 0.45);
        }
        
        .pd-btn-primary:hover:not(:disabled)::after {
          transform: translateX(100%);
        }
        
        .pd-btn-primary:active:not(:disabled) {
          transform: translateY(-2px) scale(0.98);
        }
        
        .pd-btn-primary:disabled {
          background: #f3f4f6;
          color: #d1d5db;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }
        
        .pd-btn-secondary {
          background: white;
          color: #7c3aed;
          border: 2px solid rgba(124, 58, 237, 0.2);
          padding: 16px 20px;
          border-radius: 18px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Poppins', 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
        }
        
        @media (min-width: 640px) {
          .pd-btn-secondary {
            padding: 18px 24px;
            border-radius: 20px;
            font-size: 13px;
            gap: 8px;
            width: auto;
          }
        }
        
        .pd-btn-secondary:hover {
          border-color: #7c3aed;
          background: rgba(124, 58, 237, 0.04);
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(124, 58, 237, 0.15);
        }
        
        .pd-trust {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid rgba(124, 58, 237, 0.08);
          margin-top: 24px;
        }
        
        @media (min-width: 640px) {
          .pd-trust {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        
        .pd-trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #4b5563;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.7);
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(124, 58, 237, 0.08);
        }
        
        @media (min-width: 640px) {
          .pd-trust-item {
            gap: 10px;
            font-size: 12px;
            padding: 12px 16px;
            border-radius: 16px;
          }
        }
        
        .pd-hl-spec-card {
          margin-top: 24px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 24px;
          border: 1px solid rgba(124, 58, 237, 0.12);
          overflow: hidden;
        }
        
        @media (min-width: 768px) {
          .pd-hl-spec-card {
            margin-top: 32px;
            border-radius: 28px;
          }
        }
        
        .pd-hl-spec-tabs {
          display: flex;
          gap: 0;
          padding: 0 16px;
          border-bottom: 1px solid rgba(124, 58, 237, 0.08);
          background: linear-gradient(180deg, rgba(124, 58, 237, 0.04), transparent);
        }
        
        .pd-hl-spec-tabs button {
          flex: 1;
          padding: 14px 20px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: 'Poppins', 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #9ca3af;
          border-bottom: 3px solid transparent;
          margin-bottom: -1px;
          transition: all 0.25s;
        }
        
        .pd-hl-spec-tabs button:hover {
          color: #6b7280;
        }
        
        .pd-hl-spec-tabs button.on {
          color: #7c3aed;
          border-bottom-color: #7c3aed;
        }
        
        .pd-card-body {
          padding: 24px 28px 28px;
        }
        
        .pd-hl-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 14px 0;
          font-size: 14px;
          color: #374151;
        }
        
        .pd-hl-item + .pd-hl-item {
          border-top: 1px solid rgba(124, 58, 237, 0.06);
        }
        
        .pd-hl-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          margin-top: 4px;
          flex-shrink: 0;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
        }
        
        .pd-spec-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .pd-spec-table tr {
          border-bottom: 1px solid rgba(124, 58, 237, 0.06);
        }
        
        .pd-spec-table tr:last-child {
          border-bottom: none;
        }
        
        .pd-spec-table td {
          padding: 14px 0;
        }
        
        .pd-spec-table td:first-child {
          font-size: 13px;
          color: #6b7280;
          width: 40%;
          font-weight: 600;
        }
        
        .pd-spec-table td:last-child {
          font-size: 14px;
          color: #1f2937;
          font-weight: 700;
        }
        
        .pd-description {
          margin-top: 24px;
        }
        
        @media (min-width: 768px) {
          .pd-description {
            margin-top: 32px;
          }
        }
        
        .pd-desc-title {
          font-size: 14px;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 14px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        
        .pd-desc-content {
          background: rgba(255, 255, 255, 0.7);
          border-radius: 20px;
          border: 1px solid rgba(124, 58, 237, 0.1);
          padding: 20px 20px;
        }
        
        @media (min-width: 768px) {
          .pd-desc-content {
            border-radius: 24px;
            padding: 24px 28px;
          }
        }
        
        .pd-desc-content p {
          color: #4b5563;
          font-size: 15px;
          line-height: 1.8;
          margin: 0;
        }
        
        .pd-similar {
          margin-top: 48px;
        }
        
        @media (min-width: 768px) {
          .pd-similar {
            margin-top: 64px;
          }
        }
        
        .pd-similar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        
        .pd-similar-title {
          font-size: 22px;
          font-weight: 800;
          background: linear-gradient(135deg, #1f2937 0%, #4b5563 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .pd-view-all {
          font-size: 12px;
          font-weight: 800;
          color: #7c3aed;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .pd-similar-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 16px;
        }
        
        @media (min-width: 640px) {
          .pd-similar-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1024px) {
          .pd-similar-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        @keyframes pdStockPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.65); }
        }
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
                    src={getCloudinaryUrl(imgs[activeImg].url || imgs[activeImg], 1000)}
                    alt={p.name}
                    className="pd-main-photo"
                    onLoad={() => setImgLoading(false)}
                    onError={() => setImgLoading(false)}
                  />
                )}
                {discount > 0 && (
                  <div className="pd-discount-badge" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 900,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'white',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      boxShadow: '0 6px 20px rgba(5, 150, 105, 0.25)'
                    }}>
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
                        src={getCloudinaryUrl(img.url || img, 160)}
                        alt=""
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Variants Selector */}
              {variantAttrs.length > 0 && (
                <div className="pd-variants">
                  {variantAttrs.map((attr, attrIdx) => {
                    const lowAttr = attr.toLowerCase().trim();
                    const opts = variantOpts(attr);
                    const isMany = opts.length >= 6;
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
                        <div className={`pd-var-opts ${isMany ? 'has-many' : ''}`}>
                          {opts.map((optVal, optIdx) => {
                            const enabled = isOptEnabled(attr, optVal);
                            const isOn = selected[lowAttr]?.toLowerCase() === String(optVal).toLowerCase();
                            const thisVariant = p.variants?.find(v => {
                              const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
                              return v.isActive !== false && Object.entries(vAttrs).some(([k, vv]) => k.toLowerCase() === lowAttr && String(vv).toLowerCase() === String(optVal).toLowerCase());
                            });
                            const vPrice = thisVariant?.price;
                            return (
                              <button
                                key={optIdx}
                                className={`pd-var-btn ${!enabled ? 'disabled' : ''} ${isOn ? 'on' : ''}`}
                                onClick={() => {
                                  if (!enabled) return;
                                  setSelected(s => ({ ...s, [lowAttr]: String(optVal) }));
                                }}
                                disabled={!enabled}
                              >
                                <span className="pd-var-val">{optVal}</span>
                                {vPrice && <span className="pd-var-price">₹{Number(vPrice).toLocaleString()}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="pd-info">
              <div className="pd-meta-compact">
                <div className="pd-badges">
                  <span className="pd-badge pd-badge-v">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    VERIFIED
                  </span>
                  {p.gst > 0 && (
                    <span className="pd-badge pd-badge-g">
                      GST Included
                    </span>
                  )}
                  <span className="pd-badge pd-badge-a">
                    ⚡ Express Dispatch
                  </span>
                </div>
              </div>

              <h1 className="pd-name">{p.name}</h1>

              <div className="pd-rating-row">
                <div className="pd-rating">
                  <span>{Number(p.ratingAvg || 4.3).toFixed(1)}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600 }}>
                  {Number(p.ratingCount || 128).toLocaleString()} Ratings
                </span>
              </div>

              {/* Price Block */}
              <div className="pd-price-block">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span className="pd-price-main">
                    ₹{Number(currentPrice || minPrice).toLocaleString()}
                  </span>
                  {Number(currentMrp || displayMrp) > Number(currentPrice || minPrice) && (
                    <>
                      <span className="pd-price-mrp">MRP ₹{Number(currentMrp || displayMrp).toLocaleString()}</span>
                      <span className="pd-price-save">Save ₹{(Number(currentMrp || displayMrp) - Number(currentPrice || minPrice)).toLocaleString()}</span>
                    </>
                  )}
                </div>
                {p.gst > 0 && (
                  <div style={{ fontSize: '13px', color: '#059669', fontWeight: 700, marginTop: '6px' }}>
                    Inclusive of all taxes
                  </div>
                )}
              </div>

              {/* Stock */}
              <div>
                <span
                  className="pd-stock"
                  style={{
                    background: isAvailable ? 'rgba(5, 150, 105, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    color: isAvailable ? '#059669' : '#dc2626',
                    border: isAvailable ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <span className="pd-stock-dot" style={{ background: isAvailable ? '#059669' : '#dc2626', animation: isAvailable ? 'none' : 'pdStockPulse 1.2s infinite ease-in-out' }}></span>
                  {stockSt.text}
                </span>
              </div>

              {/* Express Dispatch Countdown */}
              <div className="pd-countdown">
                <span className="pd-countdown-lbl">Express Dispatch</span>
                <div className="pd-countdown-val">
                  <div className="pd-countdown-item">
                    <div className="pd-countdown-num">{String(countdown.h).padStart(2, '0')}</div>
                    <div className="pd-countdown-label">Hours</div>
                  </div>
                  <div className="pd-countdown-item">
                    <div className="pd-countdown-num">{String(countdown.m).padStart(2, '0')}</div>
                    <div className="pd-countdown-label">Mins</div>
                  </div>
                  <div className="pd-countdown-item">
                    <div className="pd-countdown-num">{String(countdown.s).padStart(2, '0')}</div>
                    <div className="pd-countdown-label">Secs</div>
                  </div>
                </div>
              </div>

              {/* Delivery Check */}
              <div className="pd-delivery">
                <div className="pd-delivery-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" />
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Check Delivery</span>
                  </div>
                  {deliveryDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '13px', fontWeight: 800 }}>
                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ships</span>
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
                <button
                  className="pd-btn-secondary"
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
                >
                  {isInWishlist(p._id || p.id) ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                  {isInWishlist(p._id || p.id) ? 'Saved' : 'Wishlist'}
                </button>

                {authed ? (
                  <button
                    className="pd-btn-primary"
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6h15l-1.5 9h-12z" />
                      <path d="M6 6l-1-3H3" />
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="18" cy="21" r="1" />
                    </svg>
                    {totalStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                ) : (
                  <button
                    className="pd-btn-primary"
                    onClick={() => navigate('/login', { state: { from: location.pathname + location.search } })}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <span>✅</span> Verified
                </div>
                <div className="pd-trust-item">
                  <span>🧾</span> GST Invoice
                </div>
                <div className="pd-trust-item">
                  <span>⚡</span> Fast Dispatch
                </div>
                <div className="pd-trust-item">
                  <span>📦</span> Pan India
                </div>
              </div>

              {/* Highlights / Specs Tabs */}
              {(hasHighlights || hasSpecifications) && (
                <div className="pd-hl-spec-card">
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
                  <div className="pd-card-body">
                    {showHighlightsBlock && (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {p.highlights.map((hl, i) => (
                          <li key={i} className="pd-hl-item">
                            <div className="pd-hl-dot"></div>
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {showSpecificationsBlock && (
                      <table className="pd-spec-table">
                        <tbody>
                          {p.specifications.map((spec, i) => (
                            <tr key={i}>
                              <td>{spec.key}</td>
                              <td>{spec.value}</td>
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
                <div className="pd-description">
                  <h3 className="pd-desc-title">Details</h3>
                  <div className="pd-desc-content">
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      {p.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <div className="pd-similar">
              <div className="pd-similar-header">
                <h2 className="pd-similar-title">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#7c3aed">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Similar Products
                </h2>
                <Link to="/products" className="pd-view-all">
                  View All →
                </Link>
              </div>
              <div className="pd-similar-grid">
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
  );
}
