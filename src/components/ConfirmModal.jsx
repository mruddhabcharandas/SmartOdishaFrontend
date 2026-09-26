import React, { useState, useEffect } from 'react'

export default function ConfirmModal({
  open,
  title = 'Confirm Action',
  message = 'Are you sure? This action cannot be undone.',
  requirePassword = true,
  passwordPlaceholder = 'Enter your password to confirm...',
  confirmText = 'Confirm Delete',
  cancelText = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
  loading = false
}) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword('')
      setShowPassword(false)
      setError('')
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  const handleConfirm = async (e) => {
    e?.preventDefault?.()
    if (requirePassword && !password.trim()) {
      setError('Password is required to confirm this action')
      return
    }
    setError('')
    try {
      setSubmitting(true)
      await onConfirm?.(password.trim())
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setPassword('')
    setError('')
    onCancel?.()
  }

  const isBusy = loading || submitting

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Icon Badge */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-sm shadow-rose-100/50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">{title}</h3>
            <p className="text-[11px] font-black uppercase tracking-wider text-rose-600">Security Authorization Required</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-xs text-gray-600 leading-relaxed mb-5">
          {message}
        </p>

        {/* Password input form */}
        <form onSubmit={handleConfirm} className="space-y-4">
          {requirePassword && (
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Account Password
                </label>
                <span className="text-[10px] font-bold text-rose-500">Required</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  disabled={isBusy}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all pr-10"
                  placeholder={passwordPlaceholder}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleCancel}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={isBusy || (requirePassword && !password.trim())}
              className={`flex-1 py-3 px-4 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                isBusy || (requirePassword && !password.trim())
                  ? 'bg-rose-300 cursor-not-allowed shadow-none'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 active:scale-95'
              }`}
            >
              {isBusy ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

