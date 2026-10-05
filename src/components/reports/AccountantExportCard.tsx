'use client'
import { useEffect, useState } from 'react'
import { FileSpreadsheet, Download, Loader2 } from 'lucide-react'
import { colors, radius, font, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { getMe } from '@/lib/session'

// ملف المحاسب الشهري — إكسل فيه المشتريات والمبيعات والمصروفات والرواتب والمخزون (للمالك بس)
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function lastMonths(n: number) {
  const now = new Date(Date.now() + 3 * 3600e3)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const value = d.toISOString().slice(0, 7)
    return { value, label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}${i === 0 ? ' (الحالي)' : ''}` }
  })
}

export default function AccountantExportCard() {
  const months = lastMonths(12)
  const [isOwner, setIsOwner] = useState(false)
  const [month, setMonth] = useState(months[1].value)   // الشهر اللي فات — اللي يحتاجه المحاسب غالباً
  const [busy, setBusy] = useState(false)

  useEffect(() => { getMe().then(m => setIsOwner(m?.role === 'owner')).catch(() => {}) }, [])
  if (!isOwner) return null

  async function download() {
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) return
    setBusy(true)
    try {
      const qs = new URLSearchParams({ org_id: orgId, month })
      const bid = sessionStorage.getItem('s_branch_id')
      if (bid) qs.set('branch_id', bid)
      const res = await fetch(`/api/accountant-export?${qs}`, { credentials: 'same-origin' })
      if (!res.ok || !(res.headers.get('content-type') || '').includes('spreadsheet')) {
        const j = await res.json().catch(() => null)
        toast(j?.error || 'تعذر تجهيز الملف، حاول مرة ثانية', 'error')
        return
      }
      const blob = await res.blob()
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ملف المحاسب - ${months.find(m => m.value === month)?.label.replace(' (الحالي)', '')}.xlsx` })
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      toast('✅ تم تحميل ملف المحاسب')
    } catch {
      toast('تعذر تحميل الملف — تأكد من الإنترنت', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: colors.surface, border: `1.5px solid ${colors.primaryBorder}`, borderRadius: radius.xl, padding: 18, marginBottom: 14, fontFamily: font.family }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: colors.primaryLight, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileSpreadsheet size={21} strokeWidth={1.75} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>ملف المحاسب الشهري</div>
          <div style={{ fontSize: 12, color: colors.text3, marginTop: 2, lineHeight: 1.5 }}>ملف إكسل فيه المشتريات والمبيعات والمصروفات والرواتب والمخزون — جاهز ترسله لمحاسبك</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        <select value={month} onChange={e => setMonth(e.target.value)} disabled={busy} style={{ ...inp(), flex: 1, minWidth: 150 }}>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={download} disabled={busy}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 18px', borderRadius: radius.md, border: 'none', background: colors.primary, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: font.family, opacity: busy ? 0.7 : 1, flex: '0 0 auto' }}>
          {busy ? <Loader2 size={16} className="spin" style={{ animation: 'spin .7s linear infinite' }} /> : <Download size={16} strokeWidth={2.25} />}
          {busy ? 'جاري التجهيز...' : 'تحميل الملف'}
        </button>
      </div>
    </div>
  )
}
