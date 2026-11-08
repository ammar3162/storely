'use client'
import { Paperclip, Pencil, ShoppingCart, Store } from 'lucide-react'
import { StorelyCard, StorelyEmptyState, StorelyStatusBadge, StorelyTableAction } from '@/components/ui'
import { C } from './constants'
import type { PurchasesState } from './usePurchases'
import { fileLink } from '@/lib/invoiceUrl'

const PERIODS = [{v:'all',l:'الكل'},{v:'today',l:'اليوم'},{v:'week',l:'أسبوع'},{v:'month',l:'شهر'}]
const CATS = [{v:'all',l:'كل الفئات'},{v:'مخزون',l:'مخزون'},{v:'مشتريات',l:'مشتريات'},{v:'أخرى',l:'أخرى'}]

export default function PurchaseHistory({ m }: { m: PurchasesState }) {
  const { isOwner, setEditLog, deletingId, curr, filterCat, setFilterCat, filterPeriod, setFilterPeriod, filterSupplier, setFilterSupplier, filteredHistory, deletePurchase } = m
  return (
    <StorelyCard title="آخر المشتريات" actions={<StorelyStatusBadge status="info">{filteredHistory.length} فاتورة</StorelyStatusBadge>}>
      <div className="storely-toolbar">
        <div className="storely-segmented" role="tablist" aria-label="الفترة">
          {PERIODS.map(p=><button key={p.v} type="button" className={filterPeriod===p.v?'active':''} onClick={()=>setFilterPeriod(p.v)}>{p.l}</button>)}
        </div>
        <select className="storely-select" style={{maxWidth:170}} value={filterCat} onChange={e=>setFilterCat(e.target.value)} aria-label="الفئة">
          {CATS.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        <input className="storely-input" style={{flex:'1 1 180px',maxWidth:320}} value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)} placeholder="ابحث باسم المورد" aria-label="بحث بالمورد"/>
      </div>

      <div style={{maxHeight:640,overflowY:'auto'}}>
        {filteredHistory.length===0 ? (
          <StorelyEmptyState icon={<ShoppingCart size={20}/>} title="لا توجد مشتريات" description="سجّل أول فاتورة من النموذج أو من قارئ الفواتير" />
        ) : filteredHistory.map((p,i)=>{
          const status = p.category==='مخزون' ? 'success' : p.category==='مشتريات' ? 'info' : 'warning'
          return (
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,padding:'16px 24px',borderBottom:i<filteredHistory.length-1?`1px solid ${C.border}`:'none'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap'}}>
                  <StorelyStatusBadge status={status}>{p.category}</StorelyStatusBadge>
                  {p.invoice_image&&(
                    <a href={fileLink(p.invoice_image)} target="_blank" rel="noreferrer" className="storely-badge" data-status="info" style={{gap:4,textDecoration:'none'}}>
                      <Paperclip size={12}/> الفاتورة
                    </a>
                  )}
                  {p.edited_at&&(()=>{ const acc=p.edited_source==='accountant'
                    return <button type="button" onClick={()=>isOwner&&setEditLog(p)} title={`عدّله ${p.edited_by||''}${isOwner?' — اضغط لعرض السجل':''}`}
                      className="storely-badge" data-status="warning" style={{gap:4,cursor:isOwner?'pointer':'default',fontFamily:'inherit'}}>
                      <Pencil size={11}/> {acc?'معدّل من المحاسب':'معدّل'}</button> })()}
                </div>
                <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:2,overflowWrap:'anywhere'}}>{p.name}</div>
                {p.qty&&<div style={{fontSize:13,color:C.text3,marginBottom:2}}>{p.qty} {p.unit}</div>}
                <div style={{fontSize:12,color:C.text3,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                  {p.supplier&&<span style={{display:'inline-flex',alignItems:'center',gap:4}}><Store size={12}/>{p.supplier}</span>}
                  <span>{new Date(p.created_at).toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn',day:'numeric',month:'short'})}</span>
                </div>
              </div>
              <div style={{textAlign:'left',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
                <div>
                  <div style={{fontSize:16,fontWeight:600,color:C.text,fontVariantNumeric:'tabular-nums'}}>{Number(p.total_amount||0).toLocaleString('en-US',{maximumFractionDigits:0})} <span style={{fontSize:12,color:C.text3,fontWeight:400}}>{curr}</span></div>
                  {Number(p.vat_amount||0)>0&&<div style={{fontSize:12,color:C.warning,marginTop:2}}>منها ضريبة {Number(p.vat_amount||0).toFixed(0)}</div>}
                </div>
                <StorelyTableAction action="delete" disabled={deletingId===p.id} onClick={()=>deletePurchase(p)} />
              </div>
            </div>
          )
        })}
      </div>
    </StorelyCard>
  )
}
