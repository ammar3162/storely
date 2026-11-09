'use client'
import NumberInput from '@/components/NumberInput'
import TaxInvoiceFields from '@/components/TaxInvoiceFields'
import InvoicePickButtons from '@/components/InvoicePickButtons'
import { Clock, CheckCircle2, Ban, Percent } from 'lucide-react'
import { toast } from '@/components/toast'
import { C, lbl, inp } from './constants'
import type { PurchasesState } from './usePurchases'

export default function PurchaseInvoiceFields({ m }: { m: PurchasesState }) {
  const { curr, uploading, form, setForm, suppliers, vatFromSupplier, setVatFromSupplier, zatca, inputTotal, displayAmount, displayVat, setZatca, setSupplierName, handleImage } = m
  return (
    <>
            {/* Amount */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>المبلغ الإجمالي ({curr}) *</label>
              <NumberInput min="0" step="any" required value={form.total_amount}
                onChange={e=>setForm({...form,total_amount:e.target.value})}
                style={{...inp,fontSize:16,fontWeight:700}} placeholder="0.00" inputMode="decimal"/>
              {inputTotal>0&&form.hasVat==='yes'&&(
                <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,padding:'9px 12px',marginTop:6}}>
                  {[['بدون ضريبة',displayAmount+' '+curr,C.text],['ضريبة 15%',displayVat+' '+curr,C.warning],['الإجمالي',inputTotal.toFixed(2)+' '+curr,C.primary]].map(([k,v,c],i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:i<2?4:0,paddingTop:i===2?6:0,borderTop:i===2?`1px solid ${C.border}`:undefined}}>
                      <span style={{color:C.text3}}>{k}</span><span style={{fontWeight:700,color:String(c)}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supplier */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>المورد *</label>
              <input required value={form.supplier} onChange={e=>setSupplierName(e.target.value)} list="pur-sup-list" style={inp} placeholder="اسم المورد أو الشركة"/>
              <datalist id="pur-sup-list">{suppliers.map(x=><option key={x.name} value={x.name}/>)}</datalist>
            </div>

            {/* Payment status */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>حالة الدفع</label>
              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={()=>setForm({...form,payment_status:'unpaid'})}
                  style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${form.payment_status==='unpaid'?C.danger:C.border}`,background:form.payment_status==='unpaid'?C.dangerL:'white',color:form.payment_status==='unpaid'?C.danger:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <Clock size={13} strokeWidth={2.3}/> غير مدفوعة
                </button>
                <button type="button" onClick={()=>setForm({...form,payment_status:'paid'})}
                  style={{flex:1,padding:'9px',borderRadius:8,border:`1.5px solid ${form.payment_status==='paid'?C.primary:C.border}`,background:form.payment_status==='paid'?C.primaryL:'white',color:form.payment_status==='paid'?C.primary:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <CheckCircle2 size={13} strokeWidth={2.3}/> مدفوعة
                </button>
              </div>
            </div>

            {form.payment_status==='unpaid' && (
              <div style={{marginBottom:10}}>
                <label style={lbl}>موعد استحقاق الدفع (اختياري)</label>
                <input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} style={inp}/>
              </div>
            )}

            {/* Invoice Date */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>تاريخ الفاتورة</label>
              <input type="date" value={form.invoice_date} onChange={e=>setForm({...form,invoice_date:e.target.value})} style={inp}/>
            </div>

            {/* VAT */}
            <div style={{marginBottom:10}}>
              <label style={lbl}>الفاتورة شاملة ضريبة 15%؟ *</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[{v:'no',l:'بدون ضريبة',c:C.primary,Icon:Ban},{v:'yes',l:'شاملة 15%',c:C.warning,Icon:Percent}].map(b=>(
                  <button key={b.v} type="button" onClick={()=>{ if(b.v==='no') setZatca(null); setForm({...form,hasVat:b.v,invoice_image:b.v==='no'?'':form.invoice_image}) }}
                    style={{padding:'10px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${form.hasVat===b.v?b.c:C.border2}`,background:form.hasVat===b.v?b.v==='no'?C.primaryL:C.warningL:'white',color:form.hasVat===b.v?b.c:C.text3,fontFamily:'inherit',transition:'all .15s',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    <b.Icon size={13} strokeWidth={2.3}/> {b.l}
                  </button>
                ))}
              </div>
            </div>

            {/* فاتورة ضريبية = لازم صورتها أو ملفها — نطلبها هنا جنب الاختيار مو بس فوق */}
            {form.hasVat==='yes' && (
              <div style={{marginBottom:12,borderRadius:10,padding:'12px 12px',border:`1.5px ${form.invoice_image?'solid':'dashed'} ${form.invoice_image?C.primaryB:C.danger}`,background:form.invoice_image?C.primaryL:C.dangerL}}>
                {form.invoice_image
                  ? <div style={{fontSize:12.5,fontWeight:700,color:C.primary}}>الفاتورة مرفقة</div>
                  : <><div style={{fontSize:12.5,fontWeight:700,color:C.danger,marginBottom:8}}>الفاتورة ضريبية — أرفق صورتها أو ملفها (مطلوب)</div>
                    <InvoicePickButtons onFile={handleImage} disabled={uploading} primary={C.primary} primaryL={'white'}
                      labels={{camera:'تصوير',gallery:'من الصور',file:'ملف PDF'}}/>
                    {uploading&&<div style={{fontSize:11.5,color:C.text3,marginTop:6}}>جاري الرفع...</div>}</>}
              </div>
            )}
            {form.hasVat==='yes' && (
              <TaxInvoiceFields invoiceNumber={form.invoice_number} vatNumber={form.supplier_vat_number} savedFromSupplier={vatFromSupplier}
                zatca={zatca} onZatca={z=>setZatca(z)} enteredTotal={Number(form.total_amount)||0} onError={m=>toast(m,'warning')}
                onChange={p=>{ if('supplier_vat_number' in p) setVatFromSupplier(false); setForm(f=>({...f,...p})) }} inputStyle={inp} labelStyle={lbl}/>
            )}

            {/* Note */}
            <div style={{marginBottom:14}}>
              <label style={lbl}>ملاحظات (اختياري)</label>
              <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
                style={{...inp,minHeight:52,resize:'vertical'}} placeholder="أي تفاصيل إضافية..."/>
            </div>
    </>
  )
}
