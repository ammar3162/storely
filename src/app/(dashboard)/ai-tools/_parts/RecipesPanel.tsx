'use client'
import { api } from '@/lib/api-client'
import { ClipboardList, Pencil, Trash2 } from 'lucide-react'
import { C } from './config'
import type { AiToolsPage } from './useAiTools'

export default function RecipesPanel({ m }: { m: AiToolsPage }) {
  const { setRecipeReconReport, reconLoading, setReconLoading, setShowRecipeModal, setRawMaterials, recipesList, showRecipesList, setShowRecipesList, deletingRecipeId, reconFrom, setReconFrom, reconMethod, setReconMethod, reconTo, setReconTo, loadRecipesList, deleteRecipe, openEditRecipe } = m
  return (
    <>
      {/* إدارة الوصفات وتقدير الإنتاج */}
      <div className="fu" style={{marginTop:16,background:C.bg,borderRadius:14,padding:'16px 20px',border:`1px solid ${C.border2}`}}>
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:34,height:34,borderRadius:9,background:'#f5f3ff',color:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><ClipboardList size={18}/></span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>كم حضّرت فعلاً؟</div>
              <div style={{fontSize:11,color:C.text3}}>عرّف وصفة (اسم + مكوناتها)، ويقدّر النظام عدد الوحدات المحضّرة بناءً على استهلاك موظفيك الفعلي للمواد الخام</div>
            </div>
          </div>
          <div style={{display:'flex',background:C.surface,border:`1px solid ${C.border2}`,borderRadius:9,padding:3,gap:3}}>
            {([['count','حسب الجرد (الأدق)'],['dispense','حسب الصرف المسجّل']] as const).map(([k,l])=>(
              <button key={k} onClick={()=>{setReconMethod(k);setRecipeReconReport(null)}} style={{flex:1,padding:'7px',border:'none',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',background:reconMethod===k?'#7c3aed':'transparent',color:reconMethod===k?'white':C.text3}}>{l}</button>
            ))}
          </div>
          <div style={{fontSize:10,color:C.text3,lineHeight:1.6}}>
            {reconMethod==='count'
              ? 'الاستهلاك = جرد أول الفترة + المشتريات − الهدر − جرد آخر الفترة. يحتاج جردين من صفحة المخزون (زر «جرد»)'
              : 'من الكميات التي سجّلها الموظفون صرفاً. وبما أن الموظف يصرف بالوحدة الكاملة، فاستخدمها لفترة أسبوع أو أكثر'}
          </div>
          <div style={{display:'flex',gap:6}}>
            {([[7,'آخر أسبوع'],[30,'آخر شهر']] as const).map(([d,l])=>(
              <button key={d} onClick={()=>{const t=new Date(Date.now()+3*3600e3);const f=new Date(t.getTime()-d*864e5);setReconFrom(f.toISOString().slice(0,10));setReconTo(t.toISOString().slice(0,10))}}
                style={{padding:'4px 10px',background:'white',border:`1px solid ${C.border2}`,borderRadius:99,fontSize:10,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <span style={{fontSize:10,color:C.text4,whiteSpace:'nowrap' as const}}>من</span>
            <input type="date" value={reconFrom} onChange={e=>setReconFrom(e.target.value)} style={{flex:1,padding:'6px 8px',border:`1px solid ${C.border2}`,borderRadius:7,fontSize:10,fontFamily:'inherit'}}/>
            <span style={{fontSize:10,color:C.text4,whiteSpace:'nowrap' as const}}>إلى</span>
            <input type="date" value={reconTo} onChange={e=>setReconTo(e.target.value)} style={{flex:1,padding:'6px 8px',border:`1px solid ${C.border2}`,borderRadius:7,fontSize:10,fontFamily:'inherit'}}/>
            {(reconFrom||reconTo) && (
              <button onClick={()=>{setReconFrom('');setReconTo('')}} style={{padding:'4px 8px',background:'none',border:'none',color:'#7c3aed',fontSize:10,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',whiteSpace:'nowrap' as const}}>تصفير</button>
            )}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              const bid2=sessionStorage.getItem('s_branch_id')
              const j=await api.get('/api/products',{org_id:orgId,branch_id:bid2,full:1})
              setRawMaterials(j.products||[])
              setShowRecipeModal(true)
            }} style={{flex:1,padding:'8px 14px',background:'white',color:'#7c3aed',border:'1.5px solid #ddd6fe',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              + وصفة جديدة
            </button>
            <button onClick={async()=>{
              const orgId=sessionStorage.getItem('s_org_id')
              if(!orgId) return
              setReconLoading(true)
              const res=await fetch('/api/recipe-reconciliation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),from:reconFrom||undefined,to:reconTo||undefined,method:reconMethod})})
              const data=await res.json()
              setRecipeReconReport(data)
              setReconLoading(false)
            }} style={{flex:1,padding:'8px 14px',background:'#7c3aed',color:'white',border:'none',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {reconLoading?'جاري الحساب...':'تقدير الإنتاج'}
            </button>
          </div>
          <button onClick={async()=>{ if(!showRecipesList) await loadRecipesList(); setShowRecipesList(v=>!v) }}
            style={{padding:'6px 0',background:'none',border:'none',color:'#7c3aed',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline'}}>
            {showRecipesList?'إخفاء الوصفات المسجّلة':'إدارة الوصفات (تعديل/حذف)'}
          </button>
          {showRecipesList && (
            <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
              {recipesList.length===0 ? (
                <div style={{fontSize:11,color:C.text4,textAlign:'center' as const,padding:8}}>لا توجد وصفات مسجّلة بعد</div>
              ) : recipesList.map((r:any)=>(
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',border:`1px solid ${C.border2}`,borderRadius:8,padding:'8px 12px'}}>
                  <span style={{fontSize:12,fontWeight:600,color:C.text}}>{r.name}</span>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>openEditRecipe(r.id)} style={{padding:'4px 10px',background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:7,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}><Pencil size={11} style={{verticalAlign:'-2px',marginLeft:3}}/>تعديل</button>
                    <button onClick={()=>deleteRecipe(r.id)} disabled={deletingRecipeId===r.id} style={{padding:'4px 10px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:7,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:deletingRecipeId===r.id?.6:1}}>{deletingRecipeId===r.id?'...':<><Trash2 size={11} style={{verticalAlign:'-2px',marginLeft:3}}/>حذف</>}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
