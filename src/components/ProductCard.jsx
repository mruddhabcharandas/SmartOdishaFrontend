import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { getCloudinaryUrl } from '../lib/cloudinary';
import { getStockStatus, useCart } from '../lib/CartContext'
import { useWishlist } from '../lib/WishlistContext'

export default function ProductCard({ p, authed, addToCart, navigate, index, setRecOpen, setRecItems }) {
  const { refreshCart } = useCart()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const location = useLocation()
  const queryClient = useQueryClient()

  const productIdOrSlug = p.slug || p._id

  const prefetchProduct = () => {
    queryClient.prefetchQuery({
      queryKey: ['product', productIdOrSlug],
      queryFn: () => api.get(`/api/products/${productIdOrSlug}`).then(res => res.data),
      staleTime: 1000 * 60 * 5,
    })
  }

  const totalStock = Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p.stock || 0)

  const minPrice = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.price || 0);
    const activeVariants = p.variants.filter(v => v.isActive !== false && safeNumber(v.price || 0) > 0);
    if (activeVariants.length === 0) return safeNumber(p.price || 0);
    return Math.min(...activeVariants.map(v => safeNumber(v.price || 0)));
  }, [p.variants, p.price]);

  const displayMrp = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!Array.isArray(p.variants) || p.variants.length === 0) return safeNumber(p.mrp || p.price || 0);
    const variantWithMinPrice = p.variants.find(v => v.isActive !== false && safeNumber(v.price || 0) === minPrice);
    return safeNumber(variantWithMinPrice?.mrp || p.mrp || minPrice || 0);
  }, [p.variants, minPrice, p.mrp]);

  const hasMultiplePrices = useMemo(() => {
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || !isFinite(num) ? 0 : num;
    };
    if (!Array.isArray(p.variants) || p.variants.length <= 1) return false;
    const prices = new Set(p.variants.filter(v => v.isActive !== false && safeNumber(v.price) > 0).map(v => safeNumber(v.price)));
    return prices.size > 1;
  }, [p.variants]);

  const status = getStockStatus(totalStock)
  const hasBulk = p.bulkDiscountQuantity > 0
  const discount = displayMrp > minPrice
    ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0

  const share = (e) => {
    e.stopPropagation(); e.preventDefault()
    const url = `${window.location.origin}/products/${productIdOrSlug}`
    if (navigator.share) navigator.share({ title: p.name, url }).catch(() => { })
    else navigator.clipboard?.writeText(url)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col"
      onMouseEnter={prefetchProduct}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden p-4">
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          {discount >= 10 && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md">
              {discount}% OFF
            </div>
          )}
          {authed && hasBulk && (
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md">
              BULK OFFER
            </div>
          )}
        </div>

        <div className="w-full h-full flex items-center justify-center">
          {p.images?.length ? (
            <img 
              src={getCloudinaryUrl(p.images[0].url, 400)} 
              alt={p.name}
              loading="lazy" 
              className="max-w-full max-h-full object-contain transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <span className="text-5xl opacity-20">📦</span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {p.category?.name && (
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
              {p.category.name}
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-snug">
          {p.name}
        </h3>

        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-extrabold text-gray-900">
              ₹{Number(minPrice).toLocaleString('en-IN')}
            </span>
            {displayMrp > minPrice && (
              <span className="text-sm text-gray-500 line-through">
                ₹{Number(displayMrp).toLocaleString('en-IN')}
              </span>
            )}
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${productIdOrSlug}`);
            }}
            className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl flex items-center justify-center shadow-xl hover:shadow-2xl transition-all"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          {totalStock > 0 ? (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-600"></span>
                IN STOCK
              </span>
              <span>•</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                OUT OF STOCK
              </span>
              <span>•</span>
            </>
          )}
          <span>FAST</span>
          <span>•</span>
          <span>GST</span>
        </div>
      </div>
    </motion.div>
  )
}
