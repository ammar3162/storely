'use client'
import NumberInput from '@/components/NumberInput'
import { btnPrimary } from '@/lib/ds'
import type { SupplierCardState } from './useSupplierCard'

export default function SupplierCardDetails({ m }: { m: SupplierCardState }) {
  const { s, open, selectedProduct, setSelectedProduct, productSearch, setProductSearch, reorderPoint, setReorderPoint, orderQty, setOrderQty, supplierNotes, setSupplierNotes, catalogItems, selectedCatalogItem, setSelectedCatalogItem, linked, unlinked, linkProduct, unlinkProduct } = m
  return (
    <>
      {/* إعدادات الإشعارات */}
      {/* المنتجات */}
      {open && (
        <div style={{ borderTop:'1.5px solid #F3F5F6', padding:'16px 20px' }}>
          
          {/* المنتجات المرتبطة */}
          {linked.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#687985', marginBottom:10 }}>المنتجات المرتبطة</div>
              <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
                {linked.length===0 && <div style={{textAlign:'center',padding:'20px',color:'#687985',fontSize:13}}>لا توجد منتجات مرتبطة — أضف منتجاً من الأسفل</div>}
              {linked.map((p:any)=>(
                  <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'#F7F9FA', borderRadius:10, border:'1px solid #F3F5F6' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#203640' }}>{p.name}</span>
                        {p.qty <= p.supplier_reorder_point && (
                          <span style={{ fontSize:10, background:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:20, padding:'1px 7px', fontWeight:700 }}>ناقص</span>
                        )}
                      </div>
                      {p.supplier_notes && <div style={{ fontSize:11, color:'#203640', marginTop:3 }}>{p.supplier_notes}</div>}
                      <div style={{ fontSize:11, color:'#687985', marginTop:3 }}>
                        المتاح: <b style={{color:'#203640'}}>{p.qty} {p.unit}</b> · يُطلب عند: <b style={{color:'#203640'}}>{p.supplier_reorder_point}</b> · كمية الطلب: <b style={{color:'#203640'}}>{p.supplier_order_qty}</b>
                      </div>
                    </div>
                    <button onClick={()=>unlinkProduct(p.id)}
                      style={{ background:'none', border:'1.5px solid #E2E7EA', color:'#687985', borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginRight:8 }}>
                      فك
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ربط منتج جديد */}
          {unlinked.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#687985', marginBottom:10 }}>ربط منتج جديد</div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8, marginBottom:8 }}>
                <div>
                  <label style={{ fontSize:11, color:'#66737C', display:'block', marginBottom:4 }}>المنتج</label>
                  <div style={{border:'1.5px solid #E2E7EA',borderRadius:10,overflow:'hidden',background:'white'}}>
                    <input
                      value={productSearch}
                      onChange={e=>setProductSearch(e.target.value)}
                      placeholder="ابحث..."
                      style={{width:'100%',padding:'8px 12px',border:'none',borderBottom:'1px solid #F3F5F6',fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box',background:'#F7F9FA'}}
                    />
                    {(() => {
                      const filteredUnlinked = unlinked.filter((p:any)=>!productSearch||p.name.includes(productSearch))
                      if (productSearch && filteredUnlinked.length === 0) {
                        return (
                          <div style={{padding:'20px 12px',textAlign:'center' as const,fontSize:12,color:'#687985'}}>
                            لا يوجد منتج مطابق لـ "{productSearch}"
                          </div>
                        )
                      }
                      return (
                        <select value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)}
                          size={5}
                          style={{width:'100%',border:'none',fontSize:13,fontFamily:'inherit',background:'white',color:'#203640',outline:'none',padding:'4px 0'}}>
                          <option value="">— اختر —</option>
                          {filteredUnlinked.map((p:any)=>(
                            <option key={p.id} value={p.id}>{p.name} ({p.qty} {p.unit})</option>
                          ))}
                        </select>
                      )
                    })()}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#66737C', display:'block', marginBottom:4 }}>يُطلب عند</label>
                  <NumberInput value={reorderPoint} onChange={e=>setReorderPoint(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E2E7EA', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }} placeholder="5" />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#66737C', display:'block', marginBottom:4 }}>كمية الطلب</label>
                  <NumberInput value={orderQty} onChange={e=>setOrderQty(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E2E7EA', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const }} placeholder="20" />
                </div>
              </div>
              {s.marketplace_supplier_id && catalogItems.length > 0 && (
                <div style={{marginBottom:8}}>
                  <label style={{ fontSize:11, color:'#66737C', display:'block', marginBottom:4 }}>الصنف المقابل بكتالوج المورد (لطلب التوريد التلقائي)</label>
                  <select value={selectedCatalogItem} onChange={e=>setSelectedCatalogItem(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E2E7EA', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const, background:'white' }}>
                    <option value="">— بدون ربط (إشعار واتساب فقط) —</option>
                    {catalogItems.map((ci:any)=>(
                      <option key={ci.id} value={ci.id}>{ci.name} — {ci.price} ⃁ / {ci.unit}</option>
                    ))}
                  </select>
                </div>
              )}
              <input value={supplierNotes} onChange={e=>setSupplierNotes(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #E2E7EA', borderRadius:10, fontSize:13, fontFamily:'inherit', outline:'none', marginBottom:8, boxSizing:'border-box' as const }} 
                placeholder="ملاحظات لهذا المنتج — مثال: يرجى التوريد مبرداً (اختياري)" />
              <button onClick={linkProduct} disabled={!selectedProduct}
                style={{ ...btnPrimary, padding:'10px 20px', fontSize:13, opacity:!selectedProduct?.5:1, cursor:!selectedProduct?'not-allowed':'pointer' }}>
                ربط المنتج
              </button>
            </div>
          )}

          {unlinked.length === 0 && linked.length === 0 && (
            <div style={{ textAlign:'center', padding:'24px', color:'#687985', fontSize:13 }}>لا توجد منتجات متاحة للربط</div>
          )}
        </div>
      )}
    </>
  )
}
