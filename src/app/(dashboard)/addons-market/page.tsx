'use client'
export const dynamic = 'force-dynamic'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import { StorelyCard } from '@/components/ui/card'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { billLines, planKeyOf, addonPeriodEnd, proratedCharge } from '@/lib/planPricing'
import { isInApp } from '@/lib/inApp'

const AM_STYLES = `
  .am-page{max-width:1200px;min-width:0;margin:0 auto;padding:${T.spacing[6]}px;direction:rtl;font-family:${T.typography.family};font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};color:${T.color.text};background:${T.color.background};border-radius:${T.radius.panel}}
  .am-page *{box-sizing:border-box}
  .am-page>header{margin-bottom:${T.spacing[6]}px}
  .am-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
  .am-page>header p{font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .am-page .ui-workspace{padding:${T.spacing[6]}px;margin-bottom:${T.spacing[6]}px;min-width:0;border:1px solid ${T.color.border};border-radius:${T.radius.card};background:${T.color.surface};overflow:visible}
  .am-page .ui-section-title{font-size:${T.typography.section}px;font-weight:600;color:${T.color.text};margin-bottom:${T.spacing[3]}px;line-height:${T.typography.lineHeight};overflow-wrap:anywhere}
  .am-page .ui-supporting{font-size:${T.typography.supporting}px;color:${T.color.textMuted};line-height:1.8}
  .am-page .ui-strong{font-size:${T.typography.body}px;font-weight:600;line-height:${T.typography.lineHeight}}
  .am-page .ui-value{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.6;overflow-wrap:anywhere}
  .am-page .ui-between{display:flex;align-items:center;justify-content:space-between;gap:${T.spacing[3]}px;flex-wrap:wrap;min-width:0}
  .am-page .ui-inline{display:flex;align-items:center;gap:${T.spacing[2]}px;flex-wrap:wrap;min-width:0}
  .am-page .ui-stack{display:flex;flex-direction:column;gap:${T.spacing[3]}px;min-width:0}
  .am-page .ui-total{display:flex;justify-content:space-between;align-items:baseline;gap:${T.spacing[3]}px;padding-top:${T.spacing[4]}px;margin-top:${T.spacing[4]}px;border-top:1px solid ${T.color.border};font-size:${T.typography.section}px;font-weight:600}
  .am-page .ui-button{display:inline-flex;align-items:center;justify-content:center;gap:${T.spacing[2]}px;min-height:40px;height:auto;max-width:100%;padding:${T.spacing[2]}px ${T.spacing[4]}px;background:${T.color.surface};border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};color:${T.color.navy};font-size:${T.typography.body}px;font-weight:600;line-height:1.6;font-family:inherit;text-decoration:none;white-space:normal;cursor:pointer;box-shadow:none}
  .am-page .ui-button:hover:not(:disabled){background:${T.color.infoBg};border-color:${T.color.infoBorder}}
  .am-page .ui-button:disabled{opacity:.5;cursor:not-allowed}
  .am-page .ui-primary{background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .am-page .ui-primary:hover:not(:disabled){background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .am-page .ui-danger{background:${T.color.surface};border-color:${T.color.dangerBorder};color:${T.color.danger}}
  .am-page .ui-danger:hover:not(:disabled){background:${T.color.dangerBg};border-color:${T.color.dangerBorder}}
  .am-page .ui-control{width:100%;height:44px;min-width:0;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.text};font-family:inherit;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .am-page .ui-control::placeholder{color:${T.color.textSubtle};opacity:1}
  .am-page .ui-control:focus-visible,.am-page button:focus-visible{outline:2px solid ${T.color.navy};outline-offset:2px;box-shadow:${T.shadow.focus}}
  .am-page input[type=number],.am-page input[type=month]{direction:ltr;font-variant-numeric:tabular-nums}
  .am-page input[type=number]{text-align:right}
  .am-page .ui-label{display:flex;align-items:center;gap:${T.spacing[2]}px;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[3]}px;cursor:pointer}
  .am-page .ui-checkbox{width:16px;height:16px;flex-shrink:0;accent-color:${T.color.navy}}
  .am-page .ui-empty{padding:${T.spacing[8]}px ${T.spacing[6]}px;text-align:center;background:${T.color.surface};border:1px solid ${T.color.border};border-radius:${T.radius.card}}
  .am-page .ui-loading{padding:${T.spacing[8]}px;text-align:center}
  .am-page.ui-access{text-align:center;padding:${T.spacing[8]}px ${T.spacing[6]}px;background:${T.color.surface};border:1px solid ${T.color.border};max-width:680px}
  .am-page .ui-large-icon{font-size:24px;margin-bottom:${T.spacing[4]}px}
  @media(max-width:640px){.am-page{padding:${T.spacing[4]}px}.am-page .ui-workspace{padding:${T.spacing[5]}px}.am-page .ui-between{align-items:flex-start}}
  @media(prefers-reduced-motion:reduce){.am-page *{animation:none!important;transition:none!important}}

  .am-page .am-bill{margin-bottom:${T.spacing[6]}px}
  .am-bill>.ui-between{padding-block:${T.spacing[2]}px;border-bottom:1px solid ${T.color.border}}
  .am-bill>.ui-between:last-of-type{border-bottom:0}
  .am-bill>.ui-value{display:flex;align-items:baseline;justify-content:space-between;gap:${T.spacing[3]}px;margin-top:${T.spacing[4]}px;padding-top:${T.spacing[4]}px;border-top:1px solid ${T.color.border};font-size:${T.typography.section}px}
  .am-page .am-catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;gap:${T.spacing[5]}px}
  .am-page .am-addon{position:relative;display:flex;flex-direction:column;align-items:stretch;margin:0;min-width:0}
  .am-addon>.ui-section-title{padding-inline-end:${T.spacing[8]}px;margin-bottom:${T.spacing[2]}px}
  .am-addon-icon{font-size:20px;line-height:1.5;margin-bottom:${T.spacing[3]}px}
  .am-addon>.ui-supporting{margin-bottom:${T.spacing[4]}px}
  .am-addon>.ui-value{margin-bottom:${T.spacing[4]}px}
  .am-addon>.ui-value>.ui-strong{font-size:${T.typography.supporting}px;font-weight:400}
  .am-addon>.ui-stack{margin-bottom:${T.spacing[4]}px}
  .am-addon>.ui-inline{margin-bottom:${T.spacing[3]}px}
  .am-addon .ui-inline>.ui-control{flex:1;min-width:0}
  .am-addon .ui-control[type=number]{flex:0 0 80px;width:80px;text-align:center}
  .am-addon .ui-stack>.ui-inline{align-items:flex-start;flex-wrap:wrap;padding:${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface}}
  .am-addon .ui-stack>.ui-inline>div{min-width:0;flex:1 1 140px}
  .am-addon .ui-danger{min-height:36px;padding:${T.spacing[1]}px ${T.spacing[3]}px;font-size:${T.typography.supporting}px}
  .am-page .am-cancel{position:absolute;inset-inline-end:${T.spacing[4]}px;top:${T.spacing[4]}px;width:32px;height:32px;min-height:32px;padding:0}
  .am-addon>a.ui-primary{margin-top:auto;width:100%}
  .am-addon>.ui-supporting>.ui-button{margin-top:${T.spacing[3]}px}
  @media(max-width:700px){.am-page .am-catalog{grid-template-columns:minmax(0,1fr)}}
`

