import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function CustomerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { notify } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/admin/customers/${id}`)
      setData(data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  const remove = async () => {
    if (!confirm('Delete this customer permanently?')) return
    await api.delete(`/api/admin/customers/${id}`)
    notify('Customer deleted', 'success')
    nav('/admin/customers')
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!data) return <div className="p-6">Not found</div>
  const { user, orders, bills } = data
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <div className="text-sm text-gray-500">{user.phone} • {user.email || 'No email'}</div>
          <div className="mt-2 flex gap-2">
            <span className={`px-2 py-0.5 text-[9px] font-black rounded border ${user.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              STATUS: {user.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>
        <button onClick={remove} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold">Delete</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Recent Orders</div>
          <div className="divide-y">
            {orders.map(o => (
              <div key={o._id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">₹{o.totalEstimate}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">{o.status}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {orders.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No orders</div>}
          </div>
        </div>
        <div className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Recent Bills</div>
          <div className="divide-y">
            {bills.map(b => (
              <div key={b._id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{b.invoiceNumber}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">₹{b.payable}</div>
                </div>
                <div className="text-xs text-gray-500">{new Date(b.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {bills.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No bills</div>}
          </div>
        </div>
      </div>
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-4">Saved Addresses ({user.savedAddresses?.length || 0})</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.savedAddresses && user.savedAddresses.length > 0 ? (
            user.savedAddresses.map((addr, idx) => (
              <div key={idx} className={`p-4 border rounded-xl relative ${addr.isDefault ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 bg-white'}`}>
                {addr.isDefault && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded uppercase">Default</span>
                )}
                <div className="font-bold text-gray-900 text-sm mb-1">{addr.fullName}</div>
                <div className="text-xs text-gray-500 font-semibold mb-2">{addr.phone}</div>
                <div className="text-xs text-gray-600 leading-relaxed">
                  {addr.addressLine1}
                  {addr.addressLine2 && `, ${addr.addressLine2}`}
                  <br />
                  {addr.city}, {addr.district && `${addr.district}, `}{addr.state} - {addr.pincode}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-6 text-sm text-gray-400 italic">No saved addresses for this customer.</div>
          )}
        </div>
      </div>
    </div>
  )
}
