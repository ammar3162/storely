'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const C = {
  primary:'#16a34a', primaryD:'#15803d', primaryL:'#f0fdf4', primaryB:'#bbf7d0',
  text:'#111827', text2:'#374151', text3:'#6b7280', text4:'#9ca3af',
  bg:'#f9fafb', surface:'#ffffff', border:'#f3f4f6', border2:'#e5e7eb',
}

const TOOLS = [
  {
    href:'/purchase-suggestion',
    icon:'🛒',
    title:'اقتراح الشراء الذكي',
    desc:'يحسب الكمية المثلى لكل صنف بناءً على معدل الصرف الفعلي ويرسلها للمورد عبر واتساب',
    color:'#16a34a',
    bg:'#f0fdf4',
    border:'#bbf7d0',
    features:['حساب الكمية المثلى','إرسال للمورد واتساب','بناءً على 90 يوم صرف'],
  },
  {
    href:'/branch-compare',
    icon:'📊',
    title:'مقارنة الفروع',
    desc:'قارن أداء كل فرع من حيث الصرف والمشتريات والأصناف الناقصة',
    color:'#3b82f6',
    bg:'#eff6ff',
    border:'#bfdbfe',
    features:['مقارنة الصرف','أفضل الأصناف لكل فرع','تحليل أسبوعي وشهري'],
  },
]

export default function AIToolsPage() {
  const router = useRouter()
  const [visible] = useState(true)

  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',maxWidth:700,margin:'0 auto',opacity:visible?1:0,transition:'opacity .3s'}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.fu{animation:fadeUp .35s ease both}`}</style>

      {/* Header */}
      <div className="fu" style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.primaryD})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
            ✨
          </div>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:C.text,margin:0}}>أدوات الذكاء</h1>
            <p style={{fontSize:11,color:C.text3,margin:'3px 0 0'}}>أدوات تحليل ذكية مبنية على بيانات مخزونك الحقيقية</p>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {TOOLS.map((tool,i)=>(
          <div key={i} className="fu" style={{animationDelay:`${i*.08}s`}}>
            <button onClick={()=>router.push(tool.href)}
              style={{width:'100%',background:'white',border:`1.5px solid ${tool.border}`,borderRadius:16,padding:'20px',cursor:'pointer',fontFamily:'inherit',textAlign:'right',transition:'all .2s',boxShadow:`0 2px 8px ${tool.color}10`}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${tool.color}20`}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.boxShadow=`0 2px 8px ${tool.color}10`}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{width:52,height:52,borderRadius:14,background:tool.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,border:`1px solid ${tool.border}`}}>
                  {tool.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6}}>{tool.title}</div>
                  <div style={{fontSize:13,color:C.text3,lineHeight:1.6,marginBottom:12}}>{tool.desc}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {tool.features.map((f,j)=>(
                      <span key={j} style={{background:tool.bg,color:tool.color,fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:99,border:`1px solid ${tool.border}`}}>
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>
                <svg width="16" height="16" fill="none" stroke={tool.color} strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:4}}>
                  <path d="M15 19l-7-7 7-7"/>
                </svg>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`,animationDelay:'.2s'}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text3,marginBottom:10}}>🔜 قريباً</div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10,opacity:.6}}>
            <span style={{fontSize:18}}>♻️</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>كشف الهدر</div>
              <div style={{fontSize:11,color:C.text3}}>يكتشف ما تشتريه ولا تصرفه</div>
            </div>
            <span style={{marginRight:'auto',fontSize:10,fontWeight:700,color:C.text4,background:C.border,padding:'2px 8px',borderRadius:99}}>قريباً</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>📅</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>التقرير الأسبوعي</div>
              <div style={{fontSize:11,color:C.text3}}>يُرسل كل أحد على واتساب تلقائياً</div>
            </div>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              const res=await fetch('/api/weekly-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
              if(res.ok) alert('تم إرسال التقرير على واتساب ✅')
              else alert('حدث خطأ، حاول مرة أخرى')
            }}
              style={{padding:'6px 14px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              إرسال الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
