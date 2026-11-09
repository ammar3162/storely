'use client'
// رسالة المشتركين الحاليين: شكر + اختيار المزايا بالأسعار الجديدة، ويُطبَّق مع التجديد القادم (lib/pricingSwitch)
import { useEffect, useRef, useState } from 'react'
import { Check, Handshake } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { FEATURE_NAMES } from '@/lib/featurePresets'
import { customModuleAmount } from '@/lib/planPricing'
import { uncoveredBranches, uncoveredMessage } from '@/lib/branchCoverage'
import { C } from './nav'
import type { DashboardShell } from './useDashboardShell'

type Feature = { slug: string; perBranch: boolean; amount: number }
type Branch = { id: string; name: string }
type Data = { orgName: string; branches: number; renewsAt: string | null; current: number; selected: string[]; features: Feature[]; branchList?: Branch[] }
type Result = { current: number; projected: number; outcome: 'switch' | 'keep' }

const LATER_KEY = 'pricing_switch_later'
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const dateAr = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric', calendar: 'gregory', numberingSystem: 'latn' }) : ''

export default function PricingSwitchModal({ m }: { m: DashboardShell }) {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  // فروع كل ميزة «لكل فرع» (للمنشآت بأكثر من فرع) — الافتراضي كل الفروع
  const [branchMap, setBranchMap] = useState<Record<string, string[]>>({})
  const [preview, setPreview] = useState<Result | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const reqId = useRef(0)
  const [manual, setManual] = useState(0)   // فتح يدوي من الإعدادات («اختر مزاياك بالأسعار الجديدة»)

  useEffect(() => {
    const open = () => { try { sessionStorage.removeItem(LATER_KEY) } catch {}; setManual(n => n + 1) }
    window.addEventListener('pricing-switch-open', open)
    return () => window.removeEventListener('pricing-switch-open', open)
  }, [])

  // المالك فقط، وبعد موافقة الشروط — و«ذكّرني لاحقاً» تخفيها لهذه الجلسة بس
  useEffect(() => {
    if (!m.ready || m.userRole === 'manager' || m.showTermsConsent) return
    try { if (!manual && sessionStorage.getItem(LATER_KEY)) return } catch {}
    let off = false
    ;(async () => {
      const id = await getOrgId()
      if (!id || off) return
      const r = await api.get<Data & { show: boolean }>('/api/pricing-switch', { org_id: id })
      if (off || !r.success || !r.show) return
      setOrgId(id); setData(r); setPicked(r.selected)
      const all = (r.branchList || []).map(b => b.id)
      setBranchMap(Object.fromEntries(r.features.filter(f => f.perBranch).map(f => [f.slug, all])))
    })()
    return () => { off = true }
  }, [m.ready, m.userRole, m.showTermsConsent, manual])

  // الفاتورة المتوقعة مع كل تغيير في الاختيار
  useEffect(() => {
    if (!orgId || !data || done) return
    if (!picked.length) return   // بدون اختيار: العرض يكتب «—» من picked نفسه
    const my = ++reqId.current
    api.post<Result>('/api/pricing-switch', { org_id: orgId, modules: picked, branch_map: branchMap, preview: true }).then(r => {
      if (my === reqId.current && r.success) setPreview({ current: r.current, projected: r.projected, outcome: r.outcome })
    })
  }, [orgId, data, picked, branchMap, done])

  if (!data) return null

  const toggle = (slug: string) => setPicked(p => p.includes(slug) ? p.filter(s => s !== slug) : [...p, slug])
  const branchList = data.branchList || []
  const multi = branchList.length > 1
  // فرع لميزة: لازم يبقى فرع واحد على الأقل (لإلغاء الميزة كلها يشيل علامتها)
  const toggleBranch = (slug: string, id: string) => setBranchMap(m => {
    const cur = m[slug] || branchList.map(b => b.id)
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    return next.length ? { ...m, [slug]: next } : m
  })
  // شرط: كل فرع عليه خدمة واحدة على الأقل (فرع واحد = لازم خدمة لكل فرع، مو الذكاء بس)
  const branchIds = multi ? branchList.map(b => b.id) : ['_one']
  const missingIds = uncoveredBranches(branchIds, picked.map(slug => ({ slug, branchIds: multi && (branchMap[slug] || []).length < branchList.length ? branchMap[slug] : null })))
  const missingNames = picked.length ? missingIds.map(id => branchList.find(b => b.id === id)?.name || 'الفرع') : []
  const countOf = (slug: string) => (branchMap[slug] || branchList).length || data.branches
  const later = () => { try { sessionStorage.setItem(LATER_KEY, '1') } catch {}; setData(null) }
  const confirm = async () => {
    if (!orgId || !picked.length) return
    setSaving(true); setError('')
    const r = await api.post<Result>('/api/pricing-switch', { org_id: orgId, modules: picked, branch_map: branchMap })
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
                : <> سعركم الحالي ({fmt(done.current)} ⃁ شهرياً) أقل من سعر هذه الخدمات، لذا ستبقون على باقتكم الحالية بسعرها دون أي تغيير.</>}
            </div>
            <button className="sh-btn sh-btn-primary" style={{ width: '100%' }} onClick={() => setData(null)}>متابعة</button>
          </div>
        ) : (
          <>
            <div style={{ padding: '0 22px', fontSize: 14.5, color: C.text2, lineHeight: 1.95 }}>
              <p style={{ margin: '0 0 10px' }}>نشكر لكم ثقتكم بـ Storely، فأنتم من أوائل المنشآت التي اعتمدت عليه، ونعتز بشراكتكم ونتطلع إلى مواصلة النمو معكم.</p>
              <p style={{ margin: '0 0 8px' }}>حدّثنا نظام الأسعار، فلم تعد هناك باقات ثابتة. تختارون الخدمات التي تحتاجونها فقط، ويُحتسب سعر كل خدمة لكل فرع.</p>
              <ul style={{ margin: '0 0 14px', paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>تظهر لكم قيمة الفاتورة الجديدة قبل تأكيد اختياركم.</li>
                <li>إذا كانت الفاتورة الجديدة أقل من فاتورتكم الحالية، يُطبَّق اختياركم ابتداءً من تجديد اشتراككم القادم.</li>
                <li>إذا كانت أعلى من فاتورتكم الحالية، وقد يحدث ذلك للمنشآت ذات الفروع المتعددة، تبقون على باقتكم الحالية بسعرها دون أي زيادة.</li>
              </ul>
            </div>

            <div style={{ padding: '0 22px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: multi ? 2 : 8 }}>اختاروا الخدمات التي تحتاجونها <span style={{ fontWeight: 400, color: C.text3, fontSize: 12.5 }}>({branchesTxt})</span></div>
              {multi && <div style={{ fontSize: 12.5, color: C.text3, marginBottom: 8 }}>يمكنكم تحديد الفروع التي تحتاج كل خدمة، ويُحتسب سعرها على هذه الفروع فقط، على أن يكون لكل فرع خدمة واحدة على الأقل.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.features.map(f => {
                  const on = picked.includes(f.slug)
                  const n = f.perBranch && multi ? countOf(f.slug) : data.branches
                  const amount = f.perBranch && multi ? customModuleAmount(f.slug, n) : f.amount
                  const nTxt = n === 1 ? 'فرع واحد' : n === 2 ? 'فرعين' : `${n} فروع`
                  return (
                    <div key={f.slug}>
                    <button type="button" onClick={() => toggle(f.slug)} aria-pressed={on}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'right',
                        border: `1px solid ${on ? C.primary : C.border}`, background: on ? C.primaryL : C.surface, fontFamily: 'inherit' }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center',
                        border: `1.5px solid ${on ? C.primary : C.border2}`, background: on ? C.primary : 'transparent' }}>
                        {on && <Check size={14} strokeWidth={2.5} color="#fff" />}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>{FEATURE_NAMES[f.slug]?.ar || f.slug}</span>
                      <span style={{ fontSize: 13.5, color: C.text2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {fmt(amount)} ⃁ <span style={{ fontSize: 11.5, color: C.text3 }}>{f.perBranch ? (multi ? `لـ ${nTxt}` : data.branches > 1 ? `لـ ${branchesTxt}` : 'لكل فرع') : 'للمنشأة'}</span>
                      </span>
                    </button>
                    {on && f.perBranch && multi && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 4px 2px' }}>
                        <span style={{ fontSize: 12.5, color: C.text3 }}>الفروع:</span>
                        {branchList.map(b => {
                          const bOn = (branchMap[f.slug] || []).includes(b.id)
                          return (
                            <button key={b.id} type="button" onClick={() => toggleBranch(f.slug, b.id)} aria-pressed={bOn}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                                border: `1px solid ${bOn ? C.primary : C.border}`, background: bOn ? C.primary : C.surface, color: bOn ? '#fff' : C.text2 }}>
                              {bOn && <Check size={12} strokeWidth={2.5} />}{b.name || 'فرع'}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    </div>
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
                    : 'سعركم الحالي أقل من سعر هذه الخدمات، لذا ستبقون على باقتكم الحالية بسعرها.'}
                </div>
              )}
            </div>

            {missingNames.length > 0 && <div role="alert" style={{ margin: '10px 22px 0', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.7, color: C.danger, background: '#fef3f2', border: '1px solid #fecdca' }}>{uncoveredMessage(missingNames)}</div>}
            {error && <div role="alert" style={{ margin: '10px 22px 0', fontSize: 13, color: C.danger }}>{error}</div>}

            <div style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="sh-btn sh-btn-primary" style={{ width: '100%' }} onClick={confirm} disabled={!picked.length || saving || missingNames.length > 0}>
                {saving ? 'جاري الحفظ...' : !picked.length ? 'اختاروا خدمة واحدة على الأقل' : missingNames.length ? 'اختاروا خدمة لكل فرع' : 'تأكيد اختياري'}
              </button>
              <button type="button" className="sh-link-btn" style={{ alignSelf: 'center', fontSize: 13.5, color: C.text3, background: 'none', border: 'none', cursor: 'pointer', padding: 6, fontFamily: 'inherit' }} onClick={later}>ذكّرني لاحقاً</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
