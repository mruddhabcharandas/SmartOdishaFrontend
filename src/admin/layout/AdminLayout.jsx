import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const Icon = ({ name }) => (
  <span className="inline-block w-4 h-4 mr-2 align-middle">
    {name === 'dash' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>)}
    {name === 'prod' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5zM5 9.27L12 13l7-3.73V8l-7 3-7-3v1.27z"/></svg>)}
    {name === 'cat' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v4H3V5zm0 5h18v9H3v-9z"/></svg>)}
    {name === 'bill' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h9l5 5v15H6V2zm9 1.5V8h4.5L15 3.5z"/></svg>)}
    {name === 'order' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.16 14h9.68l1.24-7H6l1.16 7zM6 4h13v2H6V4z"/></svg>)}
    {name === 'coupon' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 5H3v6h2a2 2 0 1 0 0-4H3V5zm0 8h-2a2 2 0 1 0 0 4h2v2H3v-6h18v0z"/></svg>)}
    {name === 'partner' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h7v-1.5c0-.7.1-1.37.29-2H2.53C3.3 14.9 5.35 13 8 13zm8 0c-2.64 0-4.69 1.9-5.47 4.5-.19.63-.29 1.3-.29 2V20h11v-1.5C21 14.17 16.33 13 16 13z"/></svg>)}
    {name === 'inventory' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 13H4v-2h16v2zm0-4H4V7h16v2zm0 8H4v-2h16v2zM4 3v2h16V3H4z"/></svg>)}
    {name === 'store' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>)}
    {name === 'settings' && (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>)}
  </span>
)

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const logout = () => { localStorage.removeItem('token'); navigate('/admin/login') }
  const link = (to, label) => (
    <NavLink to={to} end={to==='/admin'} onClick={() => setOpen(false)} className={({ isActive }) => `
      flex items-center px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200
      ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'}
    `}>{label}</NavLink>
  )
  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr] grid-cols-1 bg-gray-50/50">
      <button className="md:hidden p-4 bg-white border-b flex items-center justify-between z-50 sticky top-0" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">C2K</div>
          <span className="font-black uppercase tracking-widest text-xs">Admin Console</span>
        </div>
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <aside className={`bg-white border-r p-6 space-y-2 fixed inset-y-0 left-0 z-40 w-[260px] transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative`}>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-blue-100">C2K</div>
          <div>
            <div className="font-black text-sm uppercase tracking-tighter">Click2Kart</div>
            <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Admin Panel</div>
          </div>
        </div>
        
        <div className="space-y-1">
          {link('/admin', <><Icon name="dash"/>Dashboard</>)}
          {link('/admin/orders', <><Icon name="order"/>Orders</>)}
          {link('/admin/billing', <><Icon name="bill"/>Billing</>)}
          {link('/admin/products', <><Icon name="prod"/>Products</>)}
          {link('/admin/inventory', <><Icon name="inventory"/>Inventory</>)}
          {link('/admin/customers', <><Icon name="partner"/>Customers</>)}
          {link('/admin/categories', <><Icon name="cat"/>Categories</>)}
          {link('/admin/stores', <><Icon name="store"/>Stores</>)}
          {link('/admin/coupons', <><Icon name="coupon"/>Coupons</>)}
          {link('/admin/partners', <><Icon name="partner"/>Partners</>)}
          {link('/admin/settings', <><Icon name="settings"/>Settings</>)}
        </div>

        <div className="pt-8 mt-8 border-t border-gray-50">
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-100 bg-red-50/80 text-red-600 transition-all hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>
      <main className="p-4 md:p-6 overflow-x-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
