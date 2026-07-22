'use client'
import { useState, useEffect } from 'react'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', blue:'#3b82f6' }

export default function ConsentLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [versionSaving, setVersionSaving] = useState(false)
  const [versionMsg, setVersionMsg] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.view_consent_logs)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) { load(); loadVersion() } }, [authChecked])

  async function loadVersion() {
    try {
      const data = await fetch('/api/terms-version').then(r=>r.json())
      setCurrentVersion(data.version); setNewVersion(data.version)
    } catch {}
  }

  async function updateVersion() {
    if (!newVersion.trim() || newVersion === currentVersion) return
    setVersionSaving(true); setVersionMsg('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/terms-version', {
        method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key },
        body: JSON.stringify({ version: newVersion.trim() })
      })
      const data = await res.json()
      if (!res.ok) { setVersionMsg('خطأ: ' + (data.error||'')); setVersionSaving(false); return }
      setCurrentVersion(data.version)
      setVersionMsg('✅ تم التحديث — كل المستخدمين الحاليين بيشوفون نافذة الموافقة بأول دخول لهم')
    } catch { setVersionMsg('حدث خطأ') }
    setVersionSaving(false)
  }

  async function load(searchTerm?: string) {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const q = searchTerm !== undefined ? searchTerm : search
      const res = await fetch(`/api/admin/consent-logs${q ? `?search=${encodeURIComponent(q)}` : ''}`, { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (!res.ok || !data.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setLogs(data.logs || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load(search)
  }

  function exportCSV() {
    if (logs.length === 0) return
    const headers = ['التاريخ والوقت', 'المؤسسة', 'الاسم', 'الجوال', 'نسخة الشروط', 'عنوان IP', 'الجهاز']
    const rows = logs.map(l => [
      new Date(l.accepted_at).toLocaleString('ar-SA'),
      l.org_name, l.profile_name, l.profile_phone, l.terms_version, l.ip_address || '—', l.user_agent || '—',
    ])
    const csv = '\ufeff' + [headers, ...rows].map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `consent-logs-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
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
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>سجلات الموافقة على الشروط</h1>
          <div style={{fontSize:12,color:C.text3}}>توثيق قانوني لموافقة كل عميل — الوقت، نسخة الشروط، IP، الجهاز</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={exportCSV} disabled={logs.length===0} style={{padding:'8px 16px',background:C.green+'22',color:C.green,border:`1px solid ${C.green}44`,borderRadius:10,fontSize:13,fontWeight:700,cursor:logs.length===0?'not-allowed':'pointer',fontFamily:'inherit',opacity:logs.length===0?.5:1}}>⬇ تصدير CSV</button>
          <a href="/storely-admin" style={{padding:'8px 16px',background:'#334155',color:C.text,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>← الرئيسية</a>
        </div>
      </div>

      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:10}}>نسخة الشروط الحالية: <span style={{color:C.green}}>{currentVersion||'...'}</span></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <input value={newVersion} onChange={e=>setNewVersion(e.target.value)} placeholder="رقم النسخة الجديد (مثلاً 2026-09)"
            style={{flex:1,padding:'9px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13,fontFamily:'inherit'}}/>
          <button onClick={updateVersion} disabled={versionSaving||!newVersion.trim()||newVersion===currentVersion}
            style={{padding:'9px 18px',background:C.green,color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:(versionSaving||!newVersion.trim()||newVersion===currentVersion)?.5:1}}>
            {versionSaving?'...':'تحديث النسخة'}
          </button>
        </div>
        {versionMsg && <div style={{fontSize:12,color:versionMsg.startsWith('✅')?C.green:'#fca5a5',marginTop:8}}>{versionMsg}</div>}
        <div style={{fontSize:11,color:C.text3,marginTop:8}}>تحديث النسخة يفرض على كل المالكين إعادة الموافقة على الشروط بأول دخول لهم بعد نشر التعديل بصفحة /terms</div>
      </div>

      <form onSubmit={handleSearch} style={{display:'flex',gap:10,marginBottom:20}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم، الجوال، أو اسم المؤسسة"
          style={{flex:1,padding:'10px 14px',background:C.card,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:13,fontFamily:'inherit'}}/>
        <button type="submit" disabled={loading} style={{padding:'10px 20px',background:C.blue,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          {loading?'...':'🔍 بحث'}
        </button>
        {search && (
          <button type="button" onClick={()=>{setSearch('');load('')}} style={{padding:'10px 16px',background:'#334155',color:C.text,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            مسح
          </button>
        )}
      </form>

      {error && <div style={{background:'#7f1d1d33',color:'#fca5a5',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:16}}>{error}</div>}

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:C.text3}}>جاري التحميل...</div>
      ) : logs.length === 0 ? (
        <div style={{background:C.card,borderRadius:14,padding:40,textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:32,marginBottom:10}}>📭</div>
          <div style={{color:C.text2}}>{search ? 'ما فيه نتائج مطابقة' : 'ما فيه سجلات موافقة بعد'}</div>
        </div>
      ) : (
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
          <div style={{overflowX:'auto' as const}}>
            <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:13}}>
              <thead>
                <tr style={{background:'#0f172a',borderBottom:`1px solid ${C.border}`}}>
                  <th style={{padding:'10px 14px',textAlign:'right' as const,color:C.text3,fontWeight:700}}>التاريخ والوقت</th>
                  <th style={{padding:'10px 14px',textAlign:'right' as const,color:C.text3,fontWeight:700}}>المؤسسة</th>
                  <th style={{padding:'10px 14px',textAlign:'right' as const,color:C.text3,fontWeight:700}}>الاسم</th>
                  <th style={{padding:'10px 14px',textAlign:'right' as const,color:C.text3,fontWeight:700}}>الجوال</th>
                  <th style={{padding:'10px 14px',textAlign:'right' as const,color:C.text3,fontWeight:700}}>نسخة الشروط</th>
                  <th style={{padding:'10px 14px',textAlign:'right' as const,color:C.text3,fontWeight:700}}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:i<logs.length-1?`1px solid ${C.border}`:'none'}}>
                    <td style={{padding:'10px 14px',color:C.text2,whiteSpace:'nowrap' as const}}>{new Date(l.accepted_at).toLocaleString('ar-SA')}</td>
                    <td style={{padding:'10px 14px',color:C.text,fontWeight:600}}>{l.org_name}</td>
                    <td style={{padding:'10px 14px',color:C.text2}}>{l.profile_name}</td>
                    <td style={{padding:'10px 14px',color:C.text2,direction:'ltr' as const,textAlign:'right' as const}}>{l.profile_phone}</td>
                    <td style={{padding:'10px 14px',color:C.text2}}>{l.terms_version}</td>
                    <td style={{padding:'10px 14px',color:C.text3,fontSize:11,direction:'ltr' as const,textAlign:'right' as const}}>{l.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
