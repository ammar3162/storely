'use client'
import { useState } from 'react'

export function FaqItem({ q, a }: { q:string; a:string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{borderBottom:'1px solid #f3f4f6'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 0',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}>
        <span style={{fontSize:16,fontWeight:600,color:'#111827'}}>{q}</span>
        <span style={{fontSize:20,color:'#15803d',transition:'transform .25s',transform:open?'rotate(45deg)':'none',flexShrink:0,marginRight:16}}>+</span>
      </button>
      {open && <p style={{paddingBottom:20,fontSize:14,color:'#6b7280',lineHeight:1.8}}>{a}</p>}
    </div>
  )
}

export function MiniMockup({ variant }: { variant: 'stats'|'whatsapp'|'staff'|'chart' }) {
  if (variant === 'staff') return (
    <div style={{background:'white',borderRadius:16,padding:14,height:'100%',display:'flex',flexDirection:'column',gap:8}}>
      <div style={{fontSize:11,fontWeight:800,color:'#111827',textAlign:'center' as const}}>أهلاً عمار</div>
      <div style={{background:'#f8fafc',borderRadius:10,padding:8,textAlign:'center' as const}}>
        <div style={{fontSize:8,color:'#d97706',fontWeight:700,marginBottom:5}}>● ما سجّلت حضورك بعد</div>
        <div style={{background:'#16a34a',borderRadius:7,padding:'6px 0',fontSize:9,fontWeight:800,color:'white'}}>تسجيل حضور</div>
      </div>
      <div style={{background:'linear-gradient(135deg,#166534,#15803d)',borderRadius:9,padding:'8px 10px',fontSize:9,fontWeight:800,color:'white',textAlign:'center' as const}}>صرف المخزون</div>
      <div style={{display:'flex',gap:6}}>
        <div style={{flex:1,background:'#f8fafc',border:'1px solid #f1f5f9',borderRadius:8,padding:'7px 0',fontSize:8,fontWeight:700,color:'#374151',textAlign:'center' as const}}>طلباتي</div>
        <div style={{flex:1,background:'#f8fafc',border:'1px solid #f1f5f9',borderRadius:8,padding:'7px 0',fontSize:8,fontWeight:700,color:'#374151',textAlign:'center' as const}}>مهامي</div>
      </div>
    </div>
  )
  if (variant === 'whatsapp') return (
    <div style={{background:'white',borderRadius:16,padding:14,height:'100%',display:'flex',flexDirection:'column',gap:7,justifyContent:'center'}}>
      <div style={{fontSize:10,fontWeight:800,color:'#111827',marginBottom:2}}>آخر المشتريات</div>
      {[['خضار','400 ر.س'],['بيض','20 ر.س'],['هالاينو','200 ر.س']].map(([n,v])=>(
        <div key={n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 9px',background:'#fafafa',borderRadius:7}}>
          <span style={{fontSize:9,fontWeight:700,color:'#374151'}}>{n}</span>
          <span style={{fontSize:9,fontWeight:800,color:'#15803d'}}>{v}</span>
        </div>
      ))}
    </div>
  )
  if (variant === 'chart') return (
    <div style={{background:'white',borderRadius:16,padding:14,height:'100%',display:'flex',flexDirection:'column',gap:6}}>
      <div style={{fontSize:10,fontWeight:800,color:'#111827',marginBottom:2}}>المخزون</div>
      {[['اكواب ورقية','21 كيس','#16a34a','كافٍ'],['ورقية ميديم','1 كرتون','#d97706','ناقص'],['بابريكا','0 علبة','#dc2626','نفد']].map(([n,q,c,s])=>(
        <div key={n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 9px',background:'#fafafa',borderRadius:7}}>
          <span style={{fontSize:9,fontWeight:700,color:'#374151'}}>{n}</span>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:9,fontWeight:800,color:'#111827'}}>{q}</span>
            <span style={{fontSize:7,fontWeight:800,color:c,background:`${c}18`,borderRadius:99,padding:'2px 6px'}}>{s}</span>
          </div>
        </div>
      ))}
    </div>
  )
  return (
    <div style={{background:'white',borderRadius:16,padding:16,height:'100%'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        {[['0','صرف اليوم','#15803d'],['26','ناقص','#dc2626'],['71','الأصناف','#2563eb'],['1,545','الكميات','#7c3aed']].map(([v,l,c])=>(
          <div key={l} style={{background:'#f8fafc',borderRadius:10,padding:'9px 6px',textAlign:'center' as const}}>
            <div style={{fontSize:15,fontWeight:900,color:c}}>{v}</div>
            <div style={{fontSize:8,color:'#9ca3af',marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{background:'#fafafa',borderRadius:9,padding:'8px 10px'}}>
        <div style={{fontSize:8,fontWeight:800,color:'#374151',marginBottom:6}}>أداء هذا الشهر</div>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
          <span style={{fontSize:8,color:'#6b7280'}}>المبيعات</span>
          <span style={{fontSize:9,fontWeight:800,color:'#111827'}}>88,090 ر.س</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:8,color:'#6b7280'}}>المشتريات</span>
          <span style={{fontSize:9,fontWeight:800,color:'#111827'}}>567 ر.س</span>
        </div>
      </div>
    </div>
  )
}
