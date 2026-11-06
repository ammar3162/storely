'use client'
import NumberInput from '@/components/NumberInput'
import { ClipboardList } from 'lucide-react'
import type { SupplierDashboard } from './useSupplierDashboard'
import type { DashboardView } from './deriveView'

export default function OrdersTab({ m, v }: { m: SupplierDashboard; v: DashboardView }) {
  const { quoteRequests, respondingId, setRespondingId, respondPrice, setRespondPrice, respondNote, setRespondNote, respondSaving, reps, myGivenReviewIds, ratingCustomerId, setRatingCustomerId, customerRating, setCustomerRating, ratingSaving, approvingId, setApprovingId, selectedRepId, setSelectedRepId, deliveryDate, setDeliveryDate, approveSaving, activeTab, submitCustomerRating, markFulfilled, startApprove, approveDelivery, startRespond, submitResponse } = m
  const { money, STATUS } = v
  return (
    <>
        {activeTab==='orders' && (
          <section className="sd-panel">
            <h2>الطلبات الواردة <small>{quoteRequests.length}</small></h2>
            {quoteRequests.length===0 ? (
              <div className="sd-empty"><ClipboardList size={28}/><b>ما وصلتك طلبات للحين</b><span>لما يطلب منك عميل، يوصلك الطلب هنا وعلى واتساب.</span></div>
            ) : (
              <div className="sd-orders">
                {quoteRequests.map((r:any)=>{ const st = STATUS[r.status] || {label:r.status,tone:'slate'}; return (
                  <article key={r.id} className={'sd-order t-'+st.tone}>
                    <div className="sd-order-head">
                      <b>{r.org_name || 'عميل'}</b>
                      <span className={'sd-badge t-'+st.tone}>{st.label}</span>
                    </div>
                    <ul className="sd-order-items">{(r.items||[]).map((i:any,k:number)=><li key={k}>{i.name}<span>{i.qty} {i.unit||''}</span></li>)}</ul>
                    {r.status==='accepted' ? (
                      approvingId===r.id ? (
                        <div className="sd-inline">
                          <select className="sd-in" value={selectedRepId} onChange={e=>setSelectedRepId(e.target.value)}>
                            <option value="">اختر المندوب</option>
                            {reps.map((rep:any)=>(<option key={rep.id} value={rep.id}>{rep.name} — {rep.phone}</option>))}
                          </select>
                          <input className="sd-in" type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)}/>
                          <button className="sd-btn" onClick={()=>approveDelivery(r)} disabled={approveSaving || !selectedRepId || !deliveryDate}>{approveSaving?'…':'تأكيد التوريد'}</button>
                          <button className="sd-btn ghost" onClick={()=>setApprovingId(null)}>إلغاء</button>
                          {reps.length===0 && <div className="sd-warn">أضف مندوب أول من «المناديب»</div>}
                        </div>
                      ) : (
                        <div className="sd-order-foot"><span>سعرك: <b>{money(r.quoted_price)} ⃁</b> — العميل وافق</span><button className="sd-btn" onClick={()=>startApprove(r.id)}>أكّد التوريد</button></div>
                      )
                    ) : r.status==='confirmed' ? (
                      <div className="sd-order-foot"><span>المندوب {r.rep_name} ({r.rep_phone}) · موعد التوريد {r.delivery_date}</span><button className="sd-btn" onClick={()=>markFulfilled(r.id)}>تم التوريد</button></div>
                    ) : r.status==='fulfilled' ? (
                      <div className="sd-order-foot">
                        <span>سعرك: <b>{money(r.quoted_price)} ⃁</b>{r.rep_name && ` · المندوب ${r.rep_name}`}</span>
                        {!myGivenReviewIds.includes(r.id) && (ratingCustomerId===r.id ? (
                          <span className="sd-rate">
                            {[1,2,3,4,5].map(n=>(<button key={n} onClick={()=>setCustomerRating(n)} aria-label={`${n} نجوم`} style={{opacity:n<=customerRating?1:.3}}>⭐</button>))}
                            <button className="sd-btn" onClick={()=>submitCustomerRating(r.id)} disabled={ratingSaving}>{ratingSaving?'…':'أرسل التقييم'}</button>
                            <button className="sd-btn ghost" onClick={()=>setRatingCustomerId(null)}>إلغاء</button>
                          </span>
                        ) : <button className="sd-btn ghost" onClick={()=>setRatingCustomerId(r.id)}>قيّم العميل</button>)}
                      </div>
                    ) : r.status==='quoted' ? (
                      <div className="sd-order-foot"><span>سعرك المرسل: <b>{money(r.quoted_price)} ⃁</b> — بانتظار رد العميل</span></div>
                    ) : respondingId===r.id ? (
                      <div className="sd-inline">
                        <NumberInput className="sd-in" value={respondPrice} onChange={e=>setRespondPrice(e.target.value)} placeholder="السعر الإجمالي" style={{maxWidth:150}}/>
                        <input className="sd-in" value={respondNote} onChange={e=>setRespondNote(e.target.value)} placeholder="ملاحظة للعميل (اختياري)"/>
                        <button className="sd-btn" onClick={()=>submitResponse(r.id)} disabled={respondSaving || !respondPrice}>{respondSaving?'…':'أرسل السعر'}</button>
                        <button className="sd-btn ghost" onClick={()=>setRespondingId(null)}>إلغاء</button>
                      </div>
                    ) : (
                      <div className="sd-order-foot"><span>العميل ينتظر سعرك</span><button className="sd-btn" onClick={()=>startRespond(r.id)}>أرسل سعرك</button></div>
                    )}
                  </article>
                )})}
              </div>
            )}
          </section>
        )}
    </>
  )
}
