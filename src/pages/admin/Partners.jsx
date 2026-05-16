import React, { Fragment, useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Partners() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCode, setSelectedCode] = useState(null)
  const [viewingPartner, setViewingPartner] = useState(null)
  const [form, setForm] = useState({ amount:'', method:'MANUAL', utr:'', razorpayPaymentId:'', notes:'' })
  const [partners, setPartners] = useState([])
  const [newPartner, setNewPartner] = useState({ name:'', email:'', phone:'', password:'' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/partners')
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const loadPartners = async () => {
    try {
      const { data } = await api.get('/api/partner-accounts')
      setPartners(data)
    } catch {}
  }
  useEffect(() => { loadPartners() }, [])

  const createPartner = async (e) => {
    e.preventDefault()
    if (!newPartner.name) return
    try {
      await api.post('/api/partner-accounts', newPartner)
      setNewPartner({ name:'', email:'', phone:'', password:'' })
      loadPartners()
      notify('Partner added','success')
    } catch {
      notify('Failed to add partner','error')
    }
  }

  const deletePartner = async (id) => {
    if (!confirm('Delete this partner?')) return
    try {
      await api.put(`/api/partner-accounts/${id}`, { isActive: false })
      loadPartners()
      notify('Partner removed','success')
    } catch {
      notify('Failed to remove partner','error')
    }
  }

  const openPayout = (code) => {
    setSelectedCode(code)
    setForm({ amount:'', method:'MANUAL', utr:'', razorpayPaymentId:'', notes:'' })
  }

  const submitPayout = async (e) => {
    e.preventDefault()
    if (!selectedCode) return
    try {
      await api.post(`/api/partners/${selectedCode}/payout`, {
        amount: Number(form.amount),
        method: form.method,
        utr: form.utr || undefined,
        razorpayPaymentId: form.razorpayPaymentId || undefined,
        notes: form.notes || undefined
      })
      notify('Payout recorded','success')
      setSelectedCode(null)
      load()
    } catch {
      notify('Failed to record payout','error')
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Channel Partners</h1>
          <p className="text-sm text-gray-500 font-medium">Track sales performance and manage commission payouts for your partners.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Add Partner</h3>
            <form onSubmit={createPartner} className="space-y-3">
              <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Partner Name" value={newPartner.name} onChange={e=>setNewPartner({...newPartner, name:e.target.value})} />
              <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email (Primary Key)" value={newPartner.email} onChange={e=>setNewPartner({...newPartner, email:e.target.value})} />
              <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Phone" value={newPartner.phone} onChange={e=>setNewPartner({...newPartner, phone:e.target.value})} />
              <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Password" type="password" value={newPartner.password} onChange={e=>setNewPartner({...newPartner, password:e.target.value})} />
              <button className="w-full bg-gray-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all">Save Partner</button>
            </form>
          </div>
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Partner Accounts</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {partners.length === 0 ? (
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4 italic">No partners</div>
              ) : (
                partners.map(p => (
                  <div key={p._id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-100 group hover:border-gray-200 transition-all">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-gray-900 truncate">{p.name}</div>
                      <div className="text-[9px] text-gray-500 font-bold truncate">{p.phone || 'No Phone'}</div>
                    </div>
                    <button onClick={() => deletePartner(p._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Partner</th>
                <th className="px-6 py-4">Coupon</th>
                <th className="px-6 py-4">Sales</th>
                <th className="px-6 py-4">Comm. %</th>
                <th className="px-6 py-4">Earnings</th>
                <th className="px-6 py-4">Paid</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="8" className="px-6 py-8"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400 italic font-medium">No partner sales or commissions found yet.</td>
                </tr>
              ) : (
                items.map(p => (
                  <Fragment key={p.couponId}>
                    <tr 
                      className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setViewingPartner(p)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{p.partnerName || '-'}</div>
                        <div className="text-[10px] text-gray-400 font-bold">{p.partnerPhone || 'No Phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black tracking-widest">{p.code}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{p.totalSales.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-gray-500">{p.commissionPercent}%</td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{p.totalCommission.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">₹{p.totalPaid.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className={`font-black ${p.balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>₹{p.balance.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                    <button 
                      onClick={()=>openPayout(p.code)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-500 transition-all uppercase tracking-widest"
                    >
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                    {p.payouts && p.payouts.length > 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-3 bg-gray-50/30">
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Last Payout: <span className="text-gray-600">₹{p.payouts[0].amount}</span> on <span className="text-gray-600">{new Date(p.payouts[0].createdAt).toLocaleDateString()}</span> via <span className="text-gray-600">{p.payouts[0].method}</span>
                            {p.payouts[0].utr && <> • UTR: <span className="text-gray-600">{p.payouts[0].utr}</span></>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      </div>

      {viewingPartner && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-8 animate-in zoom-in-95 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-gray-50 pb-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xl">
                  {viewingPartner.partnerName?.charAt(0) || 'P'}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">{viewingPartner.partnerName || 'Partner Detail'}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg tracking-widest">{viewingPartner.code}</span>
                    <span className="text-xs text-gray-400 font-bold tracking-tight">{viewingPartner.partnerPhone || viewingPartner.partnerEmail || 'No contact info'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingPartner(null)} className="p-3 hover:bg-gray-50 rounded-2xl transition-colors text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Earnings Breakdown</h3>
                <div className="h-[300px] w-full bg-gray-50/50 rounded-3xl p-4">
                  {viewingPartner.categoryBreakdown && viewingPartner.categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={viewingPartner.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {viewingPartner.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `₹${Number(value).toFixed(2)}`}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-xs italic font-medium">
                      No sales recorded for this partner yet.
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-100 rounded-3xl p-5 text-gray-900">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Commission</div>
                    <div className="text-2xl font-black tracking-tight">₹{viewingPartner.totalCommission.toLocaleString()}</div>
                  </div>
                  <div className="bg-blue-50 rounded-3xl p-5 text-blue-700 border border-blue-100">
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1">Current Balance</div>
                    <div className="text-2xl font-black tracking-tight">₹{viewingPartner.balance.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Recent Payouts</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingPartner(null); openPayout(viewingPartner.code); }}
                    className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest"
                  >
                    + Record New
                  </button>
                </div>
                <div className="space-y-3">
                  {viewingPartner.payouts && viewingPartner.payouts.length > 0 ? (
                    viewingPartner.payouts.slice(0, 5).map((p, idx) => (
                      <div key={idx} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between group hover:border-blue-100 transition-colors">
                        <div>
                          <div className="font-bold text-gray-900">₹{p.amount.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.method} • {new Date(p.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-gray-400 italic text-xs font-medium bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                      No payouts recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md space-y-6 animate-in zoom-in-95">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Record Payout</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Partner: {selectedCode}</p>
            </div>
            
            <form onSubmit={submitPayout} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Amount (₹)</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} required />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Payment Method</label>
                <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.method} onChange={e=>setForm({...form, method:e.target.value})}>
                  <option value="MANUAL">Bank Transfer / Manual</option>
                  <option value="RAZORPAY">Razorpay</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">{form.method === 'RAZORPAY' ? 'Razorpay ID' : 'UTR Number'}</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder={form.method === 'RAZORPAY' ? 'pay_...' : 'Transaction ID'} value={form.method === 'RAZORPAY' ? form.razorpayPaymentId : form.utr} onChange={e=>setForm({...form, [form.method === 'RAZORPAY' ? 'razorpayPaymentId' : 'utr']: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Notes</label>
                <textarea className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" placeholder="Optional notes..." value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setSelectedCode(null)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl text-sm font-black hover:bg-gray-200 transition-all uppercase tracking-widest">Cancel</button>
                <button className="flex-2 bg-blue-600 text-white py-4 px-8 rounded-2xl text-sm font-black shadow-lg hover:bg-blue-500 transition-all uppercase tracking-widest">Confirm Payout</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
