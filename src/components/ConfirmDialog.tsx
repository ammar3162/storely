'use client'
import { useState, useEffect } from 'react'
import { ArrowLeftRight, CircleAlert, CircleCheck, Trash2 } from 'lucide-react'
import { StorelyButton } from '@/components/ui/button'
import { storelyTokens } from '@/components/ui/design-tokens'

interface Props {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'success' | 'transfer'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmText='تأكيد', cancelText='إلغاء', type='danger', onConfirm, onCancel }: Props) {
  const colors = {
    danger: { icon: <Trash2 size={24}/>, color: storelyTokens.color.danger },
    warning: { icon: <CircleAlert size={24}/>, color: storelyTokens.color.warning },
    success: { icon: <CircleCheck size={24}/>, color: storelyTokens.color.success },
    transfer: { icon: <ArrowLeftRight size={24}/>, color: storelyTokens.color.navy },
  }
  const c = colors[type]

  return (
    <div className="storely-overlay">
      <div className="storely-dialog">
        <div style={{color:c.color,marginBottom:storelyTokens.spacing[4]}}>{c.icon}</div>
        <div className="storely-dialog-title">{title}</div>
        <div className="storely-dialog-message">{message}</div>
        <div className="storely-dialog-actions">
          <StorelyButton onClick={onCancel}>{cancelText}</StorelyButton>
          <StorelyButton onClick={onConfirm} variant={type==='danger'?'danger':'primary'}>{confirmText}</StorelyButton>
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
  type?: 'danger' | 'warning' | 'success' | 'transfer'
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
