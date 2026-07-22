'use client'
import { useState, useEffect } from 'react'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', red:'#ef4444', amber:'#f59e0b' }

export default function HealthPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.view_health)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/health-logs', { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (!res.ok || !data.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setLogs(data.logs || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  async function runNow() {
    setRunning(true)
    try { await fetch('/api/health-check') } catch {}
    setRunning(false)
    load()
  }

  const latest = logs[0]

  if (!authChecked) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{color:C.text2,fontSize:13}}>⏳ جاري التحقق...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>فحص صحة النظام</h1>
          <div style={{fontSize:12,color:C.text3}}>فحص تلقائي دوري لمشاكل البيانات (منتجات بدون فرع، مؤسسات بدون فرع فعّال، تكرارات، إلخ)</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={runNow} disabled={running} style={{padding:'8px 16px',background:C.green+'22',color:C.green,border:`1px solid ${C.green}44`,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {running?'جاري الفحص...':'⚡ فحص الآن'}
          </button>
          <a href="/storely-admin" style={{padding:'8px 16px',background:'#334155',color:C.text,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>← الرئيسية</a>
        </div>
      </div>

      {error && <div style={{background:'#7f1d1d33',color:'#fca5a5',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:16}}>{error}</div>}

      {latest && (
        <div style={{background: latest.issues_count>0 ? '#7f1d1d22' : '#14532d22', border:`1.5px solid ${latest.issues_count>0?'#7f1d1d':'#14532d'}`, borderRadius:14, padding:'16px 18px', marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:800,color: latest.issues_count>0 ? '#fca5a5' : C.green}}>
            {latest.issues_count>0 ? `⚠️ ${latest.issues_count} مشكلة مكتشفة` : '✅ كل شي سليم'}
          </div>
          <div style={{fontSize:11,color:C.text3,marginTop:4}}>آخر فحص: {new Date(latest.checked_at).toLocaleString('ar-SA')}</div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:C.text3}}>جاري التحميل...</div>
      ) : logs.length === 0 ? (
        <div style={{background:C.card,borderRadius:14,padding:40,textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:32,marginBottom:10}}>📭</div>
          <div style={{color:C.text2}}>ما فيه سجلات فحص بعد</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {logs.map((log)=>(
            <div key={log.id} style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:log.issues_count>0?10:0}}>
                <div style={{fontSize:12,fontWeight:700,color: log.issues_count>0?C.red:C.green}}>
                  {log.issues_count>0 ? `${log.issues_count} مشكلة` : 'سليم ✅'}
                </div>
                <div style={{fontSize:11,color:C.text3}}>{new Date(log.checked_at).toLocaleString('ar-SA')}</div>
              </div>
              {(log.issues||[]).map((issue:any,i:number)=>(
                <div key={i} style={{fontSize:12,color:issue.severity==='critical'?'#fca5a5':'#fcd34d',padding:'6px 10px',background:'#0f172a',borderRadius:8,marginTop:6}}>
                  <b>{issue.severity==='critical'?'🔴':'🟡'} {issue.type}:</b> {issue.detail}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
