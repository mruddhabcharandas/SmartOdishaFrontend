import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function Customers() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/admin/customers', { params: { q } })
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  const approve = async (id) => {
    setBusyId(id)
    try {
      await api.post(`/api/admin/customers/${id}/approve`)
      setItems(prev => prev.map(x => x._id === id ? { ...x, isActive: true } : x))
    } finally {
      setBusyId('')
    }
  }

  useEffect(() => {
    load()
  }, [q])

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Database</h1>
          <p className="text-sm text-gray-500 font-medium">Manage your relationship with customers and track their lifetime value.</p>
        </div>
        <div className="relative group">
          <input
            className="bg-white border border-gray-200 text-gray-900 text-sm rounded-2xl pl-10 pr-4 py-2.5 w-64 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            placeholder="Search by name or phone..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Customer Info</th>
                <th className="px-6 py-4">Contact Details</th>
                <th className="px-6 py-4">Order Stats</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic font-medium">No customers found in your database.</td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c._id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={()=>location.href=`/admin/customers/${c._id}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Member since {new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-700">{c.phone}</div>
                      <div className="text-xs text-gray-400 font-medium">{c.email || 'No Email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-[10px] tracking-widest border border-blue-100">
                        {c.purchaseHistory?.length || 0} ORDERS
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs font-medium">
                      <div className="truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                        {c.address || 'Not provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border ${c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {!c.isActive && (
                        <button
                          onClick={() => approve(c._id)}
                          disabled={busyId === c._id}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold tracking-widest uppercase disabled:opacity-50"
                        >
                          {busyId === c._id ? 'Approving...' : 'Approve'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
