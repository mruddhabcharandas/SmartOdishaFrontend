import { createContext, useContext, useState } from 'react'

const ToastCtx = createContext({ notify: () => {} })
export const useToast = () => useContext(ToastCtx)

export default function ToastProvider({ children }) {
  const [messages, setMessages] = useState([])
  const notify = (text, kind = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setMessages((m) => [...m, { id, text, kind }])
    setTimeout(() => setMessages((m) => m.filter((x) => x.id !== id)), 3000)
  }
  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {messages.map((m) => (
          <div key={m.id} className={`px-4 py-2 rounded shadow text-white ${m.kind === 'error' ? 'bg-red-600' : m.kind === 'success' ? 'bg-green-600' : 'bg-gray-800'}`}>{m.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
