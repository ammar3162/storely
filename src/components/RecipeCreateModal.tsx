'use client'
// نافذة إنشاء/تعديل وصفة — ملف مستقل عشان تنحمّل بس لما المالك يفتحها (صفحة الأدوات الذكية أخف)
import { useState, useEffect } from 'react'
import NumberInput from '@/components/NumberInput'
import { api } from '@/lib/api-client'
import { toast } from '@/components/toast'
import { subUnitOptions, hasKnownConversion, formatQty } from '@/lib/recipeUnits'
import { ClipboardList, Wallet, X } from 'lucide-react'

export default function RecipeCreateModal({onClose,onSaved,rawMaterials,orgId,branchId,editingRecipeId}:{onClose:()=>void,onSaved:()=>void,rawMaterials:any[],orgId:string|null,branchId:string|null,editingRecipeId?:string|null}) {
  const [name,setName]=useState('')
  const [components,setComponents]=useState<{component_product_id:string,qty:string}[]>([])
  const [newCompId,setNewCompId]=useState('')
  const [newCompQty,setNewCompQty]=useState('')
  const [newCompSubUnit,setNewCompSubUnit]=useState(1)
  const [customSubLabel,setCustomSubLabel]=useState('')
  const [customSubCount,setCustomSubCount]=useState('')
  const [saving,setSaving]=useState(false)
  const [loadingEdit,setLoadingEdit]=useState(!!editingRecipeId)
  const [priceMap,setPriceMap]=useState<Record<string,number>>({})
  const [sellPrice,setSellPrice]=useState('')

  useEffect(()=>{
    if(!editingRecipeId) return
    ;(async()=>{
      const j=await api.get('/api/recipes',{org_id:sessionStorage.getItem('s_org_id'),id:editingRecipeId})
      const recipe=j.recipe, items=j.items
      if(recipe){ setName(recipe.name); if(recipe.sell_price) setSellPrice(String(recipe.sell_price)) }
      setComponents((items||[]).map((it:any)=>({component_product_id:it.component_product_id,qty:String(it.qty)})))
      setLoadingEdit(false)
    })()
  },[editingRecipeId])

  // متوسط سعر الشراء لكل مادة خام (نفس منهج تقرير الهدر) — يُستخدم لتقدير تكلفة الوصفة
  useEffect(()=>{
    if(!orgId) return
    ;(async()=>{
      const j=await api.get('/api/recipes',{org_id:orgId,branch_id:branchId,view:'prices'})
      setPriceMap(j.price_map||{})
    })()
  },[orgId])

  async function addComp() {
    if(!newCompId||!newCompQty||Number(newCompQty)<=0) return
    if(components.some(c=>c.component_product_id===newCompId)) return
    const comp = rawMaterials.find((r:any)=>r.id===newCompId)
    const customFactor=Number(customSubCount)
    if(!hasKnownConversion(comp) && !(customFactor>0)){
      toast(`لازم تحدد "كم قطعة/وحدة بكل ${comp?.unit||'وحدة'} واحد؟" بالمربع الأصفر قبل الإضافة — وإلا الحساب بيكون غلط`,'error')
      return
    }
    const factor = customFactor>0 ? customFactor : newCompSubUnit
    const baseQty=Number(newCompQty)/factor
    setComponents(prev=>[...prev,{component_product_id:newCompId,qty:String(baseQty)}])
    if(customFactor>0 && customSubLabel.trim()){
      // نحفظ التحويل بالمنتج نفسه عشان ما نسأل عنه مرة ثانية بأي وصفة جاية
      await api.patch('/api/products',{org_id:orgId,id:newCompId,recipe_unit:customSubLabel.trim(),recipe_unit_factor:customFactor})
    }
    setNewCompId('');setNewCompQty('');setNewCompSubUnit(1);setCustomSubLabel('');setCustomSubCount('')
  }

  async function save() {
    if(!name.trim()||!orgId) return
    setSaving(true)

    // حماية: لو المستخدم كتب مكوّن بالحقول لكن نسي يضغط "+"، نضيفه تلقائياً هنا قبل الحفظ
    let finalComponents = [...components]
    if(newCompId && newCompQty && Number(newCompQty)>0 && !components.some(c=>c.component_product_id===newCompId)){
      const pendingComp = rawMaterials.find((r:any)=>r.id===newCompId)
      const customFactor=Number(customSubCount)
      if(!hasKnownConversion(pendingComp) && !(customFactor>0)){
        toast(`تعذّر الحفظ — حدد "كم قطعة/وحدة بكل ${pendingComp?.unit||'وحدة'} واحد؟" للمكوّن ${pendingComp?.name||''} أولاً`,'error')
        setSaving(false)
        return
      }
      const factor = customFactor>0 ? customFactor : newCompSubUnit
      const baseQty=Number(newCompQty)/factor
      finalComponents.push({component_product_id:newCompId,qty:String(baseQty)})
      if(customFactor>0 && customSubLabel.trim()){
        await api.patch('/api/products',{org_id:orgId,id:newCompId,recipe_unit:customSubLabel.trim(),recipe_unit_factor:customFactor})
      }
    }

    // الوصفات مشتركة على مستوى الشركة كاملة (مو حصرية بفرع واحد) — تُعرَّف مرة وتشتغل بكل الفروع تلقائياً
    const sellPriceVal = sellPrice ? Number(sellPrice) : null
    const r = await api.post('/api/recipes', { org_id: orgId, id: editingRecipeId || undefined, name: name.trim(), sell_price: sellPriceVal,
      items: finalComponents.map(c=>({component_product_id:c.component_product_id,qty:Number(c.qty)})) })
    if(!r.success){toast(r.error || (editingRecipeId?'فشل تحديث الوصفة — حاول مرة أخرى':'فشل حفظ الوصفة — حاول مرة أخرى'),'error');setSaving(false);return}
    if(finalComponents.length===0) {
      toast('الوصفة اتحفظت بدون مكوّنات — أضفها لاحقاً من "تعديل"','warning')
    }
    setSaving(false)
    if(finalComponents.length>0) toast(editingRecipeId?'تم تحديث الوصفة':'تم حفظ الوصفة بمكوناتها')
    onSaved()
  }

  if(loadingEdit) return (
    <div onClick={(e:any)=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,padding:40,textAlign:'center' as const,fontFamily:"'IBM Plex Sans Arabic',system-ui"}}>
      <div style={{fontSize:13,color:'#6b7280'}}>جاري تحميل بيانات الوصفة...</div>
    </div>
  )

  return (
    <div onClick={(e:any)=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,maxHeight:'85vh',overflowY:'auto',padding:20,fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl' as const}}>
      <div style={{fontSize:15,fontWeight:800,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><ClipboardList size={18} color="#7c3aed"/>{editingRecipeId?'تعديل الوصفة':'وصفة جديدة'}</div>
      <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:5}}>اسم الوصفة *</label>
      <input value={name} onChange={(e:any)=>setName(e.target.value)} placeholder="مثال: اسم المنتج النهائي" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e5e7eb',borderRadius:9,fontSize:13,marginBottom:14,fontFamily:'inherit'}}/>

      <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>مكوّنات الوصفة</div>
      {components.length>0 && (
        <div style={{display:'flex',flexDirection:'column' as const,gap:6,marginBottom:8}}>
          {components.map(c=>{
            const comp=rawMaterials.find(r=>r.id===c.component_product_id)
            const unitPrice = comp ? (priceMap[comp.name]||0) : 0
            const compCost = unitPrice * Number(c.qty)
            return (
              <div key={c.component_product_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'6px 10px'}}>
                <span style={{fontSize:11}}>{comp?.name||'—'} — {formatQty(Number(c.qty),comp)}</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {unitPrice>0 && <span style={{fontSize:10,color:'#029FA2',fontWeight:700}}>{compCost.toFixed(2)} ⃁</span>}
                  <button onClick={()=>setComponents(prev=>prev.filter(x=>x.component_product_id!==c.component_product_id))} aria-label="حذف المكوّن" style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',display:'flex'}}><X size={14}/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{display:'flex',gap:6,marginBottom:6}}>
        <select value={newCompId} onChange={(e:any)=>{const id=e.target.value;setNewCompId(id);const r=rawMaterials.find(x=>x.id===id);const opts=subUnitOptions(r);setNewCompSubUnit(opts[0].factor)}} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}>
          <option value="">اختر مكوّن...</option>
          {rawMaterials.filter(r=>!components.some(c=>c.component_product_id===r.id)).map(r=>(
            <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>
          ))}
        </select>
      </div>
      {newCompId && !hasKnownConversion(rawMaterials.find(x=>x.id===newCompId)) && (
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:8,marginBottom:8}}>
          <div style={{fontSize:10,color:'#92400e',marginBottom:6}}>كم قطعة/وحدة بكل {rawMaterials.find(x=>x.id===newCompId)?.unit} واحد؟ — مطلوب عشان الحساب يطلع صح</div>
          <div style={{display:'flex',gap:6}}>
            <input value={customSubLabel} onChange={(e:any)=>setCustomSubLabel(e.target.value)} placeholder="اسم الوحدة (مثال: رغيف)" style={{flex:2,padding:'7px',border:'1.5px solid #fde68a',borderRadius:7,fontSize:10}}/>
            <NumberInput min="1" value={customSubCount} onChange={(e:any)=>setCustomSubCount(e.target.value)} placeholder="العدد" style={{flex:1,padding:'7px',border:'1.5px solid #fde68a',borderRadius:7,fontSize:10}}/>
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        <NumberInput step="0.01" min="0" value={newCompQty} onChange={(e:any)=>setNewCompQty(e.target.value)} placeholder={customSubCount?`الكمية بـ${customSubLabel||'وحدة'}`:'الكمية'} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}/>
        {newCompId && (()=>{const r=rawMaterials.find(x=>x.id===newCompId);const opts=subUnitOptions(r);return opts.length>1 ? (
          <select value={newCompSubUnit} onChange={(e:any)=>setNewCompSubUnit(Number(e.target.value))} style={{flex:1,padding:'8px',border:'1.5px solid #e5e7eb',borderRadius:8,fontSize:11}}>
            {opts.map(o=>(<option key={o.label} value={o.factor}>{o.label}</option>))}
          </select>
        ) : (
          <div style={{flex:1,padding:'8px',fontSize:11,color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>{customSubLabel||opts[0].label}</div>
        )})()}
        <button onClick={addComp} style={{padding:'0 12px',background:'#029FA2',color:'white',border:'none',borderRadius:8,fontSize:16,fontWeight:700,cursor:'pointer'}}>+</button>
      </div>

      {(()=>{
        const totalCost = components.reduce((s,c)=>{
          const comp=rawMaterials.find(r=>r.id===c.component_product_id)
          const unitPrice = comp ? (priceMap[comp.name]||0) : 0
          return s + unitPrice*Number(c.qty)
        },0)
        const hasCostData = totalCost>0
        const foodCostPct = hasCostData && sellPrice && Number(sellPrice)>0 ? (totalCost/Number(sellPrice))*100 : null
        return (
          <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:10,padding:12,marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:hasCostData?10:0}}>
              <span style={{fontSize:11,fontWeight:700,color:'#115e59',display:'flex',alignItems:'center',gap:5}}><Wallet size={13}/>تكلفة الوصفة</span>
              <span style={{fontSize:15,fontWeight:900,color:'#029FA2'}}>{hasCostData ? totalCost.toFixed(2)+' ⃁' : 'لا توجد بيانات أسعار'}</span>
            </div>
            {hasCostData && (
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:10,color:'#115e59',display:'block',marginBottom:4}}>سعر البيع (اختياري)</label>
                  <NumberInput min="0" step="0.01" value={sellPrice} onChange={(e:any)=>setSellPrice(e.target.value)} placeholder="مثال: 25" style={{width:'100%',padding:'7px 10px',border:'1px solid #99f6e4',borderRadius:7,fontSize:12}}/>
                </div>
                {foodCostPct!==null && (
                  <div style={{textAlign:'center' as const,padding:'4px 12px'}}>
                    <div style={{fontSize:16,fontWeight:900,color:foodCostPct<=30?'#029FA2':foodCostPct<=35?'#d97706':'#dc2626'}}>{foodCostPct.toFixed(0)}%</div>
                    <div style={{fontSize:9,color:'#6b7280'}}>Food Cost</div>
                  </div>
                )}
              </div>
            )}
            {!hasCostData && <div style={{fontSize:10,color:'#6b7280'}}>سجّل مشتريات لهذي المكوّنات عشان تظهر التكلفة تلقائياً</div>}
          </div>
        )
      })()}

      <div style={{display:'flex',gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:'11px',background:'#f9fafb',color:'#374151',border:'1px solid #e5e7eb',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
        <button onClick={save} disabled={saving||!name.trim()} style={{flex:2,padding:'11px',background:'#7c3aed',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving||!name.trim()?.6:1}}>
          {saving?'جاري الحفظ...':(editingRecipeId?'حفظ التعديلات':'حفظ الوصفة')}
        </button>
      </div>
    </div>
  )
}