export default function AddonsMarketPage() {
  const [addons, setAddons] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [orgId, setOrgId] = useState('')
  const [cancelling, setCancelling] = useState<string|null>(null)
  const [plan, setPlan] = useState<{ key: string; cycle: 'monthly'|'yearly'; maxBranches: number } | null>(null)
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
    setPlan({ key: me.org?.plan || '', cycle: me.org?.billing_cycle || 'monthly', maxBranches: me.org?.max_branches || 1 })
    setSubEndsAt(me.subscription_ends_at || null)
    if (!cachedOid) await load(me.org_id)
    setLoading(false)
  }

  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})
  const [staffBranchMap, setStaffBranchMap] = useState<Record<string, string>>({})

  async function load(oid: string) {
    const j = await api.get('/api/addons-market', { org_id: oid })
    if (j.success) {
      setAddons(j.addons)
      setBranches(j.branches || [])
      if ((j.branches || []).length) setStaffBranchMap(prev => ({ 'extra_staff_default': prev['extra_staff_default'] || j.branches[0].id }))
    }
  }

  // الإضافة تنتهي مع الباقة: المستحق الحين بالتناسب عن الأيام الباقية لين التجديد
  function dueNow(addon: any, qty: number) {
    const end = addonPeriodEnd(subEndsAt)
    const pr = proratedCharge(Number(addon.monthly_price) || 0, qty, end)
    return { ...pr, endStr: end.toLocaleDateString('ar-SA', { numberingSystem: 'latn', month: 'long', day: 'numeric' }) }
  }

  function DueNote({ addon, qty }: { addon: any; qty: number }) {
    const d = dueNow(addon, qty)
    return (
      <div className="ui-supporting" style={{color:T.color.textMuted}}>
        تدفع الحين <b style={{color:T.color.text}}>{d.amount} ر.س</b> عن {d.days} يوم لين تجديد باقتك ({d.endStr})، وبعدها تتجدد مع الباقة.
      </div>
    )
  }

  function subscribeLink(addon: any, qty: number = 1, branchId?: string) {
    const isStaffAddon = addon.slug === 'extra_staff'
    const isQtyAddon = addon.slug === 'extra_staff' || addon.slug === 'extra_suppliers' || addon.slug === 'extra_branch'
    const branchName = branchId ? (branches.find(b => b.id === branchId)?.name || '') : ''
    const text = isStaffAddon
      ? `مرحباً، أبي أشترك بميزة "${addon.name}" لفرع "${branchName}" — الكمية: ${qty} (${qty * addon.monthly_price} ر.س/شهر) لمنشأة: ${orgName}`
      : isQtyAddon
      ? `مرحباً، أبي أشترك بميزة "${addon.name}" — الكمية: ${qty} (${qty * addon.monthly_price} ر.س/شهر) لمنشأة: ${orgName}`
      : `مرحباً، أبي أشترك بميزة "${addon.name}" (${addon.monthly_price} ر.س/شهر) لمنشأة: ${orgName}`
    const d = dueNow(addon, qty)
    return `https://wa.me/966594351667?text=${encodeURIComponent(`${text}\nالمستحق الحين: ${d.amount} ر.س (${d.days} يوم لين تجديد الباقة)`)}`
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
    <div className="am-page ui-access">
      <style>{AM_STYLES}</style>
      <div className="ui-section-title" style={{color:T.color.text}}>الإضافات</div>
      <div className="ui-supporting" style={{color:T.color.textMuted}}>إدارة الاشتراك والإضافات متاحة من حسابك على الموقع.</div>
    </div>
  )

  if (loading) return <div className="ui-loading" style={{color:T.color.textMuted}}>جاري التحميل...</div>

  return (
    <div className="am-page">
      <style>{AM_STYLES}</style>
      <StorelyPageHeader title="الإضافات" description={<>ميزات إضافية تساعدك تطوّر منشأتك — اشترك بأي وقت</>}/>

      {plan && (() => {
        const bill = billLines(planKeyOf(plan.key, plan.maxBranches), plan.cycle, addons)
        return (
          <StorelyCard className="ui-workspace am-bill">
            <div className="ui-section-title" style={{color:T.color.text}}>فاتورتك الحالية</div>
            {bill.lines.map((l, i) => (
              <div className="ui-between" key={i} style={{color:T.color.textMuted}}>
                <span>{l.label}</span><span className="ui-strong" style={{color:T.color.text}}>{l.amount} ر.س</span>
              </div>
            ))}
            <div className="ui-value" style={{color:T.color.navy}}>
              <span>الإجمالي</span><span>{bill.total} ر.س</span>
            </div>
          </StorelyCard>
        )
      })()}

      {addons.length === 0 ? (
        <div className="ui-loading" style={{color:T.color.textMuted}}>ما فيه إضافات متاحة حالياً</div>
      ) : (
        <div className="am-catalog">
          {addons.map((a: any) => {
            // "موظف إضافي" له بطاقة خاصة (يدعم عدة فروع بنفس الوقت)
            if (a.slug === 'extra_staff') {
              const subs = a.subscriptions || []
              const selectedBranch = staffBranchMap['extra_staff_default'] || (branches[0]?.id || '')
              const qty = qtyMap[a.id] || 1
              return (
                <StorelyCard className="ui-workspace am-addon" key={a.id}>
                  <div className="am-addon-icon">{a.icon}</div>
                  <div className="ui-section-title" style={{color:T.color.text}}>{a.name}</div>
                  <div className="ui-supporting" style={{color:T.color.textMuted}}>{a.description}</div>
                  <div className="ui-value" style={{color:T.color.navy}}>
                    {a.monthly_price} <span className="ui-strong" style={{color:T.color.textMuted}}>ر.س / وحدة / شهر — لكل فرع لحاله</span>
                  </div>

                  {subs.length > 0 && (
                    <div className="ui-stack">
                      {subs.map((s: any) => {
                        const branchName = branches.find(b => b.id === s.branch_id)?.name || 'فرع'
                        return (
                          <div className="ui-inline" key={s.branch_id}>
                            <div className="ui-supporting" style={{color:T.color.text}}>
                              {branchName} — مفعّلة لـ{s.quantity} حتى {new Date(s.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}
                            </div>
                            <StorelyButton className="ui-button ui-danger" variant="danger" onClick={() => cancelAddon(a, s.branch_id)} disabled={cancelling === a.id + s.branch_id}>
                              {cancelling === a.id + s.branch_id ? '...' : 'إلغاء'}
                            </StorelyButton>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {branches.length > 0 ? (
                    <>
                      <DueNote addon={a} qty={qty} />
                      <div className="ui-inline">
                        <select className="ui-control" value={selectedBranch} onChange={e => setStaffBranchMap(prev => ({ ...prev, extra_staff_default: e.target.value }))}>
                          {branches.map((b: any) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                        </select>
                        <input className="ui-control" type="number" min={1} max={20} value={qty}
                          onChange={e => setQtyMap(prev => ({ ...prev, [a.id]: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))}
                           />
                      </div>
                      <a className="ui-button ui-primary" href={subscribeLink(a, qty, selectedBranch)} target="_blank" rel="noopener noreferrer">
                        اشتراك عبر واتساب ({qty * a.monthly_price} ر.س)
                      </a>
                    </>
                  ) : (
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>ما فيه فروع نشطة حالياً</div>
                  )}
                </StorelyCard>
              )
            }

            const active = a.subscription?.isValid
            return (
              <StorelyCard className="ui-workspace am-addon" key={a.id}>
                {active && (
                  <StorelyButton className="ui-button ui-danger am-cancel" variant="danger" onClick={() => cancelAddon(a)} disabled={cancelling === a.id}
                    title="إلغاء الاشتراك">
                    {cancelling === a.id ? '…' : '🗑️'}
                  </StorelyButton>
                )}
                <div className="am-addon-icon">{a.icon}</div>
                <div className="ui-section-title" style={{color:T.color.text}}>{a.name}</div>
                <div className="ui-supporting" style={{color:T.color.textMuted}}>{a.description}</div>
                {(() => {
                  const isQtyAddon = a.slug === 'extra_suppliers' || a.slug === 'extra_branch'
                  const qty = qtyMap[a.id] || 1
                  return (
                    <div className="ui-value" style={{color:T.color.navy}}>
                      {isQtyAddon && !active ? qty * a.monthly_price : a.monthly_price} <span className="ui-strong" style={{color:T.color.textMuted}}>ر.س / شهر{isQtyAddon ? ` (${a.monthly_price} ر.س/وحدة)` : ''}</span>
                    </div>
                  )
                })()}

                {active ? (
                  <div >
                    <div className="ui-supporting" style={{color:T.color.navy}}>✅ مفعّلة{(a.slug==='extra_suppliers'||a.slug==='extra_branch') ? ` (${a.subscription?.quantity||1})` : ''}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>حتى {new Date(a.subscription.expires_at).toLocaleDateString('ar-SA', { numberingSystem: 'latn' })}</div>
                    {a.slug === 'extra_branch' && (
                      <a className="ui-button" href={subscribeLink(a, (a.subscription?.quantity || 1) + 1)} target="_blank" rel="noopener noreferrer">
                        تحتاج فرع زيادة؟ اطلب عبر واتساب
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    {(a.slug === 'extra_suppliers' || a.slug === 'extra_branch') && (
                      <div className="ui-between">
                        <span className="ui-strong" style={{color:T.color.textMuted}}>الكمية:</span>
                        <input className="ui-control" type="number" min={1} max={20} value={qtyMap[a.id] || 1}
                          onChange={e => setQtyMap(prev => ({ ...prev, [a.id]: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))}
                           />
                      </div>
                    )}
                    <DueNote addon={a} qty={qtyMap[a.id] || 1} />
                    <a className="ui-button ui-primary" href={subscribeLink(a, qtyMap[a.id] || 1)} target="_blank" rel="noopener noreferrer">
                      اشتراك عبر واتساب
                    </a>
                  </>
                )}
              </StorelyCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
