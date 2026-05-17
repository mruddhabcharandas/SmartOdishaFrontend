import React from 'react'
import { Link } from 'react-router-dom'
import { useWishlist } from '../../lib/WishlistContext'
import { useCart } from '../../lib/CartContext'
import { getCloudinaryUrl } from '../../lib/cloudinary'

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist()
  const { addToCart } = useCart()

  const displayItems = wishlist.map(item => item.product || item)

  if (displayItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="mb-8 text-8xl">❤️</div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">Your Wishlist is Empty</h1>
        <p className="text-gray-500 mb-8">Save products you love for later. Start exploring now!</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-95"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 mb-2">My Wishlist</h1>
        <p className="text-gray-500">You have {displayItems.length} saved item{displayItems.length !== 1 ? 's' : ''}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayItems.map((product, idx) => {
          const productId = product._id || product.id
          const imageUrl = product.images?.[0] ? getCloudinaryUrl(product.images[0], 400) : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80'

          return (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden">
              <div className="relative aspect-square">
                <Link to={`/product/${productId}`}>
                  <img
                    src={imageUrl}
                    alt={product.name || 'Product'}
                    className="h-full w-full object-cover"
                  />
                </Link>
                <button
                  onClick={() => removeFromWishlist(productId)}
                  className="absolute top-3 right-3 h-9 w-9 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <Link to={`/product/${productId}`} className="block mb-2">
                  <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug">{product.name}</h3>
                </Link>
                <div className="mb-4">
                  <span className="text-xl font-black text-orange-500">₹{Number(product.price || 0).toLocaleString()}</span>
                  {product.mrp && product.mrp > product.price && (
                    <span className="ml-2 text-sm text-gray-400 line-through">₹{Number(product.mrp).toLocaleString()}</span>
                  )}
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 text-white font-black text-sm uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
