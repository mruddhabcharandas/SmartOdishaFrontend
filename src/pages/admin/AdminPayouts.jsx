import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function AdminPayouts() {
  const { notify } = useToast()
  const [stores, setStores] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sellers') // 'sellers', 'transactions'
  
  // Modal state
  const [payoutModal, setPayoutModal] = useState(null) // holds selected store details
  const [amount, setAmount] = useState('')
  const [referenceId, setReferenceId] = useState('')
  const [note, setNote] = useState('')
  const [paying, setPaying] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [storesRes, txsRes] = await Promise.all([
        api.get('/api/admin/payouts'),
        api.get('/api/admin/payouts/transactions')
      ])
      setStores(storesRes.data)
      setTransactions(txsRes.data)
    } catch (err) {
      console.error("Failed to fetch payout data:", err)
      notify('Failed to load payout data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePayClick = (store) => {
    setPayoutModal(store)
    setAmount(store.walletPending || '')
    setReferenceId('')
    setNote('')
  }

  const handleProcessPayout = async (e) => {
    e.preventDefault()
    if (!payoutModal) return

    const payoutVal = Number(amount)
    if (isNaN(payoutVal) || payoutVal <= 0) {
      notify('Please enter a valid amount greater than 0', 'error')
      return
    }

    setPaying(true)
    try {
      await api.post('/api/admin/payouts/pay', {
        storeId: payoutModal._id,
        amount: payoutVal,
        referenceId,
        note: note || `Payout transfer`
      })
      notify('Payout processed successfully', 'success')
      setPayoutModal(null)
      loadData()
    } catch (err) {
      console.error(err)
      notify(err.response?.data?.message || 'Failed to process payout', 'error')
    } finally {
      setPaying(false)
    }
  }

  // Calculate totals
  const totalPending = stores.reduce((sum, s) => sum + (s.walletPending || 0), 0)
  const totalPaid = stores.reduce((sum, s) => sum + (s.walletPaid || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border rounded-3xl p-6 h-28 animate-pulse" />
          <div className="bg-white border rounded-3xl p-6 h-28 animate-pulse" />
        </div>
        <div className="bg-white border rounded-3xl p-6 h-96 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Seller Payouts</h2>
          <p className="text-sm text-gray-500">Manage seller wallet balances, process payouts, and audit transaction logs.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border border-blue-100 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-indigo-50">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Pending Payouts</div>
            <div className="text-3xl font-extrabold text-indigo-600 mt-1">₹{totalPending.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-emerald-50">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <path d="M12 4v16M2 12h20"></path>
            </svg>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Settled (Paid)</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">₹{totalPaid.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Tables & Tabs */}
      <div className="bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50/50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('sellers')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'sellers'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Sellers Balances
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'transactions'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Transaction Logs
            </button>
          </div>
        </div>

        {activeTab === 'sellers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-blue-100/50 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  <th className="px-6 py-4">Seller/Store</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4 text-right">Pending Balance</th>
                  <th className="px-6 py-4 text-right">Settled Amount</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {stores.length > 0 ? (
                  stores.map((store) => (
                    <tr key={store._id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {store.image && (
                            <img src={store.image} alt={store.name} className="h-10 w-10 rounded-xl object-cover border border-blue-50" />
                          )}
                          <div>
                            <div className="font-extrabold text-gray-900">{store.name}</div>
                            <div className="text-[10px] text-gray-400">Created: {new Date(store.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>{store.email}</div>
                        <div className="text-xs text-gray-400">{store.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600">
                        ₹{store.walletPending?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        ₹{store.walletPaid?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handlePayClick(store)}
                          disabled={!store.walletPending || store.walletPending <= 0}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:shadow-none"
                        >
                          Pay Seller
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No sellers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-blue-100/50 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Seller</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">#{tx._id.slice(-8).toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{tx.store?.name}</div>
                        <div className="text-[10px] text-gray-400">{tx.store?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          tx.type === 'EARNING' 
                            ? 'bg-green-50 text-green-700 border border-green-100' 
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-black ${tx.type === 'EARNING' ? 'text-green-600' : 'text-blue-600'}`}>
                        {tx.type === 'EARNING' ? '+' : '-'} ₹{tx.amount?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <div>{tx.note}</div>
                        {tx.referenceId && (
                          <div className="text-[10px] text-gray-400 mt-0.5">UTR / Ref: <span className="font-mono text-gray-500">{tx.referenceId}</span></div>
                        )}
                        {tx.order && (
                          <div className="text-[10px] text-gray-400 mt-0.5">Order Total: ₹{tx.order.totalEstimate} (Customer: {tx.order.customer?.name})</div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No transaction logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Seller Modal */}
      {payoutModal && (
        <div className="panel-modal-overlay">
          <div className="panel-modal max-w-md">
            <div className="panel-modal-header bg-gradient-to-r from-blue-50 to-indigo-50/50">
              <h3 className="text-base font-bold text-gray-900">Transfer Payout to {payoutModal.name}</h3>
              <button 
                onClick={() => setPayoutModal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >&times;</button>
            </div>
            <form onSubmit={handleProcessPayout}>
              <div className="panel-modal-body space-y-4">
                <div>
                  <label className="panel-label">Store Pending balance</label>
                  <div className="text-xl font-bold text-indigo-600">₹{payoutModal.walletPending?.toLocaleString('en-IN') || 0}</div>
                </div>

                <div>
                  <label className="panel-label">Transfer Payout Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={payoutModal.walletPending}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="panel-input"
                    placeholder="Enter amount to pay"
                  />
                </div>

                <div>
                  <label className="panel-label">UTR / Reference Transaction ID</label>
                  <input
                    type="text"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    className="panel-input"
                    placeholder="UTR-1234567890 (optional)"
                  />
                </div>

                <div>
                  <label className="panel-label">Internal Audit Note</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="panel-input"
                    placeholder="E.g. Bank transfer, IMPS (optional)"
                  />
                </div>
              </div>
              <div className="panel-modal-footer bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setPayoutModal(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl shadow-md hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                >
                  {paying ? 'Processing...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
