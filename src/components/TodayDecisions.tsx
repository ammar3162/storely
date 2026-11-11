'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react'
import { colors as C, font } from '@/lib/ds'
import { api } from '@/lib/api-client'
import { buildDecisions, type Decision } from '@/lib/todayDecisions'

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// «قرارات اليوم» في الصفحة الرئيسية (كانت بأدوات الذكاء): يشغّل الأدوات تلقائياً ويعرض 3–5 أشياء يسويها المالك اليوم (lib/todayDecisions).
// full = الباقة/الإضافة تسمح بأدوات الهدر والراكد — بدونها نعرض الطلب والزحمة بس.
export default function TodayDecisions({ full, curr, onCount }: { full: boolean; curr: string; onCount?: (n: number) => void }) {
  const router = useRouter()
  const [list, setList] = useState<Decision[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [whyOpen, setWhyOpen] = useState<number | null>(null)

  async function load() {
    const org_id = sessionStorage.getItem('s_org_id'), branch_id = sessionStorage.getItem('s_branch_id')
    if (!org_id) return
    setLoading(true)
    const body = { org_id, branch_id }
    const get = (u: string) => api.post(u, body).catch(() => ({}) as any)
    const [f, t, b, s, w, d] = await Promise.all([get('/api/stock-forecast'), get('/api/smart-reorder-timing'), get('/api/purchase-suggestion'), get('/api/seasonality'),
      full ? get('/api/waste-report') : Promise.resolve(null), full ? get('/api/waste-detection') : Promise.resolve(null)])
    const todayDow = new Date(Date.now() + 3 * 3600e3).getUTCDay()
    const out = buildDecisions({ forecast: f?.forecast, timing: t?.suggestions, buy: b?.suggestions, season: s?.byDay ? s : null,
      waste: w?.report ? w : null, dead: d?.waste, todayDow, curr })
    setList(out)
    setWhyOpen(null)
    onCount?.(out.filter(x => x.level !== 'info').length)
    setLoading(false)
  }
  useEffect(() => { load() }, [full])   // eslint-disable-line react-hooks/exhaustive-deps

  // الألوان في الأيقونة بس — الخلفية بيضاء، والأحمر للعاجل فقط
  const style = { urgent: { fg: C.danger, Icon: AlertCircle }, warn: { fg: C.warning, Icon: AlertTriangle }, info: { fg: C.text3, Icon: Info } }
  // رابط داخل أدوات الذكاء (#waste): لو القسم مو بالصفحة الحالية نفتح أدوات الذكاء عليه
  const go = (href: string) => {
    if (!href.startsWith('#')) return router.push(href)
    const el = document.getElementById(href.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else router.push('/ai-tools' + href)
  }
  const today = new Date(Date.now() + 3 * 3600e3)

  const urgent = list?.filter(d => d.level === 'urgent').length || 0

  return (
    <div className="fu" style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>قرارات اليوم</span>
            {urgent > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.danger, background: C.dangerLight, borderRadius: 99, padding: '1px 8px' }}>{urgent} {urgent === 1 ? 'عاجل' : 'عاجلة'}</span>}
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{DAY_NAMES[today.getUTCDay()]} · أهم ما يجب فعله اليوم بناءً على بياناتك</div>
        </div>
        <button onClick={load} disabled={loading} aria-label="تحديث" title="تحديث" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      <div style={{ borderTop: `1px solid ${C.border}` }}>
        {list === null && [0, 1, 2].map(i => <div key={i} style={{ height: 56, margin: '8px 16px', borderRadius: 10, background: C.bg, opacity: .7 }} />)}
        {list?.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', color: C.text, fontSize: 13, fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#047857" /> كل شيء على ما يرام اليوم، لا توجد قرارات عاجلة
          </div>
        )}
        {list?.map((d, i) => {
          const s = style[d.level]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
              <s.Icon size={17} style={{ color: s.fg, flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: C.text3, marginTop: 1, lineHeight: 1.6 }}>{d.detail}</div>
                {d.why && (
                  <>
                    <button type="button" onClick={() => setWhyOpen(whyOpen === i ? null : i)} aria-expanded={whyOpen === i}
                      style={{ marginTop: 2, padding: 0, border: 'none', background: 'none', color: C.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, textDecoration: 'underline dotted', textUnderlineOffset: 4 }}>
                      {whyOpen === i ? 'إخفاء' : 'لماذا؟'}
                    </button>
                    {whyOpen === i && <div style={{ marginTop: 4, padding: '8px 10px', borderRadius: 8, background: C.bg, color: C.text, fontSize: 12.5, lineHeight: 1.7 }}>{d.why}</div>}
                  </>
                )}
              </div>
              {d.action && (
                <button onClick={() => go(d.action!.href)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${d.level === 'urgent' ? C.danger : C.border}`, background: C.surface, color: d.level === 'urgent' ? C.danger : C.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                  {d.action.label}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
