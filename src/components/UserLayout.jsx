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

  useEffect(() => {}, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-3 sm:gap-4 group">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center transition-all group-hover:scale-105 overflow-hidden shadow-sm">
                <img
                  src="/logo.png"
                  alt="SmartOdisha"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-tighter leading-none">
                  <span className="text-blue-700">SMART</span>
                  <span className="text-orange-500">ODISHA</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 tracking-wider mt-0.5">SMART CHOICE, SMART LIFE</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/products', label: 'Catalogue' },
                { to: '/orders', label: 'My Orders' }
              ].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    classNames(
                      'px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-300',
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-lg shadow-blue-200 scale-105' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/wishlist"
                className="group relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-orange-50 border border-blue-100 hover:bg-white hover:shadow-xl transition-all active:scale-95"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-200 border-2 border-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/cart"
                className="group relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-orange-50 border border-blue-100 hover:bg-white hover:shadow-xl transition-all active:scale-95"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700 group-hover:text-orange-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 6h13l-1.2 7H9.2L7 6Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="19" r="1.6" fill="currentColor" />
                  <circle cx="17" cy="19" r="1.6" fill="currentColor" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-200 border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                {user ? (
                  <div className="flex items-center gap-3">
                    <Link to="/profile" className="inline-flex flex-col items-end gap-0.5 px-3 py-1.5 rounded-full border border-blue-200 bg-white shadow-sm hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{user.name}</span>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-500 leading-none">Customer</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title="Sign out"
                      aria-label="Sign out"
                      className="h-10 w-10 sm:h-12 sm:w-12 inline-flex items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-400 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600 hover:shadow-md active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/login"
                      state={{ from: location.pathname + location.search }}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      state={{ from: location.pathname + location.search }}
                      className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-95"
                    >
                      Join Now
                    </Link>
                  </>
                )}
              </div>
            </div>
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

      <footer className="border-t border-blue-50 bg-white py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center lg:items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center overflow-hidden shadow-sm">
                  <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-tighter leading-none">
                    <span className="text-blue-700">SMART</span>
                    <span className="text-orange-500">ODISHA</span>
                  </span>
                  <span className="text-xs font-bold text-gray-500 tracking-widest mt-1">SMART CHOICE, SMART LIFE</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">© {new Date().getFullYear()} SmartOdisha</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Store Status: Online</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <a 
                href={`mailto:${CONFIG.SUPPORT_EMAIL}`} 
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-orange-50 border border-blue-100 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-white hover:shadow-md transition-all"
              >
                <span>Support</span>
                <span className="text-blue-600">{CONFIG.SUPPORT_EMAIL}</span>
              </a>
              <div className="flex gap-6">
                <Link to="/privacy-policy" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-blue-600 transition-colors">Privacy Policy</Link>
                <Link to="/terms-of-service" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-orange-500 transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
