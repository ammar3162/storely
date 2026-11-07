'use client'
export const dynamic = 'force-dynamic'
import PageIcon from '@/components/PageIcon'
import { cache } from '@/lib/cache'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import NumberInput from '@/components/NumberInput'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { confirmDialog } from '@/components/ConfirmDialog'
import { colors, font, card, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { billLines, planKeyOf, addonPeriodEnd, proratedCharge, unitPrice, branchPriceFor, PLAN_PRICING, isNewPlan, nextPlanOf, planPriceFor, customModuleAmount, isCustomPlan, NEW_PLANS, CUSTOM_MODULES, signupAddonsMonthly, CUSTOM_STAFF_STEP, PLAN_CAPS } from '@/lib/planPricing'
import { Check, Trash2 } from 'lucide-react'
import { isInApp } from '@/lib/inApp'
import { ListSkeleton } from '@/components/PageSkeleton'

export default function AddonsMarketPage() {
  const [addons, setAddons] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [orgId, setOrgId] = useState('')
  const [cancelling, setCancelling] = useState<string|null>(null)
  const [plan, setPlan] = useState<{ key: string; cycle: 'monthly'|'yearly'; maxBranches: number; planBranches: number; staffIncluded?: number | null; locked?: number | null; discount?: any } | null>(null)
  const [subEndsAt, setSubEndsAt] = useState<string | null>(null)
  const [inApp, setInApp] = useState(false)
  useEffect(() => { setInApp(isInApp()) }, [])

  useEffect(() => { init() }, [])

  async function init() {
    // لو المعرّف محفوظ بالجلسة، نبدأ جلب الإضافات فوراً بالتوازي مع فحص المستخدم بدل ما ننتظره
    const cachedOid = sessionStorage.getItem('s_org_id')
    const [me] = await Promise.all([
      getMe(),
      cachedOid ? load(cachedOid) : Promise.resolve(),
    ])
    if (!me) return
    setOrgId(me.org_id)
    setOrgName(me.org?.name || '')
    setPlan({ key: me.org?.plan || '', cycle: me.org?.billing_cycle || 'monthly', maxBranches: me.org?.max_branches || 1, planBranches: me.org?.plan_branches || 1, staffIncluded: me.org?.staff_included ?? null, locked: me.org?.locked_plan_monthly ?? null, discount: me.org })
    setSubEndsAt(me.subscription_ends_at || null)
    if (!cachedOid) await load(me.org_id)
    setLoading(false)
  }

  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [staffBranchMap, setStaffBranchMap] = useState<Record<string, string>>({})
  // إضافة لكل فرع (الكاشير/الحضور بالباقات الجديدة): الفروع اللي اختارها العميل
  const [branchPick, setBranchPick] = useState<Record<string, string[]>>({})

  async function load(oid: string) {
    // آخر نسخة محفوظة تطلع على طول، وبعدها تتحدث من الخادم
    const cached = cache.get('addons:' + oid)
    if (cached) { setAddons(cached.addons); setBranches(cached.branches || []); setLoading(false) }
    const j = await api.get('/api/addons-market', { org_id: oid })
    loadRequests(oid)
    if (j.success) {
      cache.set('addons:' + oid, { addons: j.addons, branches: j.branches || [] })
      setAddons(j.addons)
      setBranches(j.branches || [])
      if ((j.branches || []).length) setStaffBranchMap(prev => ({ 'extra_staff_default': prev['extra_staff_default'] || j.branches[0].id }))
    }
  }

  // الإضافة تنتهي مع الباقة: المستحق الحين بالتناسب عن الأيام الباقية لين التجديد
  function dueNow(addon: any, qty: number) {
    const end = addonPeriodEnd(subEndsAt)
    // الوحدات الزايدة على اشتراك ساري بسعره المثبّت، والجديدة بالسعر الحالي
    const live = addon.subscription?.isValid ? addon.subscription : null
    const pr = proratedCharge(unitPrice(addon.monthly_price, live), qty, end)
    return { ...pr, endStr: end.toLocaleDateString('ar-SA', { numberingSystem: 'latn', month: 'long', day: 'numeric' }) }
  }

  function DueNote({ addon, qty, monthlyDelta }: { addon: any; qty: number; monthlyDelta?: number }) {
    // «ابنِ باقتك»: الفرق الشهري (الفرع الأول + الإضافي) بالتناسب
    const d = monthlyDelta != null
      ? (() => { const end = addonPeriodEnd(subEndsAt); return { ...proratedCharge(monthlyDelta, 1, end), endStr: end.toLocaleDateString('ar-SA', { numberingSystem: 'latn', month: 'long', day: 'numeric' }) } })()
      : dueNow(addon, qty)
    return (
      <div style={{ fontSize: 11, color: colors.text3, lineHeight: 1.7, marginBottom: 12 }}>
        تدفع الحين <b style={{ color: colors.text }}>{d.amount} ⃁</b> عن {d.days} يوم لين تجديد باقتك ({d.endStr})، وبعدها تتجدد مع الباقة.
      </div>
    )
  }

  // طلب إضافة: يوصل للأدمن بلوحته ويوافق عليه (بدل رسالة واتساب)
  const [requests, setRequests] = useState<any[]>([])
  const [sending, setSending] = useState<string | null>(null)
  // تحديث فوري: موافقة الأدمن على طلب أو تغيّر اشتراك يظهر بدون تحديث الصفحة
  useLiveRefresh(orgId || null, ['addon_requests', 'org_addon_subscriptions'], () => { if (orgId) load(orgId) })

  async function loadRequests(oid: string) {
    const j = await api.get('/api/addons-market/requests', { org_id: oid })
    if (j.success) setRequests(j.requests || [])
  }
  const pendingFor = (addonId: string) => requests.find(r => r.addon_id === addonId && r.status === 'pending')
  async function requestAddon(addon: any, quantity: number, branchIds?: string[]) {
    setSending(addon.id)
    const j = await api.post('/api/addons-market/requests', { org_id: orgId, addon_id: addon.id, quantity, branch_ids: branchIds })
    setSending(null)
    if (!j.success) { toast(j.error || 'فشل إرسال الطلب', 'error'); return }
    toast('وصلنا طلبك — نراجعه ونفعّل الإضافة ويوصلك إشعار')
    loadRequests(orgId)
  }
  async function cancelRequest(r: any) {
    const j = await api.del('/api/addons-market/requests', undefined, { org_id: orgId, id: r.id })
    if (!j.success) { toast(j.error || 'فشل الإلغاء', 'error'); return }
    toast('تم إلغاء الطلب'); loadRequests(orgId)
  }
  function RequestBtn({ addon, quantity, branchIds, label, link }: { addon: any; quantity: number; branchIds?: string[]; label: string; link?: boolean }) {
    const pend = pendingFor(addon.id)
    if (pend) return (
      <div style={{ marginTop: link ? 10 : 0, padding: '10px 12px', borderRadius: 10, background: colors.warningLight, border: `1px solid ${colors.warningBorder}`, fontSize: 12, color: colors.warning, fontWeight: 700, textAlign: 'center' as const }}>
        طلبك قيد المراجعة
        <button onClick={() => cancelRequest(pend)} style={{ display: 'block', margin: '6px auto 0', border: 'none', background: 'none', color: colors.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>إلغاء الطلب</button>
      </div>
    )
    if (link) return (
      <button onClick={() => requestAddon(addon, quantity, branchIds)} disabled={sending === addon.id}
        style={{ display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 700, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        {sending === addon.id ? 'جاري الإرسال...' : label}
      </button>
    )
    return (
      <button onClick={() => requestAddon(addon, quantity, branchIds)} disabled={sending === addon.id}
        style={{ display: 'block', width: '100%', textAlign: 'center' as const, padding: '11px', background: colors.primary, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: sending === addon.id ? .7 : 1 }}>
        {sending === addon.id ? 'جاري الإرسال...' : label}
      </button>
    )
  }

  async function cancelAddon(addon: any, branchId?: string) {
    if (!(await confirmDialog({
      title: 'إلغاء الاشتراك',
      message: `متأكد إنك تبي تلغي اشتراكك بميزة "${addon.name}"${branchId ? ` لفرع "${branches.find(b=>b.id===branchId)?.name||''}"` : ''}؟ راح تفقد الوصول لها فوراً — بما في ذلك صفحة المنتجات العامة وكل بياناتها المعروضة، بدون استرجاع.`,
    }))) return

    setCancelling(addon.id + (branchId||''))
    const j = await api.del('/api/addons-market', undefined, { org_id: orgId, addon_id: addon.id, branch_id: branchId })
    setCancelling(null)
    if (!j.success) { toast(j.error || 'فشل الإلغاء', 'error'); return }
    toast('تم إلغاء الاشتراك')
    load(orgId)
  }

  if (inApp) return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 480, margin: '80px auto', textAlign: 'center' as const, ...card, padding: 32 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 8 }}>الإضافات</div>
      <div style={{ fontSize: 13, color: colors.text3, lineHeight: 1.8 }}>إدارة الاشتراك والإضافات متاحة من حسابك على الموقع.</div>
    </div>
  )

  if (loading) return <ListSkeleton/>

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}><PageIcon/>الإضافات</h1>
        <p style={pageSub}>ميزات إضافية تساعدك تطوّر منشأتك — اشترك بأي وقت</p>
      </div>

      {plan && (() => {
        const pk = planKeyOf(plan.key, plan.maxBranches)
        const bill = billLines(pk, plan.cycle, addons, plan.locked, plan.discount, plan.planBranches, plan.staffIncluded)
        // الباقات الجديدة: لو فاتورته وصلت سعر الباقة الأعلى (لنفس الفروع) نقترحها
        let up = isNewPlan(pk) ? nextPlanOf(pk) : null
        let upPrice = up ? planPriceFor(up, null, plan.planBranches).monthly : 0
        // «ابنِ باقتك»: باقة جاهزة تغطي مزاياه الحالية بسعر أقل؟
        if (isCustomPlan(pk) && !plan.locked) {
          const mods = addons.filter((a: any) => a.subscription?.isValid && CUSTOM_MODULES[a.slug]).map((a: any) => a.slug as string)
          const n = plan.planBranches
          const extraStaff = Math.max(0, (plan.staffIncluded ?? PLAN_CAPS.custom.staff * n) - PLAN_CAPS.custom.staff * n) * CUSTOM_STAFF_STEP
          const best = mods.length ? NEW_PLANS.map(k => ({ k, total: planPriceFor(k, null, n).monthly + signupAddonsMonthly(k, mods, n) + extraStaff }))
            .sort((x, y) => x.total - y.total || NEW_PLANS.indexOf(y.k) - NEW_PLANS.indexOf(x.k))[0] : null
          up = best && best.total < bill.total ? best.k : null
          upPrice = best?.total || 0
        }
        return (
          <div style={{ ...card, padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: colors.text, marginBottom: 10 }}>فاتورتك الحالية</div>
            {bill.lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: colors.text3, padding: '4px 0' }}>
                <span>{l.label}</span><span style={{ fontWeight: 700, color: colors.text, whiteSpace: 'nowrap' }}>{l.amount} ⃁</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${colors.border}`, marginTop: 8, paddingTop: 10, fontSize: 14, fontWeight: 900, color: colors.primary }}>
              <span>الإجمالي</span><span>{bill.total} ⃁</span>
            </div>
            {up && plan.cycle === 'monthly' && bill.total >= upPrice && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: colors.primaryLight, border: `1px solid ${colors.primaryBorder}`, fontSize: 12, color: colors.text, lineHeight: 1.8 }}>
                <b style={{ color: colors.primary }}>باقة «{PLAN_PRICING[up].label}» أوفر لك:</b> {upPrice} ⃁ شهرياً{plan.maxBranches > 1 ? ` لـ ${plan.maxBranches} فروع` : ''}، وفيها {up === 'essential' ? 'المخزون والمشتريات لكل الفروع' : up === 'ops' ? 'المخزون والمشتريات وإقفال الكاشير لكل الفروع' : 'كل المميزات لكل الفروع'}. <a href="/settings" style={{ color: colors.primary, fontWeight: 800 }}>اطلب الترقية</a>
              </div>
            )}
            {pk === 'basic' && plan.cycle === 'monthly' && bill.total >= PLAN_PRICING.pro.monthly && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: colors.primaryLight, border: `1px solid ${colors.primaryBorder}`, fontSize: 12, color: colors.text, lineHeight: 1.8 }}>
                <b style={{ color: colors.primary }}>الشاملة أوفر لك:</b> {PLAN_PRICING.pro.monthly} ⃁ شهرياً وفيها كل المميزات و3 فروع و15 موظف. <a href="/settings" style={{ color: colors.primary, fontWeight: 800 }}>اطلب الترقية</a>
              </div>
            )}
          </div>
        )
      })()}

      {addons.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: 'center' as const, color: colors.text4 }}>ما فيه إضافات متاحة حالياً</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {addons.map((a: any) => {
            // "موظف إضافي" له بطاقة خاصة (يدعم عدة فروع بنفس الوقت)
            if (a.slug === 'extra_staff') {
              const subs = a.subscriptions || []
              const selectedBranch = staffBranchMap['extra_staff_default'] || (branches[0]?.id || '')
              const qty = qtyMap[a.id] || 1
              return (
                <div key={a.id} style={{ ...card, padding: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{a.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 6 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.7, marginBottom: 14 }}>{a.description}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary, marginBottom: 14 }}>
                    {a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text4 }}>⃁ / موظف / شهر — فوق حد باقتك</span>
                  </div>

                  {subs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 12 }}>
                      {subs.map((s: any) => {
                        const branchName = branches.find(b => b.id === s.branch_id)?.name || 'فرع'
                        return (
                          <div key={s.branch_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: colors.primaryLight, border: `1px solid ${colors.primaryBorder}` }}>
                            <div style={{ flex: 1, fontSize: 11, color: colors.text }}>
                              {branchName} — مفعّلة لـ{s.quantity} حتى {new Date(s.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}
                            </div>
                            <button onClick={() => cancelAddon(a, s.branch_id)} disabled={cancelling === a.id + s.branch_id}
                              style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {cancelling === a.id + s.branch_id ? '...' : 'إلغاء'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {branches.length > 0 ? (
                    <>
                      <DueNote addon={a} qty={qty} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <select value={selectedBranch} onChange={e => setStaffBranchMap(prev => ({ ...prev, extra_staff_default: e.target.value }))}
                          style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.border2}`, fontSize: 12, fontFamily: 'inherit', background: 'white' }}>
                          {branches.map((b: any) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                        </select>
                        <NumberInput min={1} max={20} value={qty}
                          onChange={e => setQtyMap(prev => ({ ...prev, [a.id]: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))}
                          style={{ width: 56, padding: '6px 4px', borderRadius: 8, border: `1px solid ${colors.border2}`, fontSize: 12, textAlign: 'center' as const, fontFamily: 'inherit' }} />
                      </div>
                      <RequestBtn addon={a} quantity={qty} branchIds={selectedBranch ? [selectedBranch] : undefined} label={`اطلب الإضافة (${qty * a.monthly_price} ⃁)`} />
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: colors.text4, textAlign: 'center' as const }}>ما فيه فروع نشطة حالياً</div>
                  )}
                </div>
              )
            }

            const active = a.subscription?.isValid
            // إضافة لكل فرع: يختار الفروع، والسعر × عددها
            if (a.per_branch) {
              const subBranches: string[] = (active && a.subscription?.branch_ids) || branches.map((b: any) => b.id)
              const chosen: string[] = branchPick[a.id] || subBranches
              const changed = active && (chosen.length !== subBranches.length || chosen.some(id => !subBranches.includes(id)))
              const added = active ? chosen.filter(id => !subBranches.includes(id)).length : chosen.length
              // «ابنِ باقتك»: الفرع الأول بسعر والباقي بسعر الفرع الإضافي
              const isMod = a.extra_price != null
              const monthlyFor = (n: number) => n <= 0 ? 0 : isMod ? customModuleAmount(a.slug, n, a.subscription?.locked_price) : n * a.monthly_price
              const delta = monthlyFor(chosen.length) - (active ? monthlyFor(subBranches.length) : 0)
              return (
                <div key={a.id} style={{ ...card, padding: 20, border: active ? `1.5px solid ${colors.primaryBorder}` : undefined, background: active ? colors.primaryLight : undefined }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 6 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.7, marginBottom: 14, minHeight: 40 }}>{a.description}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary, marginBottom: 12 }}>
                    {a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text3 }}>{isMod ? `⃁ للفرع الأول، و${a.extra_price} ⃁ لكل فرع إضافي` : '⃁ / فرع / شهر'}</span>
                  </div>
                  {active && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: colors.primary, marginBottom: 10 }}>
                      <Check size={15} /> مفعّلة لـ {subBranches.length} {subBranches.length === 1 ? 'فرع' : 'فروع'} حتى {new Date(a.subscription.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}
                    </div>
                  )}
                  {branches.length > 1 && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 6 }}>الفروع اللي تبيها فيها:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {branches.map((b: any) => {
                          const sel = chosen.includes(b.id)
                          return (
                            <button key={b.id} type="button" onClick={() => setBranchPick(p => ({ ...p, [a.id]: sel ? chosen.filter(x => x !== b.id) : [...chosen, b.id] }))}
                              style={{ padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                                border: `1px solid ${sel ? colors.primary : colors.border2}`, background: sel ? colors.primary : 'white', color: sel ? 'white' : colors.text }}>
                              {b.name}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                  {(!active || changed) && chosen.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: colors.text, marginBottom: 8 }}>
                        الشهري: <b>{monthlyFor(chosen.length)} ⃁</b> ({chosen.length} {chosen.length === 1 ? 'فرع' : 'فروع'})
                        {active && chosen.length < subBranches.length && <span style={{ display: 'block', color: colors.text3, fontSize: 11 }}>الفروع اللي تشيلها تتوقف من تجديد باقتك الجاي.</span>}
                      </div>
                      {added > 0 && (isMod ? delta > 0 && <DueNote addon={a} qty={added} monthlyDelta={delta} /> : <DueNote addon={a} qty={added} />)}
                      <RequestBtn addon={a} quantity={chosen.length} branchIds={chosen} label={active ? 'اطلب تعديل الفروع' : 'اطلب الإضافة'} />
                    </>
                  )}
                  {chosen.length === 0 && <div style={{ fontSize: 12, color: colors.danger }}>اختر فرع واحد على الأقل</div>}
                  {active && !changed && (
                    <button onClick={() => cancelAddon(a)} disabled={cancelling === a.id}
                      style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: colors.danger, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Trash2 size={14} /> {cancelling === a.id ? 'جاري الإلغاء…' : 'إلغاء الإضافة'}
                    </button>
                  )}
                </div>
              )
            }
            return (
              <div key={a.id} style={{ ...card, padding: 20, position: 'relative' as const, border: active ? `1.5px solid ${colors.primaryBorder}` : undefined, background: active ? colors.primaryLight : undefined }}>
                {active && (
                  <button onClick={() => cancelAddon(a)} disabled={cancelling === a.id}
                    title="إلغاء الاشتراك"
                    style={{ position: 'absolute' as const, top: 12, left: 12, width: 26, height: 26, borderRadius: 8, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                    {cancelling === a.id ? '…' : <Trash2 size={14} />}
                  </button>
                )}
                <div style={{ fontSize: 32, marginBottom: 10 }}>{a.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 6 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.7, marginBottom: 14, minHeight: 40 }}>{a.description}</div>
                {a.slug === 'extra_branch' ? (
                  <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary, marginBottom: 14 }}>
                    {plan ? branchPriceFor(plan.key) : a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text4 }}>⃁ / فرع / شهر</span>
                  </div>
                ) : (() => {
                  const isQtyAddon = a.slug === 'extra_suppliers'
                  const qty = qtyMap[a.id] || 1
                  return (
                    <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary, marginBottom: 14 }}>
                      {isQtyAddon && !active ? qty * a.monthly_price : a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text4 }}>⃁ / شهر{isQtyAddon ? ` (${a.monthly_price} ⃁/وحدة)` : ''}</span>
                    </div>
                  )
                })()}

                {active ? (
                  <div style={{ textAlign: 'center' as const }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: colors.primary, marginBottom: 4 }}><Check size={15} /> مفعّلة{(a.slug==='extra_suppliers'||a.slug==='extra_branch') ? ` (${a.subscription?.quantity||1})` : ''}</div>
                    <div style={{ fontSize: 10, color: colors.text4 }}>حتى {new Date(a.subscription.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}</div>
                    {a.slug === 'extra_branch' && (
                      <a href="/branches" style={{ display: 'block', marginTop: 8, fontSize: 12, fontWeight: 700, color: colors.primary, textDecoration: 'none' }}>تحتاج فرع زيادة؟ اطلبه من صفحة الفروع</a>
                    )}
                  </div>
                ) : a.slug === 'extra_branch' ? (
                  <a href="/branches" style={{ display: 'block', textAlign: 'center' as const, padding: '10px', borderRadius: 10, background: colors.primary, color: 'white', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>اطلب فرع من صفحة الفروع</a>
                ) : (
                  <>
                    {a.slug === 'extra_suppliers' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: colors.text3, fontWeight: 700 }}>الكمية:</span>
                        <NumberInput min={1} max={20} value={qtyMap[a.id] || 1}
                          onChange={e => setQtyMap(prev => ({ ...prev, [a.id]: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))}
                          style={{ width: 56, padding: '6px 4px', borderRadius: 8, border: `1px solid ${colors.border2}`, fontSize: 12, textAlign: 'center' as const, fontFamily: 'inherit' }} />
                      </div>
                    )}
                    <DueNote addon={a} qty={qtyMap[a.id] || 1} />
                    <RequestBtn addon={a} quantity={qtyMap[a.id] || 1} label="اطلب الإضافة" />
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
