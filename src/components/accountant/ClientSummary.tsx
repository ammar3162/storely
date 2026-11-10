'use client'
// ملخص المنشأة في بوابة المحاسب — أول ما يفتح المنشأة يشوف: الأرقام، وش ناقص قبل إقفال الشهر، وموعد الإقرار
import { CheckCircle2, AlertCircle, Info, Circle, ChevronLeft } from 'lucide-react'
import { colors, radius } from '@/lib/ds'
import { taxInvoices, vatReturn } from '@/lib/accountantExport'
import { Stat } from './PortalShell'

export type SummaryGo = (tab: string, opts?: { missing?: boolean }) => void
type State = 'ok' | 'bad' | 'warn' | 'info' | 'todo'
type Item = { state: State; title: string; desc: string; actions?: { l: string; on: () => void; primary?: boolean }[] }

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ICON: Record<State, [any, string]> = { ok: [CheckCircle2, '#067647'], bad: [AlertCircle, '#B42318'], warn: [AlertCircle, '#B54708'], info: [Info, '#175CD3'], todo: [Circle, '#98A2B3'] }
// العدد بالعربية الفصحى: ١ و٢ بصيغتهما، ٣–١٠ جمع، ١١+ مفرد
const plural = (n: number, one: string, two: string, few: string, eleven = few) => n === 1 ? one : n === 2 ? two : `${n} ${n <= 10 ? few : eleven}`

