'use client'
import { useState, useEffect } from 'react'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', red:'#ef4444' }

export default function NotificationHealthPage() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (!d.authenticated || (d.admin?.role !== 'super_admin' && !d.admin?.permissions?.view_health)) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  useEffect(() => { if (authChecked) load() }, [authChecked])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/notification-health', { headers: { 'x-admin-key': key } })
      const d = await res.json()
      if (!res.ok || !d.success) { setError('حدث خطأ بجلب البيانات'); setLoading(false); return }
      setOrgs(d.orgs || [])
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  if (!authChecked) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{color:C.text2,fontSize:13}}>⏳ جاري التحقق...</div>
    </div>
  )

  const problemOrgs = orgs.filter(o => o.failed > 0 && o.sent === 0)

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap' as const,gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>صحة توصيل واتساب لكل عميل</h1>
          <div style={{fontSize:12,color:C.text3}}>آخر 7 أيام — يُحدّث تلقائياً مع كل إشعار حقيقي يُرسل لأصحاب الحسابات</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={load} disabled={loading} style={{padding:'8px 16px',background:'#334155',color:C.text,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {loading?'...':'↺ تحديث'}
          </button>
          <a href="/storely-admin" style={{padding:'8px 16px',background:'#334155',color:C.text,borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>← الرئيسية</a>
        </div>
      </div>

      {error && <div style={{background:'#7f1d1d33',color:'#fca5a5',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:16}}>{error}</div>}

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:C.text3}}>جاري التحميل...</div>
      ) : orgs.length === 0 ? (
        <div style={{background:C.card,borderRadius:14,padding:40,textAlign:'center',border:`1px solid ${C.border}`}}>
          <div style={{fontSize:32,marginBottom:10}}>📭</div>
          <div style={{color:C.text2}}>ما فيه إشعارات مسجّلة آخر 7 أيام بعد</div>
        </div>
      ) : (
        <>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
            {orgs.map((o) => {
              const total = o.sent + o.failed
              const allFailed = o.sent === 0 && o.failed > 0
              return (
                <div key={o.org_id} style={{background:C.card,border:`1px solid ${allFailed?'#7f1d1d':'#14532d'}`,borderRadius:10,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{o.org_name}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}>{o.phone}</div>
                  </div>
                  <div style={{textAlign:'left' as const}}>
                    <div style={{fontSize:11,fontWeight:700,color:allFailed?C.red:C.green}}>
                      {allFailed?'⚠️':'✅'} {o.sent}/{total} وصلت
                    </div>
                    <div style={{fontSize:10,color:C.text3,marginTop:2}}>آخر محاولة: {new Date(o.last_at).toLocaleString('ar-SA')}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {problemOrgs.length > 0 && (
            <div style={{background:'#7f1d1d22',border:'1px solid #7f1d1d',borderRadius:10,padding:'12px 16px'}}>
              {problemOrgs.map(o => (
                <div key={o.org_id} style={{fontSize:12,color:'#fca5a5',marginBottom:4}}>
                  🔴 {o.org_name} — كل المحاولات فشلت ({o.failed}) آخر 7 أيام. رقمه غالباً غلط أو غير نشط — يستحق تواصل مباشر.
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
