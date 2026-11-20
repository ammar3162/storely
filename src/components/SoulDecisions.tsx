'use client'
// «قرارات تنتظرك» داخل Soul (المرحلة الأولى، طلب المالك 2026-11-19): كل قرار بطاقة بأزراره، والأزرار تنادي نفس
// واجهات الصفحات وبنفس صلاحياتها (الخادم يتحقق مرة ثانية، والقرار ما ينأخذ مرتين).
// بعد الضغط: «تراجع» 10 ثوانٍ قبل التنفيذ (lib/soulDecisionQueue)، و«لاحقاً» تخفي البطاقة من هذا الجهاز لين بكرة.
import { useEffect, useRef, useState } from 'react'
import { TriangleAlert, Clock, CalendarDays, HandCoins, CalendarClock, Wallet, PackageMinus, Check, ChevronDown, CircleAlert, LoaderCircle } from 'lucide-react'
import { api } from '@/lib/api-client'
import type { Decision, DecisionKind } from '@/lib/soulDecisions'
import { scheduleDecision, undoDecision, markLater, clearPhase, useDecisionPhases, type DecisionResult } from '@/lib/soulDecisionQueue'
import ExtraDayDecision from '@/components/ExtraDayDecision'

const ICON: Record<DecisionKind, typeof Clock> = {
  deficit: TriangleAlert, excuse: Clock, leave: CalendarDays, advance: HandCoins, extra_day: CalendarClock, payable: Wallet, stock: PackageMinus,
}
const TINT: Partial<Record<DecisionKind, string>> = { deficit: 'sd-red', stock: 'sd-orange' }

type Act = { label: string; tone: 'pri' | 'dng' | 'neu'; msg: string; run: (orgId: string) => Promise<DecisionResult> }
const res = (r: any): DecisionResult => ({ ok: !!r?.success, error: r?.error })

/** أزرار كل نوع — نفس النداءات اللي تستخدمها صفحات الإشعارات والموظفين والمشتريات والموردين */
export function decisionActions(d: Decision): Act[] {
  const who = d.staff || 'الموظف'
  switch (d.kind) {
    case 'deficit': return [
      { label: 'خصم من الراتب', tone: 'dng', msg: `خُصم ${d.amountText || 'العجز'} من راتب ${who}`,
        run: o => api.post('/api/cashier-deficit-decision', { org_id: o, closing_id: d.refId, decision: 'approved' }).then(res) },
      { label: 'رفض الخصم', tone: 'neu', msg: `لن يُخصم العجز من راتب ${who}`,
        run: o => api.post('/api/cashier-deficit-decision', { org_id: o, closing_id: d.refId, decision: 'rejected' }).then(res) },
    ]
    case 'excuse': return [
      { label: 'موافقة', tone: 'pri', msg: `تمت الموافقة على استئذان ${who}`, run: o => api.put('/api/attendance-permission-request', { org_id: o, id: d.refId, action: 'approve' }).then(res) },
      { label: 'رفض', tone: 'neu', msg: `رُفض استئذان ${who}`, run: o => api.put('/api/attendance-permission-request', { org_id: o, id: d.refId, action: 'reject' }).then(res) },
    ]
    case 'leave': return [
      { label: 'موافقة', tone: 'pri', msg: `تمت الموافقة على إجازة ${who}`, run: o => api.patch('/api/staff-leave', { org_id: o, request_id: d.refId, decision: 'approved' }).then(res) },
      { label: 'رفض', tone: 'neu', msg: `رُفض طلب إجازة ${who}`, run: o => api.patch('/api/staff-leave', { org_id: o, request_id: d.refId, decision: 'rejected' }).then(res) },
    ]
    case 'advance': return [
      { label: 'موافقة', tone: 'pri', msg: `تمت الموافقة على سلفة ${who}`, run: o => api.patch('/api/staff-payroll-adjustments', { org_id: o, adjustment_id: d.refId, decision: 'approved' }).then(res) },
      { label: 'رفض', tone: 'neu', msg: `رُفضت سلفة ${who}`, run: o => api.patch('/api/staff-payroll-adjustments', { org_id: o, adjustment_id: d.refId, decision: 'rejected' }).then(res) },
    ]
    case 'payable': return [
      { label: 'تم الدفع', tone: 'pri', msg: 'سُجّلت الفاتورة مدفوعة',
        run: async o => {
          for (const id of d.ids?.length ? d.ids : [d.refId]) { const r = await api.patch('/api/purchases', { org_id: o, id, mark_paid: true }); if (!r.success) return res(r) }
          return { ok: true }
        } },
    ]
    case 'stock': return [
      { label: 'اطلب من الموردين', tone: 'pri', msg: 'أُرسل طلب التوريد للموردين',
        run: async o => {
          const r: any = await api.post('/api/notify-supplier', { org_id: o, manual: true })
          if (!r.success) return res(r)
          if (!r.sent && r.failed) return { ok: false, error: 'تعذر الإرسال — تحقق من رقم واتساب المورد' }
          if (!r.sent) return { ok: true, done: 'لا توجد أصناف تحتاج طلباً الآن' }
          return { ok: true, done: r.failed ? `أُرسل ${r.sent} وتعذر ${r.failed} — تحقق من أرقام الموردين` : 'أُرسل طلب التوريد للموردين' }
        } },
    ]
    default: return []
  }
}

