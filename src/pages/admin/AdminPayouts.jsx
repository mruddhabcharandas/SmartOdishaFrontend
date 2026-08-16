import React, { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'
import ImageUpload from '../../components/ImageUpload'

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

  // Deduction Modal State
  const [deductModal, setDeductModal] = useState(null) // holds selected store details
  const [deductAmount, setDeductAmount] = useState('')
  const [deductNote, setDeductNote] = useState('')
  const [proofImage, setProofImage] = useState('')
  const [deducting, setDeducting] = useState(false)

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

  const handleDeductClick = (store) => {
    setDeductModal(store)
    setDeductAmount('')
    setDeductNote('')
    setProofImage('')
  }

  const handleProcessDeduction = async (e) => {
    e.preventDefault()
    if (!deductModal) return

    const deductVal = Number(deductAmount)
    if (isNaN(deductVal) || deductVal <= 0) {
      notify('Please enter a valid amount greater than 0', 'error')
      return
    }

    setDeducting(true)
    try {
      await api.post('/api/admin/payouts/deduct', {
        storeId: deductModal._id,
        amount: deductVal,
        note: deductNote || `Wallet deduction`,
        proofImage
      })
      notify('Deduction processed successfully', 'success')
      setDeductModal(null)
      loadData()
    } catch (err) {
      console.error(err)
      notify(err.response?.data?.message || 'Failed to process deduction', 'error')
    } finally {
      setDeducting(false)
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
                          {store.image?.url || store.image ? (
                            <img src={store.image?.url || store.image} alt={store.name} className="h-10 w-10 rounded-xl object-cover border border-blue-50" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-gray-100 border border-blue-50 flex items-center justify-center font-bold text-gray-400">
                              {store.name?.charAt(0).toUpperCase()}
                            </div>
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
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handlePayClick(store)}
                            disabled={!store.walletPending || store.walletPending <= 0}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:shadow-none"
                          >
                            Pay Seller
                          </button>
                          <button
                            onClick={() => handleDeductClick(store)}
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-100 hover:from-rose-500 hover:to-red-500 transition-all"
                          >
                            Deduct
                          </button>
                        </div>
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
                        {tx.order && (
                          <div className="text-[10px] text-gray-400 mt-0.5">Order Total: ₹{tx.order.totalEstimate} (Customer: {tx.order.customer?.name})</div>
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

                {/* Seller Payment Details */}
                <div style={{
                  padding: '14px',
                  backgroundColor: 'rgba(79,70,229,0.04)',
                  border: '1px dashed rgba(79,70,229,0.2)',
                  borderRadius: '16px',
                  fontSize: '12.5px',
                  color: '#475569',
                  lineHeight: '1.6'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px', fontSize: '13px' }}>Seller Settlement details:</div>
                  {payoutModal.bankDetails && payoutModal.bankDetails.accountNumber ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px' }}>
                      <span className="font-semibold text-gray-500">Account Name:</span>
                      <span className="font-bold text-gray-800">{payoutModal.bankDetails.accountName || 'N/A'}</span>
                      
                      <span className="font-semibold text-gray-500">Account Number:</span>
                      <span className="font-bold text-gray-800">{payoutModal.bankDetails.accountNumber}</span>
                      
                      <span className="font-semibold text-gray-500">IFSC Code:</span>
                      <span className="font-bold text-gray-800">{payoutModal.bankDetails.ifscCode || 'N/A'}</span>
                      
                      <span className="font-semibold text-gray-500">Bank Name:</span>
                      <span className="font-bold text-gray-800">{payoutModal.bankDetails.bankName || 'N/A'}</span>
                    </div>
                  ) : (
                    <div style={{ color: '#ef4444', fontStyle: 'italic', marginBottom: '4px' }}>No Bank Details configured by seller.</div>
                  )}
                  {payoutModal.upiId ? (
                    <div style={{ marginTop: '8px', borderTop: '1px solid rgba(79,70,229,0.1)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-semibold text-gray-500">UPI ID:</span>
                      <span className="font-bold text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100">{payoutModal.upiId}</span>
                    </div>
                  ) : (
                    <div style={{ color: '#ef4444', fontStyle: 'italic', marginTop: '8px', borderTop: '1px solid rgba(79,70,229,0.1)', paddingTop: '8px' }}>No UPI ID configured by seller.</div>
                  )}
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

      {/* Deduct Wallet Modal */}
      {deductModal && (
        <div className="panel-modal-overlay">
          <div className="panel-modal max-w-md">
            <div className="panel-modal-header bg-gradient-to-r from-red-50 to-rose-50/50">
              <h3 className="text-base font-bold text-gray-900">Process Wallet Deduction for {deductModal.name}</h3>
              <button 
                onClick={() => setDeductModal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >&times;</button>
            </div>
            <form onSubmit={handleProcessDeduction}>
              <div className="panel-modal-body space-y-4">
                <div>
                  <label className="panel-label">Store Pending balance</label>
                  <div className="text-xl font-bold text-indigo-600">₹{deductModal.walletPending?.toLocaleString('en-IN') || 0}</div>
                </div>

                <div>
                  <label className="panel-label">Deduction Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    className="panel-input"
                    placeholder="Enter amount to deduct"
                  />
                </div>

                <div>
                  <label className="panel-label">Reason / Notes for Deduction</label>
                  <input
                    type="text"
                    required
                    value={deductNote}
                    onChange={(e) => setDeductNote(e.target.value)}
                    className="panel-input"
                    placeholder="E.g. Sent wrong item weight (10kg instead of 5kg)"
                  />
                </div>

                <div>
                  <label className="panel-label">Upload Proof Image (e.g. shipping weight proof)</label>
                  <div className="mt-1 flex flex-col gap-2">
                    {proofImage ? (
                      <div className="relative inline-block">
                        <img src={proofImage} alt="Deduction Proof" className="h-32 w-full object-cover rounded-xl border border-gray-200" />
                        <button 
                          type="button" 
                          onClick={() => setProofImage('')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600"
                        >✕</button>
                      </div>
                    ) : (
                      <ImageUpload onUploaded={(url) => setProofImage(url)} />
                    )}
                  </div>
                </div>
              </div>
              <div className="panel-modal-footer bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setDeductModal(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deducting}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-bold rounded-xl shadow-md hover:from-rose-500 hover:to-red-500 disabled:opacity-50"
                >
                  {deducting ? 'Processing...' : 'Confirm Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
