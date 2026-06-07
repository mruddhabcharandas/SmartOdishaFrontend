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
      <style>{`
        /* Premium E-Commerce Styles - Matching Home Page Theme */
        .pd {
          font-family: 'DM Sans', 'Inter', system-ui, -apple-system, sans-serif;
          background: #f0f9ff;
          min-height: 100vh;
          color: #1e1b2e;
          padding-bottom: 80px;
        }
        
        .pd-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 16px;
        }
        
        @media (min-width: 768px) {
          .pd-wrap { padding: 32px 24px; }
        }

        .pd-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 24px;
          font-weight: 500;
        }
        .pd-breadcrumbs a {
          color: #64748b;
          text-decoration: none;
          transition: color 0.2s;
        }
        .pd-breadcrumbs a:hover {
          color: #f97316;
        }
        
        .pd-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        
        @media (min-width: 1024px) {
          .pd-grid {
            grid-template-columns: 480px 1fr;
            gap: 48px;
            align-items: start;
          }
        }
        
        /* Left Column: Image Area */
        .pd-images {
          /* Not sticky, scrolls with page */
        }

        .pd-img-main {
          background: #ffffff;
          border: 1px solid rgba(30,58,138,0.1);
          border-radius: 20px;
          overflow: hidden;
          aspect-ratio: 1;
          position: relative;
          cursor: zoom-in;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 32px rgba(30,58,138,0.07);
          width: 100%;
        }
        
        .pd-img-main img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 32px;
          transition: transform 0.3s ease;
        }
        
        .pd-img-main:hover img {
          transform: scale(1.05);
        }

        .pd-action-overlays {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 10;
        }

        .pd-action-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(30,58,138,0.1);
          box-shadow: 0 4px 16px rgba(30,58,138,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pd-action-btn:hover {
          transform: translateY(-2px) scale(1.05);
          color: #1e1b2e;
          box-shadow: 0 8px 24px rgba(30,58,138,0.12);
        }

        .pd-action-btn.wishlisted {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }
        
        .pd-thumbs {
          display: flex;
          gap: 12px;
          padding: 20px 0;
          overflow-x: auto;
          justify-content: flex-start;
          scrollbar-width: none;
        }
        .pd-thumbs::-webkit-scrollbar {
          display: none;
        }
        
        .pd-thumb {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
          background: #ffffff;
          border: 2px solid rgba(30,58,138,0.1);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s;
          box-shadow: 0 2px 8px rgba(30,58,138,0.05);
        }
        
        .pd-thumb:hover {
          border-color: rgba(30,58,138,0.2);
          box-shadow: 0 4px 16px rgba(30,58,138,0.08);
        }
        
        .pd-thumb.on {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
        }
        
        .pd-thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 8px;
        }
        
        /* Right Column: Info & Details Cards */
        .pd-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pd-card {
          background: #ffffff;
          border: 1px solid rgba(30,58,138,0.1);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 32px rgba(30,58,138,0.07);
        }

        .pd-brand {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #f97316;
          margin-bottom: 8px;
        }

        .pd-name {
          font-size: 26px;
          font-weight: 800;
          color: #1e1b2e;
          line-height: 1.25;
          margin-bottom: 16px;
        }

        .pd-rating-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .pd-rating-pill {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .pd-rating-count {
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
        }

        .pd-assured-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: linear-gradient(135deg, #f97316 0%, #1e3a8a 100%);
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-left: 8px;
        }

        /* Price display */
        .pd-price-block {
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
          margin-top: 20px;
        }

        .pd-price-row {
          display: flex;
          align-items: baseline;
          gap: 16px;
        }

        .pd-price-main {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 40px;
          color: #1e1b2e;
          letter-spacing: 0.02em;
        }

        .pd-price-mrp {
          font-size: 18px;
          color: #94a3b8;
          text-decoration: line-through;
          font-weight: 600;
        }

        .pd-price-save {
          font-size: 16px;
          color: #22c55e;
          font-weight: 800;
        }

        .pd-taxes-info {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          margin-top: 6px;
        }

        /* Delivery Checker */
        .pd-delivery-title {
          font-size: 15px;
          font-weight: 800;
          color: #1e1b2e;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .pd-delivery-form {
          display: flex;
          gap: 12px;
          max-width: 400px;
        }

        .pd-delivery-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid rgba(30,58,138,0.1);
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          outline: none;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .pd-delivery-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
          background: #ffffff;
        }

        .pd-delivery-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #f97316 0%, #1e3a8a 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 16px rgba(249, 115, 22, 0.25);
        }

        .pd-delivery-btn:hover {
          background: linear-gradient(135deg, #1e3a8a 0%, #f97316 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(30,58,138,0.25);
        }

        .pd-delivery-btn:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          box-shadow: none;
          cursor: not-allowed;
        }

        .pd-delivery-status {
          margin-top: 16px;
          font-size: 14px;
        }

        /* Address card */
        .pd-address-card {
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border: 1px solid rgba(30,58,138,0.1);
          border-radius: 14px;
          padding: 16px;
          margin-top: 16px;
        }

        .pd-address-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .pd-address-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #64748b;
        }

        .pd-address-switch-btn {
          background: none;
          border: none;
          color: #f97316;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }
        .pd-address-switch-btn:hover {
          color: #1e3a8a;
        }

        .pd-address-body {
          font-size: 14px;
          color: #1e1b2e;
          font-weight: 700;
        }

        /* Variant Buttons */
        .pd-var-lbl {
          font-size: 13px;
          font-weight: 800;
          color: #64748b;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .pd-var-btn {
          padding: 10px 20px;
          border: 2px solid rgba(30,58,138,0.1);
          background: #ffffff;
          font-size: 14px;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.25s;
        }

        .pd-var-btn:hover:not(.disabled):not(.on) {
          border-color: rgba(30,58,138,0.2);
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .pd-var-btn.on {
          border-color: #f97316;
          background: linear-gradient(135deg, #fff7ed 0%, #fff1e6 100%);
          color: #f97316;
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.15);
        }

        .pd-var-btn.disabled {
          background: #f1f5f9;
          color: #94a3b8;
          border-color: #e2e8f0;
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Specifications */
        .pd-specs-table {
          width: 100%;
          border-collapse: collapse;
        }

        .pd-specs-row {
          border-bottom: 1px solid #f1f5f9;
        }

        .pd-specs-row:last-child {
          border-bottom: none;
        }

        .pd-specs-label {
          width: 35%;
          padding: 14px 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
        }

        .pd-specs-val {
          padding: 14px 0;
          font-size: 14px;
          color: #1e1b2e;
          font-weight: 700;
        }

        /* Highlights & Description */
        ul.list-disc {
          color: #334155;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.6;
        }
        
        /* CTA Buttons */
        .pd-cta {
          display: flex;
          gap: 16px;
          margin-top: 16px;
        }

        .pd-btn-cart {
          flex: 1;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff;
          border: none;
          padding: 16px 28px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          box-shadow: 0 4px 20px rgba(79, 70, 229, 0.3);
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pd-btn-cart:hover:not(:disabled) {
          background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(79, 70, 229, 0.35);
        }

        .pd-btn-buy {
          flex: 1;
          background: linear-gradient(135deg, #f97316 0%, #1e3a8a 100%);
          color: #ffffff;
          border: none;
          padding: 16px 28px;
          font-size: 15px;
          font-weight: 800;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          box-shadow: 0 4px 20px rgba(249, 115, 22, 0.3);
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pd-btn-buy:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e3a8a 0%, #f97316 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(30,58,138,0.35);
        }

        .pd-btn-cart:disabled, .pd-btn-buy:disabled {
          background: #cbd5e1;
          color: #94a3b8;
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        /* Sticky bottom mobile actions */
        .pd-sticky-cta {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255,255,255,0.98);
          box-shadow: 0 -4px 24px rgba(30,58,138,0.08);
          backdrop-filter: blur(16px);
          z-index: 50;
          display: block;
        }

        @media (min-width: 1024px) {
          .pd-sticky-cta {
            display: none;
          }
        }

        .pd-sticky-inner {
          display: flex;
          height: 60px;
        }

        .pd-sticky-btn-cart {
          flex: 1;
          height: 100%;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
        }

        .pd-sticky-btn-buy {
          flex: 1;
          height: 100%;
          background: linear-gradient(135deg, #f97316 0%, #1e3a8a 100%);
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
        }

        .pd-sticky-btn-cart:disabled, .pd-sticky-btn-buy:disabled {
          background: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
        }

        /* Similar recommendations */
        .pd-similar {
          margin-top: 40px;
        }
        .pd-similar-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          color: #1e1b2e;
          letter-spacing: 0.02em;
          margin-bottom: 20px;
        }
        .pd-similar-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 768px) {
          .pd-similar-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }
        }

        /* Lightbox */
        .pd-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.95);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          backdrop-filter: blur(12px);
        }
        .pd-lightbox img {
          max-width: 90vw;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .pd-lightbox-close {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s;
        }
        .pd-lightbox-close:hover {
          background: rgba(255,255,255,0.25);
          transform: scale(1.1);
        }
        .pd-img-skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: pdShimmer 1.2s infinite;
        }
        @keyframes pdShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="pd-wrap">
        {/* Breadcrumbs */}
        <div className="pd-breadcrumbs">
          <Link to="/">Home</Link>
          <span className="mx-1.5 text-gray-400">&gt;</span>
          <Link to="/products">Products</Link>
          {p.category && (
            <>
              <span className="mx-1.5 text-gray-400">&gt;</span>
              <Link to={`/products?category=${p.category._id || p.category}`}>{p.category.name || p.category}</Link>
            </>
          )}
          <span className="mx-1.5 text-gray-400">&gt;</span>
          <span className="text-gray-600 truncate max-w-[200px]">{p.name}</span>
        </div>

        <div className="pd-grid">
          {/* Left Column: Images */}
          <div className="pd-images">
            <div
              className="pd-img-main"
              onTouchStart={onMainImgTouchStart}
              onTouchEnd={onMainImgTouchEnd}
              onTouchCancel={onMainImgTouchCancel}
              onClick={onMainImgClick}
            >
              {/* Overlay Action Buttons */}
              <div className="pd-action-overlays" onClick={(e) => e.stopPropagation()}>
                <button
                  className="pd-action-btn"
                  onClick={handleShare}
                  title="Share"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                  </svg>
                </button>
                <button
                  className={`pd-action-btn ${isInWishlist(p._id || p.id) ? 'wishlisted' : ''}`}
                  onClick={() => isInWishlist(p._id || p.id) ? removeFromWishlist(p._id || p.id) : addToWishlist({ ...p, id: p._id || p.id })}
                  title={isInWishlist(p._id || p.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  {isInWishlist(p._id || p.id) ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                </button>
              </div>

              {imgLoading && imgs[activeImg] && <div className="pd-img-skeleton" />}
              {imgs[activeImg] ? (
                <img
                  src={getImageUrl(imgs[activeImg], 800)}
                  alt={p.name}
                  onLoad={() => setImgLoading(false)}
                  onError={() => setImgLoading(false)}
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

            {/* Thumbnail horizontal list */}
            {imgs.length > 1 && (
              <div className="pd-thumbs">
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

          {/* Right Column: Info */}
          <div className="pd-info">
            
            {/* Header info */}
            <div className="pd-card">
              {p.brand && (
                <div className="pd-brand">{p.brand.name || p.brand}</div>
              )}
              <h1 className="pd-name">{p.name}</h1>
              
              <div className="pd-rating-row">
                <div className="pd-rating-pill">
                  <span>{Number(p.ratingAvg || 4.3).toFixed(1)}</span>
                  <span>★</span>
                </div>
                <span className="pd-rating-count">
                  {p.ratingCount || 12} Ratings &amp; {Math.round((p.ratingCount || 12) * 0.4)} Reviews
                </span>
                <span className="pd-assured-badge">
                  Assured <span>★</span>
                </span>
              </div>

              {/* Price */}
              <div className="pd-price-block">
                <div className="text-xs font-bold text-green-600 mb-1">Special Price</div>
                <div className="pd-price-row">
                  <span className="pd-price-main">
                    ₹{Math.round(currentPrice || minPrice || 0).toLocaleString()}
                  </span>
                  {currentMrp && currentMrp > currentPrice && (
                    <>
                      <span className="pd-price-mrp">
                        ₹{Math.round(currentMrp || displayMrp || 0).toLocaleString()}
                      </span>
                      <span className="pd-price-save">
                        {discount}% off
                      </span>
                    </>
                  )}
                </div>
                <div className="pd-taxes-info">
                  {p.gst > 0 ? `Inclusive of ${p.gst}% GST` : 'Inclusive of all taxes'}
                </div>
              </div>
            </div>

            {/* Verification / Store Info */}
            {p.store && (
              <div className="pd-card flex items-center gap-3">
                {p.store.sellerAvatar && (
                  <img
                    src={getImageUrl(p.store.sellerAvatar, 100)}
                    alt={p.store.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-orange-100"
                  />
                )}
                <div>
                  <div className="text-xs font-bold text-gray-400">Sold by</div>
                  <div className="text-sm font-bold text-gray-800">{p.store.name}</div>
                </div>
                <div className="ml-auto text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                  Verified Store
                </div>
              </div>
            )}



            {/* Variants */}
            {variantAttrs.length > 0 && (
              <div className="pd-card space-y-4">
                {variantAttrs.map((attr, attrIdx) => {
                  const lowAttr = attr.toLowerCase().trim();
                  const opts = variantOpts(attr);
                  const isColor = ['color', 'colour', 'finish', 'shade'].includes(lowAttr);

                  return (
                    <div key={attrIdx} className="space-y-2">
                      <div className="pd-var-lbl">{attr}:</div>
                      <div className="flex flex-wrap gap-2">
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
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-3.5 h-3.5 rounded-full border border-gray-200"
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

            {/* Delivery section */}
            <div className="pd-card">
              <div className="pd-delivery-title">Delivery</div>
              
              {user?.savedAddresses && user.savedAddresses.length > 0 ? (
                <>
                  <div className="pd-address-card">
                    <div className="pd-address-header">
                      <span className="pd-address-title">DELIVER TO:</span>
                      <button
                        type="button"
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
                      {selectedAddress.fullName} • {selectedAddress.city} - {selectedAddress.pincode}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <form className="pd-delivery-form" onSubmit={checkDelivery}>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit Pincode"
                      className="pd-delivery-input"
                    />
                    <button type="submit" className="pd-delivery-btn" disabled={checkingDelivery || pincode.length !== 6}>
                      {checkingDelivery ? 'Checking...' : 'Check'}
                    </button>
                  </form>
                </>
              )}

              {deliveryInfo && (
                <div className="pd-delivery-status mt-3">
                  {deliveryInfo.serviceable ? (
                    <div className="space-y-1 bg-green-50 border border-green-100 rounded-xl p-3 text-green-800">
                      <div className="font-bold flex items-center gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        <span>Delivery by {deliveryInfo.etaStart?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} - {deliveryInfo.etaEnd?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div className="text-xs font-semibold space-y-1 pt-1 border-t border-green-200/50 mt-1">
                        <div>Prepaid Shipping: <span className="font-bold text-green-700">{deliveryInfo.isFreeDelivery ? 'FREE' : `₹${deliveryInfo.deliveryCharge || 85}`}</span></div>
                        {deliveryInfo.codAvailable ? (
                          <div>COD Shipping: <span className="font-bold text-slate-700">₹{(deliveryInfo.deliveryCharge || 85) + (deliveryInfo.codCharge || 0)}</span></div>
                        ) : (
                          <div className="text-orange-600">✗ Cash on Delivery not available</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-800 font-bold mt-3">
                      ✗ {deliveryInfo.message || 'Product not deliverable to this pincode'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Highlights */}
            {hasHighlights && (
              <div className="pd-card">
                <div className="pd-delivery-title">Highlights</div>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                  {p.highlights.map((highlight, i) => (
                    <li key={i}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            {hasDescription && (
              <div className="pd-card">
                <div className="pd-delivery-title">Description</div>
                <p className="text-sm text-gray-600 leading-relaxed" style={{
                  display: descriptionExpanded ? 'block' : '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </p>
                {p.description.length > 250 && (
                  <button
                    className="text-xs font-bold text-blue-600 hover:underline mt-2 flex items-center gap-1 bg-none border-none p-0 cursor-pointer"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  >
                    {descriptionExpanded ? 'Read Less ▲' : 'Read More ▼'}
                  </button>
                )}
              </div>
            )}

            {/* Specifications */}
            {hasSpecifications && (
              <div className="pd-card">
                <div className="pd-delivery-title">Specifications</div>
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

            {/* Action Buttons */}
            <div className="pd-cta">
              <button className="pd-btn-cart" onClick={handleAddToCart} disabled={!canAddToCart}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Add to Cart
              </button>
              <button className="pd-btn-buy" onClick={handleBuyNow} disabled={!canAddToCart}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
                </svg>
                Buy Now
              </button>
            </div>

          </div>
        </div>

        {/* Similar Products */}
        <div className="pd-similar">
          <h3 className="pd-similar-title">Recommended Products</h3>
          <div className="pd-similar-grid">
            {(similarProducts || []).map((product, i) => (
              <ProductCard key={i} p={product} />
            ))}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightbox && imgs[activeImg] && (
        <div className="pd-lightbox" onClick={() => setLightbox(false)}>
          <button className="pd-lightbox-close" onClick={() => setLightbox(false)} aria-label="Close">×</button>
          <img src={getImageUrl(imgs[activeImg], 1200)} alt={p.name} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Sticky Bottom Actions (Mobile) */}
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