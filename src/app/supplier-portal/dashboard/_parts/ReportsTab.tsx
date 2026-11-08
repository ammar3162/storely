'use client'
import type { SupplierDashboard } from './useSupplierDashboard'
import type { DashboardView } from './deriveView'

export default function ReportsTab({ m, v }: { m: SupplierDashboard; v: DashboardView }) {
  const { activeTab, togglePaymentStatus } = m
  const { fulfilledRequests, totalRevenue, totalOrders, fulfilledCount, topItems, topCustomers, repStats, unpaidInvoices, paidInvoices, unpaidTotal, paidTotal, money } = v
  return (
    <>
        {activeTab==='reports' && (<>
          <div className="sd-figs">
            <div><span>مبيعات منفّذة</span><b>{money(totalRevenue)} <small>⃁</small></b></div>
            <div><span>كل الطلبات</span><b>{totalOrders}</b></div>
            <div><span>طلبات منفّذة</span><b>{fulfilledCount}</b></div>
            <div className="warn"><span>آجل لك عند العملاء</span><b>{money(unpaidTotal)} <small>⃁</small></b></div>
          </div>
          <div className="sd-grid-2">
            <section className="sd-panel"><h2>أكثر الأصناف طلباً</h2>
              {topItems.length===0 ? <div className="sd-muted">لا توجد بيانات بعد</div> : <ul className="sd-rank">{topItems.map(([n,q])=>(<li key={n}><span>{n}</span><b>{q} وحدة</b></li>))}</ul>}
            </section>
            <section className="sd-panel"><h2>أكثر العملاء طلباً</h2>
              {topCustomers.length===0 ? <div className="sd-muted">لا توجد بيانات بعد</div> : <ul className="sd-rank">{topCustomers.map(([n,a])=>(<li key={n}><span>{n}</span><b>{a.count} طلب · {money(a.total)} ⃁</b></li>))}</ul>}
            </section>
          </div>
          <section className="sd-panel"><h2>التوريد حسب المندوب</h2>
            {repStats.length===0 ? <div className="sd-muted">لا توجد توريدات مسندة بعد</div> : <ul className="sd-rank">{repStats.map(([n,c])=>(<li key={n}><span>{n}</span><b>{c} توريد</b></li>))}</ul>}
          </section>
          <section className="sd-panel">
            <h2>الفواتير <small>آجلة {unpaidInvoices.length} · مسددة {paidInvoices.length} ({money(paidTotal)} ⃁)</small></h2>
            {fulfilledRequests.length===0 ? <div className="sd-muted">تظهر الفواتير هنا بعد تأكيد توريد أي طلب.</div> : (
              <div className="sd-list">
                {fulfilledRequests.map((r:any)=>(
                  <div key={r.id} className="sd-item">
                    <div className="sd-item-main"><b>{r.org_name || 'عميل'}</b><span>{r.delivery_date || new Date(r.created_at).toLocaleDateString('ar-SA-u-ca-gregory',{numberingSystem:'latn'})}</span></div>
                    <div className="sd-price">{money(r.quoted_price)} <small>⃁</small></div>
                    <button onClick={()=>togglePaymentStatus(r.id, r.payment_status)} className={'sd-badge '+(r.payment_status==='paid'?'t-green':'t-amber')} title="اضغط لتغيير حالة السداد">{r.payment_status==='paid'?'مسددة':'آجلة'}</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>)}
    </>
  )
}
