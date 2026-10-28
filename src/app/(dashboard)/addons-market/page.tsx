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
import { billLines, planKeyOf, addonPeriodEnd, proratedCharge, unitPrice } from '@/lib/planPricing'
import { isInApp } from '@/lib/inApp'

export default function AddonsMarketPage() {
  const [addons, setAddons] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [orgId, setOrgId] = useState('')
  const [cancelling, setCancelling] = useState<string|null>(null)
  const [plan, setPlan] = useState<{ key: string; cycle: 'monthly'|'yearly'; maxBranches: number; locked?: number | null } | null>(null)
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
    setPlan({ key: me.org?.plan || '', cycle: me.org?.billing_cycle || 'monthly', maxBranches: me.org?.max_branches || 1, locked: me.org?.locked_plan_monthly ?? null })
    setSubEndsAt(me.subscription_ends_at || null)
    if (!cachedOid) await load(me.org_id)
    setLoading(false)
  }

  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [staffBranchMap, setStaffBranchMap] = useState<Record<string, string>>({})
  const [menuSel, setMenuSel] = useState<string[] | null>(null)

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

  function DueNote({ addon, qty }: { addon: any; qty: number }) {
    const d = dueNow(addon, qty)
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center' as const, color: colors.text4, fontFamily: font.family }}>جاري التحميل...</div>

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}><PageIcon/>الإضافات</h1>
        <p style={pageSub}>ميزات إضافية تساعدك تطوّر منشأتك — اشترك بأي وقت</p>
      </div>

      {plan && (() => {
        const bill = billLines(planKeyOf(plan.key, plan.maxBranches), plan.cycle, addons, plan.locked)
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
                    {a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text4 }}>⃁ / وحدة / شهر — لكل فرع لحاله</span>
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
            if (a.slug === 'online_menu' && branches.length > 1) {
              const covered: string[] = active && Array.isArray(a.subscription?.branch_ids) ? a.subscription.branch_ids : []
              const legacyAll = active && !covered.length
              const options = branches.filter(b => !covered.includes(b.id))
              const picked = (menuSel ?? (active ? [] : branches.map(b => b.id))).filter(id => options.some(b => b.id === id))
              return (
                <div key={a.id} style={{ ...card, padding: 20, position: 'relative' as const, border: active ? `1.5px solid ${colors.primaryBorder}` : undefined, background: active ? colors.primaryLight : undefined }}>
                  {active && (
                    <button onClick={() => cancelAddon(a)} disabled={cancelling === a.id} title="إلغاء الاشتراك"
                      style={{ position: 'absolute' as const, top: 12, left: 12, width: 26, height: 26, borderRadius: 8, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                      {cancelling === a.id ? '…' : '🗑️'}
                    </button>
                  )}
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{a.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 6 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.7, marginBottom: 14 }}>{a.description}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary, marginBottom: 14 }}>
                    {a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text4 }}>⃁ / فرع / شهر — لكل فرع منيو ورابط خاص</span>
                  </div>

                  {active && (
                    <div style={{ fontSize: 12, color: colors.text, marginBottom: 12, lineHeight: 1.8 }}>
                      <div style={{ fontWeight: 800, color: colors.primary }}>✅ مفعّلة حتى {new Date(a.subscription.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}</div>
                      {legacyAll
                        ? <div style={{ color: colors.text3 }}>منيو موحد لكل الفروع</div>
                        : <div style={{ color: colors.text3 }}>الفروع: {covered.map(id => branches.find(b => b.id === id)?.name).filter(Boolean).join('، ')}</div>}
                    </div>
                  )}

                  {!legacyAll && options.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: colors.text3, marginBottom: 8 }}>{active ? 'تبي تضيف فروع؟' : 'اختر الفروع:'}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
                        {options.map(b => {
                          const checked = picked.includes(b.id)
                          return (
                            <label key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px', borderRadius: 99, cursor: 'pointer', border: `1px solid ${checked ? colors.primaryBorder : colors.border2}`, background: checked ? colors.primaryLight : 'white', color: colors.text }}>
                              <input type="checkbox" checked={checked} onChange={() => setMenuSel(checked ? picked.filter(x => x !== b.id) : [...picked, b.id])} />
                              {b.name}
                            </label>
                          )
                        })}
                      </div>
                      {picked.length > 0 ? (
                        <>
                          <DueNote addon={a} qty={picked.length} />
                          <RequestBtn addon={a} quantity={picked.length} branchIds={picked} label={`${active ? 'اطلب إضافة الفروع' : 'اطلب الإضافة'} (${picked.length * a.monthly_price} ⃁/شهر)`} />
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: colors.text4, textAlign: 'center' as const }}>اختر فرع واحد على الأقل</div>
                      )}
                    </>
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
                    {cancelling === a.id ? '…' : '🗑️'}
                  </button>
                )}
                <div style={{ fontSize: 32, marginBottom: 10 }}>{a.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 6 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.7, marginBottom: 14, minHeight: 40 }}>{a.description}</div>
                {(() => {
                  const isQtyAddon = a.slug === 'extra_suppliers' || a.slug === 'extra_branch'
                  const qty = qtyMap[a.id] || 1
                  return (
                    <div style={{ fontSize: 18, fontWeight: 900, color: colors.primary, marginBottom: 14 }}>
                      {isQtyAddon && !active ? qty * a.monthly_price : a.monthly_price} <span style={{ fontSize: 11, fontWeight: 700, color: colors.text4 }}>⃁ / شهر{isQtyAddon ? ` (${a.monthly_price} ⃁/وحدة)` : ''}</span>
                    </div>
                  )
                })()}

                {active ? (
                  <div style={{ textAlign: 'center' as const }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: colors.primary, marginBottom: 4 }}>✅ مفعّلة{(a.slug==='extra_suppliers'||a.slug==='extra_branch') ? ` (${a.subscription?.quantity||1})` : ''}</div>
                    <div style={{ fontSize: 10, color: colors.text4 }}>حتى {new Date(a.subscription.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}</div>
                    {a.slug === 'extra_branch' && (
                      <RequestBtn addon={a} quantity={1} label="تحتاج فرع زيادة؟ اطلب فرع إضافي" link />
                    )}
                  </div>
                ) : (
                  <>
                    {(a.slug === 'extra_suppliers' || a.slug === 'extra_branch') && (
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
