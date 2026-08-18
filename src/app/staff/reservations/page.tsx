'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  danger:'#e24b4a', dangerL:'#fef2f2', dangerB:'#fecaca',
  warning:'#ba7517', warningL:'#fffbeb', warningB:'#fde68a',
  info:'#378add', infoL:'#eff6ff', infoB:'#bfdbfe',
  purple:'#7c3aed', purpleL:'#f5f3ff', purpleB:'#ddd6fe',
  text:'#1c1c1a', text2:'#3d3d3a', text3:'#5f5e5a', text4:'#888780',
  bg:'#f5f5f4', border:'#ebebea', border2:'#e0e0dd',
}

const STATUS_INFO: Record<string,{label:string;color:string;bg:string;border:string}> = {
  pending:   { label:'قيد الانتظار', color:C.warning, bg:C.warningL, border:C.warningB },
  confirmed: { label:'مؤكد',        color:C.primary, bg:C.primaryL, border:C.primaryB },
  ready:     { label:'جاهزة',       color:C.info,    bg:C.infoL,    border:C.infoB },
  completed: { label:'مكتملة',      color:C.purple,  bg:C.purpleL,  border:C.purpleB },
  cancelled: { label:'ملغية',       color:C.danger,  bg:C.dangerL,  border:C.dangerB },
}
const NEXT_STATUS: Record<string,string|null> = { pending:'confirmed', confirmed:'ready', ready:'completed', completed:null, cancelled:null }
const NEXT_LABEL: Record<string,string> = { pending:'تأكيد', confirmed:'جاهزة الآن', ready:'إنهاء' }

export default function StaffReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0,10))
  const [updating, setUpdating] = useState<string|null>(null)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('staff_session')
    if (!saved) { router.push('/staff'); return }
    const s = JSON.parse(saved)
    if (!s.permissions?.reservations) { router.push('/staff/dispense'); return }
    setSession(s)
    load(dateFilter)
  }, [])

  useEffect(() => { if (session) load(dateFilter) }, [dateFilter])

  async function load(date: string) {
    setLoading(true)
    const staffToken = localStorage.getItem('staff_token')
    const res = await fetch(`/api/staff-reservations?date=${date}`, { headers: { 'Authorization': `Bearer ${staffToken}` } })
    const j = await res.json()
    if (j.success) setReservations(j.reservations)
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    const staffToken = localStorage.getItem('staff_token')
    await fetch('/api/staff-reservations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
      body: JSON.stringify({ reservation_id: id, status }),
    })
    setUpdating(null)
    load(dateFilter)
  }

  function fmtTime12(t: string) {
    const [h, m] = t.split(':').map(Number)
    const p = h >= 12 ? 'م' : 'ص'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${String(m).padStart(2,'0')} ${p}`
  }

  if (!session) return null

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',minHeight:'100vh',background:C.bg,padding:'20px 16px'}}>
      <div style={{maxWidth:600,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <button onClick={()=>router.push('/staff/dispense')} style={{background:'none',border:'none',color:C.text3,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>‹ رجوع</button>
          <div style={{fontSize:15,fontWeight:800,color:C.text}}>🗓️ الحجوزات</div>
          <div style={{width:50}}/>
        </div>

        <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}
          style={{width:'100%',padding:'12px 14px',borderRadius:12,border:`1px solid ${C.border2}`,fontSize:14,fontFamily:'inherit',marginBottom:16,background:'white',boxSizing:'border-box' as const}}/>

        {loading ? (
          <div style={{textAlign:'center' as const,padding:40,color:C.text4,fontSize:13}}>جاري التحميل...</div>
        ) : reservations.length === 0 ? (
          <div style={{textAlign:'center' as const,padding:40,color:C.text4,fontSize:13,background:'white',borderRadius:16}}>ما فيه حجوزات بهذا اليوم</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
            {reservations.map((r:any) => {
              const st = STATUS_INFO[r.status] || STATUS_INFO.pending
              const next = NEXT_STATUS[r.status]
              return (
                <div key={r.id} style={{background:'white',borderRadius:16,padding:16,border:`1px solid ${C.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:C.text}}>{r.customer_name}</div>
                      <div style={{fontSize:12,color:C.text4,marginTop:2}} dir="ltr">{r.phone}</div>
                    </div>
                    <span style={{background:st.bg,color:st.color,border:`1px solid ${st.border}`,padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{st.label}</span>
                  </div>
                  <div style={{display:'flex',gap:16,fontSize:13,color:C.text2,marginBottom:14}}>
                    <span>🕐 {fmtTime12(r.booking_time)}</span>
                    <span>👥 {r.guests} أشخاص</span>
                  </div>
                  {r.notes && <div style={{fontSize:12,color:C.text3,background:C.bg,borderRadius:10,padding:10,marginBottom:14}}>{r.notes}</div>}
                  {r.status !== 'cancelled' && r.status !== 'completed' && (
                    <div style={{display:'flex',gap:8}}>
                      {next && (
                        <button onClick={()=>updateStatus(r.id, next)} disabled={updating===r.id}
                          style={{flex:1,padding:'10px',background:C.primary,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          {updating===r.id ? '...' : NEXT_LABEL[r.status]}
                        </button>
                      )}
                      <button onClick={()=>updateStatus(r.id, 'cancelled')} disabled={updating===r.id}
                        style={{padding:'10px 16px',background:C.dangerL,color:C.danger,border:`1px solid ${C.dangerB}`,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
