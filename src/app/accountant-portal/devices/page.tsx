'use client'
import { useEffect, useState } from 'react'
import { Loader2, Smartphone, Monitor } from 'lucide-react'
import { colors, font } from '@/lib/ds'
import { PortalShell } from '@/components/accountant/PortalShell'

// «أجهزتي»: كل جهاز داخل على حساب المحاسب — يطلّعه بضغطة
const ago = (iso: string) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 60 ? `قبل ${Math.max(1, m)} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم` }
export default function PortalDevicesPage() {
  const [list, setList] = useState<any[] | null>(null)
  const load = () => fetch('/api/accountant-portal/sessions').then(r => r.json()).then(j => setList(j.sessions || [])).catch(() => setList([]))
  useEffect(() => { load() }, [])
  async function out(q: string) { await fetch(`/api/accountant-portal/sessions?${q}`, { method: 'DELETE' }).catch(() => {}); load() }
  const others = (list || []).filter(d => !d.current).length
  return (
    <PortalShell title="أجهزتي" subtitle="الأجهزة الداخلة على حسابك — لو شفت جهاز ما تعرفه طلّعه، ويحتاج رمز جديد على إيميلك عشان يدخل"
      actions={others ? <button onClick={() => out('others=1')} style={{ padding: '9px 14px', borderRadius: 11, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font.family }}>طلّع كل الأجهزة الثانية</button> : undefined}>
      {!list ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color={colors.primary} className="spin" /></div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
          {list.map(d => {
            const mobile = /آيفون|أندرويد|آيباد/.test(d.device)
            return (
              <div key={d.id} style={{ background: '#fff', border: `1.5px solid ${d.current ? colors.primary : colors.border}`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: d.current ? colors.primaryLight : '#f1f5f9', color: d.current ? colors.primary : colors.text3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{mobile ? <Smartphone size={21} /> : <Monitor size={21} />}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{d.device}</div>
                  <div style={{ fontSize: 12, color: d.current ? colors.primary : colors.text4, fontWeight: d.current ? 700 : 500 }}>{d.current ? 'هذا الجهاز' : `آخر استخدام ${ago(d.last_seen_at)}`}</div>
                </div>
                {!d.current && <button onClick={() => out(`id=${d.id}`)} style={{ fontSize: 12.5, fontWeight: 800, color: '#b91c1c', background: 'none', border: `1px solid ${colors.border}`, borderRadius: 9, padding: '6px 11px', cursor: 'pointer', fontFamily: font.family }}>طلّعه</button>}
              </div>
            )
          })}
        </div>}
    </PortalShell>
  )
}
