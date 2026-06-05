import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

export default function BusinessDashboard() {
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, productsRes, ordersRes] = await Promise.all([
          api.get('/api/stores/dashboard'),
          api.get('/api/stores/products'),
          api.get('/api/stores/orders')
        ])
        setStats(statsRes.data)
        setProducts(productsRes.data)
        setOrders(ordersRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('storeToken')
    localStorage.removeItem('storeName')
    location.href = '/business/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">SmartOdisha Business</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border rounded-2xl p-5">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">SmartOdisha Business</h1>
              <p className="text-xs text-gray-500">{localStorage.getItem('storeName')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <Link
                to="/business/dashboard"
                className="w-full px-5 py-4 text-left flex items-center gap-4 border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">🏠</span>
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link
                to="/business/products"
                className="w-full px-5 py-4 text-left flex items-center gap-4 border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">📦</span>
                <span className="font-medium">Products</span>
              </Link>
              <Link
                to="/business/inventory"
                className="w-full px-5 py-4 text-left flex items-center gap-4 border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">📊</span>
                <span className="font-medium">Inventory</span>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-500">Welcome back! Here's an overview of your store</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                  icon="📦"
                  iconBg="bg-orange-50"
                  title="Total Products"
                  value={stats?.totalProducts || 0}
                />
                <Card
                  icon="✅"
                  iconBg="bg-green-50"
                  title="Active Products"
                  value={stats?.activeProducts || 0}
                />
                <Card
                  icon="⚠️"
                  iconBg="bg-yellow-50"
                  title="Low Stock"
                  value={stats?.outOfStock || 0}
                />
                <Card
                  icon="₹"
                  iconBg="bg-blue-50"
                  title="Total Revenue"
                  value={`₹${Math.round(stats?.totalRevenue || 0).toLocaleString()}`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b">
                    <h3 className="font-semibold text-gray-900">Recent Orders</h3>
                  </div>
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {orders?.length > 0 ? (
                      orders.slice(0, 10).map((order) => (
                        <div key={order._id} className="px-6 py-4 flex items-center justify-between">
                          <div className="truncate">
                            <div className="font-medium text-gray-900">{order.customer?.name}</div>
                            <div className="text-xs text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''} · 
                              {order.storeRevenue !== undefined ? ` Store Revenue: ₹${Math.round(order.storeRevenue).toLocaleString()}` : ''}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                            order.status === 'DELIVERED' || order.status === 'FULFILLED' ? 'bg-green-100 text-green-700' :
                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-8 text-center text-gray-500 text-sm">
                        No orders yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b">
                    <h3 className="font-semibold text-gray-900">Products</h3>
                  </div>
                  <div className="divide-y max-h-80 overflow-y-auto">
                    {products?.length > 0 ? (
                      products.slice(0, 10).map((product) => (
                        <div key={product._id} className="px-6 py-4 flex items-center justify-between">
                          <div className="truncate">
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-500">
                              Stock: {product.stock} · Price: ₹{product.price}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                            product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-8 text-center text-gray-500 text-sm">
                        No products yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function Card({ icon, iconBg, title, value }) {
  return (
    <div className="bg-white border rounded-2xl p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="text-[12px] text-gray-500 font-bold">{title}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  )
}
