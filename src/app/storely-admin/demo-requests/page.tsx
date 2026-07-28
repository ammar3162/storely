'use client'
import { useState, useEffect } from 'react'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', blue:'#3b82f6' }

const STATUS_LABELS: Record<string,string> = { new:'جديد', contacted:'تم التواصل', converted:'تحوّل لعميل', rejected:'مرفوض' }
const STATUS_COLORS: Record<string,string> = { new:'#3b82f6', contacted:'#f59e0b', converted:'#22c55e', rejected:'#ef4444' }

export default function DemoRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)

  function key() { return sessionStorage.getItem('storely_admin_pass') || '' }

  useEffect(() => {
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key() } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
        load()
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/demo-requests', { headers: { 'x-admin-key': key() } })
    const data = await res.json()
    setRequests(data.requests || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/demo-requests', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
      body: JSON.stringify({ id, status })
    })
    load()
  }

  if (!authChecked) return <div style={{background:C.bg,minHeight:'100vh'}}/>

  return (
    <div style={{background:C.bg, minHeight:'100vh', padding:32, fontFamily:'system-ui', direction:'rtl'}}>
      <div style={{maxWidth:1000, margin:'0 auto'}}>
        <h1 style={{color:C.text, fontSize:24, fontWeight:800, marginBottom:8}}>طلبات عرض النظام</h1>
        <p style={{color:C.text3, fontSize:13, marginBottom:28}}>الطلبات اللي وصلت من نموذج "اطلب عرض النظام" بالصفحة الرئيسية ({requests.length})</p>

        {loading ? <div style={{color:C.text3}}>جاري التحميل...</div> :
          requests.length === 0 ? (
            <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:24, color:C.text3, fontSize:13}}>
              لا توجد طلبات بعد
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {requests.map((r:any) => (
                <div key={r.id} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12}}>
                    <div>
                      <div style={{color:C.text, fontSize:16, fontWeight:700}}>{r.first_name} {r.last_name}</div>
                      <div style={{color:C.text3, fontSize:12, marginTop:2}}>{new Date(r.created_at).toLocaleString('ar-SA')}</div>
                    </div>
                    <select value={r.status} onChange={e=>updateStatus(r.id, e.target.value)}
                      style={{background:C.bg, color:STATUS_COLORS[r.status]||C.text2, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', fontSize:12, fontWeight:700}}>
                      {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:13}}>
                    <div style={{color:C.text2}}>🏢 <span style={{color:C.text}}>{r.business_name}</span></div>
                    <div style={{color:C.text2}}>🏪 <span style={{color:C.text}}>{r.branch_count || 'غير محدد'}</span></div>
                    <div style={{color:C.text2}}>📱 <a href={`https://wa.me/${r.phone.replace(/[^0-9]/g,'')}`} target="_blank" style={{color:C.blue}}>{r.phone}</a></div>
                    <div style={{color:C.text2}}>✉️ <a href={`mailto:${r.email}`} style={{color:C.blue}}>{r.email}</a></div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}
