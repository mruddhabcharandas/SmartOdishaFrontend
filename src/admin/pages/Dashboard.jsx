import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../shared/lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/orders', { params: { limit: 5 } }).catch(() => ({ data: { items: [] } }))
        ])
        setStats(statsRes.data)
        setRecentOrders(ordersRes.data?.items || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading)
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="bg-white border rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Products" value={stats?.totalProducts ?? 0} link="/admin/products" />
        <Stat title="Customers" value={stats?.totalCustomers ?? 0} />
        <Stat title="Bills" value={stats?.totalBills ?? 0} link="/admin/billing" />
        <Stat title="Low Stock" value={stats?.lowStock?.length ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Low stock</h2>
            <Link to="/admin/products" className="text-sm text-blue-600">View products</Link>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {(stats?.lowStock || []).map((p) => (
              <div key={p._id} className="px-4 py-2 flex justify-between items-center text-sm">
                <span className="truncate">{p.name}</span>
                <span className="text-red-600 font-medium">{p.stock}</span>
              </div>
            ))}
            {(!stats?.lowStock || stats.lowStock.length === 0) && (
              <div className="px-4 py-3 text-gray-500 text-sm">No low stock items</div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm text-blue-600">View all</Link>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {recentOrders.map((o) => (
              <div key={o._id} className="px-4 py-2 flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{o.customer?.name}</span>
                  <span className="text-gray-500 ml-2">₹{o.totalEstimate}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${o.status === 'FULFILLED' ? 'bg-green-100 text-green-800' : o.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>{o.status}</span>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="px-4 py-3 text-gray-500 text-sm">No orders yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ title, value, link }) {
  const content = (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
  if (link) return <Link to={link} className="block hover:opacity-90">{content}</Link>
  return content
}
