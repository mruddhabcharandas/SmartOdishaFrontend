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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="aspect-square bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl animate-pulse border border-white/10"></div>
              <div className="flex gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-20 h-20 bg-white/5 backdrop-blur-xl rounded-2xl shadow-lg animate-pulse border border-white/10"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg w-3/4 animate-pulse border border-white/10"></div>
              <div className="h-6 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg w-1/2 animate-pulse border border-white/10"></div>
              <div className="h-10 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg w-1/3 animate-pulse border border-white/10"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-4 bg-white/5 backdrop-blur-xl rounded-xl shadow-lg w-full animate-pulse border border-white/10"></div>
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 text-center border border-white/80">
          <div className="text-7xl mb-6 bg-gradient-to-br from-blue-100 to-purple-100 w-24 h-24 flex items-center justify-center rounded-full mx-auto">
            😔
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
            Oops!
          </h2>
          <p className="text-slate-600 mb-10 text-lg leading-relaxed">{error}</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        * { box-sizing: border-box; }
        
        .pd {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #020617 30%, #f8fafc 30%, #f8fafc 100%);
          color: #0f172a;
          min-height: 100vh;
          overflow-x: hidden;
          width: 100%;
        }
        
        .pd-wrap {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 16px 80px;
          position: relative;
          z-index: 1;
        }
        
        @media (min-width: 768px) {
          .pd-wrap { padding: 40px 24px 100px; }
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
          background: linear-gradient(145deg, #ffffff 0%, #f0f4ff 50%, #e8eafc 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 28px;
          overflow: hidden;
          aspect-ratio: 1;
          position: relative;
          cursor: zoom-in;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 60px -20px rgba(15, 23, 42, 0.25);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
        }
        
        .pd-img-main img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 32px;
        }
        
        .pd-img-main:hover {
          transform: translateY(-6px);
          box-shadow: 0 30px 80px -30px rgba(15, 23, 42, 0.35);
          border-color: rgba(59, 130, 246, 0.25);
        }
        
        .pd-thumbs {
          display: flex;
          gap: 10px;
          padding: 20px 0 28px;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
        }
        
        .pd-thumbs::-webkit-scrollbar {
          height: 6px;
        }
        
        .pd-thumbs::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .pd-thumbs::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 100px;
        }
        
        .pd-thumb {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
          background: white;
          border: 2px solid rgba(59, 130, 246, 0.12);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }
        
        .pd-thumb:hover {
          border-color: rgba(59, 130, 246, 0.35);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(59, 130, 246, 0.15);
        }
        
        .pd-thumb.on {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 12px 36px rgba(59, 130, 246, 0.25);
          transform: translateY(-4px) scale(1.03);
        }
        
        .pd-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 14px;
        }
        
        .pd-variants {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 24px;
          padding: 28px 24px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(24px);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 16px 48px -20px rgba(15, 23, 42, 0.15);
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        
        .pd-var-sec {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 1;
        }
        
        .pd-var-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .pd-var-lbl {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #374151;
        }
        
        .pd-var-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.15);
        }
        
        .pd-var-name {
          text-transform: uppercase;
          font-weight: 800;
          color: #6b7280;
          letter-spacing: 0.1em;
          font-size: 11px;
        }
        
        .pd-var-selected {
          color: #3b82f6;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
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
          min-width: 84px;
          padding: 14px 18px;
          background: white;
          border: 2px solid rgba(59, 130, 246, 0.15);
          border-radius: 18px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          position: relative;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
        }
        
        .pd-var-btn:hover:not(.disabled):not(.on) {
          border-color: rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%);
          transform: translateY(-4px);
          box-shadow: 0 14px 36px -10px rgba(59, 130, 246, 0.25);
        }
        
        .pd-var-btn.on {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-color: #3b82f6;
          box-shadow: 0 18px 48px -12px rgba(59, 130, 246, 0.45);
          transform: translateY(-4px);
        }
        
        .pd-var-btn.on .pd-var-val {
          color: white;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        
        .pd-var-btn.on .pd-var-price {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .pd-var-val {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          transition: color 0.3s;
          position: relative;
          z-index: 2;
        }
        
        .pd-var-price {
          font-size: 12px;
          font-weight: 700;
          color: #3b82f6;
          letter-spacing: 0.02em;
          position: relative;
          z-index: 2;
        }
        
        .pd-var-btn.disabled {
          opacity: 0.45;
          cursor: not-allowed;
          background: #f1f5f9;
          border-color: rgba(148, 163, 184, 0.3);
        }
        
        .pd-var-btn.disabled::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 10%;
          width: 80%;
          height: 2px;
          background: #94a3b8;
          transform: rotate(-18deg);
          pointer-events: none;
        }
        
        .pd-info {
          margin-top: 16px;
        }
        
        @media (min-width: 1024px) {
          .pd-info {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.95);
            border-radius: 32px;
            padding: 44px 40px 52px;
            margin-top: 0;
            box-shadow: 0 24px 72px -24px rgba(15, 23, 42, 0.15);
          }
        }
        
        .pd-meta-compact {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .pd-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 0;
          align-items: center;
        }
        
        .pd-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 8px 14px;
          border-radius: 999px;
        }
        
        .pd-badge-v {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .pd-badge-g {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #059669;
        }
        
        .pd-badge-a {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.08) 100%);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #d97706;
        }
        
        .pd-name {
          font-size: clamp(24px, 5vw, 44px);
          font-weight: 900;
          line-height: 1.05;
          background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 16px;
          letter-spacing: -0.03em;
        }
        
        .pd-rating-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        
        .pd-rating {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 800;
          box-shadow: 0 10px 30px -10px rgba(5, 150, 105, 0.4);
        }
        
        .pd-price-block {
          background: linear-gradient(165deg, #ffffff 0%, #f8fafc 50%, #f0f4ff 100%);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 28px;
          padding: 32px 28px 24px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 56px -24px rgba(59, 130, 246, 0.2);
        }
        
        .pd-price-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, transparent 0%, #3b82f6 25%, #8b5cf6 50%, #3b82f6 75%, transparent 100%);
        }
        
        .pd-price-main {
          font-size: clamp(36px, 7vw, 60px);
          font-weight: 900;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: 'Inter', sans-serif;
        }
        
        .pd-price-mrp {
          font-size: 18px;
          color: #94a3b8;
          text-decoration: line-through;
          font-weight: 600;
        }
        
        .pd-price-save {
          font-size: 15px;
          color: #059669;
          font-weight: 800;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 8px 16px;
          border-radius: 999px;
        }
        
        .pd-stock {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 10px 18px;
          border-radius: 999px;
        }
        
        .pd-stock-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .pd-countdown {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: stretch;
        }
        
        @media (min-width: 640px) {
          .pd-countdown {
            flex-direction: row;
            align-items: center;
            gap: 18px;
          }
        }
        
        .pd-countdown-lbl {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        
        .pd-countdown-val {
          display: flex;
          gap: 10px;
          font-family: 'Inter', sans-serif;
        }
        
        .pd-countdown-item {
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          padding: 10px 16px;
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.18);
          min-width: 64px;
          text-align: center;
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.12);
        }
        
        .pd-countdown-num {
          font-size: 20px;
          font-weight: 900;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .pd-countdown-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 3px;
        }
        
        .pd-delivery {
          margin-top: 28px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 24px;
          border: 1px solid rgba(59, 130, 246, 0.12);
          overflow: hidden;
          box-shadow: 0 12px 32px -16px rgba(15, 23, 42, 0.1);
        }
        
        .pd-delivery-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%);
        }
        
        .pd-delivery-form {
          padding: 18px 20px;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .pd-del-inp {
          flex: 1;
          min-width: 120px;
          padding: 16px 20px;
          border-radius: 18px;
          border: 2px solid rgba(59, 130, 246, 0.18);
          background: white;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          outline: none;
          transition: all 0.3s;
          font-family: 'Inter', sans-serif;
        }
        
        .pd-del-inp:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
        }
        
        .pd-del-check {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 16px 28px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 32px rgba(59, 130, 246, 0.35);
        }
        
        .pd-del-check:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(59, 130, 246, 0.45);
        }
        
        .pd-del-check:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        .pd-cta {
          display: flex;
          gap: 12px;
          flex-direction: column;
          margin-top: 28px;
        }
        
        @media (min-width: 640px) {
          .pd-cta {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 14px;
          }
        }
        
        .pd-btn-primary {
          flex: 1;
          min-width: 160px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          background-size: 200% 200%;
          color: white;
          border: none;
          padding: 18px 32px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 14px 40px -10px rgba(59, 130, 246, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
          width: 100%;
        }
        
        .pd-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        
        .pd-btn-primary:hover:not(:disabled) {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 26px 60px -14px rgba(59, 130, 246, 0.55);
          background-position: 100% 50%;
        }
        
        .pd-btn-primary:hover:not(:disabled)::after {
          transform: translateX(100%);
        }
        
        .pd-btn-primary:active:not(:disabled) {
          transform: translateY(-2px) scale(0.98);
        }
        
        .pd-btn-primary:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }
        
        .pd-btn-secondary {
          background: white;
          color: #3b82f6;
          border: 2px solid rgba(59, 130, 246, 0.2);
          padding: 18px 24px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.3s;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }
        
        @media (min-width: 640px) {
          .pd-btn-secondary {
            width: auto;
          }
        }
        
        .pd-btn-secondary:hover {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%);
          transform: translateY(-3px);
          box-shadow: 0 14px 36px rgba(59, 130, 246, 0.2);
        }
        
        .pd-trust {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding-top: 28px;
          border-top: 1px solid rgba(59, 130, 246, 0.08);
          margin-top: 28px;
        }
        
        @media (min-width: 640px) {
          .pd-trust {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        
        .pd-trust-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: #475569;
          font-weight: 700;
          background: white;
          padding: 14px 16px;
          border-radius: 18px;
          border: 1px solid rgba(59, 130, 246, 0.1);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
        }
        
        .pd-hl-spec-card {
          margin-top: 32px;
          background: white;
          border-radius: 28px;
          border: 1px solid rgba(59, 130, 246, 0.12);
          overflow: hidden;
          box-shadow: 0 16px 48px -24px rgba(15, 23, 42, 0.12);
        }
        
        .pd-hl-spec-tabs {
          display: flex;
          gap: 0;
          padding: 0 20px;
          border-bottom: 1px solid rgba(59, 130, 246, 0.08);
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.03) 0%, transparent 100%);
        }
        
        .pd-hl-spec-tabs button {
          flex: 1;
          padding: 16px 24px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 3px solid transparent;
          margin-bottom: -1px;
          transition: all 0.25s;
        }
        
        .pd-hl-spec-tabs button:hover {
          color: #3b82f6;
        }
        
        .pd-hl-spec-tabs button.on {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }
        
        .pd-card-body {
          padding: 32px 32px 36px;
        }
        
        .pd-hl-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 14px 0;
          font-size: 15px;
          color: #374151;
        }
        
        .pd-hl-item + .pd-hl-item {
          border-top: 1px solid rgba(59, 130, 246, 0.06);
        }
        
        .pd-hl-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          margin-top: 4px;
          flex-shrink: 0;
          box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.1);
        }
        
        .pd-spec-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .pd-spec-table tr {
          border-bottom: 1px solid rgba(59, 130, 246, 0.06);
        }
        
        .pd-spec-table tr:last-child {
          border-bottom: none;
        }
        
        .pd-spec-table td {
          padding: 16px 0;
        }
        
        .pd-spec-table td:first-child {
          font-size: 14px;
          color: #64748b;
          width: 40%;
          font-weight: 600;
        }
        
        .pd-spec-table td:last-child {
          font-size: 15px;
          color: #0f172a;
          font-weight: 700;
        }
        
        .pd-description {
          margin-top: 32px;
        }
        
        .pd-desc-title {
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        
        .pd-desc-content {
          background: white;
          border-radius: 24px;
          border: 1px solid rgba(59, 130, 246, 0.1);
          padding: 28px 28px;
          box-shadow: 0 12px 40px -20px rgba(15, 23, 42, 0.1);
        }
        
        .pd-desc-content p {
          color: #475569;
          font-size: 15px;
          line-height: 1.8;
          margin: 0;
        }
        
        .pd-similar {
          margin-top: 56px;
        }
        
        .pd-similar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        
        .pd-similar-title {
          font-size: 26px;
          font-weight: 900;
          background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: -0.02em;
        }
        
        .pd-view-all {
          font-size: 13px;
          font-weight: 800;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        
        .pd-view-all:hover {
          color: #8b5cf6;
          gap: 10px;
        }
        
        .pd-similar-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 20px;
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
                  <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 900,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'white',
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      boxShadow: '0 12px 32px -8px rgba(5, 150, 105, 0.35)'
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 700 }}>
                  {Number(p.ratingCount || 128).toLocaleString()} Ratings
                </span>
              </div>

              {/* Price Block */}
              <div className="pd-price-block">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', flexWrap: 'wrap', marginBottom: '8px' }}>
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
                  <div style={{ fontSize: '14px', color: '#059669', fontWeight: 800, marginTop: '8px' }}>
                    Inclusive of all taxes
                  </div>
                )}
              </div>

              {/* Stock */}
              <div>
                <span
                  className="pd-stock"
                  style={{
                    background: isAvailable ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.08) 100%)',
                    color: isAvailable ? '#059669' : '#dc2626',
                    border: isAvailable ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    boxShadow: isAvailable ? '0 8px 24px rgba(5, 150, 105, 0.15)' : '0 8px 24px rgba(239, 68, 68, 0.15)'
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" />
                    </svg>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Check Delivery</span>
                  </div>
                  {deliveryDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', fontSize: '14px', fontWeight: 900 }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ships</span>
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#3b82f6">
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
