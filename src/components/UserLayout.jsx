import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { useCart } from '../lib/CartContext'
import { useWishlist } from '../lib/WishlistContext'
import { CONFIG } from '../shared/lib/config.js'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function UserLayout() {
  const location = useLocation()
  const { cartCount } = useCart()
  const { wishlistCount } = useWishlist()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const [searchQuery, setSearchQuery] = useState('')

  const bottomNavItems = [
    { to: '/', l: 'Home', i: (<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />) },
    { to: '/products', l: 'Browse', i: (<path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />) },
    { to: '/orders', l: 'Orders', i: (<path d="M5 3h14a2 2 0 012 2v2H3V5a2 2 0 012-2zm16 6H3v8a2 2 0 002 2h14a2 2 0 002-2V9z" />) },
    { to: user ? '/profile' : '/login', state: user ? undefined : { from: location.pathname + location.search }, l: 'Profile', i: (<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />) }
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.reload()
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  useEffect(() => {}, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <style>{`
        .header-top {
          background: linear-gradient(135deg, #1e3a8a, #0f172a);
          color: white;
        }
        .header-search-input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 14px;
        }
        .nav-link-active {
          color: #f97316;
          border-bottom: 2px solid #f97316;
        }
      `}</style>

      {/* Top Bar */}
      <div className="header-top px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-bold flex items-center gap-2">
            <span>📦</span> Free Delivery on Select Products Over ₹499
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/orders" className="text-xs sm:text-sm font-semibold hover:underline">Track Order</Link>
            <a href="tel:+919827058262" className="text-xs sm:text-sm font-semibold hover:underline">Help Center</a>
            <Link to="/partner" className="text-xs sm:text-sm font-semibold hover:underline">Sell on SmartOdisha</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 sm:gap-4 group flex-shrink-0">
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center transition-all group-hover:scale-105 overflow-hidden shadow-sm">
                <img
                  src="/logo.png"
                  alt="SmartOdisha"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-base sm:text-xl font-black tracking-tighter leading-none">
                  <span className="text-blue-700">SMART</span>
                  <span className="text-orange-500">ODISHA</span>
                </span>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-6">
              <div className="flex items-center w-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                <input
                  type="text"
                  placeholder="Search for products, brands and more..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="header-search-input px-4 py-3 bg-transparent"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-white font-bold"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="7" strokeWidth="2" />
                    <path d="M21 21l-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Right Section: Auth, Wishlist, Cart */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Login/Sign Up or User Profile */}
              <div className="hidden sm:flex items-center gap-3">
                {user ? (
                  <div className="flex items-center gap-2">
                    <Link to="/profile" className="text-sm font-bold text-gray-700 hover:text-blue-600">
                      Hi, {user.name?.split(' ')[0] || 'User'}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-sm font-bold text-gray-500 hover:text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      state={{ from: location.pathname + location.search }}
                      className="text-sm font-bold text-gray-700 hover:text-blue-600"
                    >
                      Login / Sign Up
                    </Link>
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="group relative p-2 sm:p-3 rounded-xl hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {wishlistCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center text-[8px] font-black text-white bg-orange-500 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="group relative p-2 sm:p-3 rounded-xl hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 6h13l-1.2 7H9.2L7 6Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="19" r="1.4" fill="currentColor" />
                  <circle cx="17" cy="19" r="1.4" fill="currentColor" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center text-[8px] font-black text-white bg-orange-500 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Category Navigation */}
          <div className="hidden lg:flex items-center gap-1 py-3 border-t border-gray-100">
            {[
              { label: 'All Categories', to: '/products' },
              { label: 'Men', to: '/products' },
              { label: 'Women', to: '/products' },
              { label: 'Electronics', to: '/products' },
              { label: 'Home & Kitchen', to: '/products' },
              { label: 'Beauty', to: '/products' },
              { label: 'Baby & Kids', to: '/products' },
              { label: 'Sports', to: '/products' },
              { label: 'Offers', to: '/products' },
              { label: 'More', to: '/products' }
            ].map((item) => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                className={({ isActive }) =>
                  classNames(
                    'px-4 py-2 text-sm font-bold transition-colors',
                    isActive
                      ? 'nav-link-active text-orange-600'
                      : 'text-gray-700 hover:text-orange-500'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 pb-36 lg:pb-8 animate-in fade-in duration-700">
        {user && user.isKycComplete === false && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 mt-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-[12px] font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>Complete your KYC to place orders.</div>
              <Link to="/profile" className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] uppercase tracking-widest">Update KYC</Link>
            </div>
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-4 inset-x-4 z-40">
        <div className="max-w-md mx-auto h-16 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-100 flex items-center justify-around px-2">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              state={item.state}
              className={({ isActive }) =>
                classNames(
                  'flex flex-col items-center justify-center gap-0.5 transition-all px-3 py-2 rounded-2xl',
                  isActive ? 'text-orange-500 bg-orange-50 scale-105' : 'text-gray-600 hover:text-blue-600'
                )
              }
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                {item.i}
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-widest">{item.l}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
