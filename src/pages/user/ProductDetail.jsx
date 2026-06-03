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
  const { user, isAuthenticated } = useAuth();

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
  const [recOpen, setRecOpen] = useState(false);
  const [recItems, setRecItems] = useState([]);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });
  const [hlSpecTab, setHlSpecTab] = useState('highlights');
  const [pincode, setPincode] = useState('');
  const [checkingDelivery, setCheckingDelivery] = useState(false);
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

        let matchVal = false;
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowAttr && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) {
            matchVal = true;
          }
        });
        return matchVal;
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

  // Set initial pincode from user's saved addresses
  useEffect(() => {
    if (user?.savedAddresses && user.savedAddresses.length > 0) {
      // Get default address or first address
      const defaultAddress = user.savedAddresses.find(addr => addr.isDefault) || user.savedAddresses[0];
      if (defaultAddress?.pincode) {
        setPincode(defaultAddress.pincode);
        checkDeliveryImpl(defaultAddress.pincode);
      }
    } else if (user?.address) {
      // Fallback to old address format
      const pincodeMatch = user.address.match(/\b(\d{6})\b/);
      if (pincodeMatch) {
        setPincode(pincodeMatch[1]);
        checkDeliveryImpl(pincodeMatch[1]);
      }
    }
  }, [user?.savedAddresses, user?.address]);

  const checkDeliveryImpl = async (code) => {
    if (code.length !== 6) return;
    setCheckingDelivery(true);
    try {
      const { data } = await api.get(`/api/shipping/check-pincode`, { params: { pincode: code } });
      setDeliveryInfo({
        serviceable: data.delivery_available,
        message: data.delivery_available ? 'Delivery available' : 'Not available for delivery in this pincode'
      });
    } catch (err) {
      console.error(err);
      setDeliveryInfo({ serviceable: false, message: 'Unable to check delivery for this pincode' });
    } finally {
      setCheckingDelivery(false);
    }
  };

  const checkDelivery = (e) => {
    e?.preventDefault();
    checkDeliveryImpl(pincode);
  };

  useEffect(() => {
    if (p) {
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
    if (!isAuthenticated) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
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

  const handleBuyNow = async () => {
    if (!isAuthenticated) { 
      navigate('/login', { state: { from: location.pathname + location.search } }); 
      return; 
    }
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
      navigate('/enquiry');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-50 flex items-center justify-center py-8 px-3 sm:py-12 sm:px-4">
        <LoadingSpinner text="Fetching product details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-50 flex items-center justify-center py-8 px-3 sm:py-12 sm:px-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 text-center border border-white/80">
          <div className="text-4xl sm:text-5xl lg:text-7xl mb-4 sm:mb-6 bg-gradient-to-br from-blue-100 to-purple-100 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex items-center justify-center rounded-full mx-auto">
            😔
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2 sm:mb-3">
            Oops!
          </h2>
          <p className="text-slate-600 mb-6 sm:mb-8 lg:mb-10 text-sm sm:text-base lg:text-lg leading-relaxed">{error}</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-sm sm:text-base"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  if (!p) return null;

  return (
    <div className="pd">
      <style jsx>{`
        .pd {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #020617 25%, #f8fafc 25%, #f8fafc 100%);
          color: #0f172a;
          min-height: 100vh;
          overflow-x: hidden;
          width: 100%;
        }
        
        .pd-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 12px 40px;
          position: relative;
          z-index: 1;
        }
        
        @media (min-width: 480px) {
          .pd-wrap { padding: 20px 16px 48px; }
        }
        
        @media (min-width: 768px) {
          .pd-wrap { padding: 32px 24px 64px; }
        }
        
        @media (min-width: 1024px) {
          .pd-wrap { padding: 40px 32px 80px; }
        }
        
        .pd-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        
        @media (min-width: 1024px) {
          .pd-grid {
            grid-template-columns: 440px 1fr;
            gap: 48px;
            align-items: start;
          }
        }
        
        .pd-img-main {
          background: linear-gradient(145deg, #ffffff 0%, #f0f4ff 50%, #e8eafc 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 20px;
          overflow: hidden;
          aspect-ratio: 1;
          position: relative;
          cursor: zoom-in;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 40px -16px rgba(15, 23, 42, 0.2);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
        }
        
        @media (min-width: 640px) {
          .pd-img-main { border-radius: 28px; }
        }
        
        .pd-img-main img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 20px;
        }
        
        @media (min-width: 768px) {
          .pd-img-main img { padding: 32px; }
        }
        
        .pd-img-main:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 56px -20px rgba(15, 23, 42, 0.3);
          border-color: rgba(59, 130, 246, 0.25);
        }
        
        .pd-thumbs {
          display: flex;
          gap: 8px;
          padding: 12px 0 20px;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
          -webkit-overflow-scrolling: touch;
        }
        
        @media (min-width: 640px) {
          .pd-thumbs { gap: 10px; padding: 16px 0 24px; }
        }
        
        .pd-thumbs::-webkit-scrollbar {
          height: 4px;
        }
        
        .pd-thumbs::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 100px;
        }
        
        .pd-thumb {
          width: 60px;
          height: 60px;
          flex-shrink: 0;
          background: white;
          border: 2px solid rgba(59, 130, 246, 0.12);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
        }
        
        @media (min-width: 480px) {
          .pd-thumb { width: 68px; height: 68px; border-radius: 16px; }
        }
        
        @media (min-width: 640px) {
          .pd-thumb { width: 76px; height: 76px; border-radius: 18px; }
        }
        
        .pd-thumb:hover {
          border-color: rgba(59, 130, 246, 0.35);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
        }
        
        .pd-thumb.on {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12), 0 8px 28px rgba(59, 130, 246, 0.25);
          transform: translateY(-3px) scale(1.02);
        }
        
        .pd-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 10px;
        }
        
        @media (min-width: 640px) {
          .pd-thumb img { padding: 12px; }
        }
        
        .pd-variants {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
          padding: 18px 14px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(24px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 10px 32px -16px rgba(15, 23, 42, 0.12);
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        
        @media (min-width: 480px) {
          .pd-variants { padding: 20px 16px; gap: 18px; }
        }
        
        @media (min-width: 640px) {
          .pd-variants { padding: 24px 20px; gap: 20px; border-radius: 24px; }
        }
        
        .pd-var-sec {
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          z-index: 1;
        }
        
        @media (min-width: 640px) {
          .pd-var-sec { gap: 12px; }
        }
        
        .pd-var-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .pd-var-lbl {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #374151;
        }
        
        @media (min-width: 640px) {
          .pd-var-lbl { gap: 10px; font-size: 13px; }
        }
        
        .pd-var-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          box-shadow: 0 3px 12px rgba(59, 130, 246, 0.12);
        }
        
        @media (min-width: 640px) {
          .pd-var-icon { width: 36px; height: 36px; font-size: 17px; border-radius: 14px; }
        }
        
        .pd-var-name {
          text-transform: uppercase;
          font-weight: 800;
          color: #6b7280;
          letter-spacing: 0.1em;
          font-size: 10px;
        }
        
        @media (min-width: 640px) {
          .pd-var-name { font-size: 11px; }
        }
        
        .pd-var-selected {
          color: #3b82f6;
          font-weight: 800;
          padding: 5px 10px;
          border-radius: 12px;
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          font-size: 11px;
        }
        
        @media (min-width: 640px) {
          .pd-var-selected { padding: 6px 14px; font-size: 12px; border-radius: 14px; }
        }
        
        .pd-var-opts {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: stretch;
        }
        
        @media (min-width: 640px) {
          .pd-var-opts { gap: 8px; }
        }
        
        .pd-var-opts.has-many {
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 8px;
          padding: 2px 2px 10px;
          margin: 0 -2px;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }
        
        .pd-var-btn {
          min-width: 64px;
          padding: 10px 12px;
          background: white;
          border: 2px solid rgba(59, 130, 246, 0.15);
          border-radius: 12px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          position: relative;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
        }
        
        @media (min-width: 480px) {
          .pd-var-btn { min-width: 72px; padding: 12px 14px; border-radius: 14px; gap: 4px; }
        }
        
        @media (min-width: 640px) {
          .pd-var-btn { min-width: 80px; padding: 14px 16px; border-radius: 16px; gap: 5px; }
        }
        
        .pd-var-btn:hover:not(.disabled):not(.on) {
          border-color: rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%);
          transform: translateY(-2px);
          box-shadow: 0 10px 28px -8px rgba(59, 130, 246, 0.25);
        }
        
        .pd-var-btn.on {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-color: #3b82f6;
          box-shadow: 0 12px 36px -12px rgba(59, 130, 246, 0.4);
          transform: translateY(-3px);
        }
        
        .pd-var-btn.on .pd-var-val {
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        
        .pd-var-btn.on .pd-var-price {
          color: rgba(255, 255, 255, 0.9);
        }
        
        .pd-var-val {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          transition: color 0.3s;
          position: relative;
          z-index: 2;
        }
        
        @media (min-width: 640px) {
          .pd-var-val { font-size: 13px; }
        }
        
        .pd-var-price {
          font-size: 10px;
          font-weight: 700;
          color: #3b82f6;
          letter-spacing: 0.02em;
          position: relative;
          z-index: 2;
        }
        
        @media (min-width: 640px) {
          .pd-var-price { font-size: 11px; }
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
          margin-top: 12px;
        }
        
        @media (min-width: 1024px) {
          .pd-info {
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.95);
            border-radius: 28px;
            padding: 32px 28px 40px;
            margin-top: 0;
            box-shadow: 0 18px 56px -24px rgba(15, 23, 42, 0.12);
          }
        }
        
        .pd-meta-compact {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }
        
        @media (min-width: 640px) {
          .pd-meta-compact { gap: 8px; margin-bottom: 16px; }
        }
        
        .pd-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 0;
          align-items: center;
        }
        
        @media (min-width: 640px) {
          .pd-badges { gap: 8px; }
        }
        
        .pd-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 999px;
        }
        
        @media (min-width: 640px) {
          .pd-badge { font-size: 11px; padding: 6px 12px; }
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
          font-size: clamp(20px, 5vw, 36px);
          font-weight: 900;
          line-height: 1.15;
          background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
          letter-spacing: -0.03em;
        }
        
        @media (min-width: 640px) {
          .pd-name { margin-bottom: 14px; }
        }
        
        .pd-rating-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        
        @media (min-width: 640px) {
          .pd-rating-row { gap: 12px; margin-bottom: 22px; }
        }
        
        .pd-rating {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          padding: 7px 14px;
          border-radius: 999px;
          font-weight: 800;
          box-shadow: 0 6px 20px -8px rgba(5, 150, 105, 0.4);
          font-size: 13px;
        }
        
        @media (min-width: 640px) {
          .pd-rating { padding: 8px 16px; gap: 8px; font-size: 14px; }
        }
        
        .pd-price-block {
          background: linear-gradient(165deg, #ffffff 0%, #f8fafc 50%, #f0f4ff 100%);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 20px;
          padding: 18px 16px 16px;
          margin-bottom: 18px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 14px 44px -20px rgba(59, 130, 246, 0.18);
        }
        
        @media (min-width: 640px) {
          .pd-price-block {
            border-radius: 24px;
            padding: 24px 20px 20px;
            margin-bottom: 22px;
          }
        }
        
        .pd-price-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent 0%, #3b82f6 25%, #8b5cf6 50%, #3b82f6 75%, transparent 100%);
        }
        
        .pd-price-main {
          font-size: clamp(28px, 7vw, 48px);
          font-weight: 900;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .pd-price-mrp {
          font-size: 14px;
          color: #94a3b8;
          text-decoration: line-through;
          font-weight: 600;
        }
        
        @media (min-width: 640px) {
          .pd-price-mrp { font-size: 16px; }
        }
        
        .pd-price-save {
          font-size: 11px;
          color: #059669;
          font-weight: 800;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 5px 10px;
          border-radius: 999px;
        }
        
        @media (min-width: 640px) {
          .pd-price-save { font-size: 12px; padding: 6px 14px; }
        }
        
        .pd-stock {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 999px;
        }
        
        @media (min-width: 640px) {
          .pd-stock { gap: 8px; font-size: 12px; padding: 8px 14px; }
        }
        
        .pd-stock-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        @media (min-width: 640px) {
          .pd-stock-dot { width: 9px; height: 9px; }
        }
        
        .pd-countdown {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: stretch;
        }
        
        @media (min-width: 640px) {
          .pd-countdown {
            flex-direction: row;
            align-items: center;
            gap: 14px;
            margin-top: 18px;
          }
        }
        
        .pd-countdown-lbl {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        
        @media (min-width: 640px) {
          .pd-countdown-lbl { font-size: 12px; }
        }
        
        .pd-countdown-val {
          display: flex;
          gap: 6px;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        @media (min-width: 640px) {
          .pd-countdown-val { gap: 8px; }
        }
        
        .pd-countdown-item {
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          padding: 6px 10px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.18);
          min-width: 48px;
          text-align: center;
          box-shadow: 0 3px 12px rgba(59, 130, 246, 0.1);
        }
        
        @media (min-width: 640px) {
          .pd-countdown-item { padding: 8px 14px; min-width: 56px; border-radius: 14px; }
        }
        
        .pd-countdown-num {
          font-size: 16px;
          font-weight: 900;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        @media (min-width: 640px) {
          .pd-countdown-num { font-size: 18px; }
        }
        
        .pd-countdown-label {
          font-size: 9px;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        
        .pd-delivery {
          margin-top: 20px;
          background: rgba(255, 255, 255, 0.92);
          border-radius: 18px;
          border: 1px solid rgba(59, 130, 246, 0.12);
          overflow: hidden;
          box-shadow: 0 8px 28px -14px rgba(15, 23, 42, 0.1);
        }
        
        @media (min-width: 640px) {
          .pd-delivery { margin-top: 24px; border-radius: 20px; }
        }
        
        .pd-delivery-head {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-start;
          padding: 14px 14px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%);
        }
        
        @media (min-width: 480px) {
          .pd-delivery-head {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 16px 18px;
            gap: 10px;
          }
        }
        
        .pd-delivery-form {
          padding: 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        @media (min-width: 480px) {
          .pd-delivery-form {
            padding: 16px 18px;
            flex-direction: row;
            align-items: center;
            gap: 12px;
          }
        }
        
        .pd-del-inp {
          width: 100%;
          padding: 12px 16px;
          border-radius: 14px;
          border: 2px solid rgba(59, 130, 246, 0.18);
          background: white;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          outline: none;
          transition: all 0.3s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        @media (min-width: 480px) {
          .pd-del-inp {
            flex: 1;
            min-width: 120px;
            padding: 14px 18px;
            border-radius: 16px;
            font-size: 14px;
          }
        }
        
        .pd-del-inp:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        
        .pd-del-check {
          width: 100%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
        }
        
        @media (min-width: 480px) {
          .pd-del-check {
            width: auto;
            padding: 14px 22px;
            border-radius: 16px;
            font-size: 12px;
          }
        }
        
        .pd-del-check:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(59, 130, 246, 0.4);
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
          margin-top: 20px;
        }
        
        @media (min-width: 640px) {
          .pd-cta {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 24px;
          }
        }
        
        .pd-btn-primary {
          flex: 1;
          min-width: 140px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          background-size: 200% 200%;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 10px 32px -10px rgba(59, 130, 246, 0.4);
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
            padding: 16px 32px;
            border-radius: 18px;
            font-size: 13px;
            gap: 10px;
          }
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
          transform: translateY(-4px);
          box-shadow: 0 18px 48px -12px rgba(59, 130, 246, 0.5);
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
        
        .pd-btn-buy-now {
          flex: 1;
          min-width: 140px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          background-size: 200% 200%;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 10px 32px -10px rgba(249, 115, 22, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
          width: 100%;
        }
        
        @media (min-width: 640px) {
          .pd-btn-buy-now {
            padding: 16px 32px;
            border-radius: 18px;
            font-size: 13px;
            gap: 10px;
          }
        }
        
        .pd-btn-buy-now::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }
        
        .pd-btn-buy-now:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 0 18px 48px -12px rgba(249, 115, 22, 0.5);
        }
        
        .pd-btn-buy-now:hover:not(:disabled)::after {
          transform: translateX(100%);
        }
        
        .pd-btn-buy-now:active:not(:disabled) {
          transform: translateY(-2px) scale(0.98);
        }
        
        .pd-btn-buy-now:disabled {
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
          padding: 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          transition: all 0.3s;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: auto;
          min-width: 60px;
          height: 56px;
        }
        
        @media (min-width: 640px) {
          .pd-btn-secondary {
            padding: 16px;
            border-radius: 18px;
            font-size: 12px;
            gap: 8px;
            min-width: 70px;
            height: 64px;
          }
        }
        
        .pd-btn-secondary:hover {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%);
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(59, 130, 246, 0.18);
        }
        
        .pd-trust {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding-top: 18px;
          border-top: 1px solid rgba(59, 130, 246, 0.08);
          margin-top: 18px;
        }
        
        @media (min-width: 480px) {
          .pd-trust { grid-template-columns: repeat(5, 1fr); gap: 8px; }
        }
        
        .pd-trust-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          color: #475569;
          font-weight: 700;
          background: white;
          padding: 10px 8px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.1);
          text-align: center;
        }
        
        @media (min-width: 480px) {
          .pd-trust-item {
            flex-direction: row;
            gap: 6px;
            font-size: 10px;
            padding: 10px 14px;
            border-radius: 14px;
            text-align: left;
          }
        }
        
        @media (min-width: 640px) {
          .pd-trust-item { font-size: 11px; }
        }
        
        .pd-hl-spec-card {
          margin-top: 24px;
          background: white;
          border-radius: 20px;
          border: 1px solid rgba(59, 130, 246, 0.12);
          overflow: hidden;
          box-shadow: 0 12px 40px -20px rgba(15, 23, 42, 0.1);
        }
        
        @media (min-width: 640px) {
          .pd-hl-spec-card { margin-top: 32px; border-radius: 24px; }
        }
        
        .pd-hl-spec-tabs {
          display: flex;
          gap: 0;
          padding: 0 12px;
          border-bottom: 1px solid rgba(59, 130, 246, 0.08);
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.03), transparent);
        }
        
        @media (min-width: 640px) {
          .pd-hl-spec-tabs { padding: 0 16px; }
        }
        
        .pd-hl-spec-tabs button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
          border-bottom: 3px solid transparent;
          margin-bottom: -1px;
          transition: all 0.25s;
        }
        
        @media (min-width: 640px) {
          .pd-hl-spec-tabs button { font-size: 12px; padding: 14px 20px; }
        }
        
        .pd-hl-spec-tabs button:hover {
          color: #3b82f6;
        }
        
        .pd-hl-spec-tabs button.on {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }
        
        .pd-card-body {
          padding: 18px 16px 22px;
        }
        
        @media (min-width: 640px) {
          .pd-card-body { padding: 24px 24px 28px; }
        }
        
        .pd-hl-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 10px 0;
          font-size: 13px;
          color: #374151;
        }
        
        @media (min-width: 640px) {
          .pd-hl-item { gap: 12px; padding: 12px 0; font-size: 14px; }
        }
        
        .pd-hl-item + .pd-hl-item {
          border-top: 1px solid rgba(59, 130, 246, 0.06);
        }
        
        .pd-hl-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          margin-top: 3px;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        @media (min-width: 640px) {
          .pd-hl-dot { width: 10px; height: 10px; margin-top: 4px; }
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
          padding: 12px 0;
        }
        
        @media (min-width: 640px) {
          .pd-spec-table td { padding: 14px 0; }
        }
        
        .pd-spec-table td:first-child {
          font-size: 12px;
          color: #64748b;
          width: 40%;
          font-weight: 600;
        }
        
        @media (min-width: 640px) {
          .pd-spec-table td:first-child { font-size: 13px; }
        }
        
        .pd-spec-table td:last-child {
          font-size: 13px;
          color: #0f172a;
          font-weight: 700;
        }
        
        @media (min-width: 640px) {
          .pd-spec-table td:last-child { font-size: 14px; }
        }
        
        .pd-description {
          margin-top: 20px;
        }
        
        @media (min-width: 640px) {
          .pd-description { margin-top: 28px; }
        }
        
        .pd-desc-title {
          font-size: 11px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        
        @media (min-width: 640px) {
          .pd-desc-title { font-size: 12px; margin-bottom: 14px; }
        }
        
        .pd-desc-content {
          background: white;
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.1);
          padding: 16px 16px;
        }
        
        @media (min-width: 640px) {
          .pd-desc-content { border-radius: 20px; padding: 24px 24px; }
        }
        
        .pd-desc-content p {
          color: #475569;
          font-size: 13px;
          line-height: 1.8;
          margin: 0;
        }
        
        @media (min-width: 640px) {
          .pd-desc-content p { font-size: 14px; }
        }
        
        .pd-similar {
          margin-top: 32px;
        }
        
        @media (min-width: 640px) {
          .pd-similar { margin-top: 48px; }
        }
        
        .pd-similar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        @media (min-width: 640px) {
          .pd-similar-header { margin-bottom: 24px; }
        }
        
        .pd-similar-title {
          font-size: 18px;
          font-weight: 900;
          background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
          letter-spacing: -0.02em;
        }
        
        @media (min-width: 640px) {
          .pd-similar-title { font-size: 24px; gap: 10px; }
        }
        
        .pd-view-all {
          font-size: 10px;
          font-weight: 800;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s;
        }
        
        @media (min-width: 640px) {
          .pd-view-all { font-size: 12px; gap: 6px; }
        }
        
        .pd-view-all:hover {
          color: #8b5cf6;
          gap: 8px;
        }
        
        .pd-similar-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        @media (min-width: 550px) {
          .pd-similar-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
        }
        
        @media (min-width: 768px) {
          .pd-similar-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }
        
        @keyframes pdStockPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.65); }
        }
      `}</style>

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
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'white',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    boxShadow: '0 5px 16px rgba(5, 150, 105, 0.25)'
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                {Number(p.ratingCount || 128).toLocaleString()} Ratings
              </span>
            </div>

            {/* Price Block */}
            <div className="pd-price-block">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '5px' }}>
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
                <div style={{ fontSize: '12px', color: '#059669', fontWeight: 800, marginTop: '5px' }}>
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
                  boxShadow: isAvailable ? '0 5px 16px rgba(5, 150, 105, 0.15)' : '0 5px 16px rgba(239, 68, 68, 0.15)'
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" />
                  </svg>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Check Delivery</span>
                </div>
                {deliveryInfo?.serviceable && deliveryInfo?.deliveryDays && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '12px', fontWeight: 800 }}>
                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ships</span>
                    <span>{deliveryInfo.deliveryDays} days</span>
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
                <button type="submit" className="pd-del-check" disabled={pincode.length !== 6 || checkingDelivery}>
                  {checkingDelivery ? 'Checking...' : 'Check'}
                </button>
              </form>
              {deliveryInfo && (
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(59, 130, 246, 0.1)',
                  fontSize: '13px',
                  color: deliveryInfo.serviceable ? '#059669' : '#dc2626',
                  fontWeight: 700
                }}>
                  {deliveryInfo.serviceable ? (
                    <div>
                      <div style={{ marginBottom: '4px' }}>✓ Available for delivery</div>
                      {deliveryInfo.deliveryCharge !== undefined && (
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                          Delivery charge: {deliveryInfo.deliveryCharge === 0 ? 'Free' : `₹${deliveryInfo.deliveryCharge.toLocaleString()}`}
                        </div>
                      )}
                      {deliveryInfo.codAvailable && (
                        <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700, marginTop: '4px' }}>
                          📦 Cash on Delivery available
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      ✗ Not available for delivery in this pincode
                      {deliveryInfo.message && (
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>{deliveryInfo.message}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="pd-cta">
              {authed ? (
                <>
                  {/* Wishlist Button */}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    )}
                  </button>

                  {/* Add to Cart & Buy Now */}
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
                    {totalStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                  <button
                    className="pd-btn-buy-now"
                    onClick={handleBuyNow}
                    disabled={!canAddToCart}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 5a3 3 0 0 0-6 0H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4zM1 21h12" />
                      <path d="M9 10h6" />
                    </svg>
                    {totalStock <= 0 ? 'Out of Stock' : 'Buy Now'}
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
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

      <RecommendationModal
        isOpen={recOpen}
        onClose={() => setRecOpen(false)}
        items={recItems}
        cartProduct={p}
        addToCart={addToCart}
        authed={authed}
        navigate={navigate}
      />
    </div>
  );
}
