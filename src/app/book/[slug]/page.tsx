'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

function isOpenNow(hours: any): { known: boolean; open: boolean; label: string } {
  if (!hours?.enabled) return { known: false, open: true, label: '' }
  if (hours.is24h) return { known: true, open: true, label: 'مفتوح الآن · 24 ساعة' }
  const now = new Date()
  const saudiMinutes = ((now.getUTCHours() + 3) % 24) * 60 + now.getUTCMinutes()
  const [oh, om] = String(hours.open || '08:00').split(':').map(Number)
  const [ch, cm] = String(hours.close || '23:00').split(':').map(Number)
  const openM = oh * 60 + om, closeM = ch * 60 + cm
  const open = closeM > openM ? (saudiMinutes >= openM && saudiMinutes < closeM) : (saudiMinutes >= openM || saudiMinutes < closeM)
  return { known: true, open, label: open ? `مفتوح الآن · يغلق ${hours.close}` : `مغلق الآن · يفتح ${hours.open}` }
}

const STATUS_INFO: Record<string,{label:string;color:string;bg:string}> = {
  pending:   { label:'قيد الانتظار', color:'#d97706', bg:'#fffbeb' },
  confirmed: { label:'مؤكد',        color:'#0d9488', bg:'#f0fdfa' },
  ready:     { label:'جاهزة',       color:'#0369a1', bg:'#eff6ff' },
  completed: { label:'مكتملة',      color:'#7c3aed', bg:'#f5f3ff' },
  cancelled: { label:'ملغية',       color:'#dc2626', bg:'#fef2f2' },
}

