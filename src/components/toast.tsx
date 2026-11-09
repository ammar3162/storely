'use client'
import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { storelyTokens } from '@/components/ui/design-tokens'
export type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: number; msg: string; type: ToastType }
let _add: ((msg: string, type: ToastType) => void) | null = null
export function toast(msg: string, type: ToastType = 'success') { _add?.(msg, type) }
const C = {
  success: { border:storelyTokens.color.successBorder, color:storelyTokens.color.success, icon:<CircleCheck size={18}/> },
  error: { border:storelyTokens.color.dangerBorder, color:storelyTokens.color.danger, icon:<CircleAlert size={18}/> },
  warning: { border:storelyTokens.color.warningBorder, color:storelyTokens.color.warning, icon:<TriangleAlert size={18}/> },
  info: { border:storelyTokens.color.infoBorder, color:storelyTokens.color.info, icon:<Info size={18}/> },
}
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])
  useEffect(() => {
    _add = (msg, type) => {
      const id = Date.now()
      setItems(p => [...p, {id, msg, type}])
      setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 3500)
    }
    return () => { _add = null }
  }, [])
  return (
    <div className="storely-toast-stack">
      {items.map(t => {
        const c = C[t.type]
        return (
          <div key={t.id} className="storely-toast" style={{borderColor:c.border,color:c.color}}>
            {c.icon}<span>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
