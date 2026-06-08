'use client'
import { useEffect, useState } from 'react'
export type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: number; msg: string; type: ToastType }
let _add: ((msg: string, type: ToastType) => void) | null = null
export function toast(msg: string, type: ToastType = 'success') { _add?.(msg, type) }
const C = {
  success: { bg:'#f0fdf4', border:'#86efac', color:'#166534', icon:'✅' },
  error:   { bg:'#fef2f2', border:'#fecaca', color:'#991b1b', icon:'❌' },
  warning: { bg:'#fffbeb', border:'#fde68a', color:'#92400e', icon:'⚠️' },
  info:    { bg:'#eff6ff', border:'#bfdbfe', color:'#1d4ed8', icon:'ℹ️' },
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
    <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,display:'flex',flexDirection:'column',gap:8,alignItems:'center',pointerEvents:'none'}}>
      <style>{`@keyframes tin{from{opacity:0;transform:translateY(-10px) scale(.95)}to{opacity:1;transform:none}}.ti{animation:tin .2s ease;pointer-events:all}`}</style>
      {items.map(t => {
        const c = C[t.type]
        return (
          <div key={t.id} className="ti" style={{background:c.bg,border:'1.5px solid '+c.border,color:c.color,padding:'12px 20px',borderRadius:12,fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.12)',whiteSpace:'nowrap',direction:'rtl',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif"}}>
            <span>{c.icon}</span><span>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
