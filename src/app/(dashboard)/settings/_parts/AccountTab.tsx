'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { colors, radius, font, card, btnPrimary, inp } from '@/lib/ds'
import { lbl } from './constants'
import type { SettingsState } from './useSettings'

export default function AccountTab({ m }: { m: SettingsState }) {
  const { activeTab, userEmail, userPhone, setUserPhone, userFullName, setUserFullName, savingPersonal, personalSaveOk, subEndsAt, planLabel, bill, savePersonalInfo } = m
  return (
    <>
          {/* ORG TAB */}
          {activeTab==='account'&&(
            <div className="su">
              <div style={{...card,padding:'20px',marginBottom:14}}>
                <div style={{fontSize:font.sm,fontWeight:800,color:colors.text,marginBottom:16}}>معلوماتك الشخصية</div>
                <div style={{display:'grid',gap:14}}>
                  <div>
                    <label style={lbl}>الاسم الكامل</label>
                    <input value={userFullName} onChange={e=>setUserFullName(e.target.value)} style={inp()} placeholder="اسمك الكامل"/>
                  </div>
                  <div>
                    <label style={lbl}>البريد الإلكتروني</label>
                    <div style={{...inp(),display:'flex',alignItems:'center',background:colors.bg,color:colors.text2,direction:'ltr' as const,justifyContent:'flex-end'}}>{userEmail||'—'}</div>
                  </div>
                  <div>
                    <label style={lbl}>رقم الجوال</label>
                    <input value={userPhone} onChange={e=>setUserPhone(e.target.value)} style={{...inp(),direction:'ltr' as const,textAlign:'right' as const}} placeholder="05xxxxxxxx"/>
                  </div>
                  <button onClick={savePersonalInfo} disabled={savingPersonal} style={{...btnPrimary,opacity:savingPersonal?.6:1}}>
                    {savingPersonal?'جاري الحفظ...':personalSaveOk?'تم الحفظ':'حفظ البيانات الشخصية'}
                  </button>
                </div>
              </div>

              <div style={{...card,padding:'20px'}}>
                <div style={{fontSize:font.sm,fontWeight:800,color:colors.text,marginBottom:16}}>باقتك الحالية</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,borderRadius:radius.md,marginBottom:subEndsAt?12:0}}>
                  <span style={{fontSize:font.sm,fontWeight:800,color:colors.primary}}>{planLabel}</span>
                  <FeatureIcon name="💎" size={16} />
                </div>
                {bill.lines.length>1&&(
                  <div className="hide-in-app" style={{border:`1px solid ${colors.border}`,borderRadius:radius.md,padding:'12px 14px',marginBottom:12}}>
                    <div style={{fontSize:font.xs,fontWeight:800,color:colors.text2,marginBottom:8}}>تفاصيل الفاتورة</div>
                    {bill.lines.map((l,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:font.xs,color:colors.text3,padding:'4px 0'}}>
                        <span>{l.label}</span><span style={{fontWeight:700,color:colors.text,whiteSpace:'nowrap'}}>{l.amount} ⃁</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',borderTop:`1px solid ${colors.border}`,marginTop:6,paddingTop:8,fontSize:font.sm,fontWeight:800,color:colors.primary}}>
                      <span>الإجمالي</span><span>{bill.total} ⃁</span>
                    </div>
                  </div>
                )}
                {subEndsAt&&(
                  <div style={{fontSize:font.xs,color:colors.text3}}>ينتهي الاشتراك بتاريخ: <b style={{color:colors.text}}>{new Date(subEndsAt).toLocaleDateString('ar-SA', {numberingSystem:'latn',year:'numeric',month:'long',day:'numeric'})}</b></div>
                )}
              </div>
            </div>
          )}
    </>
  )
}
