'use client'
import { useEffect, useState } from 'react'
import { Receipt, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, font } from '@/lib/ds'
import { toast } from '@/components/toast'
import { VAT_MANDATORY, VAT_VOLUNTARY, type VatLevel } from '@/lib/vatThreshold'

type Status = { vat_registered: boolean | null; sales12m: number; level: VatLevel; is_owner: boolean }
const money = (n: number) => Math.round(n).toLocaleString('en-US')

export function useVatStatus(orgId: string) {
  const [s, setS] = useState<Status | null>(null)
  useEffect(() => { if (orgId) api.get<Status>('/api/vat-status', { org_id: orgId }).then(j => { if (j.success) setS(j as any) }) }, [orgId])
  return [s, setS] as const
}

const LEVEL_MSG: Record<VatLevel, { text: (s: number) => string; color: string; bg: string }> = {
  ok: { text: () => 'مبيعاتك تحت حد التسجيل — ما يلزمك تتسجل حالياً.', color: colors.text3, bg: colors.bg },
  voluntary: { text: () => `تعدّيت ${money(VAT_VOLUNTARY)} ريال — تقدر تتسجل اختيارياً، والإلزامي عند ${money(VAT_MANDATORY)}.`, color: colors.info, bg: colors.infoLight },
  near: { text: s => `قربت من الحد الإلزامي — باقي ${money(VAT_MANDATORY - s)} ريال. جهّز التسجيل مع محاسبك.`, color: colors.warning, bg: colors.warningLight },
  over: { text: () => `تعدّيت الحد الإلزامي (${money(VAT_MANDATORY)} ريال) — لازم تتسجل في الضريبة خلال ٣٠ يوم وإلا تجيك غرامة. كلّم محاسبك.`, color: colors.danger, bg: colors.dangerLight },
}

// إعداد واحد للمنشأة: مسجلة أو لا — وتقارير المحاسب كلها تمشي عليه
export default function VatRegistration({ orgId }: { orgId: string }) {
  const [s, setS] = useVatStatus(orgId)
  const [busy, setBusy] = useState(false)
  if (!s) return null
  async function set(v: boolean) {
    if (!s || busy || s.vat_registered === v) return
    setBusy(true)
    const r = await api.patch('/api/org-settings', { org_id: orgId, vat_registered: v })
    setBusy(false)
    if (!r.success) return toast(r.error || 'ما انحفظ', 'error')
    setS({ ...s, vat_registered: v }); toast('✅ انحفظ — تقارير المحاسب تمشي عليه')
  }
  const btn = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800, fontFamily: font.family, cursor: s.is_owner ? 'pointer' : 'default',
    border: `1.5px solid ${on ? colors.primary : colors.border}`, background: on ? colors.primaryLight : '#fff', color: on ? colors.primary : colors.text3 })
  const pct = Math.min(100, (s.sales12m / VAT_MANDATORY) * 100)
  const m = LEVEL_MSG[s.level]
  return (
    <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 800 }}><Receipt size={17} color={colors.primary} /> ضريبة القيمة المضافة</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={!s.is_owner || busy} onClick={() => set(true)} style={btn(s.vat_registered === true)}>منشأتي مسجلة</button>
        <button disabled={!s.is_owner || busy} onClick={() => set(false)} style={btn(s.vat_registered === false)}>غير مسجلة</button>
      </div>
      {s.vat_registered === null && <div style={{ fontSize: 12, color: colors.warning, fontWeight: 700 }}>حدد هذا الخيار عشان تقرير الضريبة عند محاسبك يطلع صح.</div>}
      {s.vat_registered !== true && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.text3, marginBottom: 6 }}>
            <span>مبيعاتك آخر ١٢ شهر</span><span style={{ fontWeight: 800, color: colors.text }}>{money(s.sales12m)} من {money(VAT_MANDATORY)} ريال</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: colors.bg, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: s.level === 'over' ? colors.danger : s.level === 'near' ? colors.warning : colors.primary }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 9, padding: '8px 10px', lineHeight: 1.6 }}>{m.text(s.sales12m)}</div>
          <div style={{ fontSize: 11, color: colors.text4, marginTop: 6 }}>من إقفالات الكاشير المسجلة — الحد الإلزامي يشمل كل إيرادات المنشأة.</div>
        </div>
      )}
    </div>
  )
}

// تنبيه بالرئيسية: لو المنشأة مو مسجلة ومبيعاتها قربت أو تعدّت الحد الإلزامي
export function VatThresholdBanner({ orgId }: { orgId: string }) {
  const [s] = useVatStatus(orgId)
  if (!s || s.vat_registered === true || (s.level !== 'near' && s.level !== 'over')) return null
  const over = s.level === 'over'
  return (
    <a href="/settings?tab=org" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textDecoration: 'none', marginBottom: 14, borderRadius: 12, padding: '12px 14px',
      background: over ? colors.dangerLight : colors.warningLight, border: `1px solid ${over ? colors.danger : colors.warning}33`, color: over ? colors.danger : colors.warning, fontFamily: font.family }}>
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
        {over ? 'مبيعاتك آخر ١٢ شهر تعدّت حد التسجيل الإلزامي في ضريبة القيمة المضافة' : 'مبيعاتك آخر ١٢ شهر قربت من حد التسجيل الإلزامي في ضريبة القيمة المضافة'}
{' — '}{money(s.sales12m)} ريال من حد {money(VAT_MANDATORY)}. {over ? 'لازم تتسجل خلال ٣٠ يوم.' : 'جهّز التسجيل مع محاسبك.'}
        <span style={{ textDecoration: 'underline', marginInlineStart: 6 }}>التفاصيل</span>
      </div>
    </a>
  )
}