function today() { return new Date().toISOString().slice(0,10) }
function tomorrow() { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10) }
function fmtDateLabel(d: string) {
  if (d === today()) return 'اليوم'
  if (d === tomorrow()) return 'غداً'
  return new Date(d).toLocaleDateString('ar-SA', { numberingSystem:'latn', month:'short', day:'numeric' })
}
function fmtTime12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const p = h >= 12 ? 'م' : 'ص'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2,'0')} ${p}`
}

function getTimeSlots(hours: any): string[] {
  const slots: string[] = []
  if (!hours?.enabled || hours.is24h) {
    for (let h = 0; h < 24; h++) { slots.push(`${String(h).padStart(2,'0')}:00`); slots.push(`${String(h).padStart(2,'0')}:30`) }
    return slots
  }
  const [oh, om] = String(hours.open || '08:00').split(':').map(Number)
  const [ch, cm] = String(hours.close || '23:00').split(':').map(Number)
  const openMin = oh * 60 + om, closeMin = ch * 60 + cm
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const mins = h * 60 + m
      const inRange = closeMin > openMin ? (mins >= openMin && mins < closeMin) : (mins >= openMin || mins < closeMin)
      if (inRange) slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
  }
  return slots
}

export default function BookPage() {
  const params = useParams()
  const slug = params.slug as string
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [screen, setScreen] = useState<'hero'|'book'>('hero')


  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState<string|null>(null)
  const [guests, setGuests] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')



  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reservation-settings?slug=${slug}`)
      const j = await res.json()
      if (!j.success) { setNotFound(true); setLoading(false); return }
      setOrg(j.org)
    } catch { setNotFound(true) }
    setLoading(false)
  }

  async function submit() {
    setError('')
    if (!name.trim()) { setError('اكتب اسمك'); return }
    if (!phone.trim() || phone.replace(/\D/g,'').length < 9) { setError('اكتب رقم جوال صحيح'); return }
    if (!time) { setError('اختر الوقت'); return }
    setSubmitting(true)
    const res = await fetch('/api/reservations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, name, phone, guests, booking_date: date, booking_time: time }),
    })
    const j = await res.json()
    setSubmitting(false)
    if (!j.success) { setError(j.error || 'فشل الحجز'); return }
    setResult(j.reservation)
  }

  function resetForm() {
    setResult(null); setName(''); setPhone(''); setTime(null); setGuests(2); setDate(today()); setError('')
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>جاري التحميل...</div>

  if (notFound || !org) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#faf8f5',padding:20,textAlign:'center' as const}}>
        <div><div style={{fontSize:48,marginBottom:16}}>🔍</div><div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>صفحة الحجز غير متاحة</div></div>
      </div>
    )
  }

  const color = org.res_color || '#B86E3F'
  const displayName = org.res_display_name || org.name
  const status = isOpenNow(org.res_hours)

  return (
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#faf8f5',color:'#1c1917'}}>
      {screen === 'hero' ? (
        <div style={{minHeight:'100vh',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',padding:24,textAlign:'center' as const}}>
          {org.res_logo_url ? (
            <img src={org.res_logo_url} alt={displayName} style={{width:110,height:110,borderRadius:24,objectFit:'cover',marginBottom:24,boxShadow:'0 12px 32px rgba(0,0,0,.12)'}}/>
          ) : (
            <div style={{width:110,height:110,borderRadius:24,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:900,color,marginBottom:24}}>{displayName?.[0]||'؟'}</div>
          )}
          <h1 style={{fontSize:32,fontWeight:900,color,letterSpacing:1,marginBottom:8}}>{displayName}</h1>
          {org.res_tagline && <p style={{fontSize:15,color:'#78716c',marginBottom:8}}>{org.res_tagline}</p>}
          {status.known && (
            <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:99,background:status.open?'#f0fdfa':'#fef2f2',color:status.open?'#0d9488':'#dc2626',marginBottom:20}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:status.open?'#0d9488':'#dc2626'}}/>{status.label}
            </span>
          )}
          <button onClick={()=>setScreen('book')} style={{padding:'16px 48px',background:color,color:'white',border:'none',borderRadius:14,fontSize:16,fontWeight:800,cursor:'pointer',boxShadow:`0 8px 24px ${color}44`}}>
            احجز طاولتك
          </button>
        </div>
      ) : (
        <div style={{minHeight:'100vh',padding:'20px 16px'}}>
          <div style={{maxWidth:480,margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <button onClick={()=>setScreen('hero')} style={{background:'none',border:'none',color:'#78716c',fontSize:13,fontWeight:700,cursor:'pointer'}}>‹ الرئيسية</button>
              {org.res_logo_url && <img src={org.res_logo_url} style={{height:32,borderRadius:8}}/>}
            </div>

            {!result && (
              <div style={{background:'white',borderRadius:20,padding:24,border:'1px solid #ece8e2'}}>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#78716c',display:'block',marginBottom:6}}>الاسم الكامل</label>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="أحمد محمد" style={{width:'100%',padding:'12px 14px',border:'1.5px solid #ece8e2',borderRadius:10,fontSize:14,fontFamily:'inherit',boxSizing:'border-box' as const}}/>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#78716c',display:'block',marginBottom:6}}>رقم الجوال</label>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" style={{width:'100%',padding:'12px 14px',border:'1.5px solid #ece8e2',borderRadius:10,fontSize:14,fontFamily:'inherit',textAlign:'right' as const,boxSizing:'border-box' as const}}/>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#78716c',display:'block',marginBottom:6}}>اليوم</label>
                  <div style={{display:'flex',gap:8}}>
                    {[today(), tomorrow()].map(d=>(
                      <button key={d} onClick={()=>{setDate(d);setTime(null)}} style={{flex:1,padding:'10px',borderRadius:10,border:`1.5px solid ${date===d?color:'#ece8e2'}`,background:date===d?color:'white',color:date===d?'white':'#78716c',fontSize:13,fontWeight:700,cursor:'pointer'}}>{fmtDateLabel(d)}</button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#78716c',display:'block',marginBottom:6}}>الوقت</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))',gap:6}}>
                    {getTimeSlots(org.res_hours).map(t=>{
                      const isPast = date===today() && (()=>{const now=new Date();const[h,m]=t.split(':').map(Number);return now.getHours()>h||(now.getHours()===h&&now.getMinutes()>=m)})()
                      return (
                        <button key={t} disabled={isPast} onClick={()=>setTime(t)} style={{padding:'9px 4px',borderRadius:9,border:`1.5px solid ${time===t?color:'#ece8e2'}`,background:time===t?color:isPast?'#f5f5f4':'white',color:time===t?'white':isPast?'#d6d0c8':'#4a3828',fontSize:12,fontWeight:700,cursor:isPast?'not-allowed':'pointer',textDecoration:isPast?'line-through':'none'}}>{fmtTime12(t)}</button>
                      )
                    })}
                  </div>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:11,fontWeight:700,color:'#78716c',display:'block',marginBottom:6}}>عدد الأشخاص</label>
                  <div style={{display:'inline-flex',alignItems:'center',border:'1.5px solid #ece8e2',borderRadius:10,overflow:'hidden'}}>
                    <button onClick={()=>setGuests(Math.max(1,guests-1))} style={{width:44,height:44,border:'none',background:'white',cursor:'pointer',fontSize:16}}>−</button>
                    <div style={{width:56,textAlign:'center' as const,fontSize:16,fontWeight:800}}>{guests}</div>
                    <button onClick={()=>setGuests(Math.min(org.res_max_guests||10,guests+1))} style={{width:44,height:44,border:'none',background:'white',cursor:'pointer',fontSize:16}}>+</button>
                  </div>
                </div>
                {error && <div style={{fontSize:12,color:'#dc2626',marginBottom:12,textAlign:'center' as const}}>{error}</div>}
                <button onClick={submit} disabled={submitting} style={{width:'100%',padding:'14px',background:color,color:'white',border:'none',borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer'}}>{submitting?'جاري الحجز...':'تأكيد الحجز'}</button>
              </div>
            )}

            {result && (
              <div style={{background:'white',borderRadius:20,padding:28,border:'1px solid #ece8e2',textAlign:'center' as const}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>تم الحجز بنجاح</div>
                <div style={{fontSize:12,color:'#78716c',marginBottom:20}}>راح نتواصل معك لتأكيد حجزك</div>
                <div style={{background:'#faf8f5',borderRadius:14,padding:18,textAlign:'right' as const,marginBottom:20}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:13}}>
                    <div><div style={{fontSize:9,color:'#a8a29e',marginBottom:2}}>الاسم</div><div style={{fontWeight:800}}>{result.customer_name}</div></div>
                    <div><div style={{fontSize:9,color:'#a8a29e',marginBottom:2}}>اليوم</div><div style={{fontWeight:800}}>{fmtDateLabel(result.booking_date)}</div></div>
                    <div><div style={{fontSize:9,color:'#a8a29e',marginBottom:2}}>الوقت</div><div style={{fontWeight:800}}>{fmtTime12(result.booking_time)}</div></div>
                    <div><div style={{fontSize:9,color:'#a8a29e',marginBottom:2}}>الأشخاص</div><div style={{fontWeight:800}}>{result.guests}</div></div>
                  </div>
                </div>
                <button onClick={resetForm} style={{width:'100%',padding:'12px',background:color,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>حجز جديد</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{textAlign:'center' as const,padding:'24px 20px',color:'#a8a29e',fontSize:11}}>
        حقوق الملكية محفوظة لـ <b style={{color}}>Storely</b> — تشغيل نظام حجز {displayName} بواسطة Storely
      </div>
    </div>
  )
}