export function DecisionCard({ d, orgId, compact = false, highlight = false, onExtraDone }: {
  d: Decision; orgId: string; compact?: boolean; highlight?: boolean; onExtraDone?: (key: string) => void
}) {
  const phases = useDecisionPhases()
  const ph = phases.get(d.key)
  const ref = useRef<HTMLDivElement>(null)
  // عدّاد التراجع
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (ph?.phase !== 'undo') return
    const t = setInterval(() => setNow(Date.now()), 400)
    return () => clearInterval(t)
  }, [ph?.phase])
  useEffect(() => { if (highlight) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [highlight])

  if (ph && ph.phase !== 'error') {
    const secs = ph.until ? Math.min(10, Math.max(1, Math.ceil((ph.until - now) / 1000))) : 0
    return (
      <div className={`sd-status${compact ? ' sd-compact' : ''}`} role="status" aria-live="polite">
        <span className={`sd-ic ${ph.phase === 'done' ? 'sd-green' : ''}`}>
          {ph.phase === 'running' ? <LoaderCircle size={16} strokeWidth={2.2} className="sd-spin" /> : <Check size={16} strokeWidth={2.4} />}
        </span>
        <span className="sd-status-txt">{ph.msg}</span>
        {ph.phase === 'undo' && <button className="sd-undo" onClick={() => undoDecision(d.key)}>{`تراجع (${secs})`}</button>}
      </div>
    )
  }

  const Icon = ICON[d.kind]
  const acts = decisionActions(d)
  return (
    <div ref={ref} className={`sd-card${compact ? ' sd-compact' : ''}${highlight ? ' sd-hl' : ''}`}>
      <div className="sd-head">
        {!compact && <span className={`sd-ic ${TINT[d.kind] || ''}`}><Icon size={16} strokeWidth={2.2} /></span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sd-title">{d.title}</div>
          {d.meta && <div className="sd-meta">{d.meta}</div>}
        </div>
      </div>
      {!!d.lines?.length && (
        <ul className="sd-lines">{d.lines.map((l, i) => <li key={i}><span>{l.label}</span><span className={d.kind === 'stock' ? 'sd-warn' : ''}>{l.value}</span></li>)}</ul>
      )}
      {ph?.phase === 'error' && <div className="sd-err" role="alert"><CircleAlert size={15} strokeWidth={2.2} /> {ph.msg}</div>}
      {d.kind === 'extra_day' ? (
        <div className="sd-extra">
          <ExtraDayDecision item={{ id: d.refId, work_date: d.workDate || '', suggested_amount: d.suggested, status: 'pending' }} orgId={orgId} onDone={() => onExtraDone?.(d.key)} />
          <button className="sd-a sd-later" onClick={() => markLater(d.key)}>لاحقاً</button>
        </div>
      ) : (
        <div className="sd-acts">
          {acts.map((a, i) => (
            <button key={i} className={`sd-a sd-${a.tone}`} onClick={() => { clearPhase(d.key); scheduleDecision(d.key, a.msg, () => a.run(orgId)) }}>{a.label}</button>
          ))}
          <button className="sd-a sd-later" onClick={() => markLater(d.key)}>لاحقاً</button>
        </div>
      )}
    </div>
  )
}

const qarar = (n: number) => (n === 1 ? 'قرار واحد' : n === 2 ? 'قراران' : n % 100 >= 3 && n % 100 <= 10 ? `${n} قرارات` : `${n} قراراً`)

export default function SoulDecisions({ items, orgId, highlight, onExtraDone }: {
  items: Decision[]; orgId: string; highlight?: string | null; onExtraDone?: (key: string) => void
}) {
  const fresh = items.filter(d => !d.old), old = items.filter(d => d.old)
  const [showOld, setShowOld] = useState(() => !!highlight && old.some(d => d.key === highlight))
  if (!items.length) return null
  return (
    <section className="sd" aria-label={`قرارات تنتظرك: ${qarar(items.length)}`}>
      <div className="sd-sec"><span>قرارات تنتظرك</span><span className="sd-n">{items.length}</span></div>
      {fresh.map(d => <DecisionCard key={d.key} d={d} orgId={orgId} highlight={highlight === d.key} onExtraDone={onExtraDone} />)}
      {old.length > 0 && (
        <>
          <button className="sd-old" aria-expanded={showOld} onClick={() => setShowOld(v => !v)}>
            <span>{`عجوزات أقدم من أسبوع (${old.length})`}</span>
            <ChevronDown size={17} strokeWidth={2.2} style={{ transform: showOld ? 'rotate(180deg)' : 'none' }} />
          </button>
          {showOld && old.map(d => <DecisionCard key={d.key} d={d} orgId={orgId} highlight={highlight === d.key} onExtraDone={onExtraDone} />)}
        </>
      )}
    </section>
  )
}

/** ستايل البطاقات — يندمج مرة وحدة مع ستايل Soul */
export const SOUL_DECISIONS_CSS = `
.sd{display:flex;flex-direction:column;gap:8px;width:100%;margin:2px 0 6px}
.sd,.ai-bubble{--sd-red:#B91C1C;--sd-red-bg:#FEF2F2;--sd-red-line:#FECACA;--sd-green:#047857;--sd-green-bg:#ECFDF5}
:root[data-theme="dark"] .sd,:root[data-theme="dark"] .ai-bubble{--sd-red:#FF6961;--sd-red-bg:rgba(255,69,58,.16);--sd-red-line:rgba(255,69,58,.4);--sd-green:#30D158;--sd-green-bg:rgba(48,209,88,.16)}
.sd-sec{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--storely-muted,#424245);padding:2px 4px 0}
.sd-n{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#FF3B30;color:#fff;font-size:12px;line-height:20px;text-align:center;font-variant-numeric:tabular-nums}
.sd-card,.sd-status{background:var(--storely-background,#F5F5F7);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;color:var(--storely-text,#1D1D1F)}
.sd-card.sd-hl{box-shadow:0 0 0 2px var(--storely-navy,#203640)}
.sd-compact{background:transparent;padding:0}
.sd-status{flex-direction:row;align-items:center;gap:10px;font-size:15px;font-weight:500;line-height:1.5}
.sd-status-txt{flex:1;min-width:0}
.sd-head{display:flex;gap:10px;align-items:flex-start}
.sd-ic{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(32,54,64,.1);color:var(--storely-navy,#203640)}
:root[data-theme="dark"] .sd-ic{background:rgba(169,198,212,.14);color:#a9c6d4}
.sd-ic.sd-red{background:var(--sd-red-bg);color:var(--sd-red)}
.sd-ic.sd-orange{background:var(--ai-orange-bg);color:var(--ai-orange)}
.sd-ic.sd-green{background:var(--sd-green-bg);color:var(--sd-green)}
.sd-title{font-size:16px;font-weight:600;line-height:1.45}
.sd-meta{font-size:14px;color:var(--storely-muted,#424245);line-height:1.55;margin-top:1px}
.sd-lines{list-style:none;margin:0;padding:0;font-size:15px;line-height:1.5}
.sd-lines li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:.5px solid var(--ai-hair)}
.sd-warn{color:var(--ai-orange);font-weight:500;white-space:nowrap}
.sd-err{display:flex;gap:6px;align-items:flex-start;font-size:14px;line-height:1.55;color:var(--sd-red)}
.sd-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sd-extra{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}
.sd-a{height:38px;padding:0 16px;border-radius:999px;border:0;font:inherit;font-size:15px;font-weight:600;cursor:pointer;white-space:nowrap;transition:transform .1s,background-color .15s}
.sd-a:active{transform:scale(.97)}
.sd-a:focus-visible,.sd-undo:focus-visible,.sd-old:focus-visible{outline:2px solid var(--storely-navy,#203640);outline-offset:2px}
.sd-pri{background:var(--storely-navy,#203640);color:#fff}
.sd-dng{background:var(--sd-red-bg);color:var(--sd-red);box-shadow:inset 0 0 0 1px var(--sd-red-line)}
.sd-neu{background:var(--storely-surface,#fff);color:var(--storely-text,#1D1D1F);box-shadow:inset 0 0 0 1px var(--storely-control-border,#D2D2D7)}
.sd-later{background:none;color:var(--storely-muted,#424245);font-weight:500;font-size:14px;padding:0 6px;margin-inline-start:auto}
.sd-compact .sd-a{height:36px;padding:0 13px;font-size:14px}
.sd-compact .sd-acts{gap:6px;flex-wrap:nowrap}
.sd-undo{border:0;background:none;font:inherit;font-size:15px;font-weight:600;color:var(--storely-navy,#203640);cursor:pointer;padding:6px 4px;white-space:nowrap;font-variant-numeric:tabular-nums}
:root[data-theme="dark"] .sd-undo{color:#a9c6d4}
.sd-old{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:44px;padding:8px 14px;border:0;border-radius:16px;background:var(--storely-background,#F5F5F7);color:var(--storely-text,#1D1D1F);font:inherit;font-size:15px;font-weight:500;cursor:pointer;text-align:start}
.sd-spin{animation:sdSpin .9s linear infinite}
@keyframes sdSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.sd-spin{animation:none}.sd-a:active{transform:none}}
`
