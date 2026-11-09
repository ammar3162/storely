'use client'
import { Store } from 'lucide-react'
export const dynamic = 'force-dynamic'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import { StorelyCard } from '@/components/ui/card'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { getMe } from '@/lib/session'
import { colors } from '@/lib/ds'
import { currencySymbol } from '@/lib/currencySymbol'

const BC_STYLES = `
  .bc-page{max-width:1200px;min-width:0;margin:0 auto;padding:${T.spacing[6]}px;direction:rtl;font-family:${T.typography.family};font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};color:${T.color.text};background:${T.color.background};border-radius:${T.radius.panel}}
  .bc-page *{box-sizing:border-box}
  .bc-page>header{margin-bottom:${T.spacing[6]}px}
  .bc-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
  .bc-page>header p{font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .bc-page .ui-workspace{padding:${T.spacing[6]}px;margin-bottom:${T.spacing[6]}px;min-width:0;border:1px solid ${T.color.border};border-radius:${T.radius.card};background:${T.color.surface};overflow:visible}
  .bc-page .ui-section-title{font-size:${T.typography.section}px;font-weight:600;color:${T.color.text};margin-bottom:${T.spacing[3]}px;line-height:${T.typography.lineHeight};overflow-wrap:anywhere}
  .bc-page .ui-supporting{font-size:${T.typography.supporting}px;color:${T.color.textMuted};line-height:1.8}
  .bc-page .ui-strong{font-size:${T.typography.body}px;font-weight:600;line-height:${T.typography.lineHeight}}
  .bc-page .ui-value{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.6;overflow-wrap:anywhere}
  .bc-page .ui-between{display:flex;align-items:center;justify-content:space-between;gap:${T.spacing[3]}px;flex-wrap:wrap;min-width:0}
  .bc-page .ui-inline{display:flex;align-items:center;gap:${T.spacing[2]}px;flex-wrap:wrap;min-width:0}
  .bc-page .ui-stack{display:flex;flex-direction:column;gap:${T.spacing[3]}px;min-width:0}
  .bc-page .ui-total{display:flex;justify-content:space-between;align-items:baseline;gap:${T.spacing[3]}px;padding-top:${T.spacing[4]}px;margin-top:${T.spacing[4]}px;border-top:1px solid ${T.color.border};font-size:${T.typography.section}px;font-weight:600}
  .bc-page .ui-button{display:inline-flex;align-items:center;justify-content:center;gap:${T.spacing[2]}px;min-height:40px;height:auto;max-width:100%;padding:${T.spacing[2]}px ${T.spacing[4]}px;background:${T.color.surface};border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};color:${T.color.navy};font-size:${T.typography.body}px;font-weight:600;line-height:1.6;font-family:inherit;text-decoration:none;white-space:normal;cursor:pointer;box-shadow:none}
  .bc-page .ui-button:hover:not(:disabled){background:${T.color.infoBg};border-color:${T.color.infoBorder}}
  .bc-page .ui-button:disabled{opacity:.5;cursor:not-allowed}
  .bc-page .ui-primary{background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .bc-page .ui-primary:hover:not(:disabled){background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .bc-page .ui-danger{background:${T.color.surface};border-color:${T.color.dangerBorder};color:${T.color.danger}}
  .bc-page .ui-danger:hover:not(:disabled){background:${T.color.dangerBg};border-color:${T.color.dangerBorder}}
  .bc-page .ui-control{width:100%;height:44px;min-width:0;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.text};font-family:inherit;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .bc-page .ui-control::placeholder{color:${T.color.textSubtle};opacity:1}
  .bc-page .ui-control:focus-visible,.bc-page button:focus-visible{outline:2px solid ${T.color.navy};outline-offset:2px;box-shadow:${T.shadow.focus}}
  .bc-page input[type=number],.bc-page input[type=month]{direction:ltr;font-variant-numeric:tabular-nums}
  .bc-page input[type=number]{text-align:start}
  .bc-page .ui-label{display:flex;align-items:center;gap:${T.spacing[2]}px;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[3]}px;cursor:pointer}
  .bc-page .ui-checkbox{width:16px;height:16px;flex-shrink:0;accent-color:${T.color.navy}}
  .bc-page .ui-empty{padding:${T.spacing[8]}px ${T.spacing[6]}px;text-align:center;background:${T.color.surface};border:1px solid ${T.color.border};border-radius:${T.radius.card}}
  .bc-page .ui-loading{padding:${T.spacing[8]}px;text-align:center}
  .bc-page.ui-access{text-align:center;padding:${T.spacing[8]}px ${T.spacing[6]}px;background:${T.color.surface};border:1px solid ${T.color.border};max-width:680px}
  .bc-page .ui-large-icon{font-size:24px;margin-bottom:${T.spacing[4]}px}
  @media(max-width:640px){.bc-page{padding:${T.spacing[4]}px}.bc-page .ui-workspace{padding:${T.spacing[5]}px}.bc-page .ui-between{align-items:flex-start}}
  @media(prefers-reduced-motion:reduce){.bc-page *{animation:none!important;transition:none!important}}

  .bc-page>.ui-stack{gap:${T.spacing[5]}px}
  .bc-page .bc-branch{margin-bottom:0}
  .bc-branch>.ui-between{margin-bottom:${T.spacing[4]}px}
  .bc-branch>.ui-between .ui-section-title{margin:0;font-size:16px}
  .bc-branch>.ui-between>span{font-size:${T.typography.supporting}px;border:1px solid currentColor;border-radius:${T.radius.control};padding:${T.spacing[1]}px ${T.spacing[2]}px;font-weight:600}
  .bc-rank{display:flex;align-items:center;justify-content:center;min-width:24px;color:${T.color.textMuted};font-variant-numeric:tabular-nums}
  .bc-bar-track{height:4px;background:${T.color.infoBg};border-radius:${T.radius.control};overflow:hidden;margin-bottom:${T.spacing[5]}px}
  .bc-bar-fill{height:100%;background:${T.color.navy};border-radius:inherit}
  .bc-operations,.bc-inventory{display:grid;gap:0;margin-bottom:${T.spacing[4]}px;border-bottom:1px solid ${T.color.border};padding-bottom:${T.spacing[4]}px}
  .bc-operations{grid-template-columns:repeat(4,minmax(0,1fr))}
  .bc-inventory{grid-template-columns:repeat(3,minmax(0,1fr))}
  .bc-stat{padding:${T.spacing[2]}px ${T.spacing[3]}px;border-inline-start:1px solid ${T.color.border};min-width:0;text-align:start}
  .bc-stat:first-child{border-inline-start:0;padding-inline-start:0}
  .bc-stat>.ui-value{font-size:20px}
  .bc-stat>.ui-supporting{margin-top:${T.spacing[1]}px}
  .bc-page .bc-expand{width:100%;justify-content:space-between;border:0;padding:${T.spacing[2]}px 0}
  .bc-branch .ui-stack>.ui-between{padding:${T.spacing[3]}px 0;border-bottom:1px solid ${T.color.border}}
  .bc-branch .ui-stack>.ui-between:last-child{border-bottom:0}
  .bc-page .sk{height:64px;margin-bottom:${T.spacing[3]}px;background:${T.color.border};border-radius:${T.radius.control}}
  @media(max-width:640px){.bc-operations{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:${T.spacing[3]}px}.bc-stat{padding-inline:${T.spacing[2]}px}.bc-inventory .bc-stat>.ui-value{font-size:${T.typography.section}px}.bc-inventory .bc-stat>.ui-supporting{font-size:${T.typography.supporting}px}}
`

