'use client'
import { useState, useEffect } from 'react'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', blue:'#3b82f6' }

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated || (data.admin?.role !== 'super_admin' && !data.admin?.permissions?.view_audit_log)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load(searchTerm?: string) {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const q = searchTerm !== undefined ? searchTerm : search
      const res = await fetch(`/api/admin/audit-log${q ? `?search=${encodeURIComponent(q)}` : ''}`, { headers: { 'x-admin-key': key } })
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

  if (!authChecked) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{color:C.text2,fontSize:13}}>⏳ جاري التحقق...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>سجل تدقيق الإجراءات الإدارية</h1>
          <div style={{fontSize:12,color:C.text3}}>مين سوى إيش، ومتى — كل إجراء إداري حساس (تفعيل، حذف، تعديل)</div>
        </div>
        <a href="/storely-admin" style={{padding:'8px 16px',background:'#334155',color:C.text,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>← الرئيسية</a>
      </div>

      <form onSubmit={handleSearch} style={{display:'flex',gap:10,marginBottom:20}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم المشرف، نوع الإجراء، أو اسم المؤسسة"
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
          <div style={{color:C.text2}}>{search ? 'ما فيه نتائج مطابقة' : 'ما فيه إجراءات مسجّلة بعد'}</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {logs.map((l)=>(
            <div key={l.id} style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap' as const}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{l.action}</div>
                  <div style={{fontSize:12,color:C.text2,marginTop:3}}>👤 {l.admin_name}{l.target_org_name ? ` — على مؤسسة: ${l.target_org_name}` : ''}</div>
                  {l.details && <div style={{fontSize:11,color:C.text3,marginTop:4,fontFamily:'monospace'}}>{JSON.stringify(l.details)}</div>}
                </div>
                <div style={{fontSize:11,color:C.text3,whiteSpace:'nowrap' as const}}>{new Date(l.created_at).toLocaleString('ar-SA')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
