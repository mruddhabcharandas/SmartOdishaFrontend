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
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer group flex flex-col"
      onClick={() => navigate(`/products/${productIdOrSlug}`)}
      onMouseEnter={prefetchProduct}
    >
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
          <div className="flex flex-col gap-2">
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
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const productId = p._id || p.id;
              if (isInWishlist(productId)) {
                removeFromWishlist(productId);
              } else {
                addToWishlist(p);
              }
            }}
            className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-lg hover:bg-orange-50 hover:border-orange-300 transition-all"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isInWishlist(p._id || p.id) ? '#ff4343' : 'none'}
              stroke="#64748b"
              strokeWidth="2"
              className="transition-all"
            >
              <path
                d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </div>

        <div className="w-full h-full p-8 flex items-center justify-center">
          {p.images?.length ? (
            <img 
              src={getCloudinaryUrl(p.images[0].url, 400)} 
              alt={p.name}
              loading="lazy" 
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <span className="text-5xl opacity-20">📦</span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          {p.category?.name && (
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {p.category.name}
            </span>
          )}
        </div>

        <Link 
          to={`/products/${productIdOrSlug}`} 
          onClick={e => e.stopPropagation()} 
          className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-blue-600 transition-colors"
        >
          {p.name}
        </Link>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-extrabold text-gray-900">
              ₹{Number(minPrice).toLocaleString('en-IN')}
            </span>
            {displayMrp > minPrice && (
              <>
                <span className="text-sm text-gray-500 line-through">
                  ₹{Number(displayMrp).toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-bold text-green-600">
                  Save ₹{Number(displayMrp - minPrice).toLocaleString('en-IN')}
                </span>
              </>
            )}
          </div>

          {totalStock > 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Free Delivery • Pan India</span>
            </div>
          ) : (
            <div className="text-sm text-red-600 font-bold">
              Out of Stock
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
