'use client'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { colors, radius, font, btnPrimary, inp } from '@/lib/ds'
import { lbl, DAYS } from './constants'
import type { SettingsState } from './useSettings'

export default function NotifyTab({ m }: { m: SettingsState }) {
  const { saving, sending, sendMsg, lastSent, activeTab, form, setForm, handleSave, sendNow, toggleDay, scheduleLabel } = m
  return (
    <>
          {/* NOTIFY TAB */}
          {activeTab==='notify'&&(
            <form onSubmit={handleSave}>
              <div style={{marginBottom:24,paddingBottom:24,borderBottom:`1px solid ${colors.border}`}}>
                <label style={lbl}>رسائل واتساب — اختر ما يصلك</label>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:colors.bg,borderRadius:radius.md,border:`1.5px solid ${form.notify_cashier_closing_wa?colors.primaryBorder:colors.border}`,cursor:'pointer'}}>
                    <input type="checkbox" checked={form.notify_cashier_closing_wa} onChange={e=>setForm({...form,notify_cashier_closing_wa:e.target.checked})}
                      style={{accentColor:colors.primary,width:16,height:16}}/>
                    <div>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><FeatureIcon name="🏪" size={15} /></span> تقارير إقفال الكاشير</div>
                      <div style={{fontSize:11,color:colors.text4,marginTop:2}}>رسالة فورية كل ما موظف يقفل الصندوق</div>
                    </div>
                  </label>
                </div>

              </div>

              <div style={{marginBottom:20}}>
                <label style={lbl}>التقرير الصباحي — موعد الإرسال</label>
                <div style={{fontSize:11,color:colors.text4,marginBottom:8,lineHeight:1.7}}>يصلك عبر واتساب: قرارات اليوم، ومبيعات أمس، والموظفون، والمخزون الناقص، ومشتريات أمس (حسب المزايا المفعّلة). ويصل إلى مدير كل فرع تقرير فرعه إذا أضفت رقمه في صفحة مديري الفروع.</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[{key:'daily',label:'يومي',icon:'📅'},{key:'weekly',label:'أسبوعي',icon:'📆'},{key:'manual',label:'يدوي',icon:'👆'}].map(s=>(
                    <button key={s.key} type="button" className={`sched-btn${form.notify_schedule===s.key?' active':''}`}
                      onClick={()=>setForm({...form,notify_schedule:s.key})}>
                      <FeatureIcon name={s.icon} size={20} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.notify_schedule==='weekly'&&(
                <div style={{marginBottom:18}}>
                  <label style={lbl}>أيام الإرسال</label>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                    {DAYS.map(d=>(
                      <button key={d.key} type="button" className={`day-btn${form.notify_days.includes(d.key)?' active':''}`}
                        onClick={()=>toggleDay(d.key)}>{d.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {form.notify_schedule!=='manual'&&(
                <div style={{marginBottom:18}}>
                  <label style={lbl}>وقت الإرسال</label>
                  <select value={form.notify_time.slice(0,2)} onChange={e=>setForm({...form,notify_time:`${e.target.value}:00`})} style={{...inp(),width:'auto',direction:'ltr' as const}}>
                    {Array.from({length:24},(_,h)=>{
                      const hh = String(h).padStart(2,'0')
                      const period = h<12?'ص':'م'
                      const h12 = h%12===0?12:h%12
                      return <option key={hh} value={hh}>{h12}:00 {period}</option>
                    })}
                  </select>
                  <div style={{fontSize:11,color:colors.text4,marginTop:6}}>توقيت الرياض (UTC+3) — الإرسال بالساعة كاملة فقط (بدون دقائق)</div>
                </div>
              )}

              <div style={{
                background:form.notify_schedule==='manual'?colors.warningLight:colors.primaryLight,
                border:`1.5px solid ${form.notify_schedule==='manual'?colors.warningBorder:colors.primaryBorder}`,
                borderRadius:radius.md,padding:'12px 14px',marginBottom:20,
                fontSize:font.sm,color:form.notify_schedule==='manual'?colors.warning:colors.primary,
                fontWeight:600,display:'flex',alignItems:'center',gap:8
              }}>
                <span style={{fontSize:18}}>{form.notify_schedule==='manual'?'':''}</span>
                {form.notify_schedule==='manual'?'الإرسال يدوياً فقط عند الضغط على الزر':scheduleLabel()}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
                <button type="submit" disabled={saving} style={{...btnPrimary,padding:'13px',opacity:saving?0.7:1,cursor:saving?'not-allowed':'pointer'}}>
                  {saving?'حفظ...':'حفظ الجدولة'}
                </button>
                <button type="button" onClick={sendNow} disabled={sending}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px',background:sending?colors.text4:'#25d366',color:'white',border:'none',borderRadius:radius.md,fontSize:font.sm,fontWeight:700,cursor:sending?'not-allowed':'pointer',fontFamily:font.family,transition:'all .15s',boxShadow:sending?'none':'0 4px 14px rgba(37,211,102,.3)'}}>
                  {sending?'إرسال...':'إرسال الآن'}
                </button>
              </div>

              {sendMsg&&(
                <div style={{background:sendMsg.ok?colors.primaryLight:colors.dangerLight,border:`1.5px solid ${sendMsg.ok?colors.primaryBorder:colors.dangerBorder}`,borderRadius:radius.md,padding:'10px 14px',fontSize:font.sm,fontWeight:600,color:sendMsg.ok?colors.primary:colors.danger,display:'flex',alignItems:'center',gap:8}}>
                  {sendMsg.ok?'':''} {sendMsg.text}
                </div>
              )}
              {lastSent&&(
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:10,display:'flex',alignItems:'center',gap:4}}>
                  <span></span> آخر إرسال: <span style={{fontWeight:600,color:colors.text2}}>{new Date(lastSent).toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn',weekday:'long',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              )}
            </form>
          )}
    </>
  )
}
