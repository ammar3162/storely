'use client'
import { useState, useEffect } from 'react'

interface Props {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'success'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmText='تأكيد', cancelText='إلغاء', type='danger', onConfirm, onCancel }: Props) {
  const colors = {
    danger:  { bg:'#fef2f2', border:'#fecaca', icon:'🗑️', btn:'#ef4444', btnHover:'#dc2626' },
    warning: { bg:'#fffbeb', border:'#fcd34d', icon:'⚠️', btn:'#f59e0b', btnHover:'#d97706' },
    success: { bg:'#f0fdf4', border:'#86efac', icon:'✅', btn:'#10b981', btnHover:'#059669' },
  }
  const c = colors[type]

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:380,boxShadow:'0 25px 60px rgba(0,0,0,0.2)'}}>
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{width:56,height:56,background:c.bg,border:'1.5px solid '+c.border,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 14px'}}>
            {c.icon}
          </div>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:6}}>{title}</div>
          <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>{message}</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onCancel}
            style={{flex:1,padding:'11px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            {cancelText}
          </button>
          <button onClick={onConfirm}
            style={{flex:1,padding:'11px',background:c.btn,color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════
// نسخة قابلة للنداء المباشر (نفس فلسفة toast()) — تحل محل confirm() الأصلي بالمتصفح
// الاستخدام: if (!(await confirmDialog({ title, message }))) return
// ═══════════════════════════════════════

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'success'
}

let _openConfirm: ((opts: ConfirmOptions & { resolve: (v: boolean) => void }) => void) | null = null

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    _openConfirm?.({ ...opts, resolve })
  })
}

export function ConfirmDialogContainer() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  useEffect(() => {
    _openConfirm = (opts: any) => setState(opts)
    return () => { _openConfirm = null }
  }, [])

  if (!state) return null
  const { resolve, ...dialogProps } = state

  return (
    <ConfirmDialog
      title={dialogProps.title}
      message={dialogProps.message || ''}
      confirmText={dialogProps.confirmText}
      cancelText={dialogProps.cancelText}
      type={dialogProps.type}
      onConfirm={() => { resolve(true); setState(null) }}
      onCancel={() => { resolve(false); setState(null) }}
    />
  )
}
