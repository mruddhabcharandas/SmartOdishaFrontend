import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CONFIG } from '../shared/lib/config.js'

const Icon = ({ name }) => (
  <span className="inline-block w-4 h-4 mr-2 align-middle">
    {name === 'dash' && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )}
    {name === 'prod' && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    )}
    {name === 'inv' && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M14 14h7v7h-7z" />
        <path d="M17 17h1" />
        <path d="M17 20h3" />
      </svg>
    )}
  </span>
)

export default function BusinessLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  
  const storeName = localStorage.getItem('storeName')

  const logout = () => {
    localStorage.removeItem('storeToken')
    localStorage.removeItem('storeName')
    navigate('/business/login')
  }

  const link = (to, label, end = false) => {
    return (
      <NavLink
        to={to}
        end={end}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          [
            'flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group',
            isActive
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200 scale-[1.02]'
              : 'text-gray-500 hover:bg-gradient-to-br from-orange-50 to-amber-50 hover:text-gray-900 hover:pl-5'
          ].join(' ')
        }
      >
        {label}
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-orange-100 selection:text-orange-900">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fed7aa; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fdba74; }
      `}</style>
      <div className="flex h-20 items-center justify-between border-b border-orange-100 bg-white/80 backdrop-blur-md px-6 md:px-10 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-xl hover:bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 transition-colors"
            onClick={() => setOpen(!open)}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-gray-900">{CONFIG.BRAND_NAME}</span>
                <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-[10px] font-black text-white rounded-lg tracking-widest uppercase">Seller</span>
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Seller Panel</div>
              {storeName && <div className="text-[11px] text-orange-600 font-semibold">{storeName}</div>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="group inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-gray-600 transition-all hover:bg-red-50 hover:border-red-100 hover:text-red-600 active:scale-95"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="grid min-h-[calc(100vh-5rem)] md:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`border-r border-orange-100 bg-white/50 backdrop-blur-sm ${
            open ? 'fixed inset-0 z-40 bg-white pt-20' : 'hidden'
          } md:block sticky top-20 h-[calc(100vh-5rem)]`}
        >
          <div className="h-full flex flex-col p-6 overflow-hidden">
            <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {link('/business/dashboard', (
                <>
                  <Icon name="dash" />
                  Dashboard
                </>
              ), true)}
              {link('/business/products', (
                <>
                  <Icon name="prod" />
                  Products
                </>
              ))}
              {link('/business/inventory', (
                <>
                  <Icon name="inv" />
                  Inventory
                </>
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-orange-50 px-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                System Online
              </div>
            </div>
          </div>
        </aside>

        <main className="bg-orange-50/30">
          <div className="max-w-[1400px] mx-auto p-6 md:p-10">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
