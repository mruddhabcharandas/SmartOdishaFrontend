import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { useCart } from '../lib/CartContext'
import { useWishlist } from '../lib/WishlistContext'
import { useAuth } from '../lib/AuthContext'
import { CONFIG } from '../shared/lib/config.js'
import { getImageUrl } from '../lib/cloudinary'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function UserLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cartCount } = useCart()
  const { wishlistCount } = useWishlist()
  const { user, logout } = useAuth()

  // Hide bottom nav on these paths
  const hideBottomNav = ['/products', '/cart', '/profile', '/orders', '/enquiry', '/checkout', '/about', '/login', '/signup', '/reset-password'].some(path => {
    const pathname = String(location.pathname || '');
    return typeof pathname === 'string' && pathname.includes(path);
  })

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

  useEffect(() => {}, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .nav-link-active {
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
        }
      `}</style>

      {/* Main Header - Premium */}
      <header className="sticky top-0 z-50 bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-blue-700 flex items-center justify-center transition-all group-hover:scale-105 overflow-hidden shadow-lg shadow-orange-900/20">
                  <img
                    src="/logo.png"
                    alt="SmartOdisha"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-tighter leading-none">
                    <span className="text-blue-700">SMART</span>
                    <span className="text-orange-500">ODISHA</span>
                  </span>
                  <span className="text-[9px] font-semibold text-gray-500 tracking-widest mt-0.5" style={{ 
                    background: 'linear-gradient(90deg, #f97316, #1e3a8a, #f97316)', 
                    backgroundSize: '200% 100%', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent', 
                    animation: 'gradientMove 3s linear infinite'
                  }}>SMART CHOICE, SMART LIFE</span>
                </div>
              </Link>
            </div>

            {/* Right Section: Auth, Wishlist, Cart */}
            <div className="flex items-center gap-2">
              {/* Login/Sign Up or User Profile */}
              <div className="hidden sm:flex items-center gap-3">
                {user ? (
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-900/20 overflow-hidden">
                      {user?.avatar && (
                        <img
                          src={getImageUrl(user.avatar)}
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
                    <Link to="/profile" className="text-xs font-semibold text-gray-700 hover:text-orange-500 transition-colors">
                      Hi, {user.name?.split(' ')[0] || 'User'}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 17l5-5m0 0l-5-5m5 5H9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      state={{ from: location.pathname + location.search }}
                      className="text-xs font-semibold text-gray-700 hover:text-orange-500 transition-colors"
                    >
                      Login / Sign Up
                    </Link>
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="group relative p-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                <svg className="w-6 h-6 text-gray-700 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-lg shadow-orange-900/20">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="group relative p-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                <svg className="w-6 h-6 text-gray-700 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 6h13l-1.2 7H9.2L7 6Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="19" r="1.4" fill="currentColor" />
                  <circle cx="17" cy="19" r="1.4" fill="currentColor" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br from-orange-500 to-blue-700 rounded-full shadow-lg shadow-orange-900/20">
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

      {/* Mobile bottom nav (hidden on certain pages) */}
      {!hideBottomNav && (
        <nav className="lg:hidden fixed bottom-4 inset-x-4 z-40">
          <div className="max-w-md mx-auto h-16 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-100 flex items-center justify-around px-2">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                state={item.state}
                className={({ isActive }) =>
                  classNames(
                    'flex flex-col items-center justify-center gap-0.5 transition-all px-3 py-2 rounded-2xl relative',
                    isActive ? 'text-orange-500 bg-orange-50 scale-105' : 'text-gray-600 hover:text-orange-500'
                  )
                }
              >
                {item.showCount && item.count > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center text-[8px] font-black text-white bg-orange-500 rounded-full">
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
      )}
    </div>
  )
}
