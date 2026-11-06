'use client'
import { Send, Clock, Trash2 } from 'lucide-react'
import type { SupplierCardState } from './useSupplierCard'

export default function SupplierCardHeader({ m }: { m: SupplierCardState }) {
  const { s, rating, recentFailedCount, open, setOpen, sending, editingPhone, setEditingPhone, editPhoneVal, setEditPhoneVal, savingPhone, editingVat, setEditingVat, editVatVal, setEditVatVal, setConfirmDelete, linked, openTimeline, savePhone, saveVat, sendNow } = m
  return (
    <>
      {/* Header */}
      <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', flex:1 }} onClick={()=>setOpen(o=>!o)}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0f172a,#1e293b)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'white', flexShrink:0 }}>
            {s.name[0]}
          </div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>{s.name}</div>
              {rating?.details?.dealCount>0 && (
                <span title="عدد فواتير الشراء المسجّلة من هذا المورد" style={{fontSize:11,fontWeight:700,background:'#f8fafc',color:'#475569',border:'1px solid #e2e8f0',borderRadius:20,padding:'2px 8px'}}>
                  {rating.details.dealCount} تعامل
                </span>
              )}
              {linked.length>0 && <span style={{fontSize:11,fontWeight:700,background:'#f0fdfa',color:'#029FA2',border:'1px solid #99f6e4',borderRadius:20,padding:'2px 8px'}}>{linked.length} منتج مرتبط</span>}
              {linked.length===0 && <span style={{fontSize:11,fontWeight:700,background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:20,padding:'2px 8px'}}>⚠️ لا منتجات مرتبطة</span>}
              {recentFailedCount>0 && (
                <span onClick={e=>{e.stopPropagation();openTimeline()}} title="اضغط لمشاهدة سجل التواصل" style={{fontSize:11,fontWeight:700,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:20,padding:'2px 8px',cursor:'pointer'}}>
                  ❌ فشل إرسال ({recentFailedCount})
                </span>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, flexWrap:'wrap' as const }}>
              {editingPhone ? (
                <span onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:4}}>
                  <input value={editPhoneVal} onChange={e=>setEditPhoneVal(e.target.value)} dir="ltr" autoFocus
                    style={{fontSize:11,padding:'3px 6px',border:'1.5px solid #029FA2',borderRadius:5,width:110,fontFamily:'inherit'}}/>
                  <button onClick={savePhone} disabled={savingPhone} style={{fontSize:10,fontWeight:700,color:'white',background:'#029FA2',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>{savingPhone?'...':'حفظ'}</button>
                  <button onClick={()=>{setEditingPhone(false);setEditPhoneVal(s.phone||'')}} style={{fontSize:10,fontWeight:700,color:'#64748b',background:'#f1f5f9',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                </span>
              ) : (
                <span onClick={e=>{e.stopPropagation();setEditingPhone(true)}} style={{ fontSize:12, color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                  {s.phone} <span style={{fontSize:10,opacity:.5}}>✏️</span>
                </span>
              )}
              <span style={{ fontSize:12, color:'#94a3b8' }}>·</span>
              <span style={{ fontSize:12, color:'#64748b' }}>{linked.length} منتج</span>
              <span style={{ fontSize:12, color:'#94a3b8' }}>·</span>
              {editingVat ? (
                <span onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:4}}>
                  <input value={editVatVal} onChange={e=>setEditVatVal(e.target.value)} dir="ltr" autoFocus inputMode="numeric" placeholder="3xxxxxxxxxxxxx3"
                    style={{fontSize:11,padding:'3px 6px',border:'1.5px solid #029FA2',borderRadius:5,width:140,fontFamily:'inherit'}}/>
                  <button onClick={saveVat} disabled={savingPhone} style={{fontSize:10,fontWeight:700,color:'white',background:'#029FA2',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>{savingPhone?'...':'حفظ'}</button>
                  <button onClick={()=>{setEditingVat(false);setEditVatVal(s.vat_number||'')}} style={{fontSize:10,fontWeight:700,color:'#64748b',background:'#f1f5f9',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                </span>
              ) : (
                <span onClick={e=>{e.stopPropagation();setEditingVat(true)}} style={{ fontSize:12, color:s.vat_number?'#64748b':'#029FA2', cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                  {s.vat_number ? <>الرقم الضريبي: <span dir="ltr">{s.vat_number}</span> <span style={{fontSize:10,opacity:.5}}>✏️</span></> : '+ الرقم الضريبي'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <button onClick={sendNow} disabled={sending} title="إرسال طلب توريد الآن"
            style={{ background:'#f0fdfa', color:'#029FA2', border:'1.5px solid #99f6e4', borderRadius:9, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {sending ? '...' : <Send size={14} strokeWidth={2.3}/>}
          </button>
          <button onClick={openTimeline} title="سجل التواصل"
            style={{ background:'#eff6ff', color:'#2563eb', border:'1.5px solid #bfdbfe', borderRadius:9, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Clock size={14} strokeWidth={2.3}/>
          </button>
          <button onClick={()=>setConfirmDelete(true)} title="حذف المورد"
            style={{ background:'#fef2f2', color:'#ef4444', border:'1.5px solid #fecaca', borderRadius:9, padding:'7px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Trash2 size={14} strokeWidth={2.3}/>
          </button>
          <span style={{ color:'#94a3b8', fontSize:16, transform:open?'rotate(180deg)':'none', transition:'transform .2s', cursor:'pointer' }} onClick={()=>setOpen(o=>!o)}>⌄</span>
        </div>
      </div>
    </>
  )
}
