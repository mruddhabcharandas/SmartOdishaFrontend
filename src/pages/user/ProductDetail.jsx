import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useCart } from '../../lib/CartContext'
import { useWishlist } from '../../lib/WishlistContext'
import { setSEO } from '../../shared/lib/seo.js'
import { useToast } from '../../components/Toast'
import ProductCard from '../../components/ProductCard'

export default function ProductDetail() {
  const { idOrSlug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const { notify } = useToast()
  const [activeImg, setActiveImg] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const authed = !!localStorage.getItem('token')

  const { data: p, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['product', idOrSlug],
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

  const discount = displayMrp > minPrice
    ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0

  useEffect(() => {
    if (p) {
      setSEO(`${p.name} | SmartOdisha`, `Buy ${p.name} at best prices with fast delivery across Odisha.`)
    }
  }, [p])

  const totalStock = Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p.stock || 0)

  const imgs = Array.isArray(p?.images) ? p.images : []

  const handleBuyNow = async () => {
    if (!authed) {
      navigate('/login', { state: { from: `/products/${idOrSlug}` } });
      return;
    }
    if (p.variants?.length > 0) {
      notify('Please select a variant first', 'info');
      return;
    }
    const ok = await addToCart(p, quantity);
    if (ok) {
      notify('Added to cart!', 'success');
      navigate('/cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="aspect-square bg-white rounded-2xl shadow-sm animate-pulse"></div>
              <div className="flex gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-20 h-20 bg-white rounded-xl shadow-sm animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-white rounded-lg shadow-sm w-3/4 animate-pulse"></div>
              <div className="h-6 bg-white rounded-lg shadow-sm w-1/2 animate-pulse"></div>
              <div className="h-10 bg-white rounded-lg shadow-sm w-1/3 animate-pulse"></div>
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-4 bg-white rounded-lg shadow-sm w-full animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (queryError || !p) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-10 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="text-7xl mb-6">😔</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Product Not Found</h1>
          <p className="text-gray-600 mb-8 text-lg">The product you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-6 lg:p-10">
            
            {/* Image Section */}
            <div className="space-y-6">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 aspect-square flex items-center justify-center"
              >
                {imgs.length > 0 && (
                  <img
                    src={getCloudinaryUrl(imgs[activeImg].url || imgs[activeImg], 800)}
                    alt={p.name}
                    className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  />
                )}
                {discount > 0 && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                    {discount}% OFF
                  </div>
                )}
              </motion.div>
              
              {imgs.length > 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex gap-3 overflow-x-auto pb-2"
                >
                  {imgs.map((img, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveImg(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl border-3 transition-all duration-300 overflow-hidden ${
                        activeImg === idx 
                          ? 'border-blue-500 shadow-xl scale-105' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={getCloudinaryUrl(img.url || img, 120)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Product Info Section */}
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-4">
                  {p.name}
                </h1>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full shadow-md">
                    <span className="font-bold">{Number(p.ratingAvg || 4.3).toFixed(1)}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                  <span className="text-gray-600 font-medium">
                    {Number(p.ratingCount || 128).toLocaleString()} Ratings
                  </span>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-orange-50 rounded-2xl p-6 mb-6">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <span className="text-4xl lg:text-5xl font-extrabold text-gray-900">
                      ₹{minPrice.toLocaleString()}
                    </span>
                    {displayMrp > minPrice && (
                      <>
                        <span className="text-xl text-gray-500 line-through">
                          ₹{displayMrp.toLocaleString()}
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          Save ₹{(displayMrp - minPrice).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                  {p.gst > 0 && (
                    <p className="text-green-700 text-sm mt-3 font-semibold">
                      Inclusive of all taxes
                    </p>
                  )}
                </div>

                {/* Stock & Delivery Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {totalStock > 0 ? (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#16a34a">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      <div>
                        <p className="font-bold text-green-800">In Stock</p>
                        <p className="text-sm text-green-700">{totalStock} units available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#dc2626">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      <div>
                        <p className="font-bold text-red-800">Out of Stock</p>
                        <p className="text-sm text-red-700">Currently unavailable</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#2563eb">
                      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    </svg>
                    <div>
                      <p className="font-bold text-blue-800">Free Delivery</p>
                      <p className="text-sm text-blue-700">Across Odisha</p>
                    </div>
                  </div>
                </div>

                {/* Quantity Selector */}
                {totalStock > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Quantity</label>
                    <div className="flex items-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-12 h-12 rounded-xl border-2 border-gray-300 flex items-center justify-center text-2xl font-bold text-gray-700 hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        −
                      </motion.button>
                      <span className="text-2xl font-bold text-gray-900 min-w-[60px] text-center">{quantity}</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(Math.min(totalStock, quantity + 1))}
                        disabled={quantity >= totalStock}
                        className="w-12 h-12 rounded-xl border-2 border-gray-300 flex items-center justify-center text-2xl font-bold text-gray-700 hover:border-blue-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        +
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
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
                    className="flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-orange-500 text-orange-500 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {isInWishlist(p._id || p.id) ? (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" />
                        </svg>
                        Saved
                      </>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Wishlist
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      if (!authed) {
                        navigate('/login', { state: { from: `/products/${idOrSlug}` } });
                        return;
                      }
                      if (p.variants?.length > 0) {
                        notify('Please select a variant first', 'info');
                        return;
                      }
                      const ok = await addToCart(p, quantity);
                      if (ok) {
                        notify('Added to cart!', 'success');
                      }
                    }}
                    disabled={totalStock <= 0}
                    className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {totalStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBuyNow}
                    disabled={totalStock <= 0}
                    className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Buy Now
                  </motion.button>
                </div>

                {/* Highlights */}
                {p.highlights && p.highlights.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      Highlights
                    </h3>
                    <ul className="space-y-3">
                      {p.highlights.map((hl, idx) => (
                        <motion.li 
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 + idx * 0.05 }}
                          className="flex items-start gap-3 text-gray-800"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mt-0.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          </div>
                          <span className="text-lg">{hl}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description */}
                {p.description && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                        {p.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Specifications */}
                {p.specifications && p.specifications.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Specifications</h3>
                    <div className="bg-gray-50 rounded-2xl overflow-hidden">
                      <table className="w-full">
                        <tbody>
                          {p.specifications.map((spec, idx) => (
                            <motion.tr 
                              key={idx}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.5 + idx * 0.03 }}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                            >
                              <td className="px-6 py-4 text-gray-600 font-medium w-1/3">
                                {spec.key}
                              </td>
                              <td className="px-6 py-4 text-gray-900 font-semibold">
                                {spec.value}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 bg-white rounded-3xl shadow-xl p-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Similar Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {similarProducts.slice(0, 8).map((product, idx) => (
                <motion.div
                  key={product._id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + idx * 0.05 }}
                >
                  <ProductCard
                    p={product}
                    authed={authed}
                    addToCart={addToCart}
                    navigate={navigate}
                    index={idx}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