export default function ClientSummary({ data, requests, go, onRequestMissing }: {
  data: any; requests: { open: number; answered: number }; go: SummaryGo; onRequestMissing?: (invs: any[]) => void
}) {
  const r = data.report, t = data.totals
  const has = (s: string) => r.sections.includes(s)
  const items: Item[] = []

  // ١) الفواتير الضريبية
  const tax = r.vatRegistered && (has('purchases') || has('vat'))
  const missing = tax ? taxInvoices(r.purchases).filter(i => !i.complete) : []
  if (tax) {
    items.push(missing.length
      ? { state: 'bad', title: `${plural(missing.length, 'فاتورة ضريبية ناقصة', 'فاتورتان ضريبيتان ناقصتان', 'فواتير ضريبية ناقصة', 'فاتورة ضريبية ناقصة')}`, desc: 'ينقصها الرقم الضريبي للمورد أو رقم الفاتورة، فلا تدخل ضريبتها في الإقرار',
          actions: [{ l: 'عرضها', on: () => go('purchases', { missing: true }) }, ...(onRequestMissing ? [{ l: 'اطلب من المنشأة إكمالها', on: () => onRequestMissing(missing), primary: true }] : [])] }
      : { state: 'ok', title: 'الفواتير الضريبية مكتملة', desc: t.taxInvoices ? `${plural(t.taxInvoices, 'فاتورة واحدة', 'فاتورتان', 'فواتير', 'فاتورة')} فيها الرقم الضريبي ورقم الفاتورة` : 'لا توجد فواتير ضريبية في هذه الفترة' })
    if (t.taxMismatch > 0) items.push({ state: 'bad', title: `${plural(t.taxMismatch, 'فاتورة', 'فاتورتان', 'فواتير', 'فاتورة')} بمبلغ أكبر من الأصلية`, desc: 'المبلغ المسجّل أكبر من المبلغ في باركود الفاتورة — راجعها قبل التقديم',
      actions: [{ l: 'عرضها', on: () => go('purchases') }] })
  }

  // ٢) عجز الكاشير اللي ينتظر قرار المالك
  if (has('cash_diff')) {
    const pending = r.closings.filter((c: any) => c.difference < 0 && c.deficitDecision === 'pending')
    items.push(pending.length
      ? { state: 'warn', title: `${plural(pending.length, 'عجز واحد', 'عجزان', 'حالات عجز', 'حالة عجز')} بانتظار قرار المالك`, desc: 'لم يُحدَّد بعد هل يُخصم من الموظف أم يُحمَّل على المنشأة', actions: [{ l: 'عرض الفروقات', on: () => go('sales') }] }
      : { state: 'ok', title: 'فروقات الكاشير محسومة', desc: 'لا يوجد عجز بانتظار قرار' })
  }

  // ٣) مشتريات بدون ضريبة — المحاسب يحدد خانتها
  const v = has('vat') && r.vatRegistered ? vatReturn(r) : null
  if (v && v.nonVat.count > 0) items.push({ state: 'info', title: `مشتريات بدون ضريبة بقيمة ${fmt(v.nonVat.total)}`, desc: 'حدّد هل تدخل الخانة 10 أو 11 أو أنها خارج النطاق', actions: [{ l: 'افتح الإقرار', on: () => go('vat') }] })

  // ٤) الطلبات
  if (requests.answered) items.push({ state: 'info', title: `${plural(requests.answered, 'رد جديد', 'ردّان جديدان', 'ردود جديدة', 'رداً جديداً')} من المنشأة`, desc: 'راجعها ثم أغلق الطلب إذا اكتمل', actions: [{ l: 'عرض الطلبات', on: () => go('requests'), primary: true }] })
  else if (requests.open) items.push({ state: 'todo', title: `${plural(requests.open, 'طلب واحد', 'طلبان', 'طلبات', 'طلباً')} بانتظار رد المنشأة`, desc: 'يصلك إشعار عند الرد', actions: [{ l: 'عرض الطلبات', on: () => go('requests') }] })

  // ٥) تعديلات المنشأة بعد آخر مراجعة
  const edits = [...r.closings, ...r.purchases].filter((x: any) => x.editedSource && x.editedSource !== 'accountant').length
  if (edits) items.push({ state: 'info', title: `عدّلت المنشأة ${plural(edits, 'سجلاً واحداً', 'سجلين', 'سجلات', 'سجلاً')} في هذه الفترة`, desc: 'تظهر عليها شارة «معدّل من المنشأة» في الجداول' })

  // ٦) الإقفال
  items.push({ state: 'todo', title: 'إقفال الشهر', desc: 'بعد المراجعة أقفل الشهر حتى لا تتغير أرقامه', actions: [{ l: 'إقفال الأشهر', on: () => go('locks') }] })

  const open = items.filter(i => i.state === 'bad' || i.state === 'warn').length
  const days = v?.deadline ? Math.ceil((Date.parse(`${v.deadline}T23:59:59+03:00`) - Date.now()) / 864e5) : null

  return (<>
    <style>{'.cs-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}@media(min-width:1000px){.cs-grid{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}}'}</style>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,140px),1fr))', gap: 12, marginBottom: 16 }}>
      {has('sales') && <Stat label="المبيعات" value={fmt(t.sales)} hint={`${plural(r.closings.length, 'إقفال واحد', 'إقفالان', 'إقفالات', 'إقفالاً')}`} />}
      {has('purchases') && <Stat label="المشتريات" value={fmt(t.purTotal)} hint={t.purUnpaid ? `منها آجلة ${fmt(t.purUnpaid)}` : 'شاملة الضريبة'} />}
      {v && <Stat label={v.netDue >= 0 ? 'صافي الضريبة المستحقة' : 'ضريبة مستردة'} value={fmt(Math.abs(v.netDue))} hint="الخانة 16 في الإقرار" />}
      {has('payables') && <Stat label="المستحق للموردين" value={fmt(t.payablesTotal)} hint="كل الفواتير الآجلة" />}
      {has('payroll') && r.payroll && <Stat label="صافي الرواتب" value={fmt(t.payrollNet)} hint={`${r.payroll.length} موظف`} />}
    </div>

    <div className="cs-grid">
      <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, flex: 1 }}>قبل إقفال الشهر</h2>
          <span style={{ fontSize: 12.5, color: open ? '#B42318' : '#067647', fontWeight: 600 }}>{open ? `${open} يحتاج إجراء` : 'جاهز للمراجعة'}</span>
        </header>
        {items.map((it, i) => {
          const [Icon, c] = ICON[it.state]
          return (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: i === items.length - 1 ? 'none' : `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
              <Icon size={18} color={c} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{it.title}</div>
                <div style={{ fontSize: 12.5, color: colors.text3, marginTop: 2, lineHeight: 1.6 }}>{it.desc}</div>
              </div>
              {it.actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginInlineStart: 30 }}>
                {it.actions.map(a => <button key={a.l} onClick={a.on} className={`ap-btn ${a.primary ? 'pri' : 'sec'}`} style={{ padding: '7px 12px', fontSize: 12.5 }}>{a.l}</button>)}
              </div>}
            </div>
          )
        })}
      </section>

      {has('vat') && <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: radius.xl, padding: 18, alignSelf: 'start' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>الإقرار الضريبي</h2>
        {!r.vatRegistered ? <div style={{ fontSize: 13, color: colors.text3 }}>المنشأة غير مسجلة في ضريبة القيمة المضافة</div> : v && <>
          <div style={{ fontSize: 12.5, color: colors.text3 }}>{v.netDue >= 0 ? 'صافي الضريبة المستحقة' : 'ضريبة مستردة'}</div>
          <div dir="ltr" style={{ fontSize: 28, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', margin: '4px 0 12px' }}>{fmt(Math.abs(v.netDue))}</div>
          <div style={{ display: 'grid', gap: 8, fontSize: 13, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
            {[['ضريبة المبيعات (خانة 6)', v.boxes.find(b => b.no === 6)?.vat || 0], ['ضريبة المشتريات (خانة 12)', v.boxes.find(b => b.no === 12)?.vat || 0]].map(([k, x]) => (
              <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ color: colors.text3 }}>{k}</span><span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(x as number)}</span></div>
            ))}
          </div>
          {v.deadline ? <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: days != null && days <= 10 ? '#FFFAEB' : colors.bg, fontSize: 12.5, lineHeight: 1.7 }}>
            <div style={{ color: colors.text3 }}>آخر موعد للتقديم والسداد</div>
            <div style={{ fontWeight: 600, color: days != null && days <= 10 ? '#B54708' : colors.text }}>
              {new Date(`${v.deadline}T12:00:00Z`).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })}
              {days != null && (days > 0 ? ` · باقي ${plural(days, 'يوم واحد', 'يومان', 'أيام', 'يوماً')}` : days === 0 ? ' · اليوم' : ' · انتهى الموعد')}
            </div>
          </div> : <div style={{ marginTop: 14, fontSize: 12.5, color: colors.text3, lineHeight: 1.7 }}>اختر شهراً كاملاً أو ربعاً لعرض موعد الإقرار</div>}
          <button onClick={() => go('vat')} className="ap-btn sec" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>افتح نموذج الإقرار <ChevronLeft size={15} /></button>
        </>}
      </section>}
    </div>
  </>)
}
