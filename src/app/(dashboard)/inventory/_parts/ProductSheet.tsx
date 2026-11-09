'use client'
import { catsFor, unitsFor } from '@/lib/businessTypes'
import SelectOrOther from '@/components/SelectOrOther'
import NumberInput from '@/components/NumberInput'
import { X, Camera, Ruler, Trash2 } from 'lucide-react'
import { C } from './constants'
import type { InventoryState } from './useInventory'
import PurchaseUnitsBox from './PurchaseUnitsBox'

export default function ProductSheet({ m }: { m: InventoryState }) {
  const { showAdd, setShowAdd, saving, editItem, setEditItem, addQty, setAddQty, setConfirm, form, setForm, setShowScan, businessType, lbl, inp, handleSave, load } = m
  return (
    <>
      {/* Add/Edit Sheet */}
      {showAdd&&(
        <div className="iv-sheet-wrap" style={{position:'fixed',inset:0,background:'rgba(16,24,40,.45)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div className="iv-sheet" style={{background:'white',borderRadius:'14px 14px 0 0',padding:'0 0 env(safe-area-inset-bottom)',width:'100%',maxWidth:520,maxHeight:'92vh',display:'flex',flexDirection:'column',animation:'slideUp .25s ease',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
            <div style={{padding:'10px 18px 0',flexShrink:0}}>
              <div style={{width:36,height:4,borderRadius:99,background:C.border2,margin:'0 auto 14px'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div style={{fontSize:17,fontWeight:700,color:C.text}}>{editItem?'تعديل المنتج':'منتج جديد'}</div>
                <button onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{width:28,height:28,borderRadius:'50%',border:`1px solid ${C.border2}`,background:C.bg,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.text3}}><X size={14} strokeWidth={2.25}/></button>
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'0 18px 18px'}}>
              <form onSubmit={handleSave}>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div>
                    <label style={lbl}>اسم المنتج *</label>
                    <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp()} placeholder="مثال: اسم المنتج"/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={lbl}>الفئة</label>
                      <SelectOrOther value={form.category} onChange={v=>setForm({...form,category:v})} options={catsFor(businessType)} emptyLabel="— اختر —" placeholder="اكتب اسم الفئة" style={inp()}/>
                    </div>
                    <div>
                      <label style={lbl}>الوحدة</label>
                      <SelectOrOther value={form.unit} onChange={v=>setForm({...form,unit:v})} options={unitsFor(businessType)} placeholder="اكتب اسم الوحدة" style={inp()}/>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={lbl}>باركود</label>
                      <div style={{display:'flex',gap:5}}>
                        <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} style={{...inp(),flex:1}} placeholder="اختياري"/>
                        <button type="button" onClick={()=>setShowScan(true)} style={{padding:'0 10px',background:C.primaryL,color:C.primary,border:`1px solid ${C.primaryB}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Camera size={15} strokeWidth={2.25}/></button>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>الحد الأدنى</label>
                      <NumberInput min="0" value={form.reorder_point} onChange={e=>setForm({...form,reorder_point:Number(e.target.value)})} style={inp()}/>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>تاريخ انتهاء الصلاحية (اختياري)</label>
                    <input type="date" value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})} style={inp()}/>
                  </div>

                  {/* وحدات الشراء: الفاتورة بالكرتون → المخزون بوحدة الصنف */}
                  <PurchaseUnitsBox productId={editItem?.id || null} stockUnit={form.unit} inp={inp} lbl={lbl} onChange={()=>load(true)}/>

                  {/* تحويل الوحدة الدقيقة — لدقة استخدام هذا المنتج بالوصفات */}
                  <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                      <span style={{display:'flex',alignItems:'center'}}><Ruler size={13} strokeWidth={2.25}/></span>
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>تحويل الوحدة الدقيقة (اختياري)</div>
                      {form.recipe_unit && form.recipe_unit_factor && Number(form.recipe_unit_factor)>0 && (
                        <span style={{fontSize:12,fontWeight:600,color:C.primary,marginRight:'auto'}}>محدد</span>
                      )}
                    </div>
                    <div style={{fontSize:12,color:C.text3,marginBottom:8,lineHeight:1.6}}>للوصفات فقط — مثال: كم غراماً في الكيس</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <div>
                        <label style={lbl}>الوحدة الدقيقة</label>
                        <input value={form.recipe_unit} onChange={e=>setForm({...form,recipe_unit:e.target.value})} style={inp()} placeholder="مثال: جرام"/>
                      </div>
                      <div>
                        <label style={lbl}>الكمية بالوحدة الدقيقة</label>
                        <NumberInput min="0" step="any" value={form.recipe_unit_factor} onChange={e=>setForm({...form,recipe_unit_factor:e.target.value})} style={inp()} placeholder={`1 ${form.unit} = ؟ ${form.recipe_unit||'وحدة'}`}/>
                      </div>
                    </div>
                    {form.recipe_unit && form.recipe_unit_factor && Number(form.recipe_unit_factor)>0 && (
                      <div style={{fontSize:12,fontWeight:600,color:C.text2,marginTop:8}}>
                        1 {form.unit} = {form.recipe_unit_factor} {form.recipe_unit}
                      </div>
                    )}
                  </div>

                  {editItem?(
                    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                      <div style={{fontSize:13,color:C.text2,marginBottom:8}}>الكمية الحالية: <b style={{color:C.text}}>{editItem.qty} {form.unit}</b></div>
                      <label style={lbl}>كمية تضيفها</label>
                      <NumberInput min="0" value={addQty||''} onChange={e=>setAddQty(Number(e.target.value)||0)} style={{...inp(),fontSize:16,fontWeight:600,textAlign:'center'}} placeholder="0"/>
                      {addQty>0&&<div style={{fontSize:12,color:C.text2,marginTop:6}}>الإجمالي بعد الإضافة: {editItem.qty+addQty} {form.unit}</div>}
                    </div>
                  ):(
                    <div>
                      <label style={lbl}>الكمية الابتدائية *</label>
                      <NumberInput min="1" required value={form.qty||''} onChange={e=>setForm({...form,qty:Number(e.target.value)})} style={{...inp(),fontSize:16,fontWeight:600,textAlign:'center'}} placeholder="0"/>
                    </div>
                  )}
                </div>
                {editItem && (
                  <button type="button" onClick={()=>{setConfirm({id:editItem.id,name:editItem.name});setShowAdd(false)}}
                    style={{width:'100%',padding:'10px',marginTop:16,background:C.dangerL,color:C.danger,border:`1px solid ${C.dangerB}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    <Trash2 size={13} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> حذف هذا المنتج
                  </button>
                )}
                <div style={{display:'flex',gap:8,marginTop:editItem?8:16}}>
                  <button type="button" onClick={()=>{setShowAdd(false);setEditItem(null)}} style={{flex:1,padding:'11px',background:C.bg,color:C.text2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                  <button type="submit" disabled={saving} style={{flex:2,padding:'11px',background:C.primary,color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:saving?.7:1}}>
                    {saving?'جاري الحفظ...':editItem?'حفظ التعديلات':'إضافة المنتج'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
