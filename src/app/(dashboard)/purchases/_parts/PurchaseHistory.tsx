'use client'
import { Pencil } from 'lucide-react'
import { C, CAT_ICONS } from './constants'
import type { PurchasesState } from './usePurchases'

export default function PurchaseHistory({ m }: { m: PurchasesState }) {
  const { isOwner, setEditLog, deletingId, curr, filterCat, setFilterCat, filterPeriod, setFilterPeriod, filterSupplier, setFilterSupplier, filteredHistory, deletePurchase } = m
  return (
    <>
        {/* History */}
        <div className="u" style={{background:'white',borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden',animationDelay:'.08s'}}>
          {/* Filters */}
          <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,color:C.text}}>آخر المشتريات</span>
              <span style={{fontSize:10,fontWeight:600,color:C.primary,background:C.primaryL,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.primaryB}`}}>{filteredHistory.length} فاتورة</span>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {/* Period */}
              <div style={{display:'flex',gap:3,background:C.bg,borderRadius:7,padding:3,border:`1px solid ${C.border}`}}>
                {[{v:'all',l:'الكل'},{v:'today',l:'اليوم'},{v:'week',l:'أسبوع'},{v:'month',l:'شهر'}].map(p=>(
                  <button key={p.v} onClick={()=>setFilterPeriod(p.v)}
                    style={{padding:'4px 9px',borderRadius:5,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:filterPeriod===p.v?C.primary:'transparent',color:filterPeriod===p.v?'white':C.text3,transition:'all .15s'}}>
                    {p.l}
                  </button>
                ))}
              </div>
              {/* Type */}
              <div style={{display:'flex',gap:3,background:C.bg,borderRadius:7,padding:3,border:`1px solid ${C.border}`}}>
                {[{v:'all',l:'الكل'},{v:'مخزون',l:'📦'},{v:'مشتريات',l:'🛒'},{v:'أخرى',l:'📋'}].map(c=>(
                  <button key={c.v} onClick={()=>setFilterCat(c.v)}
                    style={{padding:'4px 9px',borderRadius:5,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:filterCat===c.v?C.primary:'transparent',color:filterCat===c.v?'white':C.text3,transition:'all .15s'}}>
                    {c.l}
                  </button>
                ))}
              </div>
              {/* Supplier search */}
              <input value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} placeholder="بحث بالمورد..."
                style={{flex:1,minWidth:80,padding:'5px 10px',border:`1px solid ${C.border2}`,borderRadius:7,fontSize:11,fontFamily:'inherit',outline:'none',background:'white',color:C.text}}/>
            </div>
          </div>

          {/* List */}
          <div style={{maxHeight:600,overflowY:'auto'}}>
            {filteredHistory.length===0?(
              <div style={{padding:'48px 20px',textAlign:'center'}}>
                <div style={{fontSize:36,marginBottom:8}}>🛒</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text2,marginBottom:4}}>لا توجد مشتريات</div>
                <div style={{fontSize:11,color:C.text4}}>سجّل أول فاتورة من النموذج</div>
              </div>
            ):filteredHistory.map((p,i)=>{
              const cc=p.category==='مخزون'?{bg:C.primaryL,color:C.primary,border:C.primaryB}:p.category==='مشتريات'?{bg:C.infoL,color:C.info,border:C.infoB}:{bg:C.bg,color:C.text3,border:C.border2}
              return(
                <div key={p.id} className="rh" style={{padding:'12px 14px',borderBottom:i<filteredHistory.length-1?`1px solid ${C.border}`:'none'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5,flexWrap:'wrap'}}>
                        <span style={{background:cc.bg,color:cc.color,border:`1px solid ${cc.border}`,padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600}}>
                          {CAT_ICONS[p.category]} {p.category}
                        </span>
                        {p.invoice_image&&(
                          <a href={p.invoice_image} target="_blank" rel="noreferrer"
                            style={{color:C.info,fontSize:10,fontWeight:600,textDecoration:'none',background:C.infoL,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.infoB}`}}>
                            📎 فاتورة
                          </a>
                        )}
                        {p.edited_at&&(()=>{ const acc=p.edited_source==='accountant'
                          return <button onClick={()=>isOwner&&setEditLog(p)} title={`عدّله ${p.edited_by||''}${isOwner?' — اضغط تشوف السجل':''}`}
                            style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:800,color:acc?'#7c3aed':C.warning,background:acc?'#f5f3ff':C.warningL,border:'none',borderRadius:99,padding:'2px 8px',cursor:isOwner?'pointer':'default',fontFamily:'inherit'}}>
                            <Pencil size={10} strokeWidth={2.5}/> {acc?'معدّل من المحاسب':'معدّل'}</button> })()}
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{p.name}</div>
                      {p.qty&&<div style={{fontSize:11,color:C.text4,marginBottom:1}}>{p.qty} {p.unit}</div>}
                      <div style={{fontSize:10,color:C.text4,display:'flex',gap:8,flexWrap:'wrap'}}>
                        {p.supplier&&<span>🏪 {p.supplier}</span>}
                        <span>{new Date(p.created_at).toLocaleDateString('ar-SA', {numberingSystem:'latn',day:'numeric',month:'short'})}</span>
                      </div>
                    </div>
                    <div style={{textAlign:'left',flexShrink:0,display:'flex',flexDirection:'column' as const,alignItems:'flex-end',gap:6}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:C.primary,fontVariantNumeric:'tabular-nums'}}>{Number(p.total_amount||0).toFixed(0)}</div>
                        <div style={{fontSize:10,color:C.text4}}>{curr}</div>
                        {Number(p.vat_amount||0)>0&&<div style={{fontSize:10,color:C.warning,marginTop:1}}>+{Number(p.vat_amount||0).toFixed(0)} ض</div>}
                      </div>
                      <button onClick={()=>deletePurchase(p)} disabled={deletingId===p.id}
                        style={{padding:'3px 9px',borderRadius:6,border:`1px solid ${C.dangerB}`,background:C.dangerL,color:C.danger,fontSize:10,fontWeight:700,cursor:deletingId===p.id?'not-allowed':'pointer',fontFamily:'inherit',opacity:deletingId===p.id?.6:1}}>
                        {deletingId===p.id?'...':'🗑️ حذف'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
    </>
  )
}
