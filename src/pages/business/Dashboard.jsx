import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function BusinessDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const storeName = localStorage.getItem('storeName') || 'Partner Store'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, productsRes, ordersRes] = await Promise.all([
          api.get('/api/stores/dashboard').catch(() => ({ data: {} })),
          api.get('/api/stores/products').catch(() => ({ data: [] })),
          api.get('/api/stores/orders').catch(() => ({ data: [] }))
        ])
        setStats(statsRes.data || {})
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : [])
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : [])
      } catch (err) {
        console.error('Failed to load seller dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-6">
        <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const totalRevenue = Math.round(stats?.totalRevenue || 0)
  const pendingRevenue = Math.round(stats?.revenueBreakdown?.pending || 0)
  const receivedRevenue = Math.round(stats?.revenueBreakdown?.received || 0)

  return (
    <div className="space-y-7 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Seller Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-widest font-black text-indigo-400">Seller Partner Hub</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{storeName}</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Manage your catalog inventory, fulfill customer orders, generate Delhivery labels, and track wallet earnings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 relative z-10">
          <Link
            to="/business/products"
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>➕</span> Add Product
          </Link>
          <Link
            to="/business/variants"
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-500/30 hover:bg-indigo-500/40 text-white border border-indigo-400/40 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 backdrop-blur-sm"
          >
            <span>⚡</span> Variant Studio
          </Link>
          <Link
            to="/business/wallet"
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 backdrop-blur-sm"
          >
            <span>💳</span> Wallet
          </Link>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <MetricCard
          to="/business/wallet"
          title="Total Store Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          subtext={`Settled: ₹${receivedRevenue.toLocaleString('en-IN')} · In Process: ₹${pendingRevenue.toLocaleString('en-IN')}`}
          badgeText="Earnings"
          icon="₹"
          accentColor="emerald"
        />
        <MetricCard
          to="/business/orders"
          title="Total Orders"
          value={orders.length}
          subtext={`${orders.filter(o => ['NEW', 'CONFIRMED', 'PACKED', 'PROCESSING'].includes(o.status)).length} active / to ship`}
          badgeText="Fulfillment"
          icon="📦"
          accentColor="blue"
        />
        <MetricCard
          to="/business/products"
          title="Catalog Products"
          value={stats?.totalProducts ?? products.length}
          subtext={`${stats?.activeProducts ?? products.filter(p => p.isActive !== false).length} live on store`}
          badgeText="Inventory"
          icon="🏷️"
          accentColor="indigo"
        />
        <MetricCard
          to="/business/inventory"
          title="Low Stock Alert"
          value={stats?.outOfStock || products.filter(p => (p.stock || 0) <= 5).length}
          subtext="Items need restocking"
          badgeText="Stock Alert"
          icon="⚠️"
          accentColor={stats?.outOfStock > 0 ? "rose" : "amber"}
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Store Operations
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <QuickActionBtn to="/business/orders" label="Process Orders" icon="📦" />
          <QuickActionBtn to="/business/products" label="Manage Products" icon="🏷️" />
          <QuickActionBtn to="/business/variants" label="Variant Studio" icon="⚡" />
          <QuickActionBtn to="/business/inventory" label="Stock Inventory" icon="📊" />
          <QuickActionBtn to="/business/wallet" label="Wallet & Balance" icon="💰" />
        </div>
      </div>

      {/* Tables Section: Orders & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>📦</span> Recent Orders
            </h3>
            <Link to="/business/orders" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              View All Orders →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 max-h-96 overflow-y-auto">
            {orders?.length > 0 ? (
              orders.slice(0, 8).map((order) => {
                const statusPill = {
                  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  FULFILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
                  PACKED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  SHIPPED: 'bg-purple-50 text-purple-700 border-purple-200',
                  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
                }
                const badgeStyle = statusPill[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'

                return (
                  <div
                    key={order._id}
                    onClick={() => navigate('/business/orders')}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <div className="truncate pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          #{order.orderNumber || (order._id ? order._id.slice(-6).toUpperCase() : '')}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {order.customer?.name || 'Customer'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : ''}
                        {order.storeRevenue !== undefined && (
                          <span className="font-bold text-emerald-600 ml-2">
                            · Earnings: ₹{Math.round(order.storeRevenue).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeStyle} shrink-0`}>
                      {order.status}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                No orders received yet
              </div>
            )}
          </div>
        </div>

        {/* Store Catalog Products */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span>🏷️</span> Catalog Products
            </h3>
            <Link to="/business/products" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Manage Catalog →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 max-h-96 overflow-y-auto">
            {products?.length > 0 ? (
              products.slice(0, 8).map((product) => (
                <div
                  key={product._id}
                  onClick={() => navigate('/business/products')}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="truncate pr-4">
                    <div className="font-semibold text-slate-900 text-sm truncate">{product.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Stock: <b className={(product.stock || 0) <= 5 ? 'text-rose-600' : 'text-slate-700'}>{product.stock || 0} units</b>
                      {' '}· Base Price: <b className="text-slate-700">₹{product.originalStorePrice ?? product.price}</b>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    product.isActive !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  } shrink-0`}>
                    {product.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                No products found in catalog
              </div>
            )}
          </div>
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
    amber: {
      bg: 'bg-amber-50 text-amber-700',
      badge: 'bg-amber-50 text-amber-700 border-amber-100',
      border: 'hover:border-amber-200'
    },
    rose: {
      bg: 'bg-rose-50 text-rose-700',
      badge: 'bg-rose-50 text-rose-700 border-rose-100',
      border: 'hover:border-rose-200'
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
      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-xs font-bold text-slate-700 hover:text-indigo-700"
    >
      <span className="text-base">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  )
}
