'use client'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { C, STARTER_PRODUCTS } from './constants'
import type { InventoryState } from './useInventory'

export default function StarterProducts({ m }: { m: InventoryState }) {
  const { businessType, selectedTemplate, setSelectedTemplate, addingTemplate, setTemplateDismissed, addTemplateProducts } = m
  return (
    <>
        <div className="u" style={{background:'white',borderRadius:14,padding:'28px 24px',border:`1.5px solid ${C.primaryB}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <div style={{display:'flex',justifyContent:'center'}}><Sparkles size={22} strokeWidth={1.75}/></div>
            <div style={{fontSize:15,fontWeight:800,color:C.text}}>نقترح عليك هذي الأصناف الشائعة لـ{businessType}</div>
          </div>
          <div style={{fontSize:12,color:C.text4,marginBottom:18}}>اختر اللي يناسبك وراح نضيفها لمخزونك بضغطة وحدة — أو تجاهل وابدأ يدوياً</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,marginBottom:18}}>
            {(STARTER_PRODUCTS[businessType]||[]).map(item=>(
              <label key={item.name} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:selectedTemplate[item.name]?(C.primaryL):C.bg,border:`1.5px solid ${selectedTemplate[item.name]?(C.primaryB):C.border}`,borderRadius:9,cursor:'pointer',transition:'all .15s'}}>
                <input type="checkbox" checked={!!selectedTemplate[item.name]}
                  onChange={e=>setSelectedTemplate(prev=>({...prev,[item.name]:e.target.checked}))}
                  style={{width:16,height:16,accentColor:C.primary,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:C.text}}>{item.name}</span>
              </label>
            ))}
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' as const}}>
            <button onClick={addTemplateProducts} disabled={addingTemplate||Object.values(selectedTemplate).every(v=>!v)}
              style={{padding:'10px 20px',background:Object.values(selectedTemplate).every(v=>!v)?C.border2:(C.primary),color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:Object.values(selectedTemplate).every(v=>!v)?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {addingTemplate?'جاري الإضافة...':<span style={{display:'inline-flex',alignItems:'center',gap:6}}><CheckCircle2 size={14} strokeWidth={2.25}/> أضف المحدد ({Object.values(selectedTemplate).filter(Boolean).length})</span>}
            </button>
            <button onClick={()=>{
                const all: Record<string,boolean> = {}
                for(const p of (STARTER_PRODUCTS[businessType]||[])) all[p.name]=true
                setSelectedTemplate(all)
              }}
              style={{padding:'10px 16px',background:'none',color:C.primary,border:`1.5px solid ${C.primaryB}`,borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              تحديد الكل
            </button>
            <button onClick={()=>setTemplateDismissed(true)}
              style={{padding:'10px 16px',background:'none',color:C.text4,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginRight:'auto'}}>
              تجاهل، أبدأ يدوياً
            </button>
          </div>
        </div>
    </>
  )
}
