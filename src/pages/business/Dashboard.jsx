import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function BusinessDashboard() {
  const navigate = useNavigate()
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">Welcome back! Here's an overview of your store</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          iconType="box"
          iconBg="bg-blue-50"
          title="Total Products"
          value={stats?.totalProducts || 0}
        />
        <Card
          iconType="check"
          iconBg="bg-green-50"
          title="Active Products"
          value={stats?.activeProducts || 0}
        />
        <Card
          iconType="warning"
          iconBg="bg-yellow-50"
          title="Low Stock"
          value={stats?.outOfStock || 0}
        />
        <Card
          iconType="currency"
          iconBg="bg-indigo-50"
          title="Total Revenue"
          value={`₹${Math.round(stats?.totalRevenue || 0).toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="font-bold text-gray-900">Recent Orders</h3>
          </div>
          <div className="divide-y divide-blue-50 max-h-80 overflow-y-auto">
            {orders?.length > 0 ? (
              orders.slice(0, 10).map((order) => (
                <div key={order._id} onClick={() => navigate('/business/orders', { state: { orderId: order._id } })} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <div className="truncate">
                    <div className="font-semibold text-gray-900">{order.customer?.name}</div>
                    <div className="text-xs text-gray-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''} · 
                      {order.storeRevenue !== undefined ? ` Store Revenue: ₹${Math.round(order.storeRevenue).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                    order.status === 'DELIVERED' || order.status === 'FULFILLED' ? 'bg-green-100 text-green-700' :
                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
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

        <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="font-bold text-gray-900">Products</h3>
          </div>
          <div className="divide-y divide-blue-50 max-h-80 overflow-y-auto">
            {products?.length > 0 ? (
              products.slice(0, 10).map((product) => (
                <div key={product._id} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                  <div className="truncate">
                    <div className="font-semibold text-gray-900">{product.name}</div>
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
  )
}

function Card({ iconType, iconBg, title, value }) {
  const getIcon = () => {
    switch(iconType) {
      case 'box':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        )
      case 'check':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        )
      case 'currency':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="text-[12px] text-gray-500 font-bold uppercase tracking-wide">{title}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  )
}

