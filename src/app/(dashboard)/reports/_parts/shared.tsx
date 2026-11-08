'use client'
import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { colors, radius, shadow, font, card, btnSecondary, inp } from '@/lib/ds'

// صافي الإقفال: الشبكة + التوصيل (تحوّله التطبيقات) + الكاش − المسحوبات
export const netOf = (c: any) => Number(c.network_amount||0) + Number(c.delivery_amount||0) + Number(c.cash_amount||0) - Number(c.total_purchases||0)

export type FilterPeriod = 'today'|'week'|'month'|'year'|'custom'

/** اسم المنشأة/الفرع/العملة لتصدير PDF — من /api/me بدل استعلامات مباشرة */
export async function pdfOrgInfo() {
  const me = await getMe()
  const bid = sessionStorage.getItem('s_branch_id')
  const branchName = bid ? me?.branches.find(b=>b.id===bid)?.name : null
  return { org: me?.org ? { name: me.org.name, currency: me.org.currency } : null, branchRow: branchName ? { name: branchName } : null }
}

/** بيانات تقرير من /api/reports (الفترة محسوبة بتوقيت المستخدم) */
export function reportData(type: string, start: Date, end: Date, extra: Record<string,string> = {}) {
  return api.get('/api/reports', { org_id: sessionStorage.getItem('s_org_id'), branch_id: sessionStorage.getItem('s_branch_id'), type, start: start.toISOString(), end: end.toISOString(), ...extra })
}

export function getRange(period: FilterPeriod, from: string, to: string) {
  const now = new Date(); const end = new Date(now); end.setHours(23,59,59,999)
  if (period==='today')  { const s=new Date(now); s.setHours(0,0,0,0); return {start:s,end} }
  if (period==='week')   { const s=new Date(now); s.setDate(now.getDate()-6); s.setHours(0,0,0,0); return {start:s,end} }
  if (period==='month')  { return {start:new Date(now.getFullYear(),now.getMonth(),1),end} }
  if (period==='year')   { return {start:new Date(now.getFullYear(),0,1),end} }
  return { start:from?new Date(from+'T00:00:00'):new Date(2000,0,1), end:to?new Date(to+'T23:59:59'):end }
}

export function formatRange(period: FilterPeriod, from: string, to: string) {
  if (period==='today') return 'اليوم'
  if (period==='week')  return 'آخر 7 أيام'
  if (period==='month') return new Date().toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn',month:'long',year:'numeric'})
  if (period==='year')  return new Date().getFullYear().toString()
  if (from&&to) return `${from} — ${to}`
  if (from) return `من ${from}`
  if (to)   return `حتى ${to}`
  return 'كل الوقت'
}

export function FilterBar({ period, setPeriod, from, setFrom, to, setTo }: any) {
  const PERIODS = [
    {key:'custom',label:'مخصص',icon:<CalendarDays size={13} strokeWidth={2.25}/>},
    {key:'year',label:'هذه السنة'},
    {key:'month',label:'هذا الشهر'},
    {key:'week',label:'الأسبوع'},
    {key:'today',label:'اليوم'},
  ]
  return (
    <div style={{marginBottom:24}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap' as const,marginBottom:period==='custom'?16:0}}>
        {PERIODS.map(p=>{
          const active = period===p.key
          return (
            <button key={p.key} onClick={()=>setPeriod(p.key as FilterPeriod)}
              style={{
                padding:'12px 22px',borderRadius:99,fontFamily:font.family,
                border:active?`2px solid ${colors.primary}`:`1.5px solid ${colors.border2}`,
                background:'white',
                color:active?colors.primary:colors.text2,
                fontSize:14,fontWeight:700,cursor:'pointer',
                display:'flex',alignItems:'center',gap:6,
                transition:'all .15s',
              }}>
              {p.icon && <span>{p.icon}</span>}
              {p.label}
            </button>
          )
        })}
      </div>
      {period==='custom'&&(
        <div style={{...card,padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>من تاريخ</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inp()}/></div>
          <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text4,display:'block',marginBottom:4}}>إلى تاريخ</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inp()}/></div>
        </div>
      )}
    </div>
  )
}

export function MiniChart({ data, color }: { data:number[]; color:string }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:36}}>
      {data.map((v,i)=>(
        <div key={i} style={{flex:1,background:colors.border,borderRadius:'3px 3px 0 0',height:32,display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
          <div style={{width:'100%',background:i===data.length-1?color:color+'55',height:`${Math.max((v/max)*100,4)}%`,borderRadius:'3px 3px 0 0',transition:'height .6s'}}/>
        </div>
      ))}
    </div>
  )
}

export function ReportCard({ title, subtitle, icon, color, bg, border, stats, onClick, loading, chartData }: any) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:'100%',textAlign:'right' as const,border:'none',cursor:'pointer',fontFamily:font.family,padding:0,background:'transparent'}}>
      <div style={{
        background:colors.surface,borderRadius:radius.xl,
        border:`1.5px solid ${hov?color:colors.border}`,
        boxShadow:hov?`0 12px 36px ${color}22`:shadow.sm,
        padding:'22px 24px',transition:'all .25s cubic-bezier(.4,0,.2,1)',
        transform:hov?'translateY(-4px)':'none',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
              <div style={{width:42,height:42,borderRadius:12,background:bg,border:`1.5px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{icon}</div>
              <div>
                <div style={{fontSize:font.md,fontWeight:900,color:colors.text}}>{title}</div>
                <div style={{fontSize:font.xs,color:colors.text3,marginTop:1}}>{subtitle}</div>
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,background:hov?color:colors.bg,borderRadius:20,padding:'6px 12px',border:`1px solid ${hov?color:colors.border}`,transition:'all .2s'}}>
            <span style={{fontSize:font.xs,fontWeight:700,color:hov?'white':colors.text3}}>التفاصيل</span>
            <svg width={12} height={12} fill="none" stroke={hov?'white':colors.text3} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:chartData?16:0}}>
          {loading?[...Array(stats.length)].map((_,i)=>(
            <div key={i} style={{background:colors.bg,borderRadius:radius.md,padding:'12px',textAlign:'center' as const}}>
              <div style={{height:22,background:colors.border2,borderRadius:6,marginBottom:6,animation:'sk 1.4s infinite'}}/>
              <div style={{height:10,background:colors.border,borderRadius:4,animation:'sk 1.4s infinite'}}/>
            </div>
          )):stats.map((s:any,i:number)=>(
            <div key={i} style={{background:s.highlight?bg:colors.bg,borderRadius:radius.md,padding:'12px 10px',textAlign:'center' as const,border:`1px solid ${s.highlight?border:colors.border}`}}>
              <div style={{fontSize:18,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
              <div style={{fontSize:10,color:colors.text4,marginTop:3,fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>

        {chartData && chartData.length > 0 && (
          <div style={{marginTop:4}}>
            <MiniChart data={chartData} color={color}/>
          </div>
        )}
      </div>
    </button>
  )
}

export function BackBtn({ onClick }: { onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{...btnSecondary,marginBottom:16,display:'flex',alignItems:'center',gap:8,padding:'9px 16px',fontSize:font.sm}}>
      <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      العودة للتقارير
    </button>
  )
}

export function PeriodBadge({ period, from, to }: any) {
  return (
    <div style={{...card,padding:'10px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:8,background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`}}>
      <span style={{display:'flex',alignItems:'center'}}><CalendarDays size={16} strokeWidth={2.25}/></span>
      <span style={{fontSize:font.sm,fontWeight:700,color:colors.primary}}>{formatRange(period,from,to)}</span>
    </div>
  )
}
