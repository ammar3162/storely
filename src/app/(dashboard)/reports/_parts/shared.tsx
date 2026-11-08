'use client'
import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getMe } from '@/lib/session'
import { colors, radius, shadow, font, card, btnSecondary, inp } from '@/lib/ds'
import DateField from '@/components/DateField'

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
  // شريط واحد بخمس خانات (يتمرر أفقياً لو ضاق) بدل أزرار كبيرة تلتف على سطرين
  const PERIODS = [
    {key:'today',label:'اليوم'},
    {key:'week',label:'الأسبوع'},
    {key:'month',label:'هذا الشهر'},
    {key:'year',label:'هذه السنة'},
    {key:'custom',label:'مخصص',icon:<CalendarDays size={13} strokeWidth={2.25}/>},
  ]
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:'flex',gap:2,padding:3,background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:10,overflowX:'auto' as const,marginBottom:period==='custom'?10:0}}>
        {PERIODS.map(p=>{
          const active = period===p.key
          return (
            <button key={p.key} onClick={()=>setPeriod(p.key as FilterPeriod)} aria-pressed={active}
              style={{
                flex:'1 0 auto',padding:'8px 12px',borderRadius:8,fontFamily:font.family,border:'none',
                background:active?colors.surface:'transparent',boxShadow:active?'0 1px 2px rgba(15,23,42,.08)':'none',
                color:active?colors.text:colors.text3,fontSize:13,fontWeight:active?800:600,cursor:'pointer',
                display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5,whiteSpace:'nowrap' as const,
              }}>
              {p.icon}{p.label}
            </button>
          )
        })}
      </div>
      {period==='custom'&&(
        <div style={{...card,padding:12,display:'flex',gap:10,flexWrap:'wrap' as const,alignItems:'center'}}>
          <span style={{fontSize:12,fontWeight:700,color:colors.text3}}>من</span>
          <DateField value={from} max={to||undefined} onChange={setFrom} placeholder="من تاريخ" ariaLabel="من تاريخ" width={150}/>
          <span style={{fontSize:12,fontWeight:700,color:colors.text3}}>إلى</span>
          <DateField value={to} min={from||undefined} onChange={setTo} placeholder="إلى تاريخ" ariaLabel="إلى تاريخ" width={150}/>
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

export function ReportCard({ title, subtitle, icon, color, stats, onClick, loading, chartData }: any) {
  // بطاقة هادئة: أيقونة رمادية، والأرقام في شريط واحد؛ اللون في الرقم فقط
  return (
    <button onClick={onClick} className="rc-card"
      style={{width:'100%',textAlign:'right' as const,cursor:'pointer',fontFamily:font.family,padding:0,background:colors.surface,border:`1px solid ${colors.border}`,borderRadius:radius.xl,overflow:'hidden',display:'block'}}>
      <style>{`.rc-card:hover{border-color:${colors.text3}!important}`}</style>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px'}}>
        <span style={{width:38,height:38,borderRadius:10,background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icon}</span>
        <span style={{flex:1,minWidth:0}}>
          <span style={{display:'block',fontSize:15,fontWeight:800,color:colors.text}}>{title}</span>
          <span style={{display:'block',fontSize:12,color:colors.text3,marginTop:1}}>{subtitle}</span>
        </span>
        <svg width={16} height={16} fill="none" stroke={colors.text3} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{flexShrink:0}}><path d="M15 19l-7-7 7-7"/></svg>
      </div>

      {stats.length>0 && (
        <div style={{display:'grid',gridTemplateColumns:`repeat(${stats.length},minmax(0,1fr))`,gap:1,background:colors.border,borderTop:`1px solid ${colors.border}`}}>
          {(loading?stats.map(()=>null):stats).map((s:any,i:number)=>(
            <div key={i} style={{background:colors.surface,padding:'10px 8px',textAlign:'center' as const,minWidth:0}}>
              {s===null
                ? <><div style={{height:20,margin:'0 auto 6px',width:'50%',background:colors.border,borderRadius:6,animation:'sk 1.4s infinite'}}/><div style={{height:9,margin:'0 auto',width:'70%',background:colors.border,borderRadius:4,animation:'sk 1.4s infinite'}}/></>
                : <><div style={{fontSize:18,fontWeight:800,color:(s.value===0||s.value==='0')?colors.text:(s.color||colors.text),fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{s.value}</div>
                   <div style={{fontSize:11.5,color:colors.text3,marginTop:2,fontWeight:600,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis'}}>{s.label}</div></>}
            </div>
          ))}
        </div>
      )}

      {chartData && chartData.length > 0 && (
        <div style={{padding:'10px 16px 12px',borderTop:`1px solid ${colors.border}`}}>
          <MiniChart data={chartData} color={color||colors.primary}/>
        </div>
      )}
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
