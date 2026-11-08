'use client'
import { ClipboardList, MessageCircle, Bell } from 'lucide-react'
import type { SupplierDashboard } from './useSupplierDashboard'
import type { DashboardView } from './deriveView'

export default function ActivityTab({ m, v }: { m: SupplierDashboard; v: DashboardView }) {
  const { activeTab } = m
  const { activityFeed } = v
  return (
    <>
        {activeTab==='activity' && (
          <section className="sd-panel">
            <h2>آخر الأحداث</h2>
            {activityFeed.length===0 ? <div className="sd-empty"><Bell size={28}/><b>لا توجد أحداث</b><span>تظهر هنا الطلبات والرسائل الجديدة.</span></div> : (
              <ol className="sd-feed">
                {activityFeed.map((ev:any,i:number)=>(
                  <li key={i}>{ev.type==='order'?<ClipboardList size={16}/>:<MessageCircle size={16}/>}<div><span>{ev.text}</span><time>{new Date(ev.at).toLocaleString('ar-SA',{numberingSystem:'latn'})}</time></div></li>
                ))}
              </ol>
            )}
          </section>
        )}
    </>
  )
}
