import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { getImageUrl } from '../../lib/cloudinary';
import { useCart, getStockStatus } from '../../lib/CartContext';
import { useWishlist } from '../../lib/WishlistContext';
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js';
import { useToast } from '../../components/Toast';
import RecommendationModal from '../../components/RecommendationModal';
import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';
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

export default function ProductDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, refreshCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { notify } = useToast();
  const { user, isAuthenticated } = useAuth();

  const { data: p, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['product', idOrSlug, user?._id],
    queryFn: () => api.get(`/api/products/${idOrSlug}`).then(res => res.data),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['recommendations', idOrSlug],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/products/${idOrSlug}/recommendations?limit=8`);
        if (res.data && res.data.length > 0) return res.data;
        const fallbackRes = await api.get('/api/products?limit=8');
        return fallbackRes.data?.items || [];
      } catch (err) {
        try {
          const fallbackRes = await api.get('/api/products?limit=8');
          return fallbackRes.data?.items || [];
        } catch { return []; }
      }
    },
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
        .map(a => a.split(':')[0]?.toLowerCase().trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (attrKeys.length > 0) {
          attrKeys.forEach((key, idx) => { if (parts[idx + 1]) result[key] = parts[idx + 1].toLowerCase(); });
        } else {
          result.model = parts[1].toLowerCase();
          if (parts.length >= 3) result.variant = parts.slice(2).join('-').toLowerCase();
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
  const [recOpen, setRecOpen] = useState(false);
  const [recItems, setRecItems] = useState([]);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [pincode, setPincode] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [activeTab, setActiveTab] = useState('highlights');

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
    attrs.forEach(a => { const parts = a.split(':'); if (parts[0]) add(parts[0].trim()); });
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
        let matchVal = false;
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowAttr && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) matchVal = true;
        });
        return matchVal;
      });
    });
  }, [p, selected, variantAttrs]);

  const safeNum = (val) => { const n = Number(val); return isNaN(n) || !isFinite(n) ? 0 : n; };

  const minPrice = useMemo(() => {
    if (!p) return 0;
    let base;
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      base = safeNum(p.originalStorePrice ?? p.price ?? 0);
    } else {
      const av = p.variants.filter(v => v.isActive !== false && safeNum(v.originalStorePrice ?? v.price ?? 0) > 0);
      base = av.length === 0 ? safeNum(p.originalStorePrice ?? p.price ?? 0) : Math.min(...av.map(v => safeNum(v.originalStorePrice ?? v.price ?? 0)));
    }
    return base * (1 + safeNum(p?.store?.storePercentage ?? 0) / 100);
  }, [p]);

  const currentPrice = useMemo(() => {
    const base = matchedVariant ? safeNum(matchedVariant.originalStorePrice ?? matchedVariant.price ?? 0) : safeNum(p?.originalStorePrice ?? p?.price ?? 0);
    return base * (1 + safeNum(p?.store?.storePercentage ?? 0) / 100);
  }, [matchedVariant, p]);

  const currentMrp = useMemo(() => {
    const base = matchedVariant ? safeNum(matchedVariant.mrp ?? 0) : safeNum(p?.mrp ?? 0);
    if (base === 0) return 0;
    return base * (1 + safeNum(p?.store?.storePercentage ?? 0) / 100);
  }, [matchedVariant, p]);

  const currentStock = matchedVariant?.stock ?? p?.stock;
  const isAvailable = currentStock > 0;

  const displayMrp = useMemo(() => {
    if (!p) return 0;
    let base;
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      base = safeNum(p.mrp ?? p.originalStorePrice ?? p.price ?? 0);
    } else {
      const av = p.variants.filter(v => v.isActive !== false && safeNum(v.originalStorePrice ?? v.price ?? 0) > 0);
      if (av.length === 0) { base = safeNum(p.mrp ?? p.originalStorePrice ?? p.price ?? 0); }
      else {
        const minVar = av.reduce((a, b) => safeNum(a.originalStorePrice ?? a.price ?? 0) < safeNum(b.originalStorePrice ?? b.price ?? 0) ? a : b);
        base = safeNum(minVar?.mrp ?? p.mrp ?? 0);
      }
    }
    if (base === 0) return 0;
    return base * (1 + safeNum(p?.store?.storePercentage ?? 0) / 100);
  }, [p, minPrice]);

  const discount = displayMrp > minPrice ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0;
  const totalStock = p && Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p?.stock || 0);

  const stockStRaw = getStockStatus(currentStock ?? totalStock);
  const stockSt = { ...stockStRaw, text: String(stockStRaw.text || '').includes('Only') ? 'Limited Stock' : stockStRaw.text };
  const canAddToCart = 
    (variantAttrs.length === 0 || (variantAttrs.every(attr => !!selected[attr.toLowerCase().trim()]) && !!matchedVariant)) && 
    isAvailable;
  const hasHighlights = p && Array.isArray(p.highlights) && p.highlights.length > 0;
  const hasSpecifications = p && Array.isArray(p.specifications) && p.specifications.length > 0;
  const hasDescription = p?.description?.length > 0;

  useEffect(() => { setImgLoading(true); }, [activeImg, activeVariant, matchedVariant]);

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
  const onMainImgTouchCancel = useCallback(() => { touchImgRef.current.active = false; }, []);
  const onMainImgClick = useCallback(() => { if (skipMainImgClickRef.current) return; setLightbox(true); }, []);

  useEffect(() => {
    if (user?.savedAddresses && user.savedAddresses.length > 0) {
      const def = user.savedAddresses.find(a => a.isDefault) || user.savedAddresses[0];
      setSelectedAddress(def);
      if (def?.pincode) { setPincode(def.pincode); checkDeliveryImpl(def.pincode); }
    } else if (user?.address) {
      const m = user.address.match(/\b(\d{6})\b/);
      if (m) { setPincode(m[1]); checkDeliveryImpl(m[1]); }
    }
  }, [user?.savedAddresses, user?.address]);

  useEffect(() => {
    if (pincode.length === 6) checkDeliveryImpl(pincode);
  }, [currentPrice, minPrice, pincode]);

  const checkDeliveryImpl = async (code, weight = (p?.weight || 500) / 1000, orderAmount = currentPrice || minPrice) => {
    if (code.length !== 6) return;
    setCheckingDelivery(true);
    try {
      const serviceRes = await api.get(`/api/shipping/check-pincode`, { params: { pincode: code, order_amount: orderAmount, store_id: p?.store?._id || p?.store } });
      const [prepaidCalcRes, codCalcRes] = await Promise.all([
        api.post(`/api/shipping/calculate`, { destination_pin: code, weight, order_amount: orderAmount, payment_method: 'prepaid', store_id: p?.store?._id || p?.store }),
        api.post(`/api/shipping/calculate`, { destination_pin: code, weight, order_amount: orderAmount, payment_method: 'cod', store_id: p?.store?._id || p?.store })
      ]);
      const eta = serviceRes.data.eta || 3;
      const now = new Date();
      const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
      setDeliveryInfo({
        serviceable: serviceRes.data.delivery_available, codAvailable: serviceRes.data.cod_available,
        message: serviceRes.data.delivery_available ? 'Delivery available' : 'Not available',
        etaStart: addDays(now, eta), etaEnd: addDays(now, eta + 2),
        deliveryCharge: prepaidCalcRes.data.delivery_charge, codCharge: codCalcRes.data.cod_charge,
        codFinalCharge: codCalcRes.data.final_charge, isFreeDelivery: prepaidCalcRes.data.final_charge === 0
      });
    } catch (err) {
      const now = new Date();
      const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
      const isFree = (currentPrice || minPrice) >= 999;
      const codCharge = Math.min(Math.max(Math.round((currentPrice || minPrice) * 0.05), 40), 100);
      setDeliveryInfo({ serviceable: true, message: 'Delivery available', etaStart: addDays(now, 3), etaEnd: addDays(now, 5), deliveryCharge: 85, codCharge, codFinalCharge: 85 + codCharge, isFreeDelivery: isFree });
    } finally { setCheckingDelivery(false); }
  };

  const checkDelivery = (e) => { e?.preventDefault(); checkDeliveryImpl(pincode); };

  useEffect(() => {
    if (p) setError(null);
    if (queryError) {
      const msg = queryError?.response?.data?.error || queryError.message || 'Product not found';
      setError(msg === 'not_found' ? 'This product is no longer available.' : msg);
    }
  }, [p, queryError]);

  useEffect(() => {
    if (!p) return;
    if (!Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return; }
    const params = new URLSearchParams(location.search);
    const initialSelected = {};
    let hasParams = false;
    variantAttrs.forEach(attr => {
      const lowAttr = attr.toLowerCase().trim();
      const val = params.get(lowAttr);
      if (val) { initialSelected[lowAttr] = val; hasParams = true; }
    });
    if (hasParams) { setSelected(initialSelected); return; }
    if (Object.keys(selected).length === 0) {
      const bestVariant = [...p.variants].filter(v => v.isActive !== false).sort((a, b) => (b.stock || 0) - (a.stock || 0))[0];
      if (bestVariant) {
        if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') setSelected({ option: bestVariant.sku || bestVariant._id });
        else setSelected(normalizeAttrs(bestVariant.attributes, bestVariant.sku));
      }
    }
  }, [p, variantAttrs]);

  useEffect(() => {
    if (!p) return;
    const params = new URLSearchParams(location.search);
    let changed = false;
    Object.entries(selected).forEach(([k, v]) => { if (v && params.get(k) !== v) { params.set(k, v); changed = true; } });
    const selectedKeys = Object.keys(selected);
    Array.from(params.keys()).forEach(pk => { if (!selectedKeys.includes(pk)) { params.delete(pk); changed = true; } });
    if (changed) navigate({ search: params.toString() }, { replace: true });
  }, [selected, p, navigate, location.search]);

  useEffect(() => {
    if (!p) return;
    if (!Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return; }
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
        if (partialMatch) { currentMatch = partialMatch; break; }
      }
      if (currentMatch) { setSelected(normalizeAttrs(currentMatch.attributes, currentMatch.sku)); return; }
    }
    setActiveVariant(v);
    if (v) setActiveImg(0);
  }, [selected, p, variantAttrs]);

  useEffect(() => {
    if (!p) return;
    setSEO(p.name + ' | SmartOdisha', 'Buy ' + p.name + ' at best prices with fast delivery across Odisha.');
    const cleanup = injectJsonLd({
      '@context': 'https://schema.org/', '@type': 'Product', name: p.name,
      brand: { '@type': 'Brand', name: p.brand?.name || p.brand || 'SmartOdisha' },
      image: (p.images || []).map(i => i.url), category: p.category?.name || p.category || 'General',
      offers: { '@type': 'Offer', priceCurrency: 'INR', price: String(p.price || 0), availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: window.location.origin + '/products/' + (p.slug || p._id) },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: String(p.ratingAvg || 0), reviewCount: String(p.ratingCount || 0) }
    });
    return cleanup;
  }, [p]);

  const variantOpts = (key) => {
    const set = new Set();
    const lowKey = key.toLowerCase().trim();
    if (lowKey === 'option' && Array.isArray(p?.variants)) {
      p.variants.forEach(v => { if (v.isActive !== false) set.add(v.sku || v._id); });
      return sortVariantValues(lowKey, Array.from(set));
    }
    const attrEntry = (p?.attributes || []).find(a => a.split(':')[0]?.toLowerCase().trim() === lowKey);
    if (attrEntry) { const vals = attrEntry.split(':')[1]?.split(',').filter(Boolean) || []; vals.forEach(v => set.add(v.trim())); }
    if (p?.variants?.length) {
      p.variants.forEach(v => {
        if (v.isActive === false) return;
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
        Object.entries(vAttrs).forEach(([vk, vv]) => { if (vk.toLowerCase().trim() === lowKey && vv) set.add(vv.trim()); });
      });
    }
    return sortVariantValues(lowKey, Array.from(set));
  };

  const isOptEnabled = (key, val) => {
    if (!p?.variants?.length) return true;
    const lowKey = key.toLowerCase().trim();
    if (lowKey === 'option') return p.variants.some(v => v.isActive !== false && v.stock > 0 && (v.sku === val || v._id === val));
    const otherSelections = { ...selected };
    delete otherSelections[lowKey];
    return p.variants.some(v => {
      if (v.isActive === false || v.stock <= 0) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
      let matchVal = false;
      Object.entries(vAttrs).forEach(([vk, vv]) => {
        if (vk.toLowerCase().trim() === lowKey && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) matchVal = true;
      });
      if (matchVal) {
        return Object.entries(otherSelections).every(([ok, ov]) => {
          if (!ov) return true;
          let matchOther = false;
          Object.entries(vAttrs).forEach(([vk, vv]) => {
            if (vk.toLowerCase().trim() === ok.toLowerCase().trim() && String(vv || '').toLowerCase().trim() === String(ov || '').toLowerCase().trim()) matchOther = true;
          });
          return matchOther;
        });
      }
      return false;
    });
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    if (variantAttrs.length > 0 && !matchedVariant) { notify('Please select all options', 'error'); return; }
    if (matchedVariant && matchedVariant.stock <= 0) { notify('This variant is out of stock', 'error'); return; }
    const ok = await addToCart({ ...p, minOrderQty: 1 }, matchedVariant || undefined);
    if (ok) {
      await refreshCart();
      try {
        const { data } = await api.get('/api/recommendations/frequently-bought/' + p._id);
        const filtered = (data || []).filter(item => (item._id || item.id) !== p._id);
        setRecItems(filtered);
        if (filtered.length > 0) setRecOpen(true);
      } catch { }
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    if (variantAttrs.length > 0 && !matchedVariant) { notify('Please select all options', 'error'); return; }
    if (matchedVariant && matchedVariant.stock <= 0) { notify('This variant is out of stock', 'error'); return; }
    const ok = await addToCart({ ...p, minOrderQty: 1 }, matchedVariant || undefined);
    if (ok) { await refreshCart(); navigate('/enquiry'); }
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.origin + '/products/' + (p.slug || p._id);
      if (navigator.share) await navigator.share({ title: p.name, text: 'Check out this product on SmartOdisha: ' + p.name, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); notify('Product link copied!', 'success'); }
    } catch (err) { console.error('Share failed:', err); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
      <LoadingSpinner text="Fetching product details..." />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-gray-100">
        <div className="text-6xl mb-6">😔</div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Oops!</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">{error}</p>
        <Link to="/products" className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors text-sm">
          ← Back to Products
        </Link>
      </div>
    </div>
  );

  if (!p) return null;

  const displayPrice = Math.round(currentPrice || minPrice || 0);
  const displayMrpRounded = Math.round(currentMrp || displayMrp || 0);

  return (
    <div className="pd-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap');

        :root {
          --ink: #0f0e17;
          --ink2: #3d3d4e;
          --ink3: #8888a0;
          --surface: #fafaf8;
          --card: #ffffff;
          --border: rgba(0,0,0,0.07);
          --accent: #e8521a;
          --accent2: #1a3557;
          --accent-soft: rgba(232,82,26,0.08);
          --green: #1e9b6b;
          --green-soft: rgba(30,155,107,0.08);
          --radius-lg: 20px;
          --radius-xl: 28px;
          --shadow-card: 0 2px 24px rgba(0,0,0,0.06);
          --shadow-hover: 0 8px 40px rgba(0,0,0,0.1);
        }

        .pd-root {
          font-family: 'Outfit', system-ui, sans-serif;
          background: var(--surface);
          min-height: 100vh;
          color: var(--ink);
          padding-bottom: 88px;
        }

        /* ─── Breadcrumb ─── */
        .pd-breadcrumb {
          max-width: 1240px;
          margin: 0 auto;
          padding: 20px 20px 0;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--ink3);
          flex-wrap: wrap;
        }
        .pd-breadcrumb a { color: var(--ink3); text-decoration: none; }
        .pd-breadcrumb a:hover { color: var(--accent); }
        .pd-breadcrumb-sep { color: var(--border); font-size: 11px; }

        /* ─── Main Grid ─── */
        .pd-wrap {
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px 20px 40px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
        }

        @media (min-width: 1024px) {
          .pd-wrap {
            grid-template-columns: minmax(0, 440px) 1fr;
            gap: 48px;
            align-items: start;
          }
        }

        /* ─── Left: Image Column ─── */
        .pd-left { display: flex; flex-direction: column; gap: 16px; }

        .pd-img-stage {
          position: relative;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          aspect-ratio: 1;
          cursor: zoom-in;
          box-shadow: var(--shadow-card);
        }

        .pd-img-stage img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 36px;
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          display: block;
        }

        .pd-img-stage:hover img { transform: scale(1.06); }

        .pd-img-overlays {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 10;
        }

        .pd-icon-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--ink2);
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .pd-icon-btn:hover { transform: scale(1.12); box-shadow: 0 4px 20px rgba(0,0,0,0.12); color: var(--ink); }
        .pd-icon-btn.pd-wishlisted { color: #e53e3e; background: rgba(229,62,62,0.08); }

        .pd-discount-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          background: var(--accent);
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 10px;
          letter-spacing: 0.03em;
          box-shadow: 0 4px 12px rgba(232,82,26,0.35);
        }

        .pd-img-skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #f3f3f0 25%, #e9e9e4 50%, #f3f3f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .pd-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 4px 0;
        }
        .pd-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--border);
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          padding: 0;
        }
        .pd-dot.on { background: var(--accent); width: 20px; border-radius: 3px; }

        .pd-thumbs {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 4px 2px;
          scrollbar-width: none;
        }
        .pd-thumbs::-webkit-scrollbar { display: none; }

        .pd-thumb {
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          background: var(--card);
          border: 2px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          padding: 6px;
        }
        .pd-thumb:hover { border-color: rgba(0,0,0,0.15); }
        .pd-thumb.on { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(232,82,26,0.15); }
        .pd-thumb img { width: 100%; height: 100%; object-fit: contain; }

        /* ─── Right: Info Column ─── */
        .pd-right { display: flex; flex-direction: column; gap: 16px; }

        .pd-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-card);
        }

        /* Product Title Card */
        .pd-brand-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--accent);
          margin-bottom: 10px;
        }
        .pd-brand-tag::before {
          content: '';
          display: block;
          width: 20px;
          height: 2px;
          background: var(--accent);
          border-radius: 2px;
        }

        .pd-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(20px, 3vw, 27px);
          font-weight: 800;
          color: var(--ink);
          line-height: 1.2;
          margin-bottom: 16px;
        }

        .pd-meta-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pd-rating-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--green);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 8px;
        }

        .pd-rating-count {
          font-size: 13px;
          font-weight: 500;
          color: var(--ink3);
        }

        .pd-assured {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--accent2);
          background: rgba(26,53,87,0.07);
          padding: 4px 10px;
          border-radius: 6px;
        }

        /* Price */
        .pd-price-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px dashed rgba(0,0,0,0.08);
        }

        .pd-price-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--green);
          margin-bottom: 6px;
        }

        .pd-price-row {
          display: flex;
          align-items: baseline;
          gap: 14px;
          flex-wrap: wrap;
        }

        .pd-price {
          font-family: 'Syne', sans-serif;
          font-size: 42px;
          font-weight: 800;
          color: var(--ink);
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .pd-price-mrp {
          font-size: 18px;
          font-weight: 500;
          color: var(--ink3);
          text-decoration: line-through;
        }

        .pd-save-chip {
          background: var(--green-soft);
          color: var(--green);
          font-size: 13px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 20px;
        }

        .pd-tax-note {
          font-size: 12px;
          color: var(--ink3);
          font-weight: 500;
          margin-top: 6px;
        }

        /* Stock Status */
        .pd-stock-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          margin-top: 14px;
        }
        .pd-stock-bar.in { background: var(--green-soft); color: var(--green); }
        .pd-stock-bar.low { background: rgba(234,179,8,0.08); color: #92691a; }
        .pd-stock-bar.out { background: rgba(239,68,68,0.08); color: #b91c1c; }
        .pd-stock-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

        /* Seller */
        .pd-seller-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .pd-seller-avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid var(--border);
        }
        .pd-seller-name { font-size: 14px; font-weight: 700; color: var(--ink); }
        .pd-seller-label { font-size: 11px; font-weight: 500; color: var(--ink3); }
        .pd-verified-chip {
          margin-left: auto;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--green);
          background: var(--green-soft);
          padding: 5px 10px;
          border-radius: 6px;
        }

        /* Variants */
        .pd-section-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--ink3);
          margin-bottom: 12px;
        }
        .pd-var-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink2);
          margin-bottom: 10px;
        }
        .pd-var-label span { color: var(--ink3); font-weight: 500; }

        .pd-var-chips { display: flex; flex-wrap: wrap; gap: 8px; }

        .pd-chip {
          padding: 9px 18px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--ink2);
          font-size: 13px;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.18s;
        }
        .pd-chip:hover:not(.disabled):not(.on) {
          border-color: rgba(0,0,0,0.2);
          background: var(--card);
        }
        .pd-chip.on {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 700;
        }
        .pd-chip.disabled {
          opacity: 0.38;
          cursor: not-allowed;
          background: var(--surface);
        }
        .pd-chip-color { display: flex; align-items: center; gap: 8px; }
        .pd-color-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,0.12); flex-shrink: 0; }

        /* Delivery */
        .pd-delivery-form { display: flex; gap: 10px; }
        .pd-pin-input {
          flex: 1;
          padding: 12px 16px;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          outline: none;
          background: var(--surface);
          color: var(--ink);
          transition: all 0.2s;
        }
        .pd-pin-input:focus { border-color: var(--accent); background: var(--card); box-shadow: 0 0 0 4px rgba(232,82,26,0.08); }
        .pd-pin-btn {
          padding: 12px 20px;
          background: var(--ink);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .pd-pin-btn:hover:not(:disabled) { background: var(--accent); }
        .pd-pin-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .pd-delivery-result {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 14px;
          font-size: 13px;
        }
        .pd-delivery-result.ok { background: var(--green-soft); color: var(--green); }
        .pd-delivery-result.fail { background: rgba(239,68,68,0.07); color: #b91c1c; }
        .pd-delivery-eta { font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .pd-delivery-charges { border-top: 1px solid rgba(0,0,0,0.06); padding-top: 8px; font-size: 12px; display: flex; flex-direction: column; gap: 3px; }
        .pd-delivery-charges span { font-weight: 700; }

        .pd-address-card {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .pd-address-row { display: flex; align-items: center; justify-content: space-between; }
        .pd-address-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink3); }
        .pd-address-change { background: none; border: none; color: var(--accent); font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: 'Outfit', sans-serif; }
        .pd-address-change:hover { color: var(--accent2); }
        .pd-address-text { font-size: 14px; font-weight: 600; color: var(--ink); margin-top: 6px; }

        /* Tabs for Highlights / Desc / Specs */
        .pd-tabs {
          display: flex;
          gap: 2px;
          background: var(--surface);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 20px;
        }
        .pd-tab {
          flex: 1;
          padding: 9px 8px;
          border: none;
          background: none;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--ink3);
          border-radius: 9px;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all 0.2s;
          text-align: center;
        }
        .pd-tab.on {
          background: var(--card);
          color: var(--ink);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .pd-tab:hover:not(.on) { color: var(--ink2); }

        .pd-highlights { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
        .pd-highlight-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13.5px;
          color: var(--ink2);
          font-weight: 500;
          line-height: 1.5;
          padding: 10px 14px;
          background: var(--surface);
          border-radius: 10px;
        }
        .pd-highlight-icon { color: var(--green); margin-top: 1px; flex-shrink: 0; }

        .pd-description {
          font-size: 13.5px;
          color: var(--ink2);
          line-height: 1.7;
          font-weight: 400;
        }

        .pd-read-more {
          background: none;
          border: none;
          color: var(--accent);
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          padding: 8px 0 0;
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pd-specs { width: 100%; border-collapse: collapse; }
        .pd-specs tr { border-bottom: 1px solid rgba(0,0,0,0.05); }
        .pd-specs tr:last-child { border-bottom: none; }
        .pd-specs td { padding: 11px 0; vertical-align: top; }
        .pd-specs .spec-key { width: 38%; font-size: 13px; font-weight: 500; color: var(--ink3); padding-right: 16px; }
        .pd-specs .spec-val { font-size: 13px; font-weight: 600; color: var(--ink2); }

        /* CTA Buttons */
        .pd-cta-row { display: flex; gap: 12px; }

        .pd-btn-cart {
          flex: 1;
          padding: 16px 20px;
          background: var(--ink);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.03em;
          transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(15,14,23,0.18);
        }
        .pd-btn-cart:hover:not(:disabled) {
          background: #1a1a2e;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(15,14,23,0.24);
        }

        .pd-btn-buy {
          flex: 1;
          padding: 16px 20px;
          background: linear-gradient(135deg, var(--accent) 0%, #c43e0d 100%);
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.03em;
          transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(232,82,26,0.28);
        }
        .pd-btn-buy:hover:not(:disabled) {
          background: linear-gradient(135deg, #c43e0d 0%, var(--accent) 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(232,82,26,0.35);
        }

        .pd-btn-cart:disabled, .pd-btn-buy:disabled {
          background: #e2e2e0;
          color: #aaa;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        /* Sticky Mobile CTA */
        .pd-mobile-cta {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(16px);
          border-top: 1px solid var(--border);
          z-index: 50;
          display: flex;
          padding: 10px 16px 10px;
          gap: 10px;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.07);
        }
        @media (min-width: 1024px) { .pd-mobile-cta { display: none; } }

        .pd-mob-cart, .pd-mob-buy {
          flex: 1;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .pd-mob-cart { background: var(--ink); color: #fff; }
        .pd-mob-cart:hover:not(:disabled) { background: #1a1a2e; }
        .pd-mob-buy { background: var(--accent); color: #fff; }
        .pd-mob-buy:hover:not(:disabled) { background: #c43e0d; }
        .pd-mob-cart:disabled, .pd-mob-buy:disabled { background: #ddd; color: #999; cursor: not-allowed; }

        /* Similar / Recommended */
        .pd-recs { max-width: 1240px; margin: 0 auto; padding: 0 20px 40px; }
        .pd-recs-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .pd-recs-title {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: var(--ink);
        }
        .pd-recs-line { flex: 1; height: 1px; background: var(--border); }
        .pd-recs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 640px) { .pd-recs-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .pd-recs-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; } }

        /* Lightbox */
        .pd-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(10,10,14,0.96);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          backdrop-filter: blur(20px);
        }
        .pd-lightbox img { max-width: 90vw; max-height: 86vh; object-fit: contain; border-radius: 20px; }
        .pd-lightbox-close {
          position: absolute;
          top: 20px; right: 20px;
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          font-size: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .pd-lightbox-close:hover { background: rgba(255,255,255,0.18); transform: scale(1.08); }

        /* Divider label */
        .pd-divider-label {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--ink3);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pd-divider-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }
      `}</style>

      {/* Breadcrumb */}
      <div className="pd-breadcrumb">
        <Link to="/">Home</Link>
        <span className="pd-breadcrumb-sep">›</span>
        <Link to="/products">Products</Link>
        {p.category && (
          <>
            <span className="pd-breadcrumb-sep">›</span>
            <Link to={`/products?category=${p.category._id || p.category}`}>{p.category.name || p.category}</Link>
          </>
        )}
        <span className="pd-breadcrumb-sep">›</span>
        <span style={{ color: 'var(--ink2)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
      </div>

      {/* Main Grid */}
      <div className="pd-wrap">

        {/* ── LEFT: Image Column ── */}
        <div className="pd-left">
          <div
            className="pd-img-stage"
            onTouchStart={onMainImgTouchStart}
            onTouchEnd={onMainImgTouchEnd}
            onTouchCancel={onMainImgTouchCancel}
            onClick={onMainImgClick}
          >
            {discount > 0 && <div className="pd-discount-badge">{discount}% OFF</div>}

            <div className="pd-img-overlays" onClick={e => e.stopPropagation()}>
              <button className="pd-icon-btn" onClick={handleShare} title="Share">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </button>
              <button
                className={`pd-icon-btn ${isInWishlist(p._id || p.id) ? 'pd-wishlisted' : ''}`}
                onClick={() => isInWishlist(p._id || p.id) ? removeFromWishlist(p._id || p.id) : addToWishlist({ ...p, id: p._id || p.id })}
                title={isInWishlist(p._id || p.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                {isInWishlist(p._id || p.id)
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                }
              </button>
            </div>

            {imgLoading && imgs[activeImg] && <div className="pd-img-skeleton" />}
            {imgs[activeImg]
              ? <img src={getImageUrl(imgs[activeImg], 800)} alt={p.name} onLoad={() => setImgLoading(false)} onError={() => setImgLoading(false)} style={{ display: imgLoading ? 'none' : 'block' }} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink3)' }}>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12l2 2 4-4"/></svg>
                </div>
            }
          </div>

          {/* Dots (mobile) */}
          {imgs.length > 1 && (
            <div className="pd-dots" style={{ display: 'flex' }}>
              {imgs.map((_, i) => (
                <button key={i} className={`pd-dot ${i === activeImg ? 'on' : ''}`} onClick={() => setActiveImg(i)} aria-label={`Image ${i+1}`} />
              ))}
            </div>
          )}

          {/* Thumbnails */}
          {imgs.length > 1 && (
            <div className="pd-thumbs">
              {imgs.map((img, i) => (
                <button key={i} className={`pd-thumb ${i === activeImg ? 'on' : ''}`} onClick={() => setActiveImg(i)}>
                  <img src={getImageUrl(img, 200)} alt={`${p.name} view ${i+1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info Column ── */}
        <div className="pd-right">

          {/* Title + Price Card */}
          <div className="pd-card">
            {p.brand && <div className="pd-brand-tag">{p.brand.name || p.brand}</div>}
            <h1 className="pd-title">{p.name}</h1>

            <div className="pd-meta-row">
              <div className="pd-rating-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {Number(p.ratingAvg || 4.3).toFixed(1)}
              </div>
              <span className="pd-rating-count">{p.ratingCount || 12} ratings</span>
              <span className="pd-assured">✓ Assured</span>
            </div>

            <div className="pd-price-section">
              <div className="pd-price-label">Special Price</div>
              <div className="pd-price-row">
                <span className="pd-price">₹{displayPrice.toLocaleString('en-IN')}</span>
                {displayMrpRounded > displayPrice && (
                  <>
                    <span className="pd-price-mrp">₹{displayMrpRounded.toLocaleString('en-IN')}</span>
                    <span className="pd-save-chip">{discount}% off</span>
                  </>
                )}
              </div>
              <div className="pd-tax-note">{p.gst > 0 ? `Inclusive of ${p.gst}% GST` : 'Inclusive of all taxes'}</div>
            </div>

            {/* Stock Status */}
            {isAvailable ? (
              <div className={`pd-stock-bar ${stockSt.text === 'Limited Stock' ? 'low' : 'in'}`}>
                <span className="pd-stock-dot" />
                {stockSt.text === 'Limited Stock' ? 'Hurry — Limited Stock Left' : 'In Stock'}
              </div>
            ) : (
              <div className="pd-stock-bar out">
                <span className="pd-stock-dot" />
                Out of Stock
              </div>
            )}
          </div>

          {/* Seller Card */}
          {p.store && (
            <div className="pd-card pd-seller-row">
              {p.store.sellerAvatar
                ? <img src={getImageUrl(p.store.sellerAvatar, 100)} alt={p.store.name} className="pd-seller-avatar" />
                : <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏪</div>
              }
              <div>
                <div className="pd-seller-label">Sold by</div>
                <div className="pd-seller-name">{p.store.name}</div>
              </div>
              <span className="pd-verified-chip">✓ Verified</span>
            </div>
          )}

          {/* Variants Card */}
          {variantAttrs.length > 0 && (
            <div className="pd-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="pd-divider-label">Select Options</div>
              {variantAttrs.map((attr, attrIdx) => {
                const lowAttr = attr.toLowerCase().trim();
                const opts = variantOpts(attr);
                const isColor = ['color', 'colour', 'finish', 'shade'].includes(lowAttr);
                const selectedVal = selected[lowAttr];

                return (
                  <div key={attrIdx}>
                    <div className="pd-var-label">
                      {attr}: {selectedVal && <span>{selectedVal}</span>}
                    </div>
                    <div className="pd-var-chips">
                      {opts.map((optVal, optIdx) => {
                        const enabled = isOptEnabled(attr, optVal);
                        const isOn = selected[lowAttr]?.toLowerCase() === String(optVal).toLowerCase();
                        return (
                          <button
                            key={optIdx}
                            className={`pd-chip ${isOn ? 'on' : ''} ${!enabled ? 'disabled' : ''}`}
                            onClick={() => enabled && setSelected(s => ({ ...s, [lowAttr]: String(optVal) }))}
                            disabled={!enabled}
                          >
                            {isColor ? (
                              <span className="pd-chip-color">
                                <span className="pd-color-dot" style={{ backgroundColor: optVal.toLowerCase() }} />
                                {optVal}
                              </span>
                            ) : optVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delivery Card */}
          <div className="pd-card">
            <div className="pd-divider-label">Delivery</div>

            {user?.savedAddresses?.length > 0 ? (
              <div className="pd-address-card">
                <div className="pd-address-row">
                  <span className="pd-address-lbl">Deliver to</span>
                  <button
                    className="pd-address-change"
                    onClick={() => {
                      if (!selectedAddress) return;
                      const idx = user.savedAddresses.findIndex(a => a._id === selectedAddress._id);
                      const next = user.savedAddresses[(idx + 1) % user.savedAddresses.length];
                      setSelectedAddress(next);
                      if (next?.pincode) { setPincode(next.pincode); checkDeliveryImpl(next.pincode); }
                    }}
                  >
                    Change
                  </button>
                </div>
                <div className="pd-address-text">
                  {selectedAddress?.fullName} · {selectedAddress?.city} — {selectedAddress?.pincode}
                </div>
              </div>
            ) : (
              <form className="pd-delivery-form" onSubmit={checkDelivery}>
                <input
                  type="text"
                  value={pincode}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit pincode"
                  className="pd-pin-input"
                />
                <button type="submit" className="pd-pin-btn" disabled={checkingDelivery || pincode.length !== 6}>
                  {checkingDelivery ? '...' : 'Check'}
                </button>
              </form>
            )}

            {deliveryInfo && (
              <div className={`pd-delivery-result ${deliveryInfo.serviceable ? 'ok' : 'fail'}`}>
                {deliveryInfo.serviceable ? (
                  <>
                    <div className="pd-delivery-eta">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Delivery by {deliveryInfo.etaStart?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} – {deliveryInfo.etaEnd?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="pd-delivery-charges">
                      <div>Prepaid: <span>{deliveryInfo.isFreeDelivery ? 'FREE' : `₹${deliveryInfo.deliveryCharge || 85}`}</span></div>
                      {deliveryInfo.codAvailable
                        ? <div>COD: <span>₹{deliveryInfo.codFinalCharge || (deliveryInfo.deliveryCharge || 85) + (deliveryInfo.codCharge || 0)}</span> <span style={{ fontWeight: 400, color: 'var(--green)' }}>(Delivery ₹{deliveryInfo.deliveryCharge || 85} + COD ₹{deliveryInfo.codCharge || 0})</span></div>
                        : <div style={{ color: '#b45309' }}>COD not available</div>
                      }
                    </div>
                  </>
                ) : (
                  <div style={{ fontWeight: 700 }}>✗ {deliveryInfo.message || 'Not deliverable to this pincode'}</div>
                )}
              </div>
            )}
          </div>

          {/* Highlights / Description / Specs Tabbed Card */}
          {(hasHighlights || hasDescription || hasSpecifications) && (
            <div className="pd-card">
              <div className="pd-tabs">
                {hasHighlights && <button className={`pd-tab ${activeTab === 'highlights' ? 'on' : ''}`} onClick={() => setActiveTab('highlights')}>Highlights</button>}
                {hasDescription && <button className={`pd-tab ${activeTab === 'description' ? 'on' : ''}`} onClick={() => setActiveTab('description')}>Description</button>}
                {hasSpecifications && <button className={`pd-tab ${activeTab === 'specs' ? 'on' : ''}`} onClick={() => setActiveTab('specs')}>Specs</button>}
              </div>

              {activeTab === 'highlights' && hasHighlights && (
                <ul className="pd-highlights">
                  {p.highlights.map((h, i) => (
                    <li key={i} className="pd-highlight-item">
                      <svg className="pd-highlight-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'description' && hasDescription && (
                <div>
                  <p className="pd-description" style={{ display: descriptionExpanded ? 'block' : '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description}
                  </p>
                  {p.description.length > 280 && (
                    <button className="pd-read-more" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                      {descriptionExpanded ? '▲ Read Less' : '▼ Read More'}
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'specs' && hasSpecifications && (
                <table className="pd-specs">
                  <tbody>
                    {p.specifications.map((spec, i) => {
                      if (typeof spec === 'object' && spec !== null) {
                        return (
                          <tr key={i}>
                            <td className="spec-key">{spec.key || spec.label}</td>
                            <td className="spec-val">{spec.value || spec.val}</td>
                          </tr>
                        );
                      }
                      if (typeof spec === 'string') {
                        const parts = spec.split(':').map(s => s.trim());
                        if (parts.length === 2) return (
                          <tr key={i}>
                            <td className="spec-key">{parts[0]}</td>
                            <td className="spec-val">{parts[1]}</td>
                          </tr>
                        );
                      }
                      return null;
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Desktop CTA Buttons */}
          <div className="pd-cta-row" style={{ display: 'none' }} id="pd-desktop-cta">
          </div>
          <div className="pd-cta-row" style={{ marginTop: 4 }}>
            <button className="pd-btn-cart" onClick={handleAddToCart} disabled={!canAddToCart}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Add to Cart
            </button>
            <button className="pd-btn-buy" onClick={handleBuyNow} disabled={!canAddToCart}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
              Buy Now
            </button>
          </div>

        </div>
      </div>

      {/* Recommended Products */}
      {similarProducts.length > 0 && (
        <div className="pd-recs">
          <div className="pd-recs-header">
            <h3 className="pd-recs-title">You May Also Like</h3>
            <div className="pd-recs-line" />
          </div>
          <div className="pd-recs-grid">
            {similarProducts.map((product, i) => (
              <ProductCard key={i} p={product} />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && imgs[activeImg] && (
        <div className="pd-lightbox" onClick={() => setLightbox(false)}>
          <button className="pd-lightbox-close" onClick={() => setLightbox(false)}>×</button>
          <img src={getImageUrl(imgs[activeImg], 1200)} alt={p.name} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Mobile Sticky CTA */}
      <div className="pd-mobile-cta">
        <button className="pd-mob-cart" onClick={handleAddToCart} disabled={!canAddToCart}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Add to Cart
        </button>
        <button className="pd-mob-buy" onClick={handleBuyNow} disabled={!canAddToCart}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
          Buy Now
        </button>
      </div>

      <RecommendationModal isOpen={recOpen} onClose={() => setRecOpen(false)} products={recItems} onAddToCart={handleAddToCart} />
    </div>
  );
}