import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function BusinessWallet() {
  const [data, setData] = useState({ walletPending: 0, walletPaid: 0, transactions: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // 'ALL', 'EARNING', 'PAYOUT'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/stores/wallet')
        setData(res.data)
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border rounded-2xl p-5 animate-pulse h-28" />
          <div className="bg-white border rounded-2xl p-5 animate-pulse h-28" />
        </div>
        <div className="bg-white border rounded-2xl p-6 animate-pulse h-80" />
      </div>
    )
  }

  const filteredTransactions = data.transactions.filter(t => {
    if (filter === 'ALL') return true
    return t.type === filter
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Seller Wallet</h2>
        <p className="text-sm text-gray-500">View your pending payouts, received payments, and complete transaction log.</p>
      </div>

      {/* KPI Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border border-blue-100 rounded-3xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-indigo-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Pending Payout Balance</div>
            <div className="text-3xl font-extrabold text-indigo-600 mt-1">₹{data.walletPending?.toLocaleString('en-IN') || 0}</div>
            <div className="text-[10px] text-gray-400 mt-1">Earned from delivered orders, waiting for Admin transfer.</div>
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-3xl p-6 flex items-center gap-5 shadow-sm hover:shadow-md transition-all">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-emerald-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <path d="M12 4v16M2 12h20"></path>
            </svg>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Received (Paid)</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">₹{data.walletPaid?.toLocaleString('en-IN') || 0}</div>
            <div className="text-[10px] text-gray-400 mt-1">Total payouts successfully transferred to your account.</div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50/50 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-bold text-gray-900">Transaction History</h3>

          {/* Filter tabs */}
          <div className="flex gap-2 bg-white/80 p-1.5 rounded-xl border border-blue-100/50">
            {['ALL', 'EARNING', 'PAYOUT', 'DEDUCTION'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-indigo-600'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'EARNING' ? 'Earnings' : f === 'PAYOUT' ? 'Payouts' : 'Deductions'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-blue-100/50 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">#{tx._id.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        tx.type === 'EARNING' 
                          ? 'bg-green-50 text-green-700 border border-green-100' 
                          : tx.type === 'PAYOUT'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-black ${
                      tx.type === 'EARNING' 
                        ? 'text-green-600' 
                        : tx.type === 'PAYOUT'
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}>
                      {tx.type === 'EARNING' ? '+' : '-'} ₹{tx.amount?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div>{tx.note}</div>
                      {tx.referenceId && (
                        <div className="text-[10px] text-gray-400 mt-0.5">UTR / Ref: <span className="font-mono text-gray-500">{tx.referenceId}</span></div>
                      )}
                      {tx.proofImage && (
                        <div className="mt-2">
                          <a href={tx.proofImage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            </svg>
                            View Proof Image
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No transactions found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
