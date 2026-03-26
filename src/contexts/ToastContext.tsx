'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; type: ToastType; duration: number }

const ToastCtx = createContext<{ toast: (msg: string, type?: ToastType) => void }>({ toast: () => {} })

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timerRef.current = setTimeout(onClose, t.duration)
    return () => clearTimeout(timerRef.current)
  }, [onClose, t.duration])

  const styles: Record<ToastType, { wrap: string; text: string; bar: string; btn: string }> = {
    error:   { wrap: 'bg-red-50 border-red-200',    text: 'text-red-800',   bar: 'bg-red-500',   btn: 'text-red-400 hover:text-red-700' },
    success: { wrap: 'bg-green-50 border-green-200', text: 'text-green-800', bar: 'bg-green-500', btn: 'text-green-400 hover:text-green-700' },
    info:    { wrap: 'bg-blue-50 border-blue-200',   text: 'text-blue-800',  bar: 'bg-blue-500',  btn: 'text-blue-400 hover:text-blue-700' },
  }
  const s = styles[t.type]

  return (
    <div className={`${s.wrap} border rounded-lg shadow-md w-80 overflow-hidden`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <p className={`${s.text} text-sm font-medium flex-1 leading-snug`}>{t.message}</p>
        <button
          onClick={onClose}
          className={`${s.btn} text-xl leading-none flex-shrink-0 mt-0.5 transition-colors`}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {/* Progress bar — shrinks from full width to 0 over t.duration ms */}
      <div className="h-1 bg-black/5">
        <div
          className={`${s.bar} h-full`}
          style={{ animation: `toast-progress ${t.duration}ms linear forwards` }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId.current
    const duration = type === 'error' ? 5000 : 3500
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
