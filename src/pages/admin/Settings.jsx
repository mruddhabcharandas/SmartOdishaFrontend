import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../components/Toast'

export default function Settings() {
  const { notify } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passLoading, setPassLoading] = useState(false)

  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState('')
  const [supportWebhookUrl, setSupportWebhookUrl] = useState('')
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false)
  const [saveWebhookLoading, setSaveWebhookLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/api/admin/settings')
        setData(data)
        setFreeDeliveryAbove(data.freeDeliveryAbove ?? '')
        setSupportWebhookUrl(data.supportWebhookUrl ?? '')
      } catch (e) {
        setError('Could not load settings.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveDeliverySettings = async () => {
    if (freeDeliveryAbove === '' || isNaN(Number(freeDeliveryAbove))) {
      notify('Please enter a valid free delivery threshold', 'error')
      return
    }
    setSaveSettingsLoading(true)
    try {
      await api.put('/api/admin/settings', {
        freeDeliveryAbove: Number(freeDeliveryAbove)
      })
      notify('Delivery settings updated successfully', 'success')
      setData(prev => prev ? { ...prev, freeDeliveryAbove: Number(freeDeliveryAbove) } : null)
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update delivery settings', 'error')
    } finally {
      setSaveSettingsLoading(false)
    }
  }

  const handleSaveWebhookSettings = async () => {
    setSaveWebhookLoading(true)
    try {
      await api.put('/api/admin/settings', {
        supportWebhookUrl
      })
      notify('Support Webhook URL saved successfully', 'success')
      setData(prev => prev ? { ...prev, supportWebhookUrl } : null)
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update support webhook', 'error')
    } finally {
      setSaveWebhookLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!passData.currentPassword || !passData.newPassword) {
      notify('All password fields are required', 'error')
      return
    }
    if (passData.newPassword.length < 6) {
      notify('New password must be at least 6 characters long', 'error')
      return
    }
    if (passData.newPassword !== passData.confirmPassword) {
      notify('Passwords do not match', 'error')
      return
    }

    try {
      setPassLoading(true)
      await api.put('/api/admin/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      })
      notify('Password updated successfully', 'success')
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update password', 'error')
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">System settings</h1>
        <p className="text-xs text-gray-500 mt-1">
          Key details used on SmartOdisha bills, stock alerts, and profile security.
        </p>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading settings…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Billing profile
            </div>
            <div className="text-sm text-gray-900 font-bold">{data.companyName}</div>
            {data.companyAddress && (
              <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                {data.companyAddress}
              </div>
            )}
            {data.companyGst && (
              <div className="text-xs text-gray-700 font-medium">GSTIN: {data.companyGst}</div>
            )}
            <div className="text-xs text-gray-500 pt-2 space-y-1 border-t border-gray-50">
              {data.companyPhone && <div><strong>Phone:</strong> {data.companyPhone}</div>}
              {data.companyEmail && <div><strong>Email:</strong> {data.companyEmail}</div>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Inventory
            </div>
            <div className="text-sm text-gray-900 font-medium">
              Low stock threshold:{' '}
              <span className="font-bold text-indigo-600">{data.lowStockThreshold}</span>
            </div>
            <div className="text-xs text-gray-500 leading-relaxed">
              Products with stock levels at or below this limit are marked as low stock for alerts.
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Delivery Settings
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  value={freeDeliveryAbove}
                  onChange={(e) => setFreeDeliveryAbove(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 999"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveDeliverySettings}
                disabled={saveSettingsLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
              >
                {saveSettingsLoading ? 'Saving...' : 'Save Delivery Settings'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Customer Support Webhook
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Dispatch
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Webhook URL (HTTP POST)
                </label>
                <input
                  type="url"
                  value={supportWebhookUrl}
                  onChange={(e) => setSupportWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://your-crm.com/api/webhooks/support"
                />
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Sends instant POST payloads for ticket creation, WhatsApp-style customer messages, agent replies, media requests, and customer verification uploads.
              </p>
              <button
                type="button"
                onClick={handleSaveWebhookSettings}
                disabled={saveWebhookLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
              >
                {saveWebhookLoading ? 'Saving...' : 'Save Webhook URL'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 md:col-span-2">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Security - Change Password
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 block">Current Password</label>
                <input
                  type="password"
                  value={passData.currentPassword}
                  onChange={(e) => setPassData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 block">New Password</label>
                  <input
                    type="password"
                    value={passData.newPassword}
                    onChange={(e) => setPassData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={passData.confirmPassword}
                    onChange={(e) => setPassData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={passLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
              >
                {passLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="text-[10px] text-gray-400 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
        To modify the billing or inventory values, update the backend environment variables 
        (`COMPANY_*` and `LOW_STOCK_THRESHOLD`) and restart the service.
      </div>
    </div>
  )
}
