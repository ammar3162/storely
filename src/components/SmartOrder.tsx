'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Send, Check } from 'lucide-react'
import { colors as C, font } from '@/lib/ds'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'
import { mergeSmartOrder, type SmartOrderRow } from '@/lib/smartOrder'
import { runOutText, orderWhenText, usageReason, daysAr } from '@/lib/aiPhrases'

// «الطلب الذكي» — بدل أربع أدوات منفصلة (توقع النفاد، توقيت الطلب، اقتراح الكميات، حد إعادة الطلب):
// ضغطة وحدة تشغّلها كلها وتعرض لكل صنف: متى يخلص، كم تطلب، متى تطلب، وليش.
export default function SmartOrder() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ rows: SmartOrderRow[]; safeCount: number } | null>(null)
  const [applying, setApplying] = useState<string | null>(null)

  async function analyze() {
    const org_id = sessionStorage.getItem('s_org_id'), branch_id = sessionStorage.getItem('s_branch_id')
    if (!org_id) return
    setLoading(true)
    const body = { org_id, branch_id }
    const [f, t, b, r] = await Promise.all(['/api/stock-forecast', '/api/smart-reorder-timing', '/api/purchase-suggestion', '/api/reorder-optimizer']
      .map(u => api.post(u, body).catch(() => ({}) as any)))
    setLoading(false)
    if ([f, t, b, r].every((x: any) => x?.error)) { toast(f?.error || 'تعذر التحليل', 'error'); return }
    setData(mergeSmartOrder({ forecast: f?.forecast, timing: t?.suggestions, buy: b?.suggestions, reorder: r?.suggestions }))
  }

  async function applyReorder(row: SmartOrderRow) {
    if (!row.productId || !row.reorder) return
    setApplying(row.productId)
    const j = await api.patch('/api/products', { org_id: sessionStorage.getItem('s_org_id'), id: row.productId, reorder_point: row.reorder.suggested })
    setApplying(null)
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); return }
    toast(`صار حد التنبيه لـ${row.name}: ${row.reorder.suggested} ${row.unit}`)
    setData(d => d && { ...d, rows: d.rows.map(x => x.name === row.name ? { ...x, reorder: null } : x) })
  }

  const tone = (r: SmartOrderRow) => r.urgent ? { fg: C.danger, bg: C.dangerLight, bd: C.dangerBorder }
    : (r.daysLeft ?? 99) <= 7 ? { fg: C.warning, bg: C.warningLight, bd: C.warningBorder } : { fg: C.primary, bg: C.primaryLight, bd: C.primaryBorder }

  return (
    <div className="fu" style={{ marginTop: 16, background: C.surface, borderRadius: 14, padding: '16px 20px', border: `1px solid ${C.border2}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShoppingCart size={17} /></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>الطلب الذكي</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>وش تطلب، وكم، ومتى — من صرفك الفعلي ومدة توريد مورديك</div>
          </div>
        </div>
        <button onClick={analyze} disabled={loading} style={{ padding: '8px 16px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const }}>
          {loading ? 'جاري التحليل...' : data ? 'حدّث' : 'حلّل الطلب'}
        </button>
      </div>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginTop: 14 }}>
          {data.rows.length === 0 && <div style={{ fontSize: 13, color: C.text3, textAlign: 'center' as const, padding: 14 }}>كل أصنافك وضعها آمن — ما تحتاج تطلب شي الحين</div>}
          {data.rows.map(r => {
            const t = tone(r)
            return (
              <div key={r.name} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${t.bd}`, background: C.surface }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{r.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: t.bg, color: t.fg, whiteSpace: 'nowrap' as const }}>{runOutText(r.daysLeft)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <div style={{ background: C.bg, borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: C.text4 }}>اطلب</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{r.suggestedQty ? `${r.suggestedQty} ${r.unit}` : '—'}</div>
                  </div>
                  <div style={{ background: C.bg, borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: C.text4 }}>متى</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: (r.orderInDays ?? 1) <= 0 ? C.danger : C.text }}>
                      {r.orderInDays != null ? orderWhenText(r.orderInDays) : r.urgent ? 'اطلب اليوم' : '—'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 8, lineHeight: 1.7 }}>
                  {usageReason(r.dailyRate, r.unit, r.currentQty)}
                  {r.leadDays ? ` · المورد يحتاج ${daysAr(r.leadDays)}` : ''}
                  {r.weeklyNeed ? ` · تحتاج تقريباً ${r.weeklyNeed} ${r.unit} بالأسبوع` : ''}
                </div>
                {r.reorder && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, padding: '7px 10px', borderRadius: 8, background: C.infoLight, flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 11, color: C.text2 }}>حد التنبيه الحالي {r.reorder.current} — الأنسب {r.reorder.suggested} {r.unit}</span>
                    <button onClick={() => applyReorder(r)} disabled={applying === r.productId} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: 'none', background: C.info, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
                      <Check size={12} /> {applying === r.productId ? 'جاري...' : 'اعتمد'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 11, color: C.text4 }}>{data.safeCount > 0 ? `و${data.safeCount === 1 ? ' صنف واحد' : data.safeCount === 2 ? ' صنفين' : ` ${data.safeCount} أصناف`} وضعها آمن` : ''}</span>
            {data.rows.some(r => (r.suggestedQty ?? 0) > 0) && (
              <button onClick={() => router.push('/purchase-suggestion')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.primary}`, background: C.surface, color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>
                <Send size={14} /> أرسل الطلب للموردين
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
