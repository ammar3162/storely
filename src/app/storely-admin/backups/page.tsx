'use client'
import { useState, useEffect } from 'react'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', blue:'#3b82f6' }

export default function BackupsPage() {
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.manage_backups)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/list-backups', { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (!res.ok) { setError('حدث خطأ بالتحقق'); setLoading(false); return }
      setBackups(data.backups || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  function fmtSize(bytes:number) { return bytes > 1024 ? (bytes/1024).toFixed(1)+' KB' : bytes+' B' }

  if (!authChecked) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{color:C.text2,fontSize:13}}>⏳ جاري التحقق...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>النسخ الاحتياطية</h1>
          <div style={{fontSize:12,color:C.text3}}>عرض وتحميل ملفات CSV لكل مؤسسة — للمراجعة اليدوية فقط</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} disabled={loading} style={{padding:'8px 16px',background:'#334155',color:C.text,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{loading?'جاري التحميل...':'🔄 تحديث'}</button>
          <a href="/storely-admin/monitoring" style={{padding:'8px 16px',background:'#334155',color:C.text,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>← المراقبة</a>
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:C.text3}}>جاري التحميل...</div>
      ) : backups.length === 0 ? (
        <div style={{background:C.card,borderRadius:14,padding:40,textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:32,marginBottom:10}}>📭</div>
          <div style={{color:C.text2}}>لا توجد نسخ احتياطية بعد</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {backups.map((b,i)=>(
            <div key={i} style={{background:C.card,borderRadius:14,padding:18,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12}}>{b.org_name}</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {b.files.map((f:any,j:number)=>(
                  <div key={j} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#0f172a',borderRadius:8}}>
                    <div>
                      <div style={{fontSize:13,color:C.text,fontWeight:600}}>{f.name}</div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2}}>{new Date(f.created_at).toLocaleString('ar-SA')} · {fmtSize(f.size)}</div>
                    </div>
                    {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" style={{padding:'6px 14px',background:C.green+'22',color:C.green,border:`1px solid ${C.green}44`,borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none'}}>⬇ تحميل</a>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
