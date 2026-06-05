import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { useCart } from '../lib/CartContext'
import { useWishlist } from '../lib/WishlistContext'
import { useAuth } from '../lib/AuthContext'
import { CONFIG } from '../shared/lib/config.js'
import { getCloudinaryUrl } from '../lib/cloudinary'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function UserLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cartCount } = useCart()
  const { wishlistCount } = useWishlist()
  const { user, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const bottomNavItems = [
    { to: '/', l: 'Home', i: (<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />) },
    { to: '/products', l: 'Browse', i: (<path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />) },
    { to: '/cart', l: 'Cart', i: (<><path d="M7 6h13l-1.2 7H9.2L7 6Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="19" r="1.4" fill="currentColor" /><circle cx="17" cy="19" r="1.4" fill="currentColor" /></>), showCount: true, count: cartCount },
    { to: '/orders', l: 'Orders', i: (<path d="M5 3h14a2 2 0 012 2v2H3V5a2 2 0 012-2zm16 6H3v8a2 2 0 002 2h14a2 2 0 002-2V9z" />) },
    { to: user ? '/profile' : '/login', state: user ? undefined : { from: location.pathname + location.search }, l: 'Profile', i: (<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />) }
  ]

  const handleLogout = () => {
    logout()
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
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .header-search-input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 14px;
        }
        .nav-link-active {
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
        }
      `}</style>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to="/" className="flex items-center gap-3 sm:gap-4 group flex-shrink-0">
                <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center transition-all group-hover:scale-105 overflow-hidden shadow-sm">
                  <img
                    src="/logo.png"
                    alt="SmartOdisha"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base sm:text-xl font-black tracking-tighter leading-none">
                    <span className="text-blue-700">SMART</span>
                    <span className="text-orange-600">ODISHA</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-widest mt-0.5" style={{ 
                    background: 'linear-gradient(90deg, #3b82f6, #f97316, #10b981, #8b5cf6, #3b82f6)', 
                    backgroundSize: '200% 100%', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent', 
                    animation: 'gradientMove 3s linear infinite'
                  }}>
                    SMART CHOICE, SMART LIFE
                  </span>
                </div>
              </Link>
            </div>

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
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white font-bold"
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
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden">
                        {user?.avatar && (
                          <img
                            src={getCloudinaryUrl(user.avatar)}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.parentElement.querySelector('.avatar-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        )}
                        <span 
                          className="avatar-fallback"
                          style={{ display: user?.avatar ? 'none' : 'flex' }}
                        >
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <Link to="/profile" className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                        Hi, {user.name?.split(' ')[0] || 'User'}
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      state={{ from: location.pathname + location.search }}
                      className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
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
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-blue-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {wishlistCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center text-[8px] font-black text-white bg-blue-600 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="group relative p-2 sm:p-3 rounded-xl hover:bg-gray-50 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-blue-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 6h13l-1.2 7H9.2L7 6Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="19" r="1.4" fill="currentColor" />
                  <circle cx="17" cy="19" r="1.4" fill="currentColor" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center text-[8px] font-black text-white bg-blue-600 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>


        </div>
      </header>

      <main className="flex-1 min-h-0 pb-36 lg:pb-8 animate-in fade-in duration-700">
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
                  'flex flex-col items-center justify-center gap-0.5 transition-all px-3 py-2 rounded-2xl relative',
                  isActive ? 'text-blue-600 bg-blue-50 scale-105' : 'text-gray-600 hover:text-blue-600'
                )
              }
            >
              {item.showCount && item.count > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center text-[8px] font-black text-white bg-blue-600 rounded-full">
                  {item.count}
                </span>
              )}
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
