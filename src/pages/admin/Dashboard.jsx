import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, revenueRes, ordersRes] = await Promise.all([
          api.get('/api/admin/stats').catch(() => ({ data: {} })),
          api.get('/api/admin/revenue/summary').catch(() => ({
            data: { totalRevenue: 0, thisMonthRevenue: 0, pendingOrders: 0, topProducts: [], topBuyers: [] }
          })),
          api.get('/api/orders', { params: { limit: 6 } }).catch(() => ({ data: { items: [] } }))
        ])
        setStats({ ...statsRes.data, revenue: revenueRes.data })
        setRecentOrders(ordersRes.data?.items || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-slate-200 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-64 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div className="space-y-7 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Platform Overview</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, Administrator. Real-time statistics across Smart Odisha.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
          📅 {todayStr}
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          to="/admin/billing"
          title="Total Revenue"
          value={`₹${Math.round(stats?.revenue?.totalRevenue || 0).toLocaleString('en-IN')}`}
          subtext={`This month: ₹${Math.round(stats?.revenue?.thisMonthRevenue || 0).toLocaleString('en-IN')}`}
          badgeText="Financial"
          icon="₹"
          accentColor="emerald"
        />
        <MetricCard
          to="/admin/orders"
          title="Total Orders"
          value={stats?.revenue?.totalOrders || stats?.totalOrders || 0}
          subtext={`${stats?.newOrders || 0} new pending orders`}
          badgeText="Orders"
          icon="📦"
          accentColor="blue"
        />
        <MetricCard
          to="/admin/sellers"
          title="Active Sellers"
          value={stats?.totalSellers || 0}
          subtext="Verified business partners"
          badgeText="Stores"
          icon="🏪"
          accentColor="indigo"
        />
        <MetricCard
          to="/admin/customers"
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          subtext={`${stats?.pendingCustomers || 0} pending verification`}
          badgeText="Users"
          icon="👥"
          accentColor="purple"
        />
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Quick Management
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <QuickActionBtn to="/admin/orders" label="Orders Hub" icon="📦" />
          <QuickActionBtn to="/admin/payment-verification" label="Verify Payments" icon="💳" />
          <QuickActionBtn to="/admin/sellers" label="Seller Stores" icon="🏪" />
          <QuickActionBtn to="/admin/coupons" label="Discount Coupons" icon="🏷️" />
          <QuickActionBtn to="/admin/customers" label="Customer List" icon="👥" />
        </div>
      </div>

      {/* Middle Row: Top Products & Top Buyers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <span>🏆</span> Top Selling Products
            </h2>
            <Link to="/admin/billing" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              View Analytics →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 max-h-80 overflow-y-auto">
            {stats?.revenue?.topProducts?.length > 0 ? (
              stats.revenue.topProducts.map((p, idx) => (
                <div key={idx} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-amber-100 text-amber-800' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm truncate max-w-xs">{p.name}</div>
                      <div className="text-xs text-slate-400">Sold: {p.quantity} units</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 text-sm">₹{Math.round(p.revenue).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">No sales data recorded yet</div>
            )}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <span>⭐</span> Top Customers
            </h2>
            <Link to="/admin/customers" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              Customer Directory →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 max-h-80 overflow-y-auto">
            {stats?.revenue?.topBuyers?.length > 0 ? (
              stats.revenue.topBuyers.map((b, idx) => (
                <div key={idx} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-black text-xs flex items-center justify-center border border-purple-100">
                      {(b.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{b.name || 'Registered Customer'}</div>
                      <div className="text-xs text-slate-400">{b.phone || 'Verified User'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-purple-700 text-sm">₹{Math.round(b.total).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">No buyer transactions available</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>📋</span> Recent Orders
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest order transactions placed on the platform</p>
          </div>
          <Link
            to="/admin/orders"
            className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-sm shadow-blue-100"
          >
            All Orders →
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentOrders.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentOrders.map((o) => {
                  const statusColors = {
                    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    FULFILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
                    SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
                    PENDING: 'bg-amber-50 text-amber-700 border-amber-200'
                  }
                  const badgeClass = statusColors[o.status] || 'bg-slate-100 text-slate-700 border-slate-200'

                  return (
                    <tr key={o._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        #{o.orderNumber || (o._id ? o._id.slice(-6).toUpperCase() : '')}
                      </td>
                      <td className="px-6 py-3.5 text-slate-800">
                        <div>{o.customer?.name || 'Customer'}</div>
                        <div className="text-xs text-slate-400">{o.customer?.phone || ''}</div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        ₹{Number(o.totalEstimate || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeClass}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          to="/admin/orders"
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No recent orders found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtext, badgeText, icon, to, accentColor = 'blue' }) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      border: 'hover:border-emerald-200'
    },
    blue: {
      bg: 'bg-blue-50 text-blue-700',
      badge: 'bg-blue-50 text-blue-700 border-blue-100',
      border: 'hover:border-blue-200'
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-700',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      border: 'hover:border-indigo-200'
    },
    purple: {
      bg: 'bg-purple-50 text-purple-700',
      badge: 'bg-purple-50 text-purple-700 border-purple-100',
      border: 'hover:border-purple-200'
    }
  }

  const c = colorMap[accentColor] || colorMap.blue

  const inner = (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${c.border} flex flex-col justify-between h-full group`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${c.bg}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${c.badge}`}>
          {badgeText}
        </span>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
        <div className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{value}</div>
        {subtext && (
          <div className="text-xs text-slate-500 font-medium mt-1 truncate">{subtext}</div>
        )}
      </div>
    </div>
  )

  if (to) {
    return <Link to={to} className="block">{inner}</Link>
  }
  return inner
}

function QuickActionBtn({ to, label, icon }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-bold text-slate-700 hover:text-blue-700"
    >
      <span className="text-base">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  )
}
