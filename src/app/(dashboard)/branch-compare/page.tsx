'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, font, card, btnSecondary, pageTitle, pageSub } from '@/lib/ds'

export default function BranchComparePage() {
  const [comparison, setComparison] = useState<any[]>([])
  const [maxDispensed, setMaxDispensed] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const sb = createClient()

  useEffect(() => { load() }, [])

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
      const orgId = sessionStorage.getItem('s_org_id')
      const { data: org } = orgId ? await sb.from('organizations').select('name').eq('id', orgId).single() : { data: null }
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
        ],
        rows: comparison.map((b: any) => ({
          name: b.name,
          dispensed: b.dispensed,
          added: b.added,
          purchases: Number(b.purchases || 0).toFixed(0) + ' ر.س',
          efficiency: b.efficiency + '%',
        })),
        summaryStats: [
          { label: 'عدد الفروع', value: String(comparison.length), color: '#7c3aed' },
          { label: 'إجمالي الصرف', value: String(comparison.reduce((s, b) => s + b.dispensed, 0)), color: colors.danger },
          { label: 'إجمالي المشتريات', value: comparison.reduce((s, b) => s + Number(b.purchases || 0), 0).toFixed(0) + ' ر.س', color: colors.primary },
        ],
        fileName: `مقارنة-الفروع-${new Date().toISOString().slice(0, 10)}.pdf`,
      })
    } catch { alert('تعذر تصدير التقرير') }
    setExportingPdf(false)
  }

  const barColors = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#0891b2']

  if (loading) return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 800, margin: '0 auto' }}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.4}}.sk{animation:sk 1.4s infinite}`}</style>
      <div style={{ ...card, padding: 40 }}>
        <div className="sk" style={{ height: 16, width: '40%', background: colors.border, borderRadius: 6, marginBottom: 20 }} />
        {[1, 2, 3].map(i => (<div key={i} className="sk" style={{ height: 60, background: colors.border, borderRadius: 10, marginBottom: 10 }} />))}
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <h1 style={{ ...pageTitle }}>📊 مقارنة الفروع</h1>
          <p style={{ ...pageSub }}>أداء كل فرع من حيث الصرف والمشتريات والكفاءة (آخر 30 يوم)</p>
        </div>
        <button onClick={handleExportPdf} disabled={exportingPdf || comparison.length === 0}
          style={{ ...btnSecondary, padding: '8px 16px', fontSize: font.xs, opacity: exportingPdf || comparison.length === 0 ? 0.6 : 1, cursor: exportingPdf || comparison.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {exportingPdf ? '⏳ جاري التصدير...' : '📄 تصدير PDF'}
        </button>
      </div>

      {comparison.length === 0 ? (
        <div style={{ ...card, padding: '64px 20px', textAlign: 'center' as const }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
          <div style={{ fontSize: font.md, fontWeight: 600, color: colors.text2, marginBottom: 4 }}>لا توجد فروع نشطة</div>
          <div style={{ fontSize: font.sm, color: colors.text4 }}>أضف فروع من صفحة الإعدادات لعرض المقارنة</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          {comparison.map((b: any, i: number) => {
            const pct = Math.round((b.dispensed / maxDispensed) * 100)
            const c = barColors[i % barColors.length]
            return (
              <div key={b.id} style={{ ...card, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: c + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${c}44` }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: c }}>{i + 1}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>{b.name}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: b.efficiency >= 80 ? colors.primaryLight : b.efficiency >= 50 ? colors.warningLight : colors.dangerLight, color: b.efficiency >= 80 ? colors.primary : b.efficiency >= 50 ? colors.warning : colors.danger }}>
                    كفاءة {b.efficiency}%
                  </span>
                </div>

                <div style={{ height: 8, background: colors.bg, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: pct + '%', background: c, borderRadius: 99, transition: 'width .4s ease' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' as const }}>
                  <div style={{ background: colors.bg, borderRadius: 8, padding: '8px 6px' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: colors.danger }}>{b.dispensed}</div>
                    <div style={{ fontSize: 9, color: colors.text4, marginTop: 2 }}>مصروف</div>
                  </div>
                  <div style={{ background: colors.bg, borderRadius: 8, padding: '8px 6px' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: colors.primary }}>{b.added}</div>
                    <div style={{ fontSize: 9, color: colors.text4, marginTop: 2 }}>مضاف</div>
                  </div>
                  <div style={{ background: colors.bg, borderRadius: 8, padding: '8px 6px' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: colors.info }}>{Number(b.purchases || 0).toFixed(0)}</div>
                    <div style={{ fontSize: 9, color: colors.text4, marginTop: 2 }}>مشتريات (ر.س)</div>
                  </div>
                  <div style={{ background: colors.bg, borderRadius: 8, padding: '8px 6px' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#7c3aed' }}>{b.ops}</div>
                    <div style={{ fontSize: 9, color: colors.text4, marginTop: 2 }}>عملية صرف</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
