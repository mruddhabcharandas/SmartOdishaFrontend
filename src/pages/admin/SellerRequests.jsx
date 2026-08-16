import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function SellerRequests() {
  const { notify } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadRequests = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/admin/store-requests')
      setRequests(data || [])
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to load seller requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this request? This will automatically create the seller account and send them their login credentials via email.')) {
      return
    }
    try {
      setActionLoading(true)
      const { data } = await api.post(`/api/admin/store-requests/${id}/approve`)
      notify(data.message || 'Request approved successfully and welcome email sent!', 'success')
      setSelectedRequest(null)
      loadRequests()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to approve request', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this request?')) {
      return
    }
    try {
      setActionLoading(true)
      const { data } = await api.post(`/api/admin/store-requests/${id}/reject`)
      notify(data.message || 'Request rejected', 'success')
      setSelectedRequest(null)
      loadRequests()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to reject request', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request record?')) {
      return
    }
    try {
      setActionLoading(true)
      const { data } = await api.delete(`/api/admin/store-requests/${id}`)
      notify(data.message || 'Request record deleted successfully', 'success')
      setSelectedRequest(null)
      loadRequests()
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to delete request', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Become a Seller Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage registration requests submitted by prospective sellers.</p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          Loading seller requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center text-gray-500 shadow-sm">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-bold text-gray-900 text-lg">No requests found</h3>
          <p className="text-sm text-gray-500 mt-1">When users submit a "Become a Seller" form, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">Date</th>
                  <th className="px-6 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">Business Name</th>
                  <th className="px-6 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">Owner</th>
                  <th className="px-6 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">Contact</th>
                  <th className="px-6 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-6 py-4 font-bold text-gray-700 uppercase tracking-wider text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                      {req.businessName}
                    </td>
                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap font-medium">
                      {req.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      <div>{req.phone}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{req.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                        req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                        req.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-100'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition"
                      >
                        View
                      </button>
                      {req.status === 'pending' && (
                        <>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(req._id)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleReject(req._id)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        disabled={actionLoading}
                        onClick={() => handleDelete(req._id)}
                        className="px-3 py-1.5 text-gray-400 hover:text-red-500 rounded-lg text-xs font-bold transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-extrabold text-gray-900 text-lg">Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Name</span>
                  <div className="font-bold text-gray-900 mt-1">{selectedRequest.businessName}</div>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Owner Name</span>
                  <div className="font-bold text-gray-900 mt-1">{selectedRequest.name}</div>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</span>
                  <div className="font-medium text-gray-900 mt-1">{selectedRequest.phone}</div>
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</span>
                  <div className="font-medium text-gray-900 mt-1">{selectedRequest.email}</div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</span>
                <div className="font-medium text-gray-900 mt-1 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {selectedRequest.address?.line1 && <div>{selectedRequest.address.line1}</div>}
                  {selectedRequest.address?.line2 && <div>{selectedRequest.address.line2}</div>}
                  <div>
                    {selectedRequest.address?.city}, {selectedRequest.address?.state} - {selectedRequest.address?.pincode}
                  </div>
                </div>
              </div>

              {selectedRequest.message && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message</span>
                  <div className="font-medium text-gray-700 mt-1 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                    {selectedRequest.message}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Status</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                    selectedRequest.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                    selectedRequest.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                    'bg-yellow-50 text-yellow-700 border border-yellow-100'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div className="space-x-2">
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleApprove(selectedRequest._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleReject(selectedRequest._id)}
                        className="px-4 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
