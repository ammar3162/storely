'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import VatRegistration from '@/components/VatRegistration'
import PlanUpgrade from '@/components/PlanUpgrade'

const FEATURE_NAMES: Record<string, string> = {
  mod_inventory: 'المخزون والموردين', mod_purchases: 'المشتريات والفواتير', cashier_closing: 'إقفال الكاشير',
  hr_full: 'الحضور والرواتب', ai_tools: 'أدوات الذكاء الاصطناعي',
}
import { colors, radius, font, btnPrimary, inp } from '@/lib/ds'
import { lbl, COUNTRY_CODES } from './constants'
import type { SettingsState } from './useSettings'

export default function OrgTab({ m }: { m: SettingsState }) {
  const { saving, orgId, maxBranches, activeTab, countryCode, setCountryCode, logoUrl, logoUploading, planName, subEndsAt, planKey, billAddons, form, setForm, planLabel, handleSave, uploadLogo } = m
  // المزايا/الإضافات المفعّلة (لـ «ابنِ باقتك» هي باقته نفسها) — تطلع تحت اسم الباقة، والترقية تعرض الأعلى منها بس
  const activeSlugs: string[] = (billAddons || [])
    .filter((a: any) => FEATURE_NAMES[a.slug] && (a.subscriptions || (a.subscription ? [a.subscription] : [])).some((x: any) => x?.isValid))
    .map((a: any) => a.slug)
  return (
    <>
          {activeTab==='org'&&(
            <form onSubmit={handleSave}>
              <div style={{display:'flex',flexDirection:'column' as const,gap:18}}>

                {/* هوية المنشأة — شعار مدمج + اسم بنفس الصف */}
                <div>
                  <label style={lbl}>هوية المنشأة</label>
                  <div style={{display:'flex',alignItems:'center',gap:14,background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:radius.md,padding:'14px'}}>
                    <input type="file" accept="image/*" id="logoInput" style={{display:'none'}}
                      onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadLogo(f) }}/>
                    <label htmlFor="logoInput" style={{cursor:'pointer',flexShrink:0}}>
                      <div style={{position:'relative',width:64,height:64,borderRadius:'50%',overflow:'hidden',background:logoUrl?'transparent':'linear-gradient(135deg,#f0fdfa,#ccfbf1)',border:`2px solid ${colors.primaryBorder}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {logoUrl ? (
                          <img src={logoUrl} alt="شعار" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        ) : (
                          <FeatureIcon name="🏢" size={24} />
                        )}
                        {logoUploading && (
                          <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.85)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⏳</div>
                        )}
                        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.55)',color:'white',fontSize:9,fontWeight:700,textAlign:'center',padding:'3px 0'}}>
                          تغيير
                        </div>
                      </div>
                    </label>
                    <div style={{flex:1,minWidth:0}}>
                      <label style={{...lbl,marginBottom:4}}>اسم المؤسسة</label>
                      <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp()} placeholder="مثال: مطعم الأصيل"/>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:colors.text4,marginTop:6}}>PNG أو JPG · يُفضّل مربع الشكل</div>
                </div>
                <div>
                  <label style={lbl}>رقم واتساب التنبيهات</label>
                  <div style={{display:'flex',borderRadius:12,overflow:'hidden',border:'1.5px solid var(--storely-border)',background:'var(--storely-background)'}}>
                    <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}
                      style={{background:'transparent',color:'var(--storely-text)',border:'none',borderLeft:'1.5px solid var(--storely-border)',padding:'12px 8px',fontSize:13,fontFamily:'inherit',outline:'none',flexShrink:0,cursor:'pointer',direction:'ltr',minWidth:130}}>
                      {COUNTRY_CODES.map(c=>(
                        <option key={c.code} value={c.code}>{c.name} {'\u2066'+c.code+'\u2069'}</option>
                      ))}
                    </select>
                    <input value={form.whatsapp_number} onChange={e=>setForm({...form,whatsapp_number:e.target.value})}
                      placeholder={countryCode==='+966'?'5xxxxxxxx':countryCode==='+20'?'1xxxxxxxxx':'xxxxxxxxxx'} dir="ltr"
                      style={{background:'transparent',border:'none',padding:'12px',fontSize:14,color:'var(--storely-text)',flex:1,outline:'none',fontFamily:'inherit'}}/>
                  </div>
                  <div style={{fontSize:11,color:colors.text4,marginTop:6,display:'flex',alignItems:'center',gap:4}}><span></span> يصل إليه التقرير الصباحي وتنبيهات النظام</div>
                </div>

                {orgId&&<VatRegistration orgId={orgId}/>}

                {/* تفاصيل الاشتراك */}
                <div>
                  <label style={lbl}>الاشتراك</label>
                  <div style={{background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:radius.md,padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:subEndsAt?10:0}}>
                      <span style={{fontSize:font.sm,color:colors.text3}}>الباقة الحالية</span>
                      <span style={{fontSize:font.sm,fontWeight:800,color:colors.primary}}>{planName||planLabel}</span>
                    </div>
                    {activeSlugs.length>0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:subEndsAt?10:0,marginTop:subEndsAt?-2:10}}>
                        <span style={{fontSize:12,color:colors.text3,alignSelf:'center'}}>{planKey==='custom'?'مزاياك:':'الإضافات:'}</span>
                        {activeSlugs.map(sl=><span key={sl} style={{fontSize:12,fontWeight:600,color:colors.text,background:'white',border:`1px solid ${colors.border}`,borderRadius:6,padding:'3px 8px'}}>{FEATURE_NAMES[sl]}</span>)}
                      </div>
                    )}
                    {subEndsAt && (
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,borderTop:`1px solid ${colors.border}`}}>
                        <span style={{fontSize:font.sm,color:colors.text3}}>ينتهي في</span>
                        <span style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{new Date(subEndsAt).toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn',year:'numeric',month:'long',day:'numeric'})}</span>
                      </div>
                    )}
                  </div>

                  {orgId && planKey && <PlanUpgrade orgId={orgId} plan={planKey} maxBranches={maxBranches} activeSlugs={activeSlugs}/>}
                </div>

              </div>
              <button type="submit" disabled={saving} style={{...btnPrimary,width:'100%',padding:'13px',marginTop:20,opacity:saving?0.7:1,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'جاري الحفظ...':'حفظ البيانات'}
              </button>
            </form>
          )}
    </>
  )
}
