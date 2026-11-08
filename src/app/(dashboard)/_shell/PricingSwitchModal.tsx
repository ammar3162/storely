'use client'
// رسالة المشتركين الحاليين: شكر + اختيار المزايا بالأسعار الجديدة، ويُطبَّق مع التجديد القادم (lib/pricingSwitch)
import { useEffect, useRef, useState } from 'react'
import { Check, Handshake } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { FEATURE_NAMES } from '@/lib/featurePresets'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

type Feature = { slug: string; perBranch: boolean; amount: number }
type Data = { orgName: string; branches: number; renewsAt: string | null; current: number; selected: string[]; features: Feature[] }
type Result = { current: number; projected: number; outcome: 'switch' | 'keep' }

const LATER_KEY = 'pricing_switch_later'
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const dateAr = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric', calendar: 'gregory', numberingSystem: 'latn' }) : ''

export default function PricingSwitchModal({ m }: { m: DashboardShell }) {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [preview, setPreview] = useState<Result | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const reqId = useRef(0)

  // المالك فقط، وبعد موافقة الشروط — و«ذكّرني لاحقاً» تخفيها لهذه الجلسة بس
  useEffect(() => {
    if (!m.ready || m.userRole === 'manager' || m.showTermsConsent) return
    try { if (sessionStorage.getItem(LATER_KEY)) return } catch {}
    let off = false
    ;(async () => {
      const id = await getOrgId()
      if (!id || off) return
      const r = await api.get<Data & { show: boolean }>('/api/pricing-switch', { org_id: id })
      if (off || !r.success || !r.show) return
      setOrgId(id); setData(r); setPicked(r.selected)
    })()
    return () => { off = true }
  }, [m.ready, m.userRole, m.showTermsConsent])

  // الفاتورة المتوقعة مع كل تغيير في الاختيار
  useEffect(() => {
    if (!orgId || !data || done) return
    if (!picked.length) return   // بدون اختيار: العرض يكتب «—» من picked نفسه
    const my = ++reqId.current
    api.post<Result>('/api/pricing-switch', { org_id: orgId, modules: picked, preview: true }).then(r => {
      if (my === reqId.current && r.success) setPreview({ current: r.current, projected: r.projected, outcome: r.outcome })
    })
  }, [orgId, data, picked, done])

  if (!data) return null

  const toggle = (slug: string) => setPicked(p => p.includes(slug) ? p.filter(s => s !== slug) : [...p, slug])
  const later = () => { try { sessionStorage.setItem(LATER_KEY, '1') } catch {}; setData(null) }
  const confirm = async () => {
    if (!orgId || !picked.length) return
    setSaving(true); setError('')
    const r = await api.post<Result>('/api/pricing-switch', { org_id: orgId, modules: picked })
    setSaving(false)
    if (!r.success) { setError(r.error || 'تعذر حفظ اختيارك، حاول مرة أخرى'); return }
    setDone({ current: r.current, projected: r.projected, outcome: r.outcome })
  }
  const renew = dateAr(data.renewsAt)
  const branchesTxt = data.branches === 1 ? 'فرع واحد' : data.branches === 2 ? 'فرعين' : `${data.branches} فروع`

  return (
    <div className="sh-overlay" style={{ zIndex: 3050 }}>
      <div className="sh-modal" style={{ maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ padding: '22px 22px 0' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.primaryL, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <Handshake size={22} strokeWidth={1.75} color={C.primary} />
          </div>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 4 }}>إلى شركائنا في</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 12 }}>{data.orgName}</div>
        </div>

        {done ? (
          <div style={{ padding: '0 22px 22px' }}>
            <div style={{ fontSize: 15, color: C.text, lineHeight: 1.9, marginBottom: 14 }}>
              شكراً لثقتكم، تم تسجيل اختياركم.
              {done.outcome === 'switch'
                ? <> تصبح فاتورتكم <b>{fmt(done.projected)} ⃁ شهرياً</b> بدلاً من {fmt(done.current)} ⃁، ابتداءً من تجديد اشتراككم القادم{renew ? ` في ${renew}` : ''}، وتبقى فاتورتكم الحالية كما هي حتى ذلك التاريخ.</>
                : <> سعركم الحالي ({fmt(done.current)} ⃁ شهرياً) أقل من سعر هذه المزايا، لذا ستبقون على باقتكم الحالية بسعرها دون أي تغيير.</>}
            </div>
            <button className="sh-btn sh-btn-primary" style={{ width: '100%' }} onClick={() => setData(null)}>متابعة</button>
          </div>
        ) : (
          <>
            <div style={{ padding: '0 22px', fontSize: 14.5, color: C.text2, lineHeight: 1.95 }}>
              <p style={{ margin: '0 0 10px' }}>كنتم البداية، ومعكم كبُر Storely. أنتم من أوائل المنشآت التي وثقت بنا، ونعتز بكم شركاءَ متميزين، ونتطلع إلى أن ننمو معاً.</p>
              <p style={{ margin: '0 0 14px' }}>عدّلنا أسعارنا لتناسب كل منشأة: لم تعد هناك باقات ثابتة، بل تختارون المزايا التي تحتاجونها وتدفعون مقابلها فقط. ووعدٌ منا: لن تدفعوا أكثر من فاتورتكم الحالية.</p>
            </div>

            <div style={{ padding: '0 22px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>اختاروا المزايا التي تحتاجونها <span style={{ fontWeight: 400, color: C.text3, fontSize: 12.5 }}>({branchesTxt})</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.features.map(f => {
                  const on = picked.includes(f.slug)
                  return (
                    <button key={f.slug} type="button" onClick={() => toggle(f.slug)} aria-pressed={on}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'right',
                        border: `1px solid ${on ? C.primary : C.border}`, background: on ? C.primaryL : C.surface, fontFamily: 'inherit' }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center',
                        border: `1.5px solid ${on ? C.primary : C.border2}`, background: on ? C.primary : 'transparent' }}>
                        {on && <Check size={14} strokeWidth={2.5} color="#fff" />}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>{FEATURE_NAMES[f.slug]?.ar || f.slug}</span>
                      <span style={{ fontSize: 13.5, color: C.text2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {fmt(f.amount)} ⃁ <span style={{ fontSize: 11.5, color: C.text3 }}>{f.perBranch ? (data.branches > 1 ? `لـ ${branchesTxt}` : 'لكل فرع') : 'للمنشأة'}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ margin: '14px 22px 0', padding: '12px 14px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: C.text2, marginBottom: 6 }}>
                <span>فاتورتكم الحالية</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(data.current)} ⃁ شهرياً</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: C.text }}>
                <span>بعد اختياركم</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{!picked.length ? '—' : preview ? `${fmt(preview.outcome === 'switch' ? preview.projected : preview.current)} ⃁ شهرياً` : '…'}</span>
              </div>
              {preview && picked.length > 0 && (
                <div style={{ fontSize: 12.5, color: C.text3, marginTop: 8, lineHeight: 1.7 }}>
                  {preview.outcome === 'switch'
                    ? `يُطبَّق من تجديد اشتراككم القادم${renew ? ` في ${renew}` : ''}، وتبقى فاتورتكم الحالية حتى ذلك التاريخ.`
                    : 'سعركم الحالي أقل من سعر هذه المزايا، لذا ستبقون على باقتكم الحالية بسعرها.'}
                </div>
              )}
            </div>

            {error && <div role="alert" style={{ margin: '10px 22px 0', fontSize: 13, color: C.danger }}>{error}</div>}

            <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="sh-btn sh-btn-primary" style={{ width: '100%' }} onClick={confirm} disabled={!picked.length || saving}>
                {saving ? 'جاري الحفظ...' : !picked.length ? 'اختاروا ميزة واحدة على الأقل' : 'تأكيد اختياري'}
              </button>
              <button type="button" className="sh-link-btn" style={{ alignSelf: 'center', fontSize: 13.5, color: C.text3, background: 'none', border: 'none', cursor: 'pointer', padding: 6, fontFamily: 'inherit' }} onClick={later}>ذكّرني لاحقاً</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
