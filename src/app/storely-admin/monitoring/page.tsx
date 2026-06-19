'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', yellow:'#f59e0b', red:'#ef4444' }
type Status = 'ok'|'warn'|'error'|'loading'
interface Check { label:string; value:string; status:Status; detail?:string }

export default function MonitoringPage() {
  const [checks, setChecks] = useState<Check[]>([])
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date|null>(null)
  const sb = createClient()
  useEffect(()=>{ runChecks() },[])

  async function runChecks() {
    setLoading(true); const r: Check[] = []
    try { const{error}=await sb.from('organizations').select('count').single(); r.push({label:'Supabase اتصال',value:error?'فشل':'متصل',status:error?'error':'ok'}) } catch { r.push({label:'Supabase اتصال',value:'فشل',status:'error'}) }
    try { const{data:orgs}=await sb.from('organizations').select('id'); const{data:profiles}=await sb.from('profiles').select('status'); const active=(profiles||[]).filter((p:any)=>p.status==='active').length; const pending=(profiles||[]).filter((p:any)=>p.status==='pending').length; r.push({label:'المستخدمون',value:`${active} نشط`,status:'ok',detail:`${pending} بانتظار | ${(orgs||[]).length} مؤسسة`}) } catch { r.push({label:'المستخدمون',value:'خطأ',status:'error'}) }
    try { const{data:prods}=await sb.from('products').select('qty,reorder_point').eq('is_active',true); const total=(prods||[]).length,low=(prods||[]).filter((p:any)=>p.qty<=p.reorder_point).length; r.push({label:'المخزون',value:`${total} صنف`,status:low>10?'error':low>0?'warn':'ok',detail:low>0?`⚠️ ${low} صنف ناقص`:'جميع الأصناف كافية'}) } catch { r.push({label:'المخزون',value:'خطأ',status:'error'}) }
    try { const{data:org}=await sb.from('organizations').select('last_notified_at').order('last_notified_at',{ascending:false}).limit(1).single(); const last=(org as any)?.last_notified_at; if(last){const h=Math.floor((Date.now()-new Date(last).getTime())/3600000);r.push({label:'آخر إشعار واتساب',value:h<24?`منذ ${h} ساعة`:`منذ ${Math.floor(h/24)} يوم`,status:h>48?'warn':'ok',detail:new Date(last).toLocaleString('en-GB')})}else r.push({label:'آخر إشعار واتساب',value:'لم يُرسل بعد',status:'warn'}) } catch { r.push({label:'آخر إشعار واتساب',value:'خطأ',status:'error'}) }
    try { const{data:org}=await sb.from('organizations').select('last_backup_at').order('last_backup_at',{ascending:false}).limit(1).single(); const last=(org as any)?.last_backup_at; if(last){const d=Math.floor((Date.now()-new Date(last).getTime())/86400000);r.push({label:'آخر نسخة احتياطية',value:d===0?'اليوم':`منذ ${d} يوم`,status:d>14?'error':d>7?'warn':'ok',detail:new Date(last).toLocaleString('en-GB')})}else r.push({label:'آخر نسخة احتياطية',value:'لم تُنشأ بعد',status:'warn'}) } catch { r.push({label:'آخر نسخة احتياطية',value:'خطأ',status:'error'}) }
    try { const res=await fetch('/api/webhook'); const data=await res.json(); r.push({label:'بوت واتساب',value:data.status?'يعمل':'متوقف',status:data.status?'ok':'error'}) } catch { r.push({label:'بوت واتساب',value:'خطأ',status:'error'}) }
    try { const yesterday=new Date(Date.now()-86400000).toISOString(); const{data:mv}=await sb.from('stock_movements').select('id').gte('created_at',yesterday); const{data:pu}=await sb.from('purchases').select('id').gte('created_at',yesterday); r.push({label:'النشاط (24 ساعة)',value:`${(mv||[]).length} حركة`,status:'ok',detail:`${(pu||[]).length} مشتريات`}) } catch { r.push({label:'النشاط (24 ساعة)',value:'خطأ',status:'error'}) }
    try { const res=await fetch('/api/health-check'); const data=await res.json(); const n=data.issues_count||0; r.push({label:'فحص صحة البيانات',value:n===0?'سليم':`${n} مشكلة`,status:n===0?'ok':data.issues?.some((i:any)=>i.severity==='critical')?'error':'warn',detail:n===0?'لا توجد مشاكل هيكلية':data.issues.map((i:any)=>i.type).join('، ')}) } catch { r.push({label:'فحص صحة البيانات',value:'خطأ',status:'error'}) }
    setChecks(r); setLastCheck(new Date()); setLoading(false)
  }

  const sc=(s:Status)=>s==='ok'?C.green:s==='warn'?C.yellow:s==='error'?C.red:C.text3
  const si=(s:Status)=>s==='ok'?'✅':s==='warn'?'⚠️':s==='error'?'❌':'⏳'
  const overall=checks.some(c=>c.status==='error')?'error':checks.some(c=>c.status==='warn')?'warn':'ok'

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div><h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>مراقبة النظام</h1>{lastCheck&&<div style={{fontSize:12,color:C.text3}}>آخر فحص: {lastCheck.toLocaleTimeString('en-GB')}</div>}</div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {!loading&&<div style={{padding:'6px 14px',borderRadius:20,background:sc(overall)+'22',border:`1px solid ${sc(overall)}44`,fontSize:13,fontWeight:700,color:sc(overall)}}>{overall==='ok'?'✅ كل شيء يعمل':overall==='warn'?'⚠️ تنبيهات':'❌ مشاكل'}</div>}
          <button onClick={runChecks} disabled={loading} style={{padding:'8px 16px',background:'#334155',color:C.text,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}><span style={{display:'inline-block',animation:loading?'spin 1s linear infinite':'none'}}>🔄</span>{loading?'جاري الفحص...':'إعادة الفحص'}</button>
          <a href="/storely-admin" style={{padding:'8px 16px',background:'#334155',color:C.text,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>← الأدمن</a>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginBottom:24}}>
        {loading?[...Array(7)].map((_,i)=>(<div key={i} style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`,animation:'pulse 1.5s infinite'}}><div style={{height:12,background:'#334155',borderRadius:6,marginBottom:10,width:'60%'}}/><div style={{height:20,background:'#334155',borderRadius:6,marginBottom:8,width:'40%'}}/><div style={{height:10,background:'#334155',borderRadius:6,width:'80%'}}/></div>))
        :checks.map((c,i)=>(<div key={i} style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${sc(c.status)}33`}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}><div style={{fontSize:13,color:C.text2,fontWeight:600}}>{c.label}</div><span style={{fontSize:18}}>{si(c.status)}</span></div><div style={{fontSize:20,fontWeight:900,color:sc(c.status),marginBottom:6}}>{c.value}</div>{c.detail&&<div style={{fontSize:12,color:C.text3}}>{c.detail}</div>}</div>))}
      </div>
      <div style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14}}>⚡ إجراءات سريعة</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap' as const}}>
          {[{label:'📲 إرسال إشعار الآن',href:'/settings',color:'#22c55e'},{label:'💾 عرض النسخ الاحتياطية',href:'/storely-admin/backups',color:'#3b82f6'},{label:'👥 إدارة المستخدمين',href:'/storely-admin',color:'#a855f7'}].map((a,i)=>(
            <a key={i} href={a.href} style={{padding:'10px 18px',background:a.color+'22',color:a.color,border:`1px solid ${a.color}44`,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>{a.label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}
