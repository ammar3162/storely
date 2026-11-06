'use client'
import { Upload, Paperclip, CheckCircle2 } from 'lucide-react'
import { C } from './constants'
import type { InventoryState } from './useInventory'

export default function ImportSheet({ m }: { m: InventoryState }) {
  const { products, showImport, setShowImport, importPreview, setImportPreview, importing, importFileRef, downloadImportTemplate, handleImportFile, confirmImport } = m
  return (
    <>
      {showImport&&(
        <div style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:520,maxHeight:'85vh',overflowY:'auto' as const,padding:20}}>
            <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:4,display:'flex',alignItems:'center',gap:6}}><Upload size={16} strokeWidth={2.25}/> استيراد منتجات من ملف</div>
            <div style={{fontSize:12,color:C.text4,marginBottom:16}}>ارفع ملف CSV بصيغة Excel — سيتم تحديث الأصناف الموجودة وإضافة الجديدة تلقائياً</div>

            {importPreview.length===0 ? (
              <>
                <button onClick={downloadImportTemplate} type="button" style={{width:'100%',padding:10,background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit',marginBottom:10}}>
                  تحميل نموذج فارغ (CSV)
                </button>
                <input ref={importFileRef} type="file" accept=".csv" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])handleImportFile(e.target.files[0])}}/>
                <button onClick={()=>importFileRef.current?.click()} type="button" style={{width:'100%',padding:14,background:C.primaryL,border:`1.5px dashed ${C.primaryB}`,borderRadius:10,fontSize:13,fontWeight:700,color:C.primary,cursor:'pointer',fontFamily:'inherit'}}>
                  <Paperclip size={13} strokeWidth={2.25} style={{display:'inline',verticalAlign:'-2px',marginLeft:4}}/> اختر ملف CSV للاستيراد
                </button>
              </>
            ) : (
              <>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>معاينة ({importPreview.length} صنف)</div>
                <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:'hidden',marginBottom:14,maxHeight:280,overflowY:'auto' as const}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bg}}>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الاسم</th>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الكمية</th>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الوحدة</th>
                        <th style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:C.text3}}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((r,i)=>{
                        const exists = products.some(p=>p.name.trim()===r.name)
                        return (
                          <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                            <td style={{padding:'6px 8px',color:C.text}}>{r.name}</td>
                            <td style={{padding:'6px 8px',color:C.text2}}>{r.qty}</td>
                            <td style={{padding:'6px 8px',color:C.text2}}>{r.unit}</td>
                            <td style={{padding:'6px 8px'}}>
                              <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5,background:exists?C.warningL:C.primaryL,color:exists?C.warning:C.primary}}>
                                {exists?'تحديث':'جديد'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setImportPreview([])} type="button" style={{flex:1,padding:11,background:C.bg,border:`1px solid ${C.border2}`,borderRadius:10,fontSize:12,fontWeight:600,color:C.text2,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                  <button onClick={confirmImport} disabled={importing} type="button" style={{flex:2,padding:11,background:C.primary,border:'none',borderRadius:10,fontSize:12,fontWeight:700,color:'white',cursor:importing?'not-allowed':'pointer',fontFamily:'inherit',opacity:importing?.7:1}}>
                    {importing?'جاري الاستيراد...':<span style={{display:'inline-flex',alignItems:'center',gap:6}}><CheckCircle2 size={14} strokeWidth={2.25}/> تأكيد استيراد {importPreview.length} صنف</span>}
                  </button>
                </div>
              </>
            )}

            <button onClick={()=>{setShowImport(false);setImportPreview([])}} type="button" style={{width:'100%',padding:9,background:'none',border:'none',fontSize:11,color:C.text4,cursor:'pointer',fontFamily:'inherit',marginTop:10}}>إغلاق</button>
          </div>
        </div>
      )}
    </>
  )
}
