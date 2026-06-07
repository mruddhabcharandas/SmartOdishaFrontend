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
    let basePrice;
    if (!p) return 0;
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      basePrice = safeNumber(p.originalStorePrice ?? p.price ?? 0);
    } else {
      const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.originalStorePrice ?? v.price ?? 0) > 0);
      if (activeVariants.length === 0) {
        basePrice = safeNumber(p.originalStorePrice ?? p.price ?? 0);
      } else {
        basePrice = Math.min(...activeVariants.map(v => safeNumber(v.originalStorePrice ?? v.price ?? 0)));
      }
    }
    // Apply store percentage if available
    const storePercentage = safeNumber(p?.store?.storePercentage ?? 0);
    return basePrice * (1 + storePercentage / 100);
  }, [p]);

  const currentPrice = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    let basePrice;
    if (matchedVariant) {
      basePrice = safeNumber(matchedVariant.originalStorePrice ?? matchedVariant.price ?? 0);
    } else {
      basePrice = safeNumber(p?.originalStorePrice ?? p?.price ?? 0);
    }
    const storePercentage = safeNumber(p?.store?.storePercentage ?? 0);
    return basePrice * (1 + storePercentage / 100);
  }, [matchedVariant, p]);

  const currentMrp = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    let baseMrp;
    if (matchedVariant) {
      baseMrp = safeNumber(matchedVariant.mrp ?? 0);
    } else {
      baseMrp = safeNumber(p?.mrp ?? 0);
    }
    const storePercentage = safeNumber(p?.store?.storePercentage ?? 0);
    if (baseMrp === 0) return 0;
    return baseMrp * (1 + storePercentage / 100);
  }, [matchedVariant, p]);
  const currentStock = matchedVariant?.stock ?? p?.stock;
  const isAvailable = currentStock > 0;

  const displayMrp = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    let baseMrp;
    if (!p) return 0;
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      baseMrp = safeNumber(p.mrp ?? p.originalStorePrice ?? p.price ?? 0);
    } else {
      const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.originalStorePrice ?? v.price ?? 0) > 0);
      if (activeVariants.length === 0) {
        baseMrp = safeNumber(p.mrp ?? p.originalStorePrice ?? p.price ?? 0);
      } else {
        // Find variant with lowest base price (originalStorePrice)
        const variantWithMinPrice = activeVariants.reduce((a, b) => 
          safeNumber(a.originalStorePrice ?? a.price ?? 0) < safeNumber(b.originalStorePrice ?? b.price ?? 0) ? a : b
        );
        baseMrp = safeNumber(variantWithMinPrice?.mrp ?? p.mrp ?? 0);
      }
    }
    const storePercentage = safeNumber(p?.store?.storePercentage ?? 0);
    if (baseMrp === 0) return 0;
    return baseMrp * (1 + storePercentage / 100);
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
        /* Flipkart Colors and Fonts */
        .pd {
          font-family: 'Roboto', 'Inter', -apple-system, sans-serif;
          background-color: #f1f3f6;
          color: #212121;
          min-height: 100vh;
          padding-bottom: 80px;
        }

        .pd-wrap {
          max-width: 1248px;
          margin: 0 auto;
          padding: 8px;
        }

        @media (min-width: 768px) {
          .pd-wrap {
            padding: 16px;
          }
        }

        /* Breadcrumbs */
        .pd-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #878787;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .pd-breadcrumbs a {
          color: #878787;
          text-decoration: none;
        }
        .pd-breadcrumbs a:hover {
          color: #2874f0;
        }
        .pd-breadcrumbs .separator {
          font-size: 10px;
        }

        /* 2-Column Grid Layout */
        .pd-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          background: #fff;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 16px;
        }

        @media (min-width: 1024px) {
          .pd-grid {
            grid-template-columns: 40% 60%;
            gap: 24px;
            align-items: start;
            padding: 24px;
          }
        }

        /* Left Column: Image Gallery & Actions */
        .pd-left-col {
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 80px;
        }

        .pd-gallery-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (min-width: 1024px) {
          .pd-gallery-container {
            flex-direction: row-reverse;
            gap: 16px;
          }
        }

        /* Main Image */
        .pd-img-main {
          flex: 1;
          border: 1px solid #f0f0f0;
          background: #fff;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: zoom-in;
          overflow: hidden;
          min-height: 300px;
        }
        @media (min-width: 768px) {
          .pd-img-main {
            min-height: 400px;
          }
        }
        .pd-img-main img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          padding: 8px;
          transition: transform 0.3s ease;
        }
        .pd-img-main:hover img {
          transform: scale(1.05);
        }

        /* Thumbnails */
        .pd-thumbs {
          display: flex;
          flex-direction: row;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0;
          scrollbar-width: none;
        }
        .pd-thumbs::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 1024px) {
          .pd-thumbs {
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
            width: 64px;
            height: 400px;
            flex-shrink: 0;
          }
        }

        .pd-thumb {
          width: 56px;
          height: 56px;
          border: 1px solid #e0e0e0;
          background: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 4px;
          border-radius: 2px;
          transition: border-color 0.2s;
        }
        .pd-thumb:hover, .pd-thumb.on {
          border-color: #2874f0;
          box-shadow: 0 0 3px rgba(40,116,240,0.3);
        }
        .pd-thumb img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        /* Left Column Action Buttons (Desktop only) */
        .pd-left-actions {
          display: none;
        }
        @media (min-width: 1024px) {
          .pd-left-actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
          }
        }

        /* Flipkart Buttons */
        .pd-btn-cart {
          flex: 1;
          background: #ff9f00;
          color: #fff;
          border: none;
          padding: 16px 20px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          text-transform: uppercase;
          transition: background 0.2s;
        }
        .pd-btn-cart:hover:not(:disabled) {
          background: #f29700;
        }
        .pd-btn-buy {
          flex: 1;
          background: #fb641b;
          color: #fff;
          border: none;
          padding: 16px 20px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          text-transform: uppercase;
          transition: background 0.2s;
        }
        .pd-btn-buy:hover:not(:disabled) {
          background: #df5615;
        }
        .pd-btn-cart:disabled, .pd-btn-buy:disabled {
          background: #cccccc;
          color: #ffffff;
          cursor: not-allowed;
        }

        /* Right Column: Info & Specs */
        .pd-right-col {
          display: flex;
          flex-direction: column;
        }

        /* Brand and Title */
        .pd-brand {
          font-size: 14px;
          color: #878787;
          margin-bottom: 4px;
        }
        .pd-title-text {
          font-size: 18px;
          font-weight: 400;
          color: #212121;
          line-height: 1.4;
          margin-bottom: 8px;
        }

        /* Ratings Pill & Reviews */
        .pd-rating-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .pd-rating-pill {
          background: #388e3c;
          color: #fff;
          padding: 2px 6px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 3px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .pd-rating-count {
          font-size: 13px;
          font-weight: 500;
          color: #878787;
        }

        /* Assured Badge */
        .pd-assured-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: linear-gradient(135deg, #2874f0 0%, #1a5ac2 100%);
          color: #fff;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          box-shadow: 0 1px 3px rgba(40,116,240,0.25);
          margin-left: 8px;
        }
        .pd-assured-badge .star-icon {
          color: #ffe500;
          font-size: 9px;
        }

        /* Price block */
        .pd-price-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 4px;
        }
        .pd-price {
          font-size: 28px;
          font-weight: 700;
          color: #212121;
        }
        .pd-mrp {
          font-size: 16px;
          text-decoration: line-through;
          color: #878787;
        }
        .pd-discount {
          font-size: 16px;
          font-weight: 700;
          color: #388e3c;
        }
        .pd-taxes-info {
          font-size: 12px;
          color: #878787;
          margin-bottom: 16px;
          font-weight: 500;
        }

        /* Available Offers styling */
        .pd-offers-sec {
          margin-bottom: 20px;
        }
        .pd-offers-title {
          font-size: 14px;
          font-weight: 700;
          color: #212121;
          margin-bottom: 10px;
        }
        .pd-offer-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: #212121;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .pd-offer-tag {
          color: #26a541;
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .pd-offer-highlight {
          font-weight: 700;
        }
        .pd-offer-link {
          color: #2874f0;
          text-decoration: none;
          font-weight: 500;
          margin-left: 4px;
          cursor: pointer;
        }

        /* Pincode & Shipping */
        .pd-delivery-sec {
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          padding: 16px 0;
          margin-bottom: 20px;
        }
        .pd-delivery-row {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .pd-delivery-label {
          font-size: 14px;
          color: #878787;
          font-weight: 500;
          width: 80px;
        }
        .pd-pincode-wrapper {
          display: flex;
          align-items: center;
          border-bottom: 2px solid #2874f0;
          position: relative;
          padding-bottom: 2px;
          width: 180px;
        }
        .pd-pincode-icon {
          color: #2874f0;
          margin-right: 6px;
        }
        .pd-pincode-input {
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 700;
          color: #212121;
          width: 100%;
        }
        .pd-pincode-btn {
          border: none;
          background: none;
          color: #2874f0;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .pd-pincode-btn:disabled {
          color: #878787;
          cursor: not-allowed;
        }

        /* Delivery output details */
        .pd-delivery-status {
          margin-top: 10px;
          padding-left: 104px;
          font-size: 13px;
          line-height: 1.5;
        }
        .pd-delivery-date {
          font-weight: 700;
          color: #212121;
        }
        .pd-delivery-charge-text {
          color: #388e3c;
          font-weight: 700;
        }
        .pd-delivery-cod {
          margin-top: 4px;
          color: #878787;
        }

        /* Highlights list */
        .pd-highlights-sec {
          margin-bottom: 20px;
        }
        .pd-highlights-title {
          font-size: 14px;
          font-weight: 700;
          color: #212121;
          margin-bottom: 10px;
        }
        .pd-highlights-list {
          list-style-type: disc;
          padding-left: 20px;
          font-size: 13px;
          color: #212121;
          line-height: 1.6;
        }
        .pd-highlights-list li {
          margin-bottom: 6px;
        }

        /* Seller Section */
        .pd-seller-sec {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .pd-seller-label {
          font-size: 14px;
          color: #878787;
          font-weight: 500;
          width: 80px;
        }
        .pd-seller-value {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pd-seller-name {
          font-size: 14px;
          font-weight: 700;
          color: #2874f0;
        }
        .pd-seller-rating {
          background: #388e3c;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 2px;
        }

        /* Specifications (Flipkart styled table) */
        .pd-specs-sec {
          margin-bottom: 20px;
        }
        .pd-specs-title {
          font-size: 18px;
          font-weight: 700;
          color: #212121;
          margin-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 8px;
        }
        .pd-specs-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .pd-specs-row {
          border-bottom: 1px solid #f0f0f0;
        }
        .pd-specs-label {
          width: 30%;
          padding: 12px 8px;
          font-size: 13px;
          color: #878787;
          vertical-align: top;
          font-weight: 400;
        }
        .pd-specs-val {
          padding: 12px 8px;
          font-size: 13px;
          color: #212121;
          vertical-align: top;
          font-weight: 500;
        }

        /* Description */
        .pd-desc-sec {
          margin-bottom: 20px;
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 16px;
        }
        .pd-desc-title {
          font-size: 14px;
          font-weight: 700;
          color: #212121;
          margin-bottom: 10px;
        }
        .pd-desc-content {
          font-size: 13px;
          line-height: 1.6;
          color: #212121;
        }
        .pd-desc-toggle-btn {
          background: none;
          border: none;
          color: #2874f0;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Share & Wishlist overlay buttons on main image */
        .pd-action-overlays {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 10;
        }
        .pd-action-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid #f0f0f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #878787;
          transition: transform 0.2s, color 0.2s;
        }
        .pd-action-btn:hover {
          transform: scale(1.05);
          color: #212121;
        }
        .pd-action-btn.wishlisted {
          color: #ef4444;
        }

        /* Mobile action buttons container (at bottom of info, hidden on desktop) */
        .pd-info-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          margin-bottom: 16px;
        }
        @media (min-width: 1024px) {
          .pd-info-actions {
            display: none;
          }
        }

        /* Mobile Sticky bottom actions */
        .pd-sticky-cta {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          z-index: 99;
          display: block;
        }
        @media (min-width: 1024px) {
          .pd-sticky-cta {
            display: none;
          }
        }
        .pd-sticky-inner {
          display: flex;
          height: 52px;
        }
        .pd-sticky-btn-cart {
          flex: 1;
          height: 100%;
          background: #ff9f00;
          color: #fff;
          border: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-transform: uppercase;
        }
        .pd-sticky-btn-buy {
          flex: 1;
          height: 100%;
          background: #fb641b;
          color: #fff;
          border: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          text-transform: uppercase;
        }
        .pd-sticky-btn-cart:disabled, .pd-sticky-btn-buy:disabled {
          background: #cccccc;
          color: #ffffff;
          cursor: not-allowed;
        }

        /* Recommendations */
        .pd-similar {
          margin-top: 32px;
          background: #fff;
          padding: 16px;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .pd-similar-title {
          font-size: 20px;
          font-weight: 700;
          color: #212121;
          margin-bottom: 16px;
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 10px;
        }
        .pd-similar-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .pd-similar-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        /* Address Switch Card */
        .pd-address-card {
          background: #f5f9ff;
          border: 1px solid #d0e4ff;
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .pd-address-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .pd-address-title {
          font-size: 12px;
          font-weight: 700;
          color: #2874f0;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pd-address-switch-btn {
          background: none;
          border: none;
          color: #2874f0;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
        .pd-address-body {
          font-size: 13px;
          color: #212121;
          line-height: 1.4;
        }
      `}</style>

      <div className="pd-wrap">
        {/* Breadcrumbs */}
        <div className="pd-breadcrumbs">
          <Link to="/">Home</Link>
          <span className="separator">&gt;</span>
          <Link to="/products">Products</Link>
          {p.category && (
            <>
              <span className="separator">&gt;</span>
              <Link to={`/products?category=${p.category._id || p.category}`}>{p.category.name || p.category}</Link>
            </>
          )}
          <span className="separator">&gt;</span>
          <span className="truncate max-w-[150px] sm:max-w-xs">{p.name}</span>
        </div>

        <div className="pd-grid">
          {/* Left Column: Images & Gallery */}
          <div className="pd-left-col">
            <div className="pd-gallery-container">
              {/* Main Image Container */}
              <div
                className="pd-img-main"
                onTouchStart={onMainImgTouchStart}
                onTouchEnd={onMainImgTouchEnd}
                onTouchCancel={onMainImgTouchCancel}
                onClick={onMainImgClick}
              >
                {/* Overlay Action Buttons (Wishlist, Share) */}
                <div className="pd-action-overlays" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="pd-action-btn"
                    onClick={handleShare}
                    title="Share"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                    </svg>
                  </button>
                  <button
                    className={`pd-action-btn ${isInWishlist(p._id || p.id) ? 'wishlisted' : ''}`}
                    onClick={() => isInWishlist(p._id || p.id) ? removeFromWishlist(p._id || p.id) : addToWishlist({ ...p, id: p._id || p.id })}
                    title={isInWishlist(p._id || p.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    {isInWishlist(p._id || p.id) ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    )}
                  </button>
                </div>

                {imgs[activeImg] ? (
                  <img
                    src={getImageUrl(imgs[activeImg], 800)}
                    alt={p.name}
                    onLoad={() => setImgLoading(false)}
                    style={{ display: imgLoading ? 'none' : 'block' }}
                  />
                ) : (
                  <div className="flex items-center justify-center text-slate-400">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="m9 12l2 2 4-4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Thumbnails Container */}
              {imgs.length > 1 && (
                <div className="pd-thumbs animate-fade-in">
                  {imgs.map((img, i) => (
                    <button
                      key={i}
                      className={`pd-thumb ${i === activeImg ? 'on' : ''}`}
                      onClick={() => setActiveImg(i)}
                    >
                      <img
                        src={getImageUrl(img, 200)}
                        alt={p.name + ' - View ' + (i + 1)}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Left Action Buttons (Desktop only) */}
            <div className="pd-left-actions">
              <button
                className="pd-btn-cart"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Add to Cart
              </button>
              <button
                className="pd-btn-buy"
                onClick={handleBuyNow}
                disabled={!canAddToCart}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
                </svg>
                Buy Now
              </button>
            </div>
          </div>

          {/* Right Column: Info & Specs */}
          <div className="pd-right-col">
            {/* Brand */}
            {p.brand && (
              <div className="pd-brand">
                {p.brand.name || p.brand}
              </div>
            )}

            {/* Title */}
            <h1 className="pd-title-text">{p.name}</h1>

            {/* Rating summary */}
            <div className="pd-rating-container">
              <div className="pd-rating-pill">
                <span>{Number(p.ratingAvg || 4.3).toFixed(1)}</span>
                <span className="star-icon">â˜…</span>
              </div>
              <span className="pd-rating-count">
                {p.ratingCount || 12} Ratings &amp; {Math.round((p.ratingCount || 12) * 0.4)} Reviews
              </span>
              <span className="pd-assured-badge">
                Assured <span className="star-icon">â˜…</span>
              </span>
            </div>

            {/* Pricing */}
            <div className="pd-price-sec">
              <div className="text-xs font-bold text-green-700 mb-1">Special Price</div>
              <div className="pd-price-row">
                <span className="pd-price">
                  â‚¹{Math.round(currentPrice || minPrice || 0).toLocaleString()}
                </span>
                {currentMrp && currentMrp > currentPrice && (
                  <>
                    <span className="pd-mrp">
                      â‚¹{Math.round(currentMrp || displayMrp || 0).toLocaleString()}
                    </span>
                    <span className="pd-discount">
                      {discount}% off
                    </span>
                  </>
                )}
              </div>
              <div className="pd-taxes-info">
                {p.gst > 0 ? `Inclusive of ${p.gst}% GST` : 'Inclusive of all taxes'}
              </div>
            </div>

            {/* Available Offers */}
            <div className="pd-offers-sec">
              <div className="pd-offers-title">Available Offers</div>
              <div className="pd-offer-item">
                <span className="pd-offer-tag">ðŸ·ï¸</span>
                <span>
                  <span className="pd-offer-highlight">Bank Offer</span> 5% Cashback on SmartOdisha Axis Bank Card <span className="pd-offer-link">T&C</span>
                </span>
              </div>
              <div className="pd-offer-item">
                <span className="pd-offer-tag">ðŸ·ï¸</span>
                <span>
                  <span className="pd-offer-highlight">Special Price</span> Get extra 10% off (price inclusive of cashback/coupon) <span className="pd-offer-link">T&C</span>
                </span>
              </div>
              {deliveryInfo?.isFreeDelivery && (
                <div className="pd-offer-item">
                  <span className="pd-offer-tag">ðŸ·ï¸</span>
                  <span>
                    <span className="pd-offer-highlight">Free Shipping</span> Enjoy FREE delivery on this order <span className="pd-offer-link">T&C</span>
                  </span>
                </div>
              )}
              <div className="pd-offer-item">
                <span className="pd-offer-tag">ðŸ·ï¸</span>
                <span>
                  <span className="pd-offer-highlight">Partner Offer</span> Sign up for Pay Later & get a surprise cashback reward <span className="pd-offer-link">T&C</span>
                </span>
              </div>
            </div>

            {/* Variant Selector */}
            {variantAttrs.length > 0 && (
              <div className="mb-6 border-t border-b border-gray-100 py-4">
                {variantAttrs.map((attr, attrIdx) => {
                  const lowAttr = attr.toLowerCase().trim();
                  const opts = variantOpts(attr);
                  const isColor = ['color', 'colour', 'finish', 'shade'].includes(lowAttr);

                  return (
                    <div key={attrIdx} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm font-semibold text-gray-500 w-20 capitalize">{attr}:</span>
                        {selected[lowAttr] && (
                          <span className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-0.5 rounded">
                            {selected[lowAttr]}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {opts.map((optVal, optIdx) => {
                          const enabled = isOptEnabled(attr, optVal);
                          const isOn = selected[lowAttr]?.toLowerCase() === String(optVal).toLowerCase();

                          return (
                            <button
                              key={optIdx}
                              className={`px-4 py-2 text-xs font-bold border rounded transition-all ${
                                isOn
                                  ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                                  : enabled
                                  ? 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
                                  : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                              onClick={() => enabled && setSelected(s => ({ ...s, [lowAttr]: String(optVal)}))}
                              disabled={!enabled}
                              style={isColor ? { minWidth: '40px' } : {}}
                            >
                              {isColor ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full border border-gray-300"
                                    style={{ backgroundColor: optVal.toLowerCase() }}
                                  />
                                  <span>{optVal}</span>
                                </div>
                              ) : (
                                optVal
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

            {/* Delivery Pincode */}
            <div className="pd-delivery-sec">
              <div className="pd-delivery-row">
                <span className="pd-delivery-label">Delivery</span>
                <div className="pd-pincode-wrapper">
                  <span className="pd-pincode-icon">ðŸ“</span>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter Delivery Pincode"
                    className="pd-pincode-input"
                  />
                </div>
                <button
                  onClick={checkDelivery}
                  className="pd-pincode-btn"
                  disabled={checkingDelivery || pincode.length !== 6}
                >
                  {checkingDelivery ? 'Checking...' : 'Check'}
                </button>
              </div>

              {/* Delivery Address Switch (if user is logged in and has addresses) */}
              {user?.savedAddresses && user.savedAddresses.length > 0 && selectedAddress && (
                <div className="mt-3 pd-address-card">
                  <div className="pd-address-header">
                    <span className="pd-address-title">
                      ðŸšš Deliver to: <strong>{selectedAddress.fullName}</strong>
                    </span>
                    <button
                      onClick={() => {
                        const nextIndex = (user.savedAddresses.findIndex(a => a._id === selectedAddress._id) + 1) % user.savedAddresses.length;
                        const nextAddr = user.savedAddresses[nextIndex];
                        setSelectedAddress(nextAddr);
                        if (nextAddr?.pincode) {
                          setPincode(nextAddr.pincode);
                          checkDeliveryImpl(nextAddr.pincode);
                        }
                      }}
                      className="pd-address-switch-btn"
                    >
                      Change Address
                    </button>
                  </div>
                  <div className="pd-address-body">
                    {selectedAddress.addressLine1}, {selectedAddress.city}, {selectedAddress.state} - <strong>{selectedAddress.pincode}</strong>
                  </div>
                </div>
              )}

              {/* Delivery check output */}
              {deliveryInfo && (
                <div className="pd-delivery-status">
                  {deliveryInfo.serviceable ? (
                    <>
                      <div>
                        Delivery by <span className="pd-delivery-date">
                          {deliveryInfo.etaStart?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} - {deliveryInfo.etaEnd?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="mx-2">|</span>
                        <span className="pd-delivery-charge-text">
                          {deliveryInfo.isFreeDelivery ? 'FREE' : `â‚¹${deliveryInfo.finalCharge}`}
                        </span>
                      </div>
                      {deliveryInfo.codAvailable ? (
                        <div className="pd-delivery-cod">âœ“ Cash on Delivery available</div>
                      ) : (
                        <div className="pd-delivery-cod text-orange-600">âœ— Cash on Delivery not available</div>
                      )}
                    </>
                  ) : (
                    <div className="text-red-500 font-bold">
                      {deliveryInfo.message || 'Product not delivery available at this pincode'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seller */}
            {p.store && (
              <div className="pd-seller-sec">
                <span className="pd-seller-label">Seller</span>
                <div className="pd-seller-value">
                  <span className="pd-seller-name">{p.store.name}</span>
                  <span className="pd-seller-rating">4.1 â˜…</span>
                  <span className="text-xs text-gray-500">(Verified Seller)</span>
                </div>
              </div>
            )}

            {/* Highlights */}
            {hasHighlights && (
              <div className="pd-highlights-sec">
                <div className="pd-highlights-title">Highlights</div>
                <ul className="pd-highlights-list">
                  {p.highlights.map((highlight, i) => (
                    <li key={i}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            {hasDescription && (
              <div className="pd-desc-sec">
                <div className="pd-desc-title">Description</div>
                <div className="pd-desc-content" style={{
                  display: descriptionExpanded ? 'block' : '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </div>
                {p.description.length > 250 && (
                  <button
                    className="pd-desc-toggle-btn"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  >
                    {descriptionExpanded ? 'Read Less' : 'Read More'}
                    <span>{descriptionExpanded ? 'â–²' : 'â–¼'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Specifications */}
            {hasSpecifications && (
              <div className="pd-specs-sec">
                <div className="pd-specs-title">Specifications</div>
                <table className="pd-specs-table">
                  <tbody>
                    {p.specifications.map((spec, i) => {
                      if (typeof spec === 'object' && spec !== null) {
                        return (
                          <tr key={i} className="pd-specs-row">
                            <td className="pd-specs-label">{spec.key || spec.label || 'Key'}</td>
                            <td className="pd-specs-val">{spec.value || spec.val}</td>
                          </tr>
                        );
                      } else if (typeof spec === 'string') {
                        const parts = spec.split(':').map(s => s.trim());
                        if (parts.length === 2) {
                          return (
                            <tr key={i} className="pd-specs-row">
                              <td className="pd-specs-label">{parts[0]}</td>
                              <td className="pd-specs-val">{parts[1]}</td>
                            </tr>
                          );
                        }
                      }
                      return null;
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile Actions Container (visible only on mobile, under info) */}
            <div className="pd-info-actions">
              <button
                className="pd-btn-cart"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
              >
                Add to Cart
              </button>
              <button
                className="pd-btn-buy"
                onClick={handleBuyNow}
                disabled={!canAddToCart}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Similar Products / Recommendations */}
        <div className="pd-similar">
          <h3 className="pd-similar-title">Similar Products</h3>
          <div className="pd-similar-grid">
            {(similarProducts || []).map((product, i) => (
              <ProductCard key={i} p={product} />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for mobile */}
      <div className="pd-sticky-cta">
        <div className="pd-sticky-inner">
          <button
            className="pd-sticky-btn-cart"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
          >
            Add to Cart
          </button>
          <button
            className="pd-sticky-btn-buy"
            onClick={handleBuyNow}
            disabled={!canAddToCart}
          >
            Buy Now
          </button>
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