import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { CONFIG } from '../shared/lib/config.js'

const AdminIcon = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'dash':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'tickets':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'orders':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      )
    case 'billing':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
          <path d="M12 11h4" />
          <path d="M12 16h4" />
        </svg>
      )
    case 'payments':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case 'cat':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      )
    case 'brands':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      )
    case 'slides':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="21" y1="12" x2="3" y2="12" />
          <line x1="12" y1="21" x2="12" y2="3" />
        </svg>
      )
    case 'coupon':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 0 0 6v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-6Z" />
        </svg>
      )
    case 'offer':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    case 'partner':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'cust':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'sellers':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M14 14h7v7h-7z" />
        </svg>
      )
    case 'requests':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
        </svg>
      )
    case 'payouts':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'staff':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <circle cx="19" cy="11" r="3" />
          <path d="M22 21v-1a3 3 0 0 0-3-3" />
        </svg>
      )
    case 'settings':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    default:
      return null
  }
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  
  const token = localStorage.getItem('token')
  let role = 'admin'
  let permissions = []
  if (token) {
    try {
      const part = token.split('.')[1] || ''
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
      const payload = JSON.parse(decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')))
      role = payload.role || 'admin'
      permissions = payload.permissions || []
    } catch (e) {
      console.error('AdminLayout token decode error:', e)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/admin/login')
  }

  const canAccess = (key) => {
    if (role === 'admin') return true
    return permissions.includes(key)
  }

  const navCategories = [
    {
      title: 'Core & Overview',
      items: [
        { to: '/admin', label: 'Dashboard', icon: 'dash', end: true, permission: null },
        { to: '/admin/tickets', label: 'Support Desk', icon: 'tickets', permission: null, badge: 'Live' }
      ]
    },
    {
      title: 'Commerce & Orders',
      items: [
        { to: '/admin/orders', label: 'Orders & Shipments', icon: 'orders', permission: 'orders' },
        { to: '/admin/billing', label: 'Billing Invoices', icon: 'billing', permission: 'billing' },
        { to: '/admin/payment-verification', label: 'Payment Verification', icon: 'payments', permission: 'payment-verification' }
      ]
    },
    {
      title: 'Catalog & Storefront',
      items: [
        { to: '/admin/categories', label: 'Categories', icon: 'cat', permission: 'categories' },
        { to: '/admin/subcategories', label: 'Subcategories', icon: 'cat', permission: 'subcategories' },
        { to: '/admin/brands', label: 'Brands', icon: 'brands', permission: 'brands' },
        { to: '/admin/hero-slides', label: 'Hero Banners', icon: 'slides', permission: 'settings' }
      ]
    },
    {
      title: 'Marketing & Users',
      items: [
        { to: '/admin/coupons', label: 'Coupons', icon: 'coupon', permission: 'coupons' },
        { to: '/admin/offers', label: 'Offers & Deals', icon: 'offer', permission: 'offers' },
        { to: '/admin/partners', label: 'B2B Partners', icon: 'partner', permission: 'partners' },
        { to: '/admin/customers', label: 'Customers', icon: 'cust', permission: 'customers' }
      ]
    },
    {
      title: 'Seller Ecosystem',
      items: [
        { to: '/admin/sellers', label: 'Active Sellers', icon: 'sellers', permission: 'stores' },
        { to: '/admin/seller-requests', label: 'Seller Onboarding', icon: 'requests', permission: 'stores' },
        { to: '/admin/payouts', label: 'Seller Payouts', icon: 'payouts', permission: 'stores' }
      ]
    },
    {
      title: 'System & Security',
      items: [
        { to: '/admin/staff', label: 'Staff Management', icon: 'staff', permission: 'staff' },
        { to: '/admin/settings', label: 'Platform Settings', icon: 'settings', permission: 'settings' }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
        <div className="h-16 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
              aria-label="Toggle Navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>

            <Link to="/admin" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center p-1.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain filter brightness-110" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm md:text-base tracking-tight text-white">{CONFIG.BRAND_NAME}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    role === 'admin' 
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 shadow-xs' 
                      : 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40'
                  }`}>
                    {role}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400 -mt-0.5">Enterprise Administration</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition"
            >
              <span>Live Website</span>
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid: Sidebar + Viewport */}
      <div className="grid min-h-[calc(100vh-4rem)] md:grid-cols-[250px_minmax(0,1fr)]">
        {/* Mobile Backdrop */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-16 bottom-0 z-30 w-[250px] bg-white border-r border-slate-200/80 p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="space-y-6 overflow-y-auto pr-1">
            {navCategories.map((cat, cIdx) => {
              const visibleItems = cat.items.filter(it => !it.permission || canAccess(it.permission))
              if (visibleItems.length === 0) return null

              return (
                <div key={cIdx} className="space-y-1.5">
                  <span className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {cat.title}
                  </span>
                  <nav className="space-y-1">
                    {visibleItems.map((item, iIdx) => (
                      <NavLink
                        key={iIdx}
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 translate-x-1'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3">
                              <AdminIcon
                                name={item.icon}
                                className={`w-4 h-4 transition-colors ${
                                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                                }`}
                              />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                isActive ? 'bg-white text-indigo-700' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </nav>
                </div>
              )
            })}
          </div>

          {/* System Footer Pill */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">System Gateway</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">ONLINE</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Delhivery & Webhooks Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Workspace Viewport */}
        <main className="min-w-0 bg-slate-50/60 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

