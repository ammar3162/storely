'use client'
import NumberInput from '@/components/NumberInput'
import { isPdfUrl } from '@/lib/invoiceFile'
import { unitsFor } from '@/lib/businessTypes'
import SelectOrOther from '@/components/SelectOrOther'
import InvoicePickButtons from '@/components/InvoicePickButtons'
import { C, CATS, CAT_ICONS, lbl, inp } from './constants'
import type { PurchasesState } from './usePurchases'

export default function PurchaseItemFields({ m }: { m: PurchasesState }) {
  const { invOn, products, isExisting, setIsExisting, uploading, bizType, setShowScan, previewUrl, form, setForm, handleImage } = m
  const cats = CATS.filter(c => invOn || c !== 'مخزون')
  return (
    <>
            {/* Category */}
            <div style={{marginBottom:12}}>
              <label style={lbl}>نوع الشراء</label>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${cats.length},1fr)`,gap:6}}>
                {cats.map(c=>(
                  <button key={c} type="button" onClick={()=>setForm({...form,category:c,name:'',sku:'',unit:'قطعة'})}
                    style={{padding:'10px 6px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${form.category===c?C.primary:C.border2}`,background:form.category===c?C.primaryL:'white',color:form.category===c?C.primary:C.text3,fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all .15s'}}>
                    <span style={{fontSize:18}}>{CAT_ICONS[c]}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
              {form.category==='مخزون'&&<div style={{background:C.primaryL,border:`1px solid ${C.primaryB}`,borderRadius:7,padding:'7px 10px',marginTop:8,fontSize:11,color:C.primary,fontWeight:600}}>سيتم إضافة الصنف للمخزون تلقائياً</div>}
            </div>

            {/* Invoice image */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>صورة الفاتورة {form.hasVat==='yes'?<span style={{color:C.danger}}>*</span>:'(اختياري)'}</label>
              <InvoicePickButtons onFile={handleImage} disabled={uploading} primary={C.primary} primaryL={C.primaryL}
                labels={{camera:'📷 تصوير',gallery:'🖼️ من الصور',file:'📄 ملف PDF'}}/>
              {(uploading||previewUrl||form.hasVat==='yes')&&(
                <div style={{fontSize:11.5,fontWeight:700,marginTop:6,color:uploading?C.text3:previewUrl?C.primary:C.danger}}>
                  {uploading?'⏳ جاري الرفع...':previewUrl?(isPdfUrl(previewUrl)?'📄 تم إرفاق ملف الفاتورة — اختر من جديد للتغيير':'✅ تم رفع الصورة — اختر من جديد للتغيير'):'الفاتورة مطلوبة لأن فيها ضريبة'}
                </div>
              )}
              {previewUrl&&!isPdfUrl(previewUrl)&&(
                <img src={previewUrl} alt="فاتورة" style={{width:'100%',maxHeight:80,objectFit:'cover',borderRadius:7,marginTop:6,border:`1px solid ${C.primaryB}`}}/>
              )}
            </div>

            {/* Existing/New toggle */}
            {form.category==='مخزون'&&(
              <div style={{display:'flex',gap:6,marginBottom:12}}>
                {[{v:true,l:'📦 صنف موجود'},{v:false,l:'➕ صنف جديد'}].map(b=>(
                  <button key={String(b.v)} type="button" onClick={()=>setIsExisting(b.v)}
                    style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${isExisting===b.v?C.primary:C.border2}`,background:isExisting===b.v?C.primaryL:'white',color:isExisting===b.v?C.primary:C.text3,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:12,transition:'all .15s'}}>
                    {b.l}
                  </button>
                ))}
              </div>
            )}

            {/* Name */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>{form.category==='مخزون'?'اسم الصنف':'اسم الفاتورة'} *</label>
              {form.category==='مخزون'&&isExisting===true?(
                <div style={{position:'relative'}}>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{...inp,marginBottom:4}} placeholder="ابحث عن صنف..."/>
                  {form.name===''||products.filter((p:any)=>p.name.includes(form.name)&&form.name!==p.name).length>0?(
                    <div style={{position:'absolute',top:'100%',right:0,left:0,background:'white',border:`1px solid ${C.border2}`,borderRadius:8,zIndex:50,maxHeight:200,overflowY:'auto',boxShadow:'0 4px 12px rgba(0,0,0,.1)'}}>
                      {products.filter((p:any)=>!form.name||p.name.includes(form.name)).slice(0,10).map((p:any)=>(
                        <div key={p.id} onClick={()=>setForm({...form,name:p.name,unit:p.unit})}
                          style={{padding:'9px 12px',cursor:'pointer',fontSize:12,color:C.text,borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=C.bg}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='white'}>
                          <span style={{fontWeight:600}}>{p.name}</span>
                          <span style={{color:C.text4,fontSize:11}}>{p.qty} {p.unit}</span>
                        </div>
                      ))}
                    </div>
                  ):null}
                </div>
              ):(
                <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp}
                  placeholder={form.category==='مخزون'?'مثال: اسم الصنف':form.category==='مشتريات'?'مثال: أدوات ومستلزمات':'مثال: مصاريف تشغيلية'}/>
              )}
            </div>

            {/* Barcode + qty */}
            {form.category==='مخزون'&&(
              <>
                <div style={{marginBottom:10}}>
                  <label style={lbl}>باركود (اختياري)</label>
                  <div style={{display:'flex',gap:5}}>
                    <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={{...inp,flex:1}} placeholder="امسح أو أدخل يدوياً"/>
                    <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 10px',background:C.primaryL,color:C.primary,border:`1px solid ${C.primaryB}`,borderRadius:8,fontSize:14,cursor:'pointer'}}>📷</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                  <div>
                    <label style={lbl}>الكمية</label>
                    <NumberInput min="0" step="any" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} style={inp} placeholder="0" inputMode="numeric"/>
                  </div>
                  <div>
                    <label style={lbl}>الوحدة</label>
                    <SelectOrOther value={form.unit} onChange={v=>setForm({...form,unit:v})} options={unitsFor(bizType)} placeholder="اكتب اسم الوحدة" style={inp}/>
                  </div>
                  <div>
                    <label style={lbl}>الحد الأدنى</label>
                    <NumberInput min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:e.target.value})} style={inp} inputMode="numeric"/>
                  </div>
                </div>
              </>
            )}
    </>
  )
}
