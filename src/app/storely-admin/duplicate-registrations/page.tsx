'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#14b8a6', blue:'#3b82f6', amber:'#f59e0b' }

interface OrgGroup {
  ip_address: string
  organizations: { id: string; name: string; plan: string; created_at: string }[]
  first_seen: string
  last_seen: string
}

export default function DuplicateRegistrationsPage() {
  const [groups, setGroups] = useState<OrgGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const key = sessionStorage.getItem('storely_admin_pass') || ''
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key } })
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.replace('/storely-admin'); return }
        setAuthChecked(true)
        load()
      })
      .catch(() => router.replace('/storely-admin'))
  }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const key = sessionStorage.getItem('storely_admin_pass') || ''
      const res = await fetch('/api/admin/duplicate-registrations', { headers: { 'x-admin-key': key } })
      const data = await res.json()
      if (data.success) setGroups(data.groups || [])
      else setError(data.error || 'تعذر التحميل')
    } catch { setError('حدث خطأ بالاتصال') }
    setLoading(false)
  }

  if (!authChecked) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{color:C.text2,fontSize:13}}>⏳ جاري التحقق...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:C.bg,padding:24,fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{marginBottom:20}}>
          <h1 style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:6}}>🕵️ تسجيلات مشبوهة (نفس IP)</h1>
          <p style={{fontSize:13,color:C.text2,lineHeight:1.7}}>
            منشآت متعددة اتسجّلت من نفس عنوان الشبكة — مؤشر محتمل (مو مؤكد) على شخص واحد يتحايل على
            حدود الباقة بإنشاء منشآت منفصلة بدل استخدام نظام "إضافة فرع" الحقيقي. راجع كل حالة يدوياً
            قبل أي إجراء (ممكن يكون سبب طبيعي زي شبكة WiFi مشتركة بمكتب أو كافيه).
          </p>
        </div>

        {error && <div style={{background:'#7f1d1d',color:'#fecaca',padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13}}>{error}</div>}

        {loading ? (
          <div style={{color:C.text2,fontSize:13,textAlign:'center' as const,padding:40}}>⏳ جاري التحميل...</div>
        ) : groups.length === 0 ? (
          <div style={{background:C.card,borderRadius:14,padding:40,textAlign:'center' as const,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:32,marginBottom:10}}>✅</div>
            <div style={{color:C.text2}}>ما فيه أي حالة مشبوهة حالياً</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
            {groups.map((g, i) => (
              <div key={g.ip_address} style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.amber,background:'#78350f',padding:'4px 10px',borderRadius:99}}>
                      {g.organizations.length} منشآت
                    </span>
                    <span style={{fontSize:13,color:C.text,fontFamily:'monospace',direction:'ltr' as const}}>{g.ip_address}</span>
                  </div>
                  <span style={{fontSize:11,color:C.text3}}>
                    من {new Date(g.first_seen).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short'})}
                    {' '}إلى {new Date(g.last_seen).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short'})}
                  </span>
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
                  {g.organizations.map(o => (
                    <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:C.bg,borderRadius:8}}>
                      <span style={{fontSize:13,color:C.text,fontWeight:600}}>{o.name}</span>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:11,color:C.text3}}>{new Date(o.created_at).toLocaleDateString('ar-SA',{numberingSystem:'latn',day:'numeric',month:'short',year:'numeric'})}</span>
                        <span style={{fontSize:10,fontWeight:700,color:C.blue,background:'#1e3a5f',padding:'2px 8px',borderRadius:99}}>{o.plan}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
