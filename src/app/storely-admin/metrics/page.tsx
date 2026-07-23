'use client'
import { useState, useEffect } from 'react'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', blue:'#3b82f6', purple:'#a78bfa', red:'#ef4444' }

const EVENT_LABELS: Record<string,{label:string;color:string;icon:string}> = {
  trial_started: { label:'بدأ تجربة', color:C.blue, icon:'🎁' },
  activated:     { label:'اشترك (مدفوع)', color:C.green, icon:'✅' },
  cancelled:     { label:'ألغى/أُوقف', color:C.red, icon:'⛔' },
  upgraded:      { label:'رقّى الباقة', color:C.purple, icon:'⬆️' },
  downgraded:    { label:'خفّض الباقة', color:'#f59e0b', icon:'⬇️' },
  renewed:       { label:'جدّد الاشتراك', color:C.green, icon:'🔄' },
}

export default function MetricsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (!d.authenticated || (d.admin?.role !== 'super_admin' && !d.admin?.permissions?.view_metrics)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/metrics', { headers: { 'x-admin-key': key } })
      const d = await res.json()
      if (!res.ok || !d.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setData(d)
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  if (!authChecked) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{color:C.text2,fontSize:13}}>⏳ جاري التحقق...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>مقاييس العمل التجاري</h1>
          <div style={{fontSize:12,color:C.text3}}>الإيراد المتكرر، معدل التحويل، وسجل أحداث الاشتراكات</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} disabled={loading} style={{padding:'8px 16px',background:'#334155',color:C.text,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {loading?'...':'↺ تحديث'}
          </button>
          <a href="/storely-admin" style={{padding:'8px 16px',background:'#334155',color:C.text,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>← الرئيسية</a>
        </div>
      </div>

      {error && <div style={{background:'#7f1d1d33',color:'#fca5a5',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:16}}>{error}</div>}

      {loading && !data ? (
        <div style={{textAlign:'center',padding:60,color:C.text3}}>جاري التحميل...</div>
      ) : data && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24}}>
            {[
              { label:'الإيراد الشهري (MRR)', value:`${data.mrr.toLocaleString()} ر.س`, color:C.green, icon:'💰' },
              { label:'الإيراد السنوي المتوقع (ARR)', value:`${data.arr.toLocaleString()} ر.س`, color:C.blue, icon:'📈' },
              { label:'معدل التحويل لمدفوع', value:`${data.conversionRate}%`, color:C.purple, icon:'🎯' },
              { label:'مشتركون مدفوعون نشطون', value:data.paidCount, color:C.green, icon:'✅' },
              { label:'بالتجربة المجانية', value:data.trialCount, color:C.blue, icon:'🎁' },
              { label:'موقوفون/ملغيون', value:data.suspendedCount, color:C.red, icon:'⛔' },
            ].map((s,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'16px 18px'}}>
                <div style={{fontSize:20,marginBottom:8}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:C.text3,marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{background:'#1e3a5f22',border:'1px solid #1e3a5f',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:12,color:C.text2}}>
            ℹ️ سجل الأحداث (تفعيل، إلغاء، ترقية) بدأ التسجيل اليوم — كل ما مرّ وقت أكثر، تصير مقاييس زي معدل الإلغاء الشهري (Churn) أدق.
          </div>

          <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:12}}>آخر أحداث الاشتراكات</div>
          {(!data.recentEvents || data.recentEvents.length===0) ? (
            <div style={{background:C.card,borderRadius:14,padding:40,textAlign:'center',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:32,marginBottom:10}}>📭</div>
              <div style={{color:C.text2}}>ما فيه أحداث مسجّلة بعد — بتظهر هنا أول ما تفعّل/تلغي/ترقّي أي اشتراك</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {data.recentEvents.map((e:any)=>{
                const cfg = EVENT_LABELS[e.event_type] || { label:e.event_type, color:C.text2, icon:'•' }
                return (
                  <div key={e.id} style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap' as const}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:16}}>{cfg.icon}</span>
                      <div>
                        <span style={{fontSize:12,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
                        <span style={{fontSize:12,color:C.text2}}> — {e.org_name}</span>
                        {e.plan && <span style={{fontSize:11,color:C.text3}}> ({e.plan})</span>}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:C.text3}}>{new Date(e.created_at).toLocaleString('ar-SA')}</div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
