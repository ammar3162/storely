'use client'
import { useState } from 'react'
import NumberInput from '@/components/NumberInput'
import { api } from '@/lib/api-client'
import { colors, font, inp } from '@/lib/ds'
import { toast } from '@/components/toast'

export type ExtraDay = {
  id: string; name?: string; work_date: string; suggested_amount?: number
  status: 'pending' | 'paid' | 'comp' | 'rejected'; amount?: number | null; comp_date?: string | null
}

const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', calendar: 'gregory', numberingSystem: 'latn', timeZone: 'UTC' })
const plusDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)

// قرار المالك على يوم إضافي: تعويض مالي (مبلغ يحدده) أو يوم إجازة بديل أو رفض
export default function ExtraDayDecision({ item, orgId, canDecide = true, onDone }: { item: ExtraDay; orgId: string; canDecide?: boolean; onDone?: (status: ExtraDay['status']) => void }) {
  const [mode, setMode] = useState<'paid' | 'comp' | null>(null)
  const [amount, setAmount] = useState(String(item.suggested_amount || ''))
  const [compDate, setCompDate] = useState(plusDays(item.work_date, 7))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(item.status)

  async function decide(decision: 'paid' | 'comp' | 'rejected') {
    if (busy) return
    setBusy(true)
    const r = await api.post('/api/extra-days', { org_id: orgId, id: item.id, decision, amount: Number(amount), comp_date: compDate })
    setBusy(false)
    if (!r.success) { toast(r.error || 'تعذر حفظ القرار', 'error'); return }
    setStatus(decision)
    toast(decision === 'paid' ? `تم — ينضاف ${amount} ر.س لراتب الموظف` : decision === 'comp' ? `تم — إجازته البديلة ${dayLabel(compDate)}` : 'تم رفض التعويض')
    onDone?.(decision)
  }

  if (status !== 'pending') {
    const txt = status === 'paid' ? `✓ تعويض مالي${item.amount ? ` ${item.amount} ر.س` : ''}` : status === 'comp' ? `✓ يوم بديل${item.comp_date ? `: ${dayLabel(item.comp_date)}` : ''}` : 'تم رفض التعويض'
    return <div style={{ fontSize: 12, fontWeight: 700, color: status === 'rejected' ? colors.text3 : colors.primary, margin: '4px 0' }}>{txt}</div>
  }
  if (!canDecide) return <div style={{ fontSize: 11.5, color: colors.text4, margin: '4px 0' }}>بانتظار قرار المالك</div>

  const btn = (on: boolean): React.CSSProperties => ({ padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, border: `1.5px solid ${on ? colors.primary : colors.border2}`, background: on ? colors.primaryLight : colors.surface, color: on ? colors.primary : colors.text2 })
  return (
    <div onClick={e => e.stopPropagation()} style={{ margin: '6px 0 8px' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        <button onClick={() => setMode('paid')} style={btn(mode === 'paid')}>تعويض مالي</button>
        <button onClick={() => setMode('comp')} style={btn(mode === 'comp')}>يوم بديل</button>
        <button onClick={() => decide('rejected')} disabled={busy} style={{ ...btn(false), color: colors.text3 }}>رفض</button>
      </div>
      {mode === 'paid' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' as const }}>
          <div style={{ position: 'relative' as const }}>
            <NumberInput min="1" step="0.5" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inp(), width: 150, paddingInlineEnd: 44 }} />
            <span style={{ position: 'absolute' as const, insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: colors.text4 }}>ر.س</span>
          </div>
          <button onClick={() => decide('paid')} disabled={busy || !(Number(amount) > 0)} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: colors.primary, color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, opacity: busy || !(Number(amount) > 0) ? .6 : 1 }}>اعتماد المبلغ</button>
          {item.suggested_amount ? <span style={{ fontSize: 11, color: colors.text4 }}>المقترح: أجر يوم ({item.suggested_amount} ر.س = الراتب ÷ 30)</span> : null}
        </div>
      )}
      {mode === 'comp' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' as const }}>
          <input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} style={{ ...inp(), width: 170 }} />
          <button onClick={() => decide('comp')} disabled={busy || !compDate} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', background: colors.primary, color: 'white', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, opacity: busy ? .6 : 1 }}>اعتماد اليوم البديل</button>
          <span style={{ fontSize: 11, color: colors.text4 }}>بذاك اليوم ما ينحسب عليه غياب</span>
        </div>
      )}
    </div>
  )
}
