'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react'
import { colors as C, font } from '@/lib/ds'
import { api } from '@/lib/api-client'
import { buildDecisions, type Decision } from '@/lib/todayDecisions'

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// «قرارات اليوم» أعلى صفحة أدوات الذكاء: يشغّل الأدوات تلقائياً ويعرض 3–5 أشياء يسويها المالك اليوم (lib/todayDecisions).
// full = الباقة/الإضافة تسمح بأدوات الهدر والراكد — بدونها نعرض الطلب والزحمة بس.
export default function TodayDecisions({ full, curr }: { full: boolean; curr: string }) {
  const router = useRouter()
  const [list, setList] = useState<Decision[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    const org_id = sessionStorage.getItem('s_org_id'), branch_id = sessionStorage.getItem('s_branch_id')
    if (!org_id) return
    setLoading(true)
    const body = { org_id, branch_id }
    const get = (u: string) => api.post(u, body).catch(() => ({}) as any)
    const [f, t, b, s, w, d] = await Promise.all([get('/api/stock-forecast'), get('/api/smart-reorder-timing'), get('/api/purchase-suggestion'), get('/api/seasonality'),
      full ? get('/api/waste-report') : Promise.resolve(null), full ? get('/api/waste-detection') : Promise.resolve(null)])
    const todayDow = new Date(Date.now() + 3 * 3600e3).getUTCDay()
    setList(buildDecisions({ forecast: f?.forecast, timing: t?.suggestions, buy: b?.suggestions, season: s?.byDay ? s : null,
      waste: w?.report ? w : null, dead: d?.waste, todayDow, curr }))
    setLoading(false)
  }
  useEffect(() => { load() }, [full])   // eslint-disable-line react-hooks/exhaustive-deps

  const style = { urgent: { fg: C.danger, bg: C.dangerLight, Icon: AlertCircle }, warn: { fg: C.warning, bg: C.warningLight, Icon: AlertTriangle }, info: { fg: C.text3, bg: C.bg, Icon: Info } }
  const go = (href: string) => { if (href.startsWith('#')) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else router.push(href) }
  const today = new Date(Date.now() + 3 * 3600e3)

  return (
    <div className="fu" style={{ marginTop: 16, background: C.surface, borderRadius: 14, padding: '16px 20px', border: `1.5px solid ${C.primaryBorder}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>قرارات اليوم</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{DAY_NAMES[today.getUTCDay()]} — أهم اللي تسويه اليوم من بياناتك</div>
        </div>
        <button onClick={load} disabled={loading} aria-label="تحديث" title="تحديث" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border2}`, background: C.surface, color: C.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginTop: 12 }}>
        {list === null && [0, 1, 2].map(i => <div key={i} style={{ height: 58, borderRadius: 10, background: C.bg, opacity: .7 }} />)}
        {list?.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 10, background: C.primaryLight, color: C.primary, fontSize: 13, fontWeight: 700 }}>
            <CheckCircle2 size={16} /> كل شي تمام اليوم — ما فيه قرارات عاجلة
          </div>
        )}
        {list?.map((d, i) => {
          const s = style[d.level]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: s.bg }}>
              <s.Icon size={18} style={{ color: s.fg, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{d.title}</div>
                <div style={{ fontSize: 11.5, color: C.text2, marginTop: 2, lineHeight: 1.6 }}>{d.detail}</div>
              </div>
              {d.action && (
                <button onClick={() => go(d.action!.href)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${s.fg}`, background: C.surface, color: s.fg, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const }}>
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