export default function BranchComparePage() {
  const [comparison, setComparison] = useState<any[]>([])
  const [maxDispensed, setMaxDispensed] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [curr, setCurr] = useState('⃁')

  useEffect(() => { load() }, [])
  useEffect(() => {
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)) })
  }, [])

  async function load() {
    setLoading(true)
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) { setLoading(false); return }
    const res = await fetch('/api/branch-comparison', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId }) })
    const data = await res.json()
    setComparison(data.comparison || [])
    setMaxDispensed(data.maxDispensed || 1)
    setLoading(false)
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const org = (await getMe())?.org
      const { exportReportPdf } = await import('@/lib/pdfExport')
      await exportReportPdf({
        title: 'مقارنة أداء الفروع',
        subtitle: 'آخر 30 يوم',
        orgName: (org as any)?.name || 'Storely',
        columns: [
          { header: 'الفرع', key: 'name' },
          { header: 'مصروف', key: 'dispensed', align: 'left' },
          { header: 'مضاف', key: 'added', align: 'left' },
          { header: 'المشتريات', key: 'purchases', align: 'left' },
          { header: 'الكفاءة', key: 'efficiency', align: 'left' },
          { header: 'إجمالي الأصناف', key: 'invTotal', align: 'left' },
          { header: 'ناقص', key: 'invLow', align: 'left' },
          { header: 'نفد', key: 'invOut', align: 'left' },
          { header: 'الأكثر استهلاكاً', key: 'topProduct', align: 'right' },
        ],
        // خدمة غير مفعّلة للفرع = «—» بدل صفر، وما تدخل في الإجماليات
        rows: comparison.map((b: any) => {
          const inv = b.features?.inventory !== false, pur = b.features?.purchases !== false
          return {
            name: b.name,
            dispensed: inv ? b.dispensed : '—',
            added: inv ? b.added : '—',
            purchases: pur ? Number(b.purchases || 0).toFixed(0) + ' ' + curr : '—',
            efficiency: inv ? b.efficiency + '%' : '—',
            invTotal: inv ? (b.inventory?.total || 0) : '—',
            invLow: inv ? (b.inventory?.low || 0) : '—',
            invOut: inv ? (b.inventory?.out || 0) : '—',
            topProduct: inv && b.topProducts?.[0] ? `${b.topProducts[0].name} (${b.topProducts[0].qty} ${b.topProducts[0].unit})` : '—',
          }
        }),
        summaryStats: [
          { label: 'عدد الفروع', value: String(comparison.length), color:'#717553' },
          { label: 'إجمالي الصرف', value: String(comparison.filter(b => b.features?.inventory !== false).reduce((s, b) => s + b.dispensed, 0)), color: colors.danger },
          { label: 'إجمالي المشتريات', value: comparison.filter(b => b.features?.purchases !== false).reduce((s, b) => s + Number(b.purchases || 0), 0).toFixed(0) + ' ' + curr, color: colors.primary },
        ],
        fileName: `مقارنة-الفروع-${new Date().toISOString().slice(0, 10)}.pdf`,
      })
    } catch { alert('تعذر تصدير التقرير') }
    setExportingPdf(false)
  }

  const barColors = [T.color.navy]

  if (loading) return (
    <div className="bc-page">
      <style>{BC_STYLES}</style>

      <div className="ui-loading">
        <div className="sk bc-stat"  />
        {[1, 2, 3].map(i => (<div key={i} className="sk bc-stat"  />))}
      </div>
    </div>
  )

  return (
    <div className="bc-page">
      <style>{BC_STYLES}</style>
      <StorelyPageHeader title="مقارنة الفروع" description={<>الصرف، المخزون، الكفاءة، وأكثر المنتجات استهلاكاً لكل فرع (آخر 30 يوم)</>} actions={<StorelyButton className="ui-button" onClick={handleExportPdf} disabled={exportingPdf || comparison.length === 0}>
          {exportingPdf ? 'جاري التصدير...' : 'تصدير PDF'}
        </StorelyButton>}/>

      {comparison.length === 0 ? (
        <div className="ui-empty">
          <div className="ui-large-icon"><Store size={32}/></div>
          <div className="ui-section-title" style={{color:T.color.text}}>لا توجد فروع نشطة</div>
          <div className="ui-supporting" style={{color:T.color.textMuted}}>أضف فروع من صفحة الإعدادات لعرض المقارنة</div>
        </div>
      ) : (
        <div className="ui-stack">
          {comparison.map((b: any, i: number) => {
            const pct = Math.round((b.dispensed / maxDispensed) * 100)
            const c = barColors[i % barColors.length]
            const inv = b.inventory || { total: 0, low: 0, out: 0 }
            const isOpen = !!expanded[b.id]
            // خدمات الفرع: اللي مو مفعّلة تطلع «غير مفعّل» بدل أصفار وكفاءة 0% حمراء
            const hasInv = b.features?.inventory !== false, hasPur = b.features?.purchases !== false
            const off = (label: string) => (
              <div className="bc-stat">
                <div className="ui-value" style={{color:T.color.textMuted}}>—</div>
                <div className="ui-supporting" style={{color:T.color.textMuted}}>{label}</div>
              </div>
            )
            return (
              <StorelyCard className="ui-workspace bc-branch" key={b.id}>
                <div className="ui-between">
                  <div className="ui-inline">
                    <div className="bc-rank">
                      <span className="ui-strong" style={{color:c}}>{i + 1}</span>
                    </div>
                    <div className="ui-section-title" style={{color:T.color.text}}>{b.name}</div>
                  </div>
                  {hasInv
                    ? <span className="ui-strong" style={{color:b.efficiency >= 80 ? T.color.navy : b.efficiency >= 50 ? T.color.warning : T.color.danger}}>كفاءة {b.efficiency}%</span>
                    : <span className="ui-supporting" style={{color:T.color.textMuted}}>المخزون غير مفعّل لهذا الفرع</span>}
                </div>

                {hasInv && (
                  <div className="bc-bar-track">
                    <div className="bc-bar-fill" style={{width:pct + '%'}} />
                  </div>
                )}

                <div className="bc-operations">
                  {hasInv ? <div className="bc-stat">
                    <div className="ui-value" style={{color:T.color.danger}}>{b.dispensed}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>مصروف</div>
                  </div> : off('مصروف — غير مفعّل')}
                  {hasInv ? <div className="bc-stat">
                    <div className="ui-value" style={{color:T.color.navy}}>{b.added}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>مضاف</div>
                  </div> : off('مضاف — غير مفعّل')}
                  {hasPur ? <div className="bc-stat">
                    <div className="ui-value" style={{color:T.color.info}}>{Number(b.purchases || 0).toFixed(0)}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>مشتريات ({curr})</div>
                  </div> : off('المشتريات غير مفعّلة')}
                  {hasInv ? <div className="bc-stat">
                    <div className="ui-value" style={{color:T.color.navy}}>{b.ops}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>عملية صرف</div>
                  </div> : off('عمليات الصرف — غير مفعّل')}
                </div>

                {/* حالة المخزون الحالية */}
                {hasInv && <div className="bc-inventory">
                  <div className="bc-stat">
                    <div className="ui-value" style={{color:T.color.text}}>{inv.total}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>إجمالي الأصناف</div>
                  </div>
                  <div className="bc-stat">
                    <div className="ui-value" style={{color:inv.low > 0 ? T.color.warning : T.color.textMuted}}>{inv.low}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>ناقصة</div>
                  </div>
                  <div className="bc-stat">
                    <div className="ui-value" style={{color:inv.out > 0 ? T.color.danger : T.color.textMuted}}>{inv.out}</div>
                    <div className="ui-supporting" style={{color:T.color.textMuted}}>نفدت</div>
                  </div>
                </div>}

                {/* أكثر المنتجات استهلاكاً */}
                {hasInv && b.topProducts && b.topProducts.length > 0 && (
                  <div>
                    <StorelyButton className="ui-button bc-expand" onClick={() => setExpanded(prev => ({ ...prev, [b.id]: !prev[b.id] }))}>
                      <span className="ui-strong" style={{color:T.color.text}}>الأكثر استهلاكاً</span>
                      <span className="ui-supporting" style={{color:T.color.textMuted}}>{isOpen ? '▲ إخفاء' : '▼ عرض'}</span>
                    </StorelyButton>
                    {isOpen && (
                      <div className="ui-stack">
                        {b.topProducts.map((p: any, pi: number) => (
                          <div className="ui-between" key={pi}>
                            <span className="ui-strong" style={{color:T.color.text}}>{pi + 1}. {p.name}</span>
                            <span className="ui-strong" style={{color:c}}>{p.qty} {p.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </StorelyCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
