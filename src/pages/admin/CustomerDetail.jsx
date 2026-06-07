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
          <div className="text-[10px] font-black uppercase tracking-widest mt-1">
            KYC: {user.isKycComplete ? 'COMPLETED' : 'PENDING'}
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
      <div className="bg-white border rounded-2xl p-4">
        <div className="text-xs text-gray-500 uppercase font-bold mb-3">KYC Details</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <KycItem label="Business Name" value={user.kyc?.businessName} />
          <KycItem label="GSTIN" value={user.kyc?.gstin} />
          <KycItem label="PAN" value={user.kyc?.pan} />
          <KycItem label="Pincode" value={user.kyc?.pincode} />
          <KycItem label="State" value={user.kyc?.state} />
          <KycItem label="City" value={user.kyc?.city} />
          <KycItem label="Address Line 1" value={user.kyc?.addressLine1} className="md:col-span-2" />
          <KycItem label="Address Line 2" value={user.kyc?.addressLine2} className="md:col-span-2" />
        </div>
      </div>
    </div>
  )
}

function KycItem({ label, value, className='' }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</div>
      <div className={`px-3 py-2 rounded-2xl border text-sm font-bold ${value ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
        {value || '—'}
      </div>
    </div>
  )
}
