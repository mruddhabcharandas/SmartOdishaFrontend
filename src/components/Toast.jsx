import { createContext, useContext, useState } from 'react'

const ToastCtx = createContext({ notify: () => {} })
export const useToast = () => useContext(ToastCtx)

export default function ToastProvider({ children }) {
  const [messages, setMessages] = useState([])
  const notify = (text, kind='info') => {
    const id = Math.random().toString(36).slice(2)
    setMessages((m)=>{
      const last = m[m.length - 1]
      if (last && last.text === text && last.kind === kind) return m
      return [...m, { id, text, kind }]
    })
    setTimeout(()=> setMessages((m)=> m.filter(x=>x.id!==id)), 3500)
  }
  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none">
        <div className="mx-auto max-w-md space-y-2 flex flex-col items-stretch px-4">
          {messages.slice(-3).map(m => (
            <div
              key={m.id}
              className={`pointer-events-auto overflow-hidden rounded-2xl shadow-2xl border backdrop-blur bg-white/80 text-gray-900 animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                m.kind==='error'
                  ? 'border-red-200'
                  : m.kind==='success'
                  ? 'border-emerald-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="px-4 py-3 flex items-start gap-3">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${
                  m.kind==='error'
                    ? 'bg-red-50 text-red-600 ring-red-100'
                    : m.kind==='success'
                    ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                    : 'bg-blue-50 text-blue-600 ring-blue-100'
                }`}>
                  {m.kind==='error' ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2Zm0 12.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm0-8a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z"/></svg>
                  ) : m.kind==='success' ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2Zm4.3 7.3a1 1 0 0 0-1.6-1.2l-4.2 5-1.4-1.4a1 1 0 1 0-1.4 1.4l2.2 2.2a1 1 0 0 0 1.5-.1l5.9-6.9Z"/></svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2Zm0 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-1-9h2v7h-2V8Z"/></svg>
                  )}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-black leading-tight">
                    {m.kind==='error' ? 'Action Required' : m.kind==='success' ? 'Success' : 'Notice'}
                  </div>
                  <div className="text-[13px] font-medium text-gray-700 mt-0.5">{m.text}</div>
                </div>
                <button
                  onClick={() => setMessages((list)=> list.filter(x=>x.id!==m.id))}
                  className="ml-2 h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                  title="Dismiss"
                >
                  <svg className="w-4 h-4 m-auto" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className={`h-1 ${
                m.kind==='error' ? 'bg-gradient-to-r from-red-400 to-red-300'
                : m.kind==='success' ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                : 'bg-gradient-to-r from-blue-400 to-blue-300'
              }`} />
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  )
}
