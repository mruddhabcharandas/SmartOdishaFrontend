import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, revenueRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/admin/revenue/summary').catch(() => ({
            data: { totalRevenue: 0, thisMonthRevenue: 0, pendingOrders: 0, topProducts: [], topBuyers: [] }
          }))
        ])
        setStats({ ...statsRes.data, revenue: revenueRes.data })
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Loading dashboard data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-blue-100 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your platform overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          to="/admin/orders"
          iconType="cart"
          iconBg="bg-blue-50"
          title="Total Orders"
          value={stats?.revenue?.totalOrders || 0}
          subtext={`${stats?.newOrders || 0} new orders`}
        />
        <Card
          to="/admin/sellers"
          iconType="store"
          iconBg="bg-indigo-50"
          title="Total Sellers"
          value={stats?.totalSellers || 0}
          subtext="Active stores"
        />
        <Card
          to="/admin/customers"
          iconType="users"
          iconBg="bg-purple-50"
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          subtext={`${stats?.pendingCustomers || 0} pending`}
        />
        <Card
          to="/admin/billing"
          iconType="currency"
          iconBg="bg-green-50"
          title="Total Revenue"
          value={`₹${Math.round(stats?.revenue?.totalRevenue || 0).toLocaleString()}`}
          subtext={`This month: ₹${Math.round(stats?.revenue?.thisMonthRevenue || 0).toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg font-bold text-gray-900">Top Products</h2>
          </div>
          <div className="divide-y divide-blue-50 max-h-80 overflow-y-auto">
            {stats?.revenue?.topProducts?.length > 0 ? (
              stats.revenue.topProducts.map((p, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                  <div>
                    <div className="font-semibold text-gray-900 truncate max-w-xs">{p.name}</div>
                    <div className="text-xs text-gray-500">Qty: {p.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">₹{Math.round(p.revenue).toLocaleString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">No product data available</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg font-bold text-gray-900">Top Buyers</h2>
          </div>
          <div className="divide-y divide-blue-50 max-h-80 overflow-y-auto">
            {stats?.revenue?.topBuyers?.length > 0 ? (
              stats.revenue.topBuyers.map((b, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                  <div>
                    <div className="font-semibold text-gray-900">{b.name || b.phone}</div>
                    <div className="text-xs text-gray-500">{b.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">₹{Math.round(b.total).toLocaleString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">No buyer data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ iconType, iconBg, title, value, subtext, to }) {
  const getIcon = () => {
    switch(iconType) {
      case 'cart':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="M6 6h15l-1.5 9h-12z" />
            <circle cx="9" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>
        )
      case 'store':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        )
      case 'users':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      case 'currency':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        )
      default:
        return null
    }
  }

  const content = (
    <>
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{title}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
        {subtext && (
          <div className="text-[11px] text-blue-600 font-bold tracking-wide mt-1">{subtext}</div>
        )}
      </div>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="bg-white border border-blue-100 rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition-all relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity text-blue-200">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        {content}
      </Link>
    )
  }

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-6 flex items-center gap-4">
      {content}
    </div>
  )
}
