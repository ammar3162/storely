'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StaffSession {
  id: string; name: string; org_id: string; branch_id: string | null
  org_name: string; branch_name: string
}

const STATUS_LABEL: Record<string, {label:string; color:string; bg:string}> = {
  pending:  { label: 'بانتظار الموافقة', color: '#d97706', bg: '#fffbeb' },
  approved: { label: 'موافَق عليها ✓',   color: '#029FA2', bg: '#f0fdfa' },
  rejected: { label: 'مرفوضة',           color: '#dc2626', bg: '#fef2f2' },
}

export default function StaffLeavePage() {
  const router = useRouter()
  const [session, setSession] = useState<StaffSession|null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [balance, setBalance] = useState<number|null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){ router.push('/staff'); return }
    setSession(JSON.parse(saved) as StaffSession)
    loadRequests()
  },[])

  async function loadRequests() {
    setLoading(true)
    try {
      const token = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-leave', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      const list = j.success ? (j.requests||[]) : []
      setRequests(list)
      if (list.length > 0) setBalance(list[0]?.staff_members?.leave_balance_days ?? null)
    } catch { setRequests([]) }
    setLoading(false)
  }

  async function submitRequest() {
    if (!startDate || !endDate) { setError('اختر تاريخ البداية والنهاية'); return }
    setError('')
    setSubmitting(true)
    const token = localStorage.getItem('staff_token')
    const res = await fetch('/api/staff-leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, reason: reason || null }),
    })
    const j = await res.json()
    setSubmitting(false)
    if (!j.success) { setError(j.error || 'حدث خطأ'); return }
    setStartDate(''); setEndDate(''); setReason('')
    loadRequests()
  }

  if (!session) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f4',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{width:32,height:32,border:'3px solid #e5e5e2',borderTopColor:'#029FA2',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f7f7f5',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',paddingBottom:40}}>
      <div style={{background:'white',borderBottom:'1px solid #ece8e2',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a'}}>طلب إجازة</div>
          <div style={{fontSize:12,color:'#888780',marginTop:2}}>{session.name}</div>
        </div>
        <button onClick={()=>router.back()} style={{background:'#f5f5f4',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,color:'#5f5e5a',cursor:'pointer',fontFamily:'inherit'}}>رجوع</button>
      </div>

      <div style={{maxWidth:520,margin:'0 auto',padding:'20px 16px'}}>
        {balance !== null && (
          <div style={{background:'linear-gradient(135deg,#042f2e,#029FA2)',borderRadius:16,padding:'18px 20px',marginBottom:20,textAlign:'center' as const}}>
            <div style={{fontSize:12,color:'rgba(255,255,255,.8)',marginBottom:4}}>رصيدك المتبقي</div>
            <div style={{fontSize:32,fontWeight:900,color:'white'}}>{balance} <span style={{fontSize:15,fontWeight:600}}>يوم</span></div>
          </div>
        )}

        <div style={{background:'white',border:'1.5px solid #ece8e2',borderRadius:14,padding:'16px',marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:'#374151',marginBottom:10}}>طلب إجازة جديد</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:11,color:'#6b7280',display:'block',marginBottom:5}}>من تاريخ</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{width:'100%',padding:'10px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/>
            </div>
            <div>
              <label style={{fontSize:11,color:'#6b7280',display:'block',marginBottom:5}}>إلى تاريخ</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                style={{width:'100%',padding:'10px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const}}/>
            </div>
          </div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="السبب (اختياري)"
            style={{width:'100%',padding:'10px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' as const,minHeight:60,resize:'none' as const,marginBottom:12}}/>
          {error && <div style={{fontSize:12,color:'#dc2626',marginBottom:10}}>{error}</div>}
          <button onClick={submitRequest} disabled={submitting||!startDate||!endDate}
            style={{width:'100%',padding:'12px',background:(submitting||!startDate||!endDate)?'#94a3b8':'#029FA2',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:(submitting||!startDate||!endDate)?'not-allowed':'pointer',fontFamily:'inherit'}}>
            {submitting?'جاري الإرسال...':'إرسال الطلب'}
          </button>
        </div>

        <div style={{fontSize:12,fontWeight:700,color:'#888780',marginBottom:10}}>طلباتي</div>
        {loading ? (
          <div style={{textAlign:'center' as const,padding:20,fontSize:13,color:'#888780'}}>جاري التحميل...</div>
        ) : requests.length===0 ? (
          <div style={{textAlign:'center' as const,padding:'40px 20px',fontSize:13,color:'#888780'}}>ما فيه طلبات إجازة بعد</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {requests.map((r:any)=>{
              const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending
              return (
                <div key={r.id} style={{background:st.bg,border:'1px solid #ece8e2',borderRadius:12,padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#1c1c1a'}}>{r.start_date} → {r.end_date}</span>
                    <span style={{fontSize:10,fontWeight:700,color:st.color}}>{st.label}</span>
                  </div>
                  <div style={{fontSize:11,color:'#6b7280'}}>{r.days_count} يوم{r.reason?` — ${r.reason}`:''}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
