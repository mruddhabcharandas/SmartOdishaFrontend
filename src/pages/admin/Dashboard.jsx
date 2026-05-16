import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [inv, setInv] = useState({ totalSkus: 0, totalUnits: 0, outOfStock: 0, lowStock: 0 })
  const [orders, setOrders] = useState({ total: 0, open: 0, today: 0, recent: [] })
  const [revenue, setRevenue] = useState({ totalRevenue: 0, thisMonthRevenue: 0, pendingOrders: 0, topProducts: [], topBuyers: [] })
  const [loading, setLoading] = useState(true)
  const [selectedProductSkus, setSelectedProductSkus] = useState(null)
  const [loadingSkus, setLoadingSkus] = useState(false)

  const fetchSkus = async (productId) => {
    setLoadingSkus(true)
    try {
      const { data } = await api.get(`/api/admin/revenue/product/${productId}/skus`)
      setSelectedProductSkus(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSkus(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, ordersRes, revenueRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/orders', { params: { page: 1, limit: 50 } }).catch(() => ({ data: { items: [] } })),
          api.get('/api/admin/revenue/summary').catch(() => ({ data: { totalRevenue: 0, thisMonthRevenue: 0, pendingOrders: 0, topProducts: [], topBuyers: [] } }))
        ])
        const s = statsRes.data
        setStats(s)
        setRevenue(revenueRes.data)
        setInv({ 
          totalSkus: s.totalProducts, 
          totalUnits: s.totalUnits, 
          outOfStock: s.outOfStock, 
          lowStock: s.lowStockCount 
        })

        const items = ordersRes.data?.items || []
        const now = new Date()
        const todayStr = now.toISOString().slice(0, 10)
        const open = items.filter(o => o.status === 'NEW' || o.status === 'CONFIRMED').length
        const today = items.filter(o => o.createdAt && o.createdAt.slice(0, 10) === todayStr).length
        const recent = items.slice(0, 5)
        setOrders({ total: items.length, open, today, recent })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Inventory Dashboard</h1>
            <p className="text-xs text-gray-500">Loading latest inventory and orders…</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-4 animate-pulse h-40" />
          <div className="bg-white border rounded-xl p-4 animate-pulse h-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here's an overview of your platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          to="/admin/products" 
          iconBg="bg-blue-50" 
          icon="📦" 
          title="Total Products" 
          value={stats?.actualProductsCount ?? (stats?.totalProducts ?? inv.totalSkus)} 
          subtext={`Across ${stats?.totalProducts ?? inv.totalSkus} SKUs`} 
        />
        <Card to="/admin/customers" iconBg="bg-yellow-50" icon="⏳" title="Pending Customer Approvals" value={stats?.pendingCustomers ?? 0} />
        <Card to="/admin/inventory" iconBg="bg-amber-50" icon="⚠️" title="Low Stock Alerts" value={inv.lowStock} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card to="/admin/orders" iconBg="bg-emerald-50" icon="🛒" title="New Order Requests" value={stats?.newOrders ?? 0} />
        <Card to="/admin/payment-verification" iconBg="bg-purple-50" icon="💼" title="Payments to Verify" value={stats?.pendingCash ?? 0} subtext="Manual Transfer / UPI" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded-2xl p-5">
          <div className="text-[12px] text-gray-500 font-bold mb-1">Total Revenue</div>
          <div className="text-3xl font-black text-gray-900">₹{Math.round(revenue.totalRevenue).toLocaleString()}</div>
          <div className="mt-3 text-[12px] text-gray-500 font-bold mb-1">This Month</div>
          <div className="text-xl font-black text-emerald-700">₹{Math.round(revenue.thisMonthRevenue).toLocaleString()}</div>
          <div className="mt-3 text-[12px] text-gray-500 font-bold mb-1">Pending Orders</div>
          <div className="text-lg font-black text-amber-600">{revenue.pendingOrders}</div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-gray-800">Top 5 Products</div>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {revenue.topProducts.map((p, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div className="truncate text-sm font-semibold text-gray-800">{p.name}</div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">₹{Math.round(p.revenue).toLocaleString()}</div>
                  <div className="text-[11px] text-gray-400">Qty {p.quantity}</div>
                </div>
              </div>
            ))}
            {revenue.topProducts.length === 0 && (
              <div className="py-4 text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-gray-800">Top 5 Buyers</div>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {revenue.topBuyers.map((b, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div className="truncate">
                  <div className="text-sm font-semibold text-gray-800">{b.name || b.phone}</div>
                  <div className="text-[11px] text-gray-400">{b.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">₹{Math.round(b.total).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {revenue.topBuyers.length === 0 && (
              <div className="py-4 text-gray-500 text-sm">No data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Low Stock Products</h2>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {(stats?.lowStock || []).map(p => (
              <div key={p._id} className="px-6 py-3 flex items-center justify-between">
                <div className="truncate">{p.name}</div>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 border border-red-100">{p.stock}</span>
              </div>
            ))}
            {(!stats?.lowStock || stats.lowStock.length === 0) && (
              <div className="px-6 py-6 text-gray-500 text-sm">No low stock items</div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Recent Orders</h2>
              <p className="text-xs text-gray-500">Today: {orders.today} • Loaded: {orders.total}</p>
            </div>
            <Link to="/admin/orders" className="text-sm text-blue-600">View all</Link>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {orders.recent.map(o => (
              <div key={o._id} className="px-6 py-3 flex items-center justify-between">
                <div className="truncate">
                  <div className="font-medium text-gray-900">{o.customer?.name}</div>
                  <div className="text-xs text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''} • ₹{o.totalEstimate}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                  o.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  o.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border border-red-100' :
                  'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                  {o.status}
                </span>
              </div>
            ))}
            {orders.recent.length === 0 && (
              <div className="px-6 py-6 text-gray-500 text-sm">No orders yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ icon, iconBg, title, value, subtext, to }) {
  const content = (
    <>
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-[12px] text-gray-500 font-bold">{title}</div>
        <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{value}</div>
        {subtext && <div className="text-[10.5px] text-blue-600 font-bold tracking-tight mt-0.5">{subtext}</div>}
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="group bg-white border rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </div>
        {content}
      </Link>
    )
  }

  return (
    <div className="bg-white border rounded-2xl p-5 flex items-center gap-4">
      {content}
    </div>
  )
}
