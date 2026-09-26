import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

export default function BusinessWallet() {
  const [data, setData] = useState({ walletPending: 0, walletPaid: 0, transactions: [] })
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // 'ALL', 'EARNING', 'PAYOUT', 'DEDUCTION'
  const [search, setSearch] = useState('')
  const [selectedProof, setSelectedProof] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [walletRes, profileRes] = await Promise.all([
          api.get('/api/stores/wallet'),
          api.get('/api/stores/profile').catch(() => ({ data: null }))
        ])
        setData(walletRes.data || { walletPending: 0, walletPaid: 0, transactions: [] })
        if (profileRes?.data) setProfile(profileRes.data)
      } catch (err) {
        console.error("Failed to load seller wallet details:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 h-36"></div>
          <div className="bg-white border border-slate-100 rounded-3xl p-6 h-36"></div>
          <div className="bg-white border border-slate-100 rounded-3xl p-6 h-36"></div>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 h-96"></div>
      </div>
    )
  }

  const transactions = data.transactions || []
  const filteredTransactions = transactions.filter(t => {
    if (filter !== 'ALL' && t.type !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const txId = (t._id || '').toLowerCase()
      const note = (t.note || '').toLowerCase()
      const ref = (t.referenceId || '').toLowerCase()
      const orderNum = (t.order?.orderNumber || t.order?._id || '').toLowerCase()
      return txId.includes(q) || note.includes(q) || ref.includes(q) || orderNum.includes(q)
    }
    return true
  })

  const totalLifetimeEarnings = (data.walletPending || 0) + (data.walletPaid || 0)

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Finance & Settlements
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Seller Wallet</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time balance, verified payouts, and order earning logs.
          </p>
        </div>

        {/* Bank Account Quick Summary Card */}
        {profile?.bankDetails?.accountNumber || profile?.upiId ? (
          <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
              🏦
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                {profile.bankDetails?.bankName || 'Direct Settlement'}
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded-md font-bold">Active</span>
              </div>
              <div className="text-slate-500 font-mono mt-0.5">
                {profile.bankDetails?.accountNumber 
                  ? `•••• ${profile.bankDetails.accountNumber.slice(-4)}` 
                  : (profile.upiId || 'Configured')}
              </div>
            </div>
            <Link to="/business/profile" className="ml-2 text-xs font-bold text-indigo-600 hover:text-indigo-800">
              Manage →
            </Link>
          </div>
        ) : (
          <Link
            to="/business/profile"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors shadow-xs"
          >
            <span>⚠️</span> Add Bank / UPI Details for Payouts →
          </Link>
        )}
      </div>

      {/* Hero KPI Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Pending Payout */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/80 via-white to-white border border-indigo-100/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600">Pending Payout</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100/70 text-indigo-700 border border-indigo-200/50">
              Awaiting Transfer
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-indigo-950 mt-3 tracking-tight">
            ₹{Number(data.walletPending || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-500">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 14 14"></polyline>
            </svg>
            Delivered orders awaiting Admin bank transfer.
          </p>
        </div>

        {/* Total Settled / Paid */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-white border border-emerald-100/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600">Total Settled (Paid)</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100/70 text-emerald-700 border border-emerald-200/50">
              Paid Out
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-950 mt-3 tracking-tight">
            ₹{Number(data.walletPaid || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Successfully credited to your bank account.
          </p>
        </div>

        {/* Lifetime Processed */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50/80 via-white to-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600">Lifetime Earnings</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              Delivered Orders
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
            ₹{totalLifetimeEarnings.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Cumulative seller earnings generated to date.
          </p>
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg flex-shrink-0">
            💡
          </div>
          <div>
            <div className="text-sm font-black text-white">How Payouts Work</div>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              When an order is successfully <span className="text-emerald-300 font-semibold">Delivered</span>, your seller price is immediately credited to Pending Balance. Cancelled or returned orders are excluded (₹0 earnings). Admin releases payments directly into your registered Bank/UPI account.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        {/* Table Controls Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-50/40">
          <div>
            <h2 className="text-lg font-black text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredTransactions.length} of {transactions.length} recorded events
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search order #, UTR, note..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'EARNING', label: 'Earnings' },
                { id: 'PAYOUT', label: 'Payouts' },
                { id: 'DEDUCTION', label: 'Deductions' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap ${
                    filter === f.id
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="px-6 py-4">Transaction / Ref</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Details & Notes</th>
                <th className="px-6 py-4 text-right">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(tx => {
                  const isEarning = tx.type === 'EARNING'
                  const isPayout = tx.type === 'PAYOUT'
                  const isCancelled = tx.isCancelled || (tx.order && ['CANCELLED', 'RETURNED'].includes(tx.order.status))
                  const displayAmount = isCancelled && isEarning ? 0 : (tx.amount || 0)

                  return (
                    <tr key={tx._id} className="hover:bg-indigo-50/15 transition-colors">
                      {/* ID / Order Reference */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-slate-800 font-bold">
                          #{tx._id.slice(-8).toUpperCase()}
                        </div>
                        {tx.order && (
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                            <span>Order #{tx.order.orderNumber || tx.order._id?.toString().slice(-6).toUpperCase()}</span>
                            {isCancelled && (
                              <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] font-black">
                                CANCELLED
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isEarning
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : isPayout
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isEarning ? 'bg-emerald-500' : isPayout ? 'bg-indigo-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          {tx.type}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4">
                        {isCancelled && isEarning ? (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-400 text-sm line-through">
                              ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100">
                              ₹0 (Cancelled)
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`font-black text-sm ${
                              isEarning
                                ? 'text-emerald-700'
                                : isPayout
                                ? 'text-indigo-700'
                                : 'text-rose-600'
                            }`}
                          >
                            {isEarning ? '+' : '-'} ₹{Number(displayAmount).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Details / Notes */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 leading-snug">{tx.note || 'Wallet transaction'}</div>
                        {tx.referenceId && (
                          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                            <span className="text-slate-400">UTR / Ref:</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-bold text-slate-700">
                              {tx.referenceId}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Proof Image */}
                      <td className="px-6 py-4 text-right">
                        {tx.proofImage ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProof(tx.proofImage)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            View Proof
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                      📄
                    </div>
                    <div className="font-black text-slate-700 text-sm">No transactions found</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try clearing your search query' : 'Your completed payouts and order credits will appear here.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Preview Modal */}
      {selectedProof && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedProof(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Payment Proof / UTR Slip</h3>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[70vh] flex items-center justify-center">
              <img
                src={selectedProof}
                alt="Payment Proof"
                className="w-full h-auto object-contain max-h-[65vh]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={selectedProof}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Open Full Image ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

