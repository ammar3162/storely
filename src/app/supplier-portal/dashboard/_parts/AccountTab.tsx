'use client'
import { ImagePlus } from 'lucide-react'
import type { SupplierDashboard } from './useSupplierDashboard'

export default function AccountTab({ m }: { m: SupplierDashboard }) {
  const { profile, accountSaving, accountName, setAccountName, accountLocation, setAccountLocation, logoBusy, activeTab, saveAccountInfo, uploadLogo, removeLogo } = m
  return (
    <>
        {activeTab==='account' && (
          <section className="sd-panel" style={{maxWidth:560}}>
            <h2>بيانات المنشأة</h2>
            <div className="sd-form">
              <div className="sd-logo">
                <div className="sd-logo-box">{profile?.logo_url ? <img src={profile.logo_url} alt="شعار المنشأة"/> : <ImagePlus size={24}/>}</div>
                <div>
                  <b>شعار المنشأة</b>
                  <span>يظهر للعملاء في قائمة الموردين. PNG أو JPG، مربع، أقل من ٢ ميجا.</span>
                  <div className="sd-actions" style={{marginTop:8}}>
                    <label className="sd-btn ghost" style={{cursor:logoBusy?'wait':'pointer'}}>{logoBusy?'جاري الرفع…':profile?.logo_url?'تغيير الشعار':'ارفع الشعار'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} hidden disabled={logoBusy}/></label>
                    {profile?.logo_url && !logoBusy && <button className="sd-btn ghost" onClick={removeLogo}>حذف</button>}
                  </div>
                </div>
              </div>
              <label>اسم المنشأة<input className="sd-in" value={accountName} onChange={e=>setAccountName(e.target.value)}/></label>
              <label>المدينة<input className="sd-in" value={accountLocation} onChange={e=>setAccountLocation(e.target.value)} placeholder="مثال: الرياض"/></label>
              <label>رقم الجوال<input className="sd-in" value={profile?.phone || ''} disabled dir="ltr"/><small>لتغيير الرقم تواصل مع الدعم</small></label>
              <label>الإيميل<input className="sd-in" value={profile?.email || ''} disabled dir="ltr"/></label>
              <div className="sd-actions"><button className="sd-btn" onClick={saveAccountInfo} disabled={accountSaving || !accountName.trim()}>{accountSaving?'جاري الحفظ…':'حفظ التعديلات'}</button></div>
            </div>
          </section>
        )}
    </>
  )
}
