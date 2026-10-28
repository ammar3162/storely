'use client'
// وكيل الفواتير: يرفع العميل الفاتورة، الوكيل يقرأها ويطابق أصنافها مع المخزون،
// يسجّل الواضح ويسأل عن الباقي — وبعد ما يجاوب، ضغطة «حفظ» وتنسجّل مشتريات.
import { useEffect, useState } from 'react'
import { Sparkles, Check, HelpCircle, Plus, Loader2, Trash2, PackageCheck, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { prepareInvoiceFile } from '@/lib/invoiceFile'
import { blobToBase64 } from '@/lib/zatcaScan'
import InvoicePickButtons from '@/components/InvoicePickButtons'
import NumberInput from '@/components/NumberInput'
import { colors } from '@/lib/ds'

type Cand = { id: string; name: string; unit?: string | null; score: number }
type Item = { name: string; qty: number | null; unit: string | null; total: number | null; status: 'matched' | 'new' | 'expense' | 'skip' | 'ask'; product_id: string | null; product_name?: string | null; candidates: Cand[]; question?: string | null; learned?: boolean }
type Draft = { id: string; supplier: string | null; invoice_date: string | null; has_vat: boolean; total: number | null; items: Item[]; status: 'needs_review' | 'ready'; invoice_image: string | null; created_at: string }

const fmt = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function InvoiceAgentPanel({ orgId, branchId, products, curr, onSaved }: {
  orgId: string; branchId: string | null; products: { id: string; name: string; unit?: string | null }[]; curr: string; onSaved: () => void
}) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    if (!orgId) return
    const j = await api.get('/api/invoice-agent', { org_id: orgId, branch_id: branchId })
    if (j.success) setDrafts(j.drafts || [])
  }
  useEffect(() => { load() }, [orgId, branchId])
  useLiveRefresh(orgId || null, ['invoice_drafts'], () => load())

  async function onFile(file: File) {
    const prep = await prepareInvoiceFile(file)
    if ('error' in prep) { toast(prep.error, 'warning'); return }
    if (!prep.ocrType) { toast('الوكيل يقرأ الصور وملفات PDF بس', 'warning'); return }
    setReading(true)
    try {
      const sb = createClient()
      const path = `${orgId}/invoice-${Date.now()}.${prep.ext}`   // مجلد المنشأة (سياسة التخزين)
      const { error } = await sb.storage.from('invoices').upload(path, prep.blob, { contentType: prep.type })
      if (error) { toast('فشل رفع الفاتورة', 'error'); setReading(false); return }
      const { data: { publicUrl } } = sb.storage.from('invoices').getPublicUrl(path)
      const j = await api.post('/api/invoice-agent', { org_id: orgId, branch_id: branchId, image: await blobToBase64(prep.blob), mediaType: prep.ocrType, invoice_image: publicUrl })
      if (!j.success) { toast(j.error || 'ما قدر الوكيل يقرأ الفاتورة', 'error'); setReading(false); return }
      const asks = (j.draft.items as Item[]).filter(i => i.status === 'ask').length
      toast(asks ? `قرأ الوكيل الفاتورة — عنده ${asks} ${asks === 1 ? 'سؤال' : 'أسئلة'} لك` : 'قرأ الوكيل الفاتورة — راجعها واحفظ')
      load()
    } catch { toast('فشل رفع الفاتورة', 'error') }
    setReading(false)
  }

  async function patch(d: Draft, body: any) {
    setBusy(d.id)
    const j = await api.patch('/api/invoice-agent', { org_id: orgId, id: d.id, ...body })
    setBusy(null)
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); return }
    setDrafts(prev => prev.map(x => x.id === d.id ? j.draft : x))
  }

  async function confirm(d: Draft, allowDuplicate = false) {
    setBusy(d.id)
    const j = await api.post('/api/invoice-agent/confirm', { org_id: orgId, id: d.id, allow_duplicate: allowDuplicate })
    setBusy(null)
    if (!j.success) {
      if (j.duplicate && await confirmDialog({ title: 'الفاتورة مسجلة قبل', message: `${j.error}\n\nتسجلها مرة ثانية؟`, confirmText: 'سجّلها' })) return confirm(d, true)
      if (!j.duplicate) toast(j.error || 'فشل الحفظ', 'error')
      return
    }
    toast(`تم تسجيل الفاتورة — ${j.summary || `${j.saved} صنف`}`)
    load(); onSaved()
  }

  async function cancel(d: Draft) {
    if (!(await confirmDialog({ title: 'إلغاء الفاتورة', message: 'تنحذف هالمسودة وما ينسجّل منها شي.', confirmText: 'ألغِها' }))) return
    const j = await api.del('/api/invoice-agent', undefined, { org_id: orgId, id: d.id })
    if (!j.success) { toast(j.error || 'تعذر الإلغاء', 'error'); return }
    load()
  }

  const pill = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, background: bg, color: fg, borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 })
  const opt: React.CSSProperties = { padding: '7px 11px', borderRadius: 9, border: `1px solid ${colors.border}`, background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: colors.text }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 16 }}>
      <style>{`@keyframes ia-spin{to{transform:rotate(360deg)}}.ia-spin{animation:ia-spin .8s linear infinite}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: colors.primaryLight, color: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={18} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>الوكيل الذكي للفواتير</div>
          <div style={{ fontSize: 11.5, color: colors.text3, marginTop: 2 }}>ارفع الفاتورة — يقرأها ويطابق الأصناف مع مخزونك، ويسألك بس عن اللي مو واضح</div>
        </div>
      </div>

      {reading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 12px', background: colors.primaryLight, borderRadius: 10, fontSize: 13, fontWeight: 700, color: colors.primary }}>
          <Loader2 size={16} className="ia-spin" /> الوكيل يقرأ الفاتورة ويطابق الأصناف...
        </div>
      ) : (
        <InvoicePickButtons onFile={onFile} primary={colors.primary} primaryL={colors.primaryLight} labels={{ camera: 'صوّر الفاتورة', gallery: 'من الصور', file: 'ملف PDF' }} />
      )}

      {drafts.map(d => {
        const asks = d.items.filter(i => i.status === 'ask').length
        const saving = d.items.filter(i => i.status === 'matched' || i.status === 'new' || i.status === 'expense')
        const sum = saving.reduce((s, i) => s + (Number(i.total) || 0), 0)
        return (
          <div key={d.id} style={{ marginTop: 14, border: `1.5px solid ${d.status === 'ready' ? colors.primary : '#fde68a'}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
              <input defaultValue={d.supplier || ''} placeholder="اسم المورد" onBlur={e => { if (e.target.value.trim() !== (d.supplier || '')) patch(d, { supplier: e.target.value }) }}
                style={{ flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }} />
              <input type="date" defaultValue={d.invoice_date || ''} onChange={e => patch(d, { invoice_date: e.target.value })}
                style={{ padding: '7px 8px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 12, fontFamily: 'inherit' }} />
              <button onClick={() => patch(d, { has_vat: !d.has_vat })} style={{ ...opt, background: d.has_vat ? colors.primaryLight : 'white', color: d.has_vat ? colors.primary : colors.text3 }}>
                {d.has_vat ? 'شاملة ضريبة 15%' : 'بدون ضريبة'}
              </button>
              <span style={asks ? pill('#fffbeb', '#b45309') : pill(colors.primaryLight, colors.primary)}>
                {asks ? <><HelpCircle size={12} /> {asks} {asks === 1 ? 'سؤال' : 'أسئلة'}</> : <><Check size={12} /> جاهزة للحفظ</>}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.items.map((it, i) => (
                <div key={i} style={{ background: it.status === 'ask' ? '#fffbeb' : it.status === 'skip' ? '#f8fafc' : 'white', border: `1px solid ${it.status === 'ask' ? '#fde68a' : colors.border}`, borderRadius: 10, padding: '10px 12px', opacity: it.status === 'skip' ? .6 : 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{it.name}</div>
                      <div style={{ fontSize: 11.5, color: colors.text3, marginTop: 2 }}>
                        {it.qty ? `${it.qty} ${it.unit || ''} · ` : it.status === 'expense' ? '' : 'الكمية ناقصة · '}{it.total ? `${fmt(it.total)} ${curr}` : 'السعر ناقص'}
                      </div>
                    </div>
                    {it.status === 'matched' && <span style={pill(colors.primaryLight, colors.primary)}><Check size={12} /> مخزون: {it.product_name}{it.learned ? ' (تعلّمها)' : ''}</span>}
                    {it.status === 'new' && <span style={pill('#eff6ff', '#1d4ed8')}><Plus size={12} /> مخزون: صنف جديد</span>}
                    {it.status === 'expense' && <span style={pill('#faf5ff', '#7e22ce')}><Receipt size={12} /> مشتريات — ما تنضاف للمخزون</span>}
                    {(it.status === 'new' || it.status === 'expense') && (
                      <button onClick={() => patch(d, { index: i, action: it.status === 'new' ? 'expense' : 'new' })} disabled={busy === d.id}
                        style={{ border: 'none', background: 'none', color: colors.text3, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                        {it.status === 'new' ? 'خلّه مشتريات' : 'خلّه مخزون'}
                      </button>
                    )}
                    {it.status === 'skip' && <span style={pill('#f1f5f9', colors.text3)}>ما ينسجّل</span>}
                    {it.status !== 'ask' && (
                      <button onClick={() => patch(d, { index: i, action: it.status === 'skip' ? 'new' : 'skip' })} disabled={busy === d.id}
                        style={{ border: 'none', background: 'none', color: colors.text3, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                        {it.status === 'skip' ? 'رجّعه' : 'لا تسجّله'}
                      </button>
                    )}
                  </div>

                  {it.status === 'ask' && it.question === 'which_product' && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                        {it.candidates.length ? 'هذا أي صنف بمخزونك؟' : 'ما لقيته بمخزونك — صنف مخزون جديد، ولا مشتريات ما تنحسب مخزون؟'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {it.candidates.map(c => (
                          <button key={c.id} onClick={() => patch(d, { index: i, action: 'match', product_id: c.id })} disabled={busy === d.id} style={opt}>{c.name}</button>
                        ))}
                        <select value="" onChange={e => e.target.value && patch(d, { index: i, action: 'match', product_id: e.target.value })} disabled={busy === d.id}
                          style={{ ...opt, maxWidth: 190 }}>
                          <option value="">صنف ثاني من المخزون...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button onClick={() => patch(d, { index: i, action: 'new' })} disabled={busy === d.id} style={{ ...opt, color: '#1d4ed8', borderColor: '#bfdbfe', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}><Plus size={12} /> صنف مخزون جديد</button>
                        <button onClick={() => patch(d, { index: i, action: 'expense' })} disabled={busy === d.id} style={{ ...opt, color: '#7e22ce', borderColor: '#e9d5ff', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}><Receipt size={12} /> مشتريات (بدون مخزون)</button>
                        <button onClick={() => patch(d, { index: i, action: 'skip' })} disabled={busy === d.id} style={{ ...opt, color: colors.text3 }}>لا تسجّله</button>
                      </div>
                    </div>
                  )}
                  {it.status === 'ask' && (it.question === 'missing_price' || it.question === 'missing_qty') && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#92400e' }}>{it.question === 'missing_price' ? 'كم سعره شامل الضريبة؟' : 'كم الكمية؟'}</span>
                      <NumberInput placeholder={it.question === 'missing_price' ? curr : 'الكمية'} style={{ width: 110, padding: '7px 9px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 13 }}
                        onBlur={(e: any) => { const v = Number(e.target.value); if (v > 0) patch(d, { index: i, action: 'set', ...(it.question === 'missing_price' ? { total: v } : { qty: v }) }) }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, fontSize: 12, color: colors.text3 }}>
                ينسجّل {saving.length} صنف · {fmt(sum)} {curr}{d.total ? ` من إجمالي الفاتورة ${fmt(d.total)} ${curr}` : ''}
              </div>
              <button onClick={() => cancel(d)} disabled={busy === d.id} style={{ ...opt, color: colors.danger, borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={13} /> إلغاء</button>
              <button onClick={() => confirm(d)} disabled={busy === d.id || d.status !== 'ready'}
                style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: d.status === 'ready' ? colors.primary : colors.text4, color: 'white', fontSize: 13, fontWeight: 700, cursor: d.status === 'ready' ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                {busy === d.id ? <Loader2 size={14} className="ia-spin" /> : <PackageCheck size={15} />} حفظ الفاتورة
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
