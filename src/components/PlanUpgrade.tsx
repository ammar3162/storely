'use client'
// ترقية الباقة من الإعدادات — الطلب يوصل للأدمن (طلبات الإضافات والترقية) ويوافق عليه
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { colors, font, radius } from '@/lib/ds'
import { toast } from '@/components/toast'
import { PLAN_CAPS, PLAN_PRICING, planKeyOf, planPriceFor, higherPlans, isNewPlan, type PlanKey } from '@/lib/planPricing'

const NEW_DESC: Record<string, string> = { ops: 'كل الأساسية + إقفال الكاشير لكل الفروع', full: 'كل المميزات: الكاشير والحضور والرواتب والذكاء' }
const desc = (k: PlanKey) => {
  const c = PLAN_CAPS[k]
  if (isNewPlan(k)) return `${NEW_DESC[k] || ''} · ${c.staff} موظفين و${c.suppliers} مورد لكل فرع`
  return `${k === 'basic' ? 'المميزات بالإضافات' : 'كل المميزات'} · ${c.branches === 1 ? 'فرع واحد' : c.branches + ' فروع'} · ${c.staff} موظف · ${c.suppliers} مورد`
}

export default function PlanUpgrade({ orgId, plan, maxBranches }: { orgId: string; plan: string; maxBranches: number }) {
  const current = planKeyOf(plan, maxBranches)
  const [pending, setPending] = useState<any>(null)
  const [sending, setSending] = useState<string | null>(null)

  const load = () => api.get('/api/plan-requests', { org_id: orgId }).then(j => setPending((j.requests || []).find((r: any) => r.status === 'pending') || null)).catch(() => {})
  useEffect(() => { if (orgId) load() }, [orgId])   // eslint-disable-line react-hooks/exhaustive-deps

  async function request(k: PlanKey) {
    setSending(k)
    const j = await api.post('/api/plan-requests', { org_id: orgId, target_plan: k })
    setSending(null)
    if (!j.success) { toast(j.error || 'فشل إرسال الطلب', 'error'); return }
    toast('وصل طلب الترقية — بنفعّلها لك بأقرب وقت')
    load()
  }
  async function cancel() {
    const j = await api.del('/api/plan-requests', undefined, { org_id: orgId, id: pending.id })
    if (j.success) setPending(null)
  }

  const higher = higherPlans(current)
  if (!higher.length) return null
  return (
    <div className="hide-in-app" style={{ marginTop: 16, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      {pending ? (
        <div style={{ padding: '12px 14px', borderRadius: radius.md, background: colors.primaryLight, border: `1px solid ${colors.primaryBorder}`, fontSize: font.sm, color: colors.text, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1 }}>طلب الترقية إلى <b>{PLAN_PRICING[pending.target_plan as PlanKey]?.label}</b> قيد المراجعة</span>
          <button type="button" onClick={cancel} style={{ background: 'none', border: 'none', color: colors.danger, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>إلغاء الطلب</button>
        </div>
      ) : higher.map(k => (
        <div key={k} style={{ padding: '12px 14px', borderRadius: radius.md, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: font.sm, fontWeight: 800, color: colors.text }}>{PLAN_PRICING[k].label} — {planPriceFor(k, null, isNewPlan(k) ? maxBranches : 1).monthly} ريال شهرياً{isNewPlan(k) && maxBranches > 1 ? ` لـ ${maxBranches} فروع` : ''}</div>
            <div style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>{desc(k)}</div>
          </div>
          <button type="button" onClick={() => request(k)} disabled={!!sending}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: colors.primary, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const }}>
            {sending === k ? '...' : 'اطلب الترقية'}
          </button>
        </div>
      ))}
    </div>
  )
}
