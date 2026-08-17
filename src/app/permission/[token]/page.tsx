'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function PermissionPage() {
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [req, setReq] = useState<any>(null)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<'approved'|'rejected'|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance-permission-request?token=${token}`)
      const j = await res.json()
      if (!j.success) { setError(j.error || 'الطلب غير موجود'); setLoading(false); return }
      setReq(j.request)
      if (j.request.status !== 'pending') setResult(j.request.status)
    } catch { setError('حدث خطأ') }
    setLoading(false)
  }

  async function respond(action: 'approve'|'reject') {
    setResolving(true)
    try {
      const res = await fetch('/api/attendance-permission-request', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })
      const j = await res.json()
      if (j.success) setResult(j.status)
      else setError(j.error || 'حدث خطأ')
    } catch { setError('حدث خطأ') }
    setResolving(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f7fa',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',padding:20}}>
      <div style={{width:'100%',maxWidth:420,background:'white',borderRadius:20,padding:'32px 28px',boxShadow:'0 4px 24px rgba(0,0,0,.08)',textAlign:'center' as const}}>
        {loading ? (
          <div style={{color:'#94a3b8',fontSize:13}}>جاري التحميل...</div>
        ) : error ? (
          <div><div style={{fontSize:40,marginBottom:12}}>⚠️</div><div style={{color:'#dc2626',fontSize:14,fontWeight:700}}>{error}</div></div>
        ) : result ? (
          <div>
            <div style={{fontSize:48,marginBottom:14}}>{result === 'approved' ? '✅' : '🚫'}</div>
            <div style={{fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:6}}>
              {result === 'approved' ? 'تمت الموافقة على الاستئذان' : 'تم رفض الاستئذان'}
            </div>
            <div style={{fontSize:12,color:'#64748b'}}>{req?.staff_name} تم إبلاغه بالنتيجة</div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:40,marginBottom:12}}>🙋</div>
            <div style={{fontSize:17,fontWeight:800,color:'#0f172a',marginBottom:4}}>طلب استئذان</div>
            <div style={{fontSize:14,fontWeight:700,color:'#16a34a',marginBottom:10}}>{req?.staff_name}</div>
            {req?.reason && (
              <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',fontSize:13,color:'#334155',marginBottom:20,lineHeight:1.7,textAlign:'right' as const}}>
                {req.reason}
              </div>
            )}
            <div style={{display:'flex',gap:10}}>
              <button onClick={() => respond('approve')} disabled={resolving}
                style={{flex:1,padding:'13px',background:'#16a34a',color:'white',border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                {resolving ? '...' : '✅ موافقة'}
              </button>
              <button onClick={() => respond('reject')} disabled={resolving}
                style={{flex:1,padding:'13px',background:'#fef2f2',color:'#dc2626',border:'1.5px solid #fecaca',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                {resolving ? '...' : '🚫 رفض'}
              </button>
            </div>
          </div>
        )}
        <p style={{fontSize:11,color:'#9ca3af',marginTop:24}}>Storely · storely.dev</p>
      </div>
    </div>
  )
}
