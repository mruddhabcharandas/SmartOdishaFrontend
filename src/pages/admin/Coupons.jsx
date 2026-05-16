import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function Coupons(){
  const [items, setItems] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    code:'', type:'PERCENT', value:'', minAmount:'', minOrderValue:'', maxDiscount:'', expiryDate:'', usageLimit:'',
    partnerId:'', partnerCommissionPercent:'', maxTotalSales:'', isActive:true, password:''
  })
  const [partners, setPartners] = useState([])
  const [newPartner, setNewPartner] = useState({ name:'', email:'', phone:'' })
  const load = async()=>{ const {data}=await api.get('/api/coupons'); setItems(data) }
  const loadPartners = async()=>{ const {data}=await api.get('/api/partner-accounts'); setPartners(data) }
  useEffect(()=>{ load(); loadPartners() }, [])

  const resetForm = () => {
    setForm({
      code:'', type:'PERCENT', value:'', minAmount:'', minOrderValue:'', maxDiscount:'', expiryDate:'', usageLimit:'',
      partnerId:'', partnerCommissionPercent:'', maxTotalSales:'', isActive:true, password:''
    });
    setEditingId(null);
  }

  const startEdit = (c) => {
    setEditingId(c._id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      minAmount: c.minOrderValue || c.minAmount || '',
      minOrderValue: c.minOrderValue || c.minAmount || '',
      maxDiscount: c.maxDiscount || '',
      expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: c.usageLimit || '',
      partnerId: c.partner?._id || c.partner || '',
      partnerCommissionPercent: c.partnerCommissionPercent || '',
      maxTotalSales: c.maxTotalSales || '',
      isActive: c.isActive,
      password: c.password || ''
    });
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const save = async (e)=>{ 
    e.preventDefault(); 
    const payload = {
      ...form,
      value: Number(form.value),
      minOrderValue: form.minOrderValue? Number(form.minOrderValue): Number(form.minAmount || 0),
      maxDiscount: form.maxDiscount? Number(form.maxDiscount): 0,
      usageLimit: form.usageLimit? Number(form.usageLimit): undefined,
      partnerCommissionPercent: form.partnerCommissionPercent ? Number(form.partnerCommissionPercent) : undefined,
      maxTotalSales: form.maxTotalSales ? Number(form.maxTotalSales) : undefined,
      password: form.password ? String(form.password).trim() : undefined
    };

    if (editingId) {
      await api.put(`/api/coupons/${editingId}`, payload);
    } else {
      await api.post('/api/coupons', payload);
    }
    resetForm(); 
    load(); 
  }

  const remove = async (c)=>{ 
    if (c.isActive) {
      if (!confirm(`Disable coupon "${c.code}"?`)) return;
      await api.delete(`/api/coupons/${c._id}`); 
    } else {
      if (!confirm(`Permanently DELETE coupon "${c.code}"? This cannot be undone.`)) return;
      await api.delete(`/api/coupons/${c._id}`); 
    }
    load(); 
  }

  const toggleStatus = async (c) => {
    await api.put(`/api/coupons/${c._id}`, { isActive: !c.isActive });
    load();
  }
  const createPartner = async (e)=> {
    e.preventDefault()
    if (!newPartner.name) return
    const { data } = await api.post('/api/partner-accounts', newPartner)
    setNewPartner({ name:'', email:'', phone:'' })
    loadPartners()
  }

  const deletePartner = async (id) => {
    if (!confirm("Are you sure you want to delete this partner? Coupons linked to this partner will remain but will lose the partner link.")) return;
    await api.put(`/api/partner-accounts/${id}`, { isActive: false });
    loadPartners();
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Promotions & Coupons</h1>
          <p className="text-sm text-gray-500 font-medium">Create discount codes and manage partner commissions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">
                {editingId ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>
              {editingId && (
                <button onClick={resetForm} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Cancel</button>
              )}
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Coupon Code</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. WELCOME10" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Type</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
                    <option value="PERCENT">Percentage</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Value</label>
                  <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="10" value={form.value} onChange={e=>setForm({...form, value:e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Min Order</label>
                  <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="500" value={form.minOrderValue} onChange={e=>setForm({...form, minOrderValue:e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Max Discount</label>
                  <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0 = no max" value={form.maxDiscount} onChange={e=>setForm({...form, maxDiscount:e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Usage Limit</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="100" value={form.usageLimit} onChange={e=>setForm({...form, usageLimit:e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Expiry Date</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" type="date" value={form.expiryDate} onChange={e=>setForm({...form, expiryDate:e.target.value})} />
              </div>
              
              <div className="pt-4 border-t border-gray-50 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Partner Settings</h4>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Assign Partner</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={form.partnerId} onChange={e=>setForm({...form, partnerId:e.target.value})}>
                    <option value="">No Partner</option>
                    {partners.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                {form.partnerId && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Commission %</label>
                      <input className="w-full bg-blue-50/50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="5" value={form.partnerCommissionPercent} onChange={e=>setForm({...form, partnerCommissionPercent:e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Sales Cap</label>
                      <input className="w-full bg-blue-50/50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="50000" value={form.maxTotalSales} onChange={e=>setForm({...form, maxTotalSales:e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Partner Portal Password</label>
                      <input className="w-full bg-emerald-50/50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Set password for partner access" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
                    </div>
                  </div>
                )}
              </div>

              <button className={`w-full py-4 rounded-2xl text-sm font-black shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 ${editingId ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'}`}>
                {editingId ? 'UPDATE COUPON' : 'CREATE COUPON'}
              </button>
            </form>
          </div>

          
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 ml-2">Active Coupons</h3>
          <div className="grid grid-cols-1 gap-4">
            {items.map(c => {
              const isExpanded = expandedId === c._id;
              return (
                <div 
                  key={c._id} 
                  className={`group bg-white border border-gray-100 rounded-3xl p-5 shadow-sm transition-all cursor-pointer hover:shadow-md ${!c.isActive ? 'opacity-60 grayscale' : ''} ${isExpanded ? 'ring-2 ring-gray-900' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : c._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs tracking-tighter shadow-inner ${c.type === 'PERCENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {c.type === 'PERCENT' ? `${c.value}%` : `₹${c.value}`}
                      </div>
                      <div>
                        <div className="text-lg font-black text-gray-900 tracking-tight">{c.code}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {c.type === 'PERCENT' ? 'Percentage Discount' : 'Flat Discount'} • {c.usageCount || 0} uses
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {c.isActive ? 'ACTIVE' : 'DISABLED'}
                      </div>
                      <svg className={`w-5 h-5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Coupon Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] text-gray-400 font-bold">MIN ORDER</div>
                            <div className="text-sm font-black text-gray-900">₹{c.minAmount || 0}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 font-bold">EXPIRY</div>
                            <div className="text-sm font-black text-gray-900">{new Date(c.expiryDate).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 font-bold">LIMIT</div>
                            <div className="text-sm font-black text-gray-900">{c.usageLimit || '∞'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Partner Stats</h4>
                        {c.partnerName ? (
                          <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-[10px] font-bold text-blue-600 uppercase">Partner</span>
                              <span className="text-xs font-black text-blue-900">{c.partnerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] font-bold text-blue-600 uppercase">Comm.</span>
                              <span className="text-xs font-black text-blue-900">{c.partnerCommissionPercent}%</span>
                            </div>
                            {c.password && (
                              <div className="flex justify-between">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Portal Pass</span>
                                <span className="text-xs font-black text-emerald-900">{c.password}</span>
                              </div>
                            )}
                            {c.maxTotalSales > 0 && (
                              <div className="pt-2 border-t border-blue-100">
                                <div className="text-[9px] font-bold text-blue-400 uppercase mb-1">Sales Cap Progress</div>
                                <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '45%' }}></div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic font-medium">No partner linked.</div>
                        )}
                      </div>
                      <div className="col-span-2 pt-4 flex gap-3">
                        <button 
                          onClick={(e)=>{ e.stopPropagation(); startEdit(c); }} 
                          className="flex-1 bg-gray-50 text-gray-900 py-3 rounded-2xl text-[10px] font-black hover:bg-gray-100 transition-all uppercase tracking-widest border border-gray-100"
                        >
                          Edit Details
                        </button>
                        {!c.isActive && (
                          <button 
                            onClick={(e)=>{ e.stopPropagation(); toggleStatus(c); }} 
                            className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-2xl text-[10px] font-black hover:bg-emerald-100 transition-all uppercase tracking-widest"
                          >
                            Enable Coupon
                          </button>
                        )}
                        <button 
                          onClick={(e)=>{ e.stopPropagation(); remove(c); }} 
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${c.isActive ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                        >
                          {c.isActive ? 'Disable Coupon' : 'Delete Permanent'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {items.length===0 && (
              <div className="py-20 text-center space-y-4">
                <div className="text-4xl">🎟️</div>
                <div className="text-gray-400 font-bold italic">No active promotions found.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
