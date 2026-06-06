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

function VariantIcon({ name }) {
  const IconSVG = () => {
    switch (name) {
      case 'option':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        );
      case 'color':
      case 'colour':
      case 'finish':
      case 'shade':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 13l4-1v8a3 3 0 103 3"/>
          </svg>
        );
      case 'ram':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <path d="M9 1v2M15 1v2M9 21v2M15 21v2"/>
          </svg>
        );
      case 'rom':
      case 'storage':
      case 'memory':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <path d="M12 18h.01"/>
          </svg>
        );
      case 'size':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M12 2L4 5v10l8 3 8-3V5l-8-3z"/>
            <path d="M4.5 7.5L20.5 7.5"/>
          </svg>
        );
      case 'watt':
      case 'power':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/>
          </svg>
        );
      case 'material':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M12.22 2s-4.15 2.14-1.56 4.16 4.7 5 1.42 5-4.62 10 1 1 3.5-3 1-3.5 1.1 2.5 4.37-3.5 2.85 1 3z"/>
          </svg>
        );
      case 'model':
      case 'variant':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2"/>
            <path d="M12 18h.01"/>
          </svg>
        );
      case 'screen':
      case 'display':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="2" y="3" width="20" height="15" rx="2"/>
            <path d="M8 21h8"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.8 1.8H11v2h7.5l-1.8 1.8a1 1 0 0 0 1.4 1.4l4-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 0z"/>
            <path d="M5 18v-6"/>
          </svg>
        );
    }
  };
  return <IconSVG />;
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
        
        // Fallback: get random products if no specific recommendations
        const fallbackRes = await api.get('/api/products?limit=8');
        return fallbackRes.data?.items || [];
      } catch (err) {
        // If both fail, get fallback products
        try {
          const fallbackRes = await api.get('/api/products?limit=8');
          return fallbackRes.data?.items || [];
        } catch {
          return [];
        }
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
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [pincode, setPincode] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

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

  const currentPrice = matchedVariant?.price ?? p?.price;
  const currentMrp = matchedVariant?.mrp ?? p?.mrp;
  const currentStock = matchedVariant?.stock ?? p?.stock;
  const isAvailable = currentStock > 0;

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
  const stockSt = { ...stockStRaw, text: String(stockStRaw.text || '').includes('Only') ? 'Limited Stock' : stockStRaw.text };

  const canAddToCart = variantAttrs.every(attr => !!selected[attr.toLowerCase().trim()]) && !!matchedVariant && isAvailable;

  const hasHighlights = p && Array.isArray(p.highlights) && p.highlights.length > 0;
  const hasSpecifications = p && Array.isArray(p.specifications) && p.specifications.length > 0;
  const hasDescription = p?.description?.length > 0;

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

  // Set initial pincode from user's saved addresses
  useEffect(() => {
    if (user?.savedAddresses && user.savedAddresses.length > 0) {
      const defaultAddress = user.savedAddresses.find(addr => addr.isDefault) || user.savedAddresses[0];
      setSelectedAddress(defaultAddress);
      if (defaultAddress?.pincode) {
        setPincode(defaultAddress.pincode);
        checkDeliveryImpl(defaultAddress.pincode);
      }
    } else if (user?.address) {
      const pincodeMatch = user.address.match(/\b(\d{6})\b/);
      if (pincodeMatch) {
        setPincode(pincodeMatch[1]);
        checkDeliveryImpl(pincodeMatch[1]);
      }
    }
  }, [user?.savedAddresses, user?.address]);

  // Recheck delivery when price changes to update free delivery status
  useEffect(() => {
    if (pincode.length === 6) {
      checkDeliveryImpl(pincode);
    }
  }, [currentPrice, minPrice, pincode]);

  const checkDeliveryImpl = async (code, weight = (p?.weight || 500) / 1000, orderAmount = currentPrice || minPrice) => {
    if (code.length !== 6) return;
    setCheckingDelivery(true);
    try {
      // First check pincode serviceability
      const serviceRes = await api.get(`/api/shipping/check-pincode`, { 
        params: { 
          pincode: code, 
          order_amount: orderAmount,
          store_id: p?.store?._id || p?.store
        } 
      });
      
      // Then calculate shipping charges
      const calculateRes = await api.post(`/api/shipping/calculate`, {
        destination_pin: code,
        weight: weight,
        order_amount: orderAmount,
        store_id: p?.store?._id || p?.store
      });
      
      // Calculate delivery dates
      const eta = serviceRes.data.eta || 3;
      const now = new Date();
      const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
      
      const etaStart = addDays(now, eta);
      const etaEnd = addDays(now, eta + 2);
      
      const freeDeliveryAbove = calculateRes.data.free_delivery_above || 999;
      const isFree = calculateRes.data.final_charge === 0;
      
      setDeliveryInfo({
        serviceable: serviceRes.data.delivery_available,
        codAvailable: serviceRes.data.cod_available,
        message: serviceRes.data.delivery_available ? 'Delivery available' : 'Not available for delivery in this pincode',
        etaStart: etaStart,
        etaEnd: etaEnd,
        deliveryCharge: calculateRes.data.delivery_charge,
        finalCharge: calculateRes.data.final_charge,
        freeDeliveryAbove: freeDeliveryAbove,
        isFreeDelivery: isFree
      });
    } catch (err) {
      console.error(err);
      const now = new Date();
      const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
      const freeDeliveryAbove = 999;
      const isFree = (currentPrice || minPrice) >= freeDeliveryAbove;
      setDeliveryInfo({ 
        serviceable: true, 
        message: 'Delivery available',
        etaStart: addDays(now, 3),
        etaEnd: addDays(now, 5),
        deliveryCharge: 85,
        finalCharge: isFree ? 0 : 85,
        freeDeliveryAbove: freeDeliveryAbove,
        isFreeDelivery: isFree
      });
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
    if (!p) return;
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
        setSelected(normalizeAttrs(currentMatch.attributes, currentMatch.sku));
        return;
      }
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
      offers: {
        '@type': 'Offer', priceCurrency: 'INR', price: String(p.price || 0),
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: window.location.origin + '/products/' + (p.slug || p._id)
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
        const { data } = await api.get('/api/recommendations/frequently-bought/' + p._id);
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

  const handleShare = async () => {
    try {
      const shareUrl = window.location.origin + '/products/' + (p.slug || p._id);
      const shareData = {
        title: p.name,
        text: 'Check out this product on SmartOdisha: ' + p.name,
        url: shareUrl,
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        notify('Product link copied to clipboard!', 'success');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center py-8 px-3 sm:py-12 sm:px-4">
        <LoadingSpinner text="Fetching product details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center py-8 px-3 sm:py-12 sm:px-4">
        <div className="max-w-md w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 lg:p-12 text-center border border-gray-100">
          <div className="text-4xl sm:text-5xl lg:text-7xl mb-4 sm:mb-6 bg-gradient-to-br from-blue-100 to-indigo-200 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex items-center justify-center rounded-full mx-auto">
            😔
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent mb-2 sm:mb-3">
            Oops!
          </h2>
          <p className="text-slate-600 mb-6 sm:mb-8 lg:mb-10 text-sm sm:text-base lg:text-lg leading-relaxed">{error}</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-sm sm:text-base"
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
          background: #f8fafc;
          color: #0f172a;
          min-height: 100vh;
          overflow-x: hidden;
          width: 100%;
        }
        
        .pd-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 12px 80px;
          position: relative;
          z-index: 1;
        }
        
        @media (min-width: 480px) {
          .pd-wrap { padding: 20px 16px 80px; }
        }
        
        @media (min-width: 768px) {
          .pd-wrap { padding: 32px 24px 80px; }
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
          background: linear-gradient(145deg, #ffffff 0%, #eff6ff 50%, #dbeafe 100%);
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
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
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
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          font-size: 11px;
        }
        
        @media (min-width: 640px) {
          .pd-var-selected { padding: 6px 14px; font-size: 12px; border-radius: 14px; }
        }
        
        .pd-var-opts {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: stretch;
        }
        
        @media (min-width: 640px) {
          .pd-var-opts { gap: 10px; }
        }
        
        .pd-var-opts.has-many {
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 10px;
          padding: 2px 2px 10px;
          margin: 0 -2px;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }
        
        .pd-var-btn {
          min-width: auto;
          padding: 10px 16px;
          background: white;
          border: 2px solid rgba(59, 130, 246, 0.15);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.04);
        }
        
        @media (min-width: 480px) {
          .pd-var-btn { padding: 12px 18px; border-radius: 14px; }
        }
        
        @media (min-width: 640px) {
          .pd-var-btn { padding: 14px 20px; border-radius: 16px; }
        }
        
        .pd-var-btn:hover:not(.disabled):not(.on) {
          border-color: rgba(59, 130, 246, 0.4);
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
          transform: translateY(-2px);
          box-shadow: 0 10px 28px -8px rgba(59, 130, 246, 0.25);
        }
        
        .pd-var-btn.on {
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
          border-color: #3b82f6;
          box-shadow: 0 12px 36px -12px rgba(59, 130, 246, 0.4);
          transform: translateY(-3px);
        }
        
        .pd-var-btn.on .pd-var-val {
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        
        .pd-var-val {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          transition: color 0.3s;
        }
        
        @media (min-width: 640px) {
          .pd-var-val { font-size: 13px; }
        }
        
        .pd-var-btn.disabled {
          opacity: 0.45;
          cursor: not-allowed;
          background: #f1f5f9;
          border-color: rgba(148, 163, 184, 0.3);
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
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(79, 70, 229, 0.08) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .pd-badge-g {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #059669;
        }
        
        .pd-badge-a {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(234, 88, 12, 0.08) 100%);
          border: 1px solid rgba(249, 115, 22, 0.2);
          color: #f97316;
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
          background: linear-gradient(165deg, #ffffff 0%, #f8fafc 50%, #eff6ff 100%);
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
          background: linear-gradient(90deg, transparent 0%, #3b82f6 25%, #4f46e5 50%, #3b82f6 75%, transparent 100%);
        }
        
        .pd-price-main {
          font-size: clamp(28px, 7vw, 48px);
          font-weight: 900;
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
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
        
        .pd-delivery {
          background: white;
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        @media (min-width: 640px) {
          .pd-delivery { padding: 20px; border-radius: 20px; margin-bottom: 20px; }
        }
        
        .pd-delivery-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .pd-delivery-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .pd-delivery-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .pd-delivery-subtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #64748b;
        }
        
        .pd-delivery-charge {
          font-weight: 600;
          color: #3b82f6;
        }
        
        .pd-delivery-charge.free {
          color: #059669;
        }
        
        .pd-delivery-form {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        
        .pd-delivery-input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid rgba(148, 163, 184, 0.3);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
        }
        
        .pd-delivery-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .pd-delivery-btn {
          padding: 10px 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .pd-delivery-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px -8px rgba(59, 130, 246, 0.5);
        }
        
        .pd-highlights {
          background: white;
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        @media (min-width: 640px) {
          .pd-highlights { padding: 20px; border-radius: 20px; margin-bottom: 20px; }
        }
        
        .pd-highlights-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        
        @media (min-width: 640px) {
          .pd-highlights-grid { grid-template-columns: repeat(2, 1fr); }
        }
        
        .pd-highlight-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        
        .pd-highlight-check {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pd-highlight-check svg {
          width: 12px;
          height: 12px;
          fill: none;
          stroke: white;
          stroke-width: 3;
        }
        
        .pd-section-title {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .pd-description {
          background: white;
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        @media (min-width: 640px) {
          .pd-description { padding: 20px; border-radius: 20px; margin-bottom: 20px; }
        }
        
        .pd-description-text {
          font-size: 14px;
          line-height: 1.7;
          color: #475569;
          margin-bottom: 12px;
        }
        
        .pd-description-toggle {
          font-size: 13px;
          font-weight: 800;
          color: #3b82f6;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .pd-cta {
          display: flex;
          gap: 10px;
          flex-direction: column;
          margin-top: 20px;
        }
        
        @media (min-width: 640px) {
          .pd-cta { flex-direction: row; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
        }
        
        .pd-btn-primary {
          flex: 1;
          min-width: 140px;
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
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
          .pd-btn-primary { padding: 16px 32px; border-radius: 18px; font-size: 13px; gap: 10px; }
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
          .pd-btn-buy-now { padding: 16px 32px; border-radius: 18px; font-size: 13px; gap: 10px; }
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
        
        .pd-btn-secondary {
          background: white;
          color: #3b82f6;
          border: 2px solid rgba(59, 130, 246, 0.2);
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          transition: all 0.3s;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          width: auto;
          min-width: 48px;
          height: 48px;
        }
        
        @media (min-width: 640px) {
          .pd-btn-secondary { padding: 12px; border-radius: 14px; min-width: 56px; height: 56px; }
        }
        
        .pd-btn-secondary:hover {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
          transform: translateY(-2px);
          box-shadow: 0 10px 28px -8px rgba(59, 130, 246, 0.25);
        }
        
        .pd-sticky-cta {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
          padding: 12px 16px;
          box-shadow: 0 -4px 24px -12px rgba(15, 23, 42, 0.2);
          z-index: 50;
          display: none;
        }
        
        @media (max-width: 1024px) {
          .pd-sticky-cta { display: block; }
        }
        
        .pd-sticky-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .pd-sticky-price {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .pd-sticky-price-main {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
        }
        
        .pd-sticky-price-mrp {
          font-size: 12px;
          color: #94a3b8;
          text-decoration: line-through;
          font-weight: 600;
        }
        
        .pd-sticky-actions {
          display: flex;
          gap: 8px;
        }
        
        .pd-sticky-btn-primary {
          padding: 12px 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }
        
        .pd-sticky-btn-secondary {
          padding: 12px 20px;
          background: white;
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          color: #3b82f6;
        }
        
        .pd-similar {
          margin-top: 40px;
        }
        
        .pd-similar-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 20px;
        }
        
        .pd-similar-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        @media (min-width: 768px) {
          .pd-similar-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      <div className="pd-wrap">
        <div className="pd-grid">
          {/* Left: Product Images */}
          <div className="pd-images">
            <div
              className="pd-img-main"
              onTouchStart={onMainImgTouchStart}
              onTouchEnd={onMainImgTouchEnd}
              onTouchCancel={onMainImgTouchCancel}
              onClick={onMainImgClick}
            >
              {imgs[activeImg] ? (
                <img
                  src={getCloudinaryUrl(imgs[activeImg], 800)}
                  alt={p.name}
                  onLoad={() => setImgLoading(false)}
                  style={{ display: imgLoading ? 'none' : 'block' }}
                />
              ) : (
                  <div className="flex items-center justify-center text-slate-400">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="m9 12l2 2 4-4" />
                    </svg>
                  </div>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="pd-thumbs">
                {imgs.map((img, i) => (
                  <button
                    key={i}
                    className={`pd-thumb ${i === activeImg ? 'on' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img
                      src={getCloudinaryUrl(img, 200)}
                      alt={p.name + ' - View ' + (i + 1)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="pd-info">
            {/* Action buttons at top */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  className="pd-btn-secondary"
                  onClick={handleShare}
                  title="Share"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  className="pd-btn-secondary"
                  onClick={() => isInWishlist(p._id || p.id) ? removeFromWishlist(p._id || p.id) : addToWishlist({ ...p, id: p._id || p.id })}
                  title={isInWishlist(p._id || p.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  {isInWishlist(p._id || p.id) ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Product name */}
            <h1 className="pd-name">{p.name}</h1>

            {/* Rating */}
            <div className="pd-rating-row">
              <div className="pd-rating">
                <span>{Number(p.ratingAvg || 4.3).toFixed(1)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-600">
                {p.ratingCount || 0} Ratings
              </span>
            </div>

            {/* Price */}
            <div className="pd-price-block">
              <div className="flex items-end gap-3">
                <span className="pd-price-main">
                  ₹{Math.round(currentPrice || minPrice || 0).toLocaleString()}
                </span>
                {currentMrp && currentMrp > currentPrice && (
                  <>
                    <span className="pd-price-mrp">
                    ₹{Math.round(currentMrp || displayMrp || 0).toLocaleString()}
                  </span>
                    <span className="pd-price-save">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>
              {p.gst > 0 && (
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  Inclusive of all taxes
                </div>
              )}
            </div>

            {/* Variants */}
            {variantAttrs.length > 0 && (
              <div className="pd-variants">
                {variantAttrs.map((attr, attrIdx) => {
                  const lowAttr = attr.toLowerCase().trim();
                  const opts = variantOpts(attr);
                  const isMany = opts.length >= 6;
                  const isColor = ['color', 'colour', 'finish', 'shade'].includes(lowAttr);

                  return (
                    <div key={attrIdx} className="pd-var-sec">
                      <div className="pd-var-header">
                        <div className="pd-var-lbl">
                          <span className="pd-var-icon">
                            <VariantIcon name={lowAttr} />
                          </span>
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

                          return (
                            <button
                              key={optIdx}
                              className={`pd-var-btn ${isOn ? 'on' : ''} ${!enabled ? 'disabled' : ''}`}
                              onClick={() => enabled && setSelected(s => ({ ...s, [lowAttr]: String(optVal)}))}
                              disabled={!enabled}
                            >
                              {isColor ? (
                                <div
                                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                  style={{ backgroundColor: optVal.toLowerCase() }}
                                />
                              ) : (
                                <span className="pd-var-val">{optVal}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delivery */}
            <div className="pd-delivery">
              <div className="pd-delivery-header">
                {user?.savedAddresses && user.savedAddresses.length > 0 && selectedAddress && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="pd-delivery-title mb-1 flex items-center gap-2">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" />
                          </svg>
                          <span className="text-blue-700 font-bold">Deliver to</span>
                          {selectedAddress.isDefault && (
                            <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">DEFAULT</span>
                          )}
                        </div>
                        
                        {/* Address Display */}
                        <div className="mt-2">
                          <div className="font-bold text-gray-800">
                            {selectedAddress.fullName}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {selectedAddress.addressLine1}
                            {selectedAddress.addressLine2 && `, ${selectedAddress.addressLine2}`}
                          </div>
                          <div className="text-sm text-gray-700 mt-1 font-semibold">
                            {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            📱 {selectedAddress.phone}
                          </div>
                        </div>
                      </div>
                      
                      {/* Switch Address Button */}
                      <button
                        onClick={() => {
                          // Show a simple address switcher dropdown
                          const nextIndex = (user.savedAddresses.findIndex(a => a._id === selectedAddress._id) + 1) % user.savedAddresses.length;
                          const nextAddr = user.savedAddresses[nextIndex];
                          setSelectedAddress(nextAddr);
                          if (nextAddr?.pincode) {
                            setPincode(nextAddr.pincode);
                            checkDeliveryImpl(nextAddr.pincode);
                          }
                        }}
                        className="px-3 py-2 bg-white border border-blue-200 rounded-xl text-blue-600 text-xs font-bold hover:bg-blue-100 transition-all"
                      >
                        Switch
                      </button>
                    </div>
                  </div>
                )}

                {/* Delivery Info */}
                {deliveryInfo?.serviceable ? (
                  <div className="pd-delivery-info">
                    <div className="pd-delivery-title flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Delivery by {deliveryInfo.etaStart?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} - {deliveryInfo.etaEnd?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="pd-delivery-subtitle flex flex-col gap-1">
                      <span className={`pd-delivery-charge ${deliveryInfo.isFreeDelivery ? 'free' : ''}`}>
                        {deliveryInfo.isFreeDelivery 
                          ? '🎉 FREE Delivery' 
                          : '₹' + deliveryInfo.finalCharge + ' Delivery'
                        }
                      </span>
                      {!deliveryInfo.isFreeDelivery && (
                        <span className="text-xs text-gray-500">
                          Add items worth ₹{deliveryInfo.freeDeliveryAbove - (currentPrice || minPrice)} more for FREE Delivery!
                        </span>
                      )}
                      {deliveryInfo.codAvailable && (
                        <span className="text-xs text-green-600">
                          ✓ Cash on Delivery available
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pd-delivery-info">
                    <div className="pd-delivery-subtitle text-red-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="mr-1">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{deliveryInfo?.message || 'Enter pincode to check delivery'}</span>
                    </div>
                  </div>
                )}

                {/* Pincode Input (only if no saved addresses or guest user) */}
                {(!user?.savedAddresses || user.savedAddresses.length === 0) && (
                  <form className="pd-delivery-form mt-3" onSubmit={checkDelivery}>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter pincode"
                      className="pd-delivery-input"
                    />
                    <button type="submit" className="pd-delivery-btn" disabled={checkingDelivery || pincode.length !== 6}>
                      {checkingDelivery ? 'Checking...' : 'Check'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Highlights */}
            {hasHighlights && (
              <div className="pd-highlights">
                <h3 className="pd-section-title">Highlights</h3>
                <div className="pd-highlights-grid">
                  {p.highlights.map((highlight, i) => (
                    <div key={i} className="pd-highlight-item">
                      <div className="pd-highlight-check">
                        <svg viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {hasDescription && (
              <div className="pd-description">
                <h3 className="pd-section-title">Product Description</h3>
                <div className="pd-description-text" style={{
                  display: descriptionExpanded ? 'block' : '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </div>
                {p.description.length > 200 && (
                  <button
                    className="pd-description-toggle"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  >
                    {descriptionExpanded ? 'Read Less' : 'Read More'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: descriptionExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="pd-cta">
              <button className="pd-btn-primary" onClick={handleAddToCart} disabled={!canAddToCart}>
                Add to Cart
              </button>
              <button className="pd-btn-buy-now" onClick={handleBuyNow} disabled={!canAddToCart}>
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        <div className="pd-similar">
          <h3 className="pd-similar-title">Recommended for You</h3>
          <div className="pd-similar-grid">
            {(similarProducts || []).map((product, i) => (
              <ProductCard key={i} p={product} />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA for mobile */}
      <div className="pd-sticky-cta">
        <div className="pd-sticky-inner">
          <div className="pd-sticky-price">
            <span className="pd-sticky-price-main">
              ₹{Math.round(currentPrice || minPrice || 0).toLocaleString()}
            </span>
            {currentMrp && currentMrp > currentPrice && (
              <span className="pd-sticky-price-mrp">
                ₹{Math.round(currentMrp || displayMrp || 0).toLocaleString()}
              </span>
            )}
          </div>
          <div className="pd-sticky-actions">
            <button className="pd-sticky-btn-secondary" onClick={handleAddToCart} disabled={!canAddToCart}>
              Add to Cart
            </button>
            <button className="pd-sticky-btn-primary" onClick={handleBuyNow} disabled={!canAddToCart}>
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Recommendation Modal */}
      <RecommendationModal
        isOpen={recOpen}
        onClose={() => setRecOpen(false)}
        products={recItems}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
