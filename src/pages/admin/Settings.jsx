import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function Settings() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/api/admin/settings')
        setData(data)
      } catch (e) {
        setError('Could not load settings.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Store settings</h1>
        <p className="text-[11px] text-gray-500">
          Key details used on Click2Kart bills and stock alerts.
        </p>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading settings…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Billing profile
            </div>
            <div className="text-sm text-gray-900 font-medium">{data.companyName}</div>
            {data.companyAddress && (
              <div className="text-xs text-gray-600 whitespace-pre-line">
                {data.companyAddress}
              </div>
            )}
            {data.companyGst && (
              <div className="text-xs text-gray-700 mt-1">GSTIN: {data.companyGst}</div>
            )}
            <div className="text-xs text-gray-600 mt-2 space-y-0.5">
              {data.companyPhone && <div>Phone: {data.companyPhone}</div>}
              {data.companyEmail && <div>Email: {data.companyEmail}</div>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Inventory
            </div>
            <div className="text-sm text-gray-900">
              Low stock threshold:{' '}
              <span className="font-semibold">{data.lowStockThreshold}</span>
            </div>
            <div className="text-xs text-gray-600">
              Products with stock at or below this number are treated as low stock for alerts.
            </div>
          </div>
        </div>
      )}

      <div className="text-[11px] text-gray-400">
        To change these values, update the server environment variables (`COMPANY_*` and
        `LOW_STOCK_THRESHOLD`) and redeploy the backend.
      </div>
    </div>
  )
}

