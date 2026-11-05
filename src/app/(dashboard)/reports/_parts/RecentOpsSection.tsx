'use client'
import { useState } from 'react'
import { Download, Upload, ClipboardList, X } from 'lucide-react'

export default function RecentOpsSection({ recentOps, colors }: { recentOps:any[]; colors:any }) {
  const [sheet, setSheet] = useState<'dispense'|'purchase'|'add'|null>(null)

  const dispense  = recentOps.filter(m=>m.type==='out')
  const additions = recentOps.filter(m=>m.type==='in')

  function OpsSheet({ items, title, color, bg, border, onClose }:any) {
    return (
      <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'flex-end'}}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={onClose}/>
        <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'80vh',display:'flex',flexDirection:'column' as const,position:'relative',fontFamily:'inherit',direction:'rtl'}}>
          <div style={{padding:'14px 20px',borderBottom:`1px solid #f0f0f0`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
            <div style={{width:32,height:3,borderRadius:99,background:'#e5e7eb',position:'absolute',top:8,left:'50%',transform:'translateX(-50%)'}}/>
            <span style={{fontSize:15,fontWeight:800,color:'#111827'}}>{title}</span>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:4,display:'flex',alignItems:'center'}}><X size={18} strokeWidth={2.25}/></button>
          </div>
          <div style={{overflowY:'auto',flex:1}}>
            {items.length===0?(
              <div style={{padding:'40px',textAlign:'center',color:'#9ca3af',fontSize:13}}>لا توجد عمليات</div>
            ):items.map((m:any,i:number)=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<items.length-1?'1px solid #f3f4f6':'none'}}>
                <div style={{width:36,height:36,borderRadius:10,background:bg,border:`1px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:14,fontWeight:900,color}}>{Math.abs(m.qty_change)}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(m.products as any)?.name}</div>
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{new Date(m.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn',weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <span style={{fontSize:13,fontWeight:800,color,flexShrink:0}}>{m.type==='out'?'-':'+'}{Math.abs(m.qty_change)} <span style={{fontSize:10,fontWeight:400,color:'#9ca3af'}}>{(m.products as any)?.unit}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {sheet==='dispense'&&<OpsSheet items={dispense} title="آخر عمليات الصرف" color={colors.danger} bg={colors.dangerLight} border={colors.dangerBorder} onClose={()=>setSheet(null)}/>}
      {sheet==='add'&&<OpsSheet items={additions} title="آخر عمليات الإضافة" color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder} onClose={()=>setSheet(null)}/>}
      {sheet==='purchase'&&<OpsSheet items={recentOps} title="آخر العمليات" color={colors.info} bg={colors.infoLight} border={colors.infoBorder} onClose={()=>setSheet(null)}/>}

      <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[
          {key:'dispense' as const, title:'آخر الصرف',    count:dispense.length,  color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder,  icon:<Upload size={24} strokeWidth={1.75}/>},
          {key:'add' as const,      title:'آخر الإضافات', count:additions.length, color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder, icon:<Download size={24} strokeWidth={1.75}/>},
          {key:'purchase' as const, title:'آخر العمليات', count:recentOps.length, color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder,    icon:<ClipboardList size={24} strokeWidth={1.75}/>},
        ].map(s=>(
          <button key={s.key} onClick={()=>setSheet(s.key)}
            style={{background:'white',borderRadius:12,padding:'14px 10px',border:`1.5px solid ${s.border}`,cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all .15s',boxShadow:`0 2px 8px ${s.color}10`}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform='none'}>
            <div style={{marginBottom:8,display:'flex',justifyContent:'center',color:s.color}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:s.color,marginBottom:4}}>{s.count}</div>
            <div style={{fontSize:11,fontWeight:700,color:'#374151'}}>{s.title}</div>
          </button>
        ))}
      </div>
    </>
  )
}
