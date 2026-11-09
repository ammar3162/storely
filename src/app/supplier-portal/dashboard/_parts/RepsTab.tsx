'use client'
import { Bike, Trash2, Plus } from 'lucide-react'
import type { SupplierDashboard } from './useSupplierDashboard'

export default function RepsTab({ m }: { m: SupplierDashboard }) {
  const { reps, repName, setRepName, repPhone, setRepPhone, repSaving, activeTab, addRep, deleteRep } = m
  return (
    <>
        {activeTab==='reps' && (
          <div className="sd-grid-products">
            <section className="sd-panel">
              <h2>مندوب جديد</h2>
              <div className="sd-form">
                <label>اسم المندوب<input className="sd-in" value={repName} onChange={e=>setRepName(e.target.value)} placeholder="الاسم"/></label>
                <label>رقم الجوال<input className="sd-in" value={repPhone} onChange={e=>setRepPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr"/></label>
                <div className="sd-actions"><button className="sd-btn" onClick={addRep} disabled={repSaving || !repName.trim() || !repPhone.trim()}>{repSaving?'جاري الإضافة…':<><Plus size={16}/> أضف المندوب</>}</button></div>
              </div>
            </section>
            <section className="sd-panel">
              <h2>مناديبك <small>{reps.length}</small></h2>
              {reps.length===0 ? <div className="sd-empty"><Bike size={28}/><b>لا يوجد مناديب</b><span>أضف مندوباً لإسناد الطلبات إليه وقت التوريد.</span></div> : (
                <div className="sd-list">
                  {reps.map((rep:any)=>(
                    <div key={rep.id} className="sd-item">
                      <div className="sd-thumb"><Bike size={18}/></div>
                      <div className="sd-item-main"><b>{rep.name}</b><span dir="ltr" style={{textAlign:'right'}}>{rep.phone}</span></div>
                      <div className="sd-icons"><button onClick={()=>deleteRep(rep.id)} aria-label="حذف" className="danger"><Trash2 size={15}/></button></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
    </>
  )
}
