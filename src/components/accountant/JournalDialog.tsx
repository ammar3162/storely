'use client'
// تصدير القيود اليومية: المحاسب يربط بنود ستورلي بأرقام حساباته مرة وحدة، وبعدها ينزّل ملف القيود لأي فترة
import { useEffect, useState } from 'react'
import { X, BookOpen, Download, Loader2 } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { ACCOUNT_KEYS, ACCOUNT_LABELS, DEFAULT_ACCOUNTS, type AccountMap } from '@/lib/journalExport'

export default function JournalDialog({ orgId, range, periodLabel, onClose }: { orgId: string; range: { from: string; to: string }; periodLabel: string; onClose: () => void }) {
  const [map, setMap] = useState<AccountMap | null>(null)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(''), [err, setErr] = useState('')
  useEffect(() => {
    fetch(`/api/accountant-portal/journal?org_id=${orgId}`).then(r => r.json()).then(j => { if (j.success) { setMap(j.map); setSaved(j.saved) } else setErr(j.error || 'تعذر التحميل') }).catch(() => setErr('تأكد من الإنترنت'))
  }, [orgId])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [busy, onClose])

  const set = (k: keyof AccountMap, f: 'code' | 'name', v: string) => { setMap(m => m && { ...m, [k]: { ...m[k], [f]: v } }); setDirty(true) }
  async function save() {
    if (!map) return false
    if (ACCOUNT_KEYS.some(k => !map[k].code.trim() || !map[k].name.trim())) { setErr('اكتب رقم واسم كل حساب'); return false }
    setErr('')
    const j = await fetch('/api/accountant-portal/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, map }) }).then(r => r.json()).catch(() => ({ error: 'تأكد من الإنترنت' }))
    if (!j.success) { setErr(j.error || 'تعذر الحفظ'); return false }
    setMap(j.map); setSaved(true); setDirty(false); return true
  }
  async function download(format: 'xlsx' | 'csv') {
    setBusy(format)
    if ((dirty || !saved) && !(await save())) { setBusy(''); return }
    window.location.href = `/api/accountant-portal/journal?org_id=${orgId}&from=${range.from}&to=${range.to}&format=${format}`
    setTimeout(() => setBusy(''), 1500)
  }

  const cell: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, fontFamily: font.family, background: '#fff' }
  return (
    <div role="dialog" aria-modal="true" aria-label="تصدير القيود" style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: font.family }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)' }} onClick={() => !busy && onClose()} />
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: colors.bg, color: colors.text3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>تصدير القيود اليومية</div>
            <div style={{ fontSize: 12.5, color: colors.text3 }}>{periodLabel} · قيد لكل إقفال كاشير وكل فاتورة مشتريات</div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3, padding: 4 }}><X size={20} /></button>
        </header>

        <div style={{ padding: '14px 20px', overflowY: 'auto' }}>
          <p style={{ fontSize: 13, color: colors.text3, lineHeight: 1.7, margin: '0 0 12px' }}>
            اربط كل بند بحسابه في دليل حسابات العميل لديك. يُحفظ الربط لهذا العميل، فلا تحتاج إلى إعادته. الملف يُستورد في قيود ودفترة و Zoho Books وأودو.
          </p>
          {!map ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={22} className="spin" color={colors.primary} /></div> : (
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <div className="jd-row" style={{ background: '#F6F8F9', color: colors.text3, fontSize: 12, fontWeight: 600 }}>
                <span>البند في ستورلي</span><span>رقم الحساب</span><span>اسم الحساب لديك</span>
              </div>
              {ACCOUNT_KEYS.map(k => (
                <div key={k} className="jd-row" style={{ borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{ACCOUNT_LABELS[k]}</span>
                  <input value={map[k].code} onChange={e => set(k, 'code', e.target.value)} dir="ltr" inputMode="numeric" aria-label={`رقم حساب ${ACCOUNT_LABELS[k]}`} placeholder={DEFAULT_ACCOUNTS[k].code} style={cell} />
                  <input value={map[k].name} onChange={e => set(k, 'name', e.target.value)} aria-label={`اسم حساب ${ACCOUNT_LABELS[k]}`} style={cell} />
                </div>
              ))}
            </div>
          )}
          <style>{'.jd-row{display:grid;grid-template-columns:minmax(0,1.2fr) 110px minmax(0,1.4fr);gap:10px;align-items:center;padding:8px 12px}@media(max-width:560px){.jd-row{grid-template-columns:1fr 1fr}.jd-row>span:first-child{grid-column:1/-1}}'}</style>
          {err && <div style={{ marginTop: 10, fontSize: 13, color: '#B42318' }}>{err}</div>}
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 20px', borderTop: `1px solid ${colors.border}` }}>
          <button onClick={() => { setMap({ ...DEFAULT_ACCOUNTS }); setDirty(true) }} className="ap-btn sec" style={{ border: 'none', color: colors.text3 }} disabled={!map}>استعادة الافتراضي</button>
          <span style={{ flex: 1 }} />
          {dirty && <button onClick={save} className="ap-btn sec" disabled={!!busy}>حفظ الربط</button>}
          <button onClick={() => download('csv')} className="ap-btn sec" disabled={!map || !!busy}>{busy === 'csv' ? 'جاري التجهيز...' : 'CSV'}</button>
          <button onClick={() => download('xlsx')} className="ap-btn pri" disabled={!map || !!busy}><Download size={15} />{busy === 'xlsx' ? 'جاري التجهيز...' : 'تحميل ملف القيود'}</button>
        </footer>
      </div>
    </div>
  )
}
