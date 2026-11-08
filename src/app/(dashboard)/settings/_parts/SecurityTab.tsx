'use client'
import { colors, radius, font, card, btnPrimary, inp } from '@/lib/ds'
import TrustedDevices from '@/components/TrustedDevices'
import { lbl } from './constants'
import type { SettingsState } from './useSettings'

export default function SecurityTab({ m }: { m: SettingsState }) {
  const { setShowDelete, pwForm, setPwForm, pwSaving, pwMsg, activeTab, form, changePassword } = m
  return (
    <>
          {/* SECURITY TAB */}
          {activeTab==='security'&&(
            <div>
              <div style={{...card,padding:'16px',marginBottom:20,background:colors.infoLight,border:`1.5px solid ${colors.infoBorder}`,display:'flex',alignItems:'flex-start',gap:12}}>
                <span style={{fontSize:20,flexShrink:0}}>ℹ️</span>
                <div style={{fontSize:font.sm,color:colors.info,lineHeight:1.7}}>تغيير كلمة المرور يتطلب إدخال كلمة المرور الحالية أولاً للتحقق من هويتك. تأكد من اختيار كلمة مرور قوية لا تقل عن 6 أحرف.</div>
              </div>

              {pwMsg&&(
                <div style={{background:pwMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${pwMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,fontWeight:700,color:pwMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>
                  {pwMsg.ok?'✅':'❌'} {pwMsg.text}
                </div>
              )}

              <form onSubmit={changePassword}>
                <div style={{display:'grid',gap:14,marginBottom:20}}>
                  {[
                    {label:'كلمة المرور الحالية', key:'current', placeholder:'••••••••'},
                    {label:'كلمة المرور الجديدة', key:'newPw',   placeholder:'6 أحرف على الأقل'},
                    {label:'تأكيد كلمة المرور',  key:'confirm', placeholder:'أعد الإدخال'},
                  ].map(f=>(
                    <div key={f.key}>
                      <label style={lbl}>{f.label}</label>
                      <input type="password" value={(pwForm as any)[f.key]} onChange={e=>setPwForm({...pwForm,[f.key]:e.target.value})} style={{...inp(),width:'100%'}} placeholder={f.placeholder} required/>
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={pwSaving} style={{...btnPrimary,width:'100%',padding:'14px',opacity:pwSaving?0.7:1,cursor:pwSaving?'not-allowed':'pointer',fontSize:font.base}}>
                  {pwSaving?'⏳ جاري التحقق والحفظ...':'🔐 تغيير كلمة المرور'}
                </button>
              </form>

              <TrustedDevices />

              {/* Delete account */}
              <div style={{marginTop:28,paddingTop:24,borderTop:`1px solid ${colors.dangerBorder}`}}>
                <div style={{background:colors.dangerLight,border:`1.5px solid ${colors.dangerBorder}`,borderRadius:radius.md,padding:'16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <span style={{fontSize:20}}>🗑️</span>
                    <div>
                      <div style={{fontSize:font.sm,fontWeight:800,color:colors.danger}}>حذف الحساب نهائياً</div>
                      <div style={{fontSize:font.xs,color:colors.danger,opacity:.8}}>لا يمكن التراجع عن هذا الإجراء</div>
                    </div>
                  </div>
                  <p style={{fontSize:font.xs,color:colors.danger,opacity:.85,marginBottom:14,lineHeight:1.7}}>عند الحذف، تحصل على <b>15 يوم فترة سماح</b> — بعدها تُحذف جميع البيانات نهائياً (المخزون، والمشتريات، والموظفون، والتقارير). وتسجيل الدخول خلال هذه الفترة يلغي الحذف تلقائياً.</p>
                  <button onClick={()=>setShowDelete(true)}
                    style={{width:'100%',padding:'11px',background:colors.danger,color:'white',border:'none',borderRadius:radius.md,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                    حذف حسابي
                  </button>
                </div>
              </div>
            </div>
          )}
    </>
  )
}
