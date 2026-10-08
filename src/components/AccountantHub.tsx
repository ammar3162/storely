'use client'
import { useEffect, useState } from 'react'
import { Users, Send, MessageSquareText, Lock, ShieldCheck, Clock } from 'lucide-react'
import { api } from '@/lib/api-client'
import { colors, radius, font } from '@/lib/ds'
import AccountantPortalAccess from '@/components/AccountantPortalAccess'
import AccountantLinkSettings from '@/components/AccountantLinkSettings'
import OwnerAccountantRequests from '@/components/OwnerAccountantRequests'
import OwnerPeriodLocks from '@/components/OwnerPeriodLocks'

// تبويب «المحاسب» في الإعدادات: ملخص فوق + أقسام فرعية (المحاسبين، التقارير، الطلبات، إقفال الشهور)
type Sub = 'people' | 'reports' | 'requests' | 'locks'
const SUBS: Sub[] = ['people', 'reports', 'requests', 'locks']
const initials = (s: string) => (s.replace(/^(أ\.|د\.)\s*/, '').trim()[0] || '؟').toUpperCase()
const dateAr = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long' })

export default function AccountantHub({ orgId }: { orgId: string }) {
  const [sub, setSub] = useState<Sub | null>(null)
  const [people, setPeople] = useState<any[]>([])
  const [openReq, setOpenReq] = useState(0)
  const [locks, setLocks] = useState(0)
  const [lastReport, setLastReport] = useState<string | null>(null)

  async function loadSummary() {
    const [a, r, l, k] = await Promise.all([
      api.get('/api/accountant-access', { org_id: orgId }), api.get('/api/accountant-requests', { org_id: orgId }),
      api.get('/api/accountant-link', { org_id: orgId }), api.get('/api/period-locks', { org_id: orgId }),
    ])
    if (a.success) setPeople(a.accountants || [])
    const open = r.success ? (r.requests || []).filter((x: any) => x.status === 'open').length : 0
    setOpenReq(open)
    setLastReport((l.reports || []).find((x: any) => x.email_status === 'sent' || x.whatsapp_status === 'sent')?.created_at || null)
    setLocks(k.success ? (k.locks || []).length : 0)
    return open
  }
  useEffect(() => {
    if (!orgId) return
    const q = new URLSearchParams(window.location.search).get('sub') as Sub | null
    loadSummary().then(open => setSub(q && SUBS.includes(q) ? q : open ? 'requests' : 'people'))
  }, [orgId])
  function go(s: Sub) {
    setSub(s)
    try { const u = new URL(window.location.href); u.searchParams.set('sub', s); window.history.replaceState(null, '', u) } catch {}
  }

  const active = people.filter(p => p.status === 'active').length, pending = people.length - active
  const TABS: { k: Sub; label: string; short: string; icon: any; badge?: number; tone?: string }[] = [
    { k: 'people', label: 'المحاسبين', short: 'المحاسبين', icon: Users, badge: people.length || undefined },
    { k: 'reports', label: 'التقارير التلقائية', short: 'التقارير', icon: Send },
    { k: 'requests', label: 'الطلبات', short: 'الطلبات', icon: MessageSquareText, badge: openReq || undefined, tone: '#b45309' },
    { k: 'locks', label: 'إقفال الشهور', short: 'الإقفال', icon: Lock, badge: locks || undefined },
  ]

  return (
    <div style={{ fontFamily: font.family }}>
      <style>{`.ah-head{display:grid;grid-template-columns:1fr;gap:14px}.ah-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        @media(min-width:900px){.ah-head{grid-template-columns:minmax(0,1fr) auto;align-items:center}.ah-stats{grid-template-columns:repeat(3,128px)}}
        .ah-tab:hover{background:${colors.bg}}.ah-tabs{display:flex}.ah-s{display:none}
        @media(max-width:640px){.ah-tabs{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))}.ah-tab{flex-direction:column;gap:3px!important;padding:9px 2px!important;font-size:12px!important}.ah-l{display:none}.ah-s{display:inline}}`}</style>

      {/* الملخص */}
      <div style={{ background: 'linear-gradient(135deg,#f0fdfa 0%,#ffffff 70%)', border: `1px solid ${colors.primaryBorder}`, borderRadius: radius.xl, padding: 18, marginBottom: 14 }}>
        <div className="ah-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: colors.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={18} color="#fff" /></span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: colors.text }}>محاسبك</div>
                <div style={{ fontSize: 12.5, color: colors.text3 }}>
                  {people.length ? `${active} مفعّل${pending ? ` · ${pending} بانتظار القبول` : ''}` : 'ادعُ محاسبك — يشوف بياناتك قراءة بس ويوصله التقرير تلقائياً'}
                </div>
              </div>
            </div>
            {people.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 12 }}>
                {people.map(p => {
                  const on = p.status === 'active'
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 99, padding: '4px 12px 4px 4px', maxWidth: '100%' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 99, background: on ? colors.primary : '#f59e0b', color: '#fff', fontSize: 12.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(p.name || p.email)}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name || p.email}</span>
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: on ? '#10b981' : '#f59e0b', flexShrink: 0 }} title={on ? 'مفعّل' : 'بانتظار القبول'} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="ah-stats">
            {[
              { l: 'طلبات مفتوحة', v: String(openReq), warn: openReq > 0, s: 'requests' as Sub },
              { l: 'آخر تقرير', v: lastReport ? dateAr(lastReport) : '—', s: 'reports' as Sub },
              { l: 'شهور مقفلة', v: String(locks), s: 'locks' as Sub },
            ].map(x => (
              <button key={x.l} onClick={() => go(x.s)} style={{ textAlign: 'start' as const, background: '#fff', border: `1px solid ${x.warn ? '#fcd34d' : colors.border}`, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: font.family }}>
                <div style={{ fontSize: 11.5, color: colors.text3 }}>{x.l}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: x.warn ? '#b45309' : colors.text, marginTop: 2, whiteSpace: 'nowrap' as const }}>{x.v}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* الأقسام */}
      <div role="tablist" className="ah-tabs" style={{ gap: 4, borderBottom: `1px solid ${colors.border}`, marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map(t => {
          const on = sub === t.k, Icon = t.icon
          return (
            <button key={t.k} role="tab" aria-selected={on} className="ah-tab" onClick={() => go(t.k)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 14px', border: 'none', borderBottom: `2.5px solid ${on ? colors.primary : 'transparent'}`, marginBottom: -1,
                background: 'transparent', color: on ? colors.primary : colors.text3, fontSize: 13.5, fontWeight: on ? 800 : 600, cursor: 'pointer', fontFamily: font.family, whiteSpace: 'nowrap' as const, borderRadius: '8px 8px 0 0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon size={16} />{t.badge ? <span className="ah-s" style={{ fontSize: 10.5, fontWeight: 800, padding: '0 5px', borderRadius: 99, background: t.tone ? '#fef3c7' : colors.bg, color: t.tone || colors.text3 }}>{t.badge}</span> : null}</span>
              <span className="ah-l">{t.label}</span><span className="ah-s">{t.short}</span>
              {t.badge ? <span className="ah-l" style={{ fontSize: 11, fontWeight: 800, minWidth: 20, padding: '1px 6px', borderRadius: 99, background: t.tone ? '#fef3c7' : on ? colors.primaryLight : colors.bg, color: t.tone || (on ? colors.primary : colors.text3) }}>{t.badge}</span> : null}
            </button>
          )
        })}
      </div>

      <div style={{ maxWidth: 920 }}>
        {sub === null && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text4, fontSize: 13, padding: 20 }}><Clock size={14} /> جاري التحميل...</div>}
        {sub === 'people' && <AccountantPortalAccess orgId={orgId} onChange={loadSummary} />}
        {sub === 'reports' && <AccountantLinkSettings orgId={orgId} onChange={loadSummary} />}
        {sub === 'requests' && <OwnerAccountantRequests orgId={orgId} showEmpty onChange={loadSummary} />}
        {sub === 'locks' && <OwnerPeriodLocks orgId={orgId} showEmpty />}
      </div>
    </div>
  )
}
