'use client'
import { colors, radius, shadow, font, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { toast } from '@/components/toast'
import { Package, BarChart3, User, Lock, Wallet, Smartphone, Check, Send, ShoppingCart } from 'lucide-react'
import type { StaffPage } from './useStaffManagement'

export default function AddStaffModal({ m }: { m: StaffPage }) {
  const { branches, showAdd, setShowAdd, newPermissions, setNewPermissions, newName, setNewName, newPhone, setNewPhone, staffCountry, setStaffCountry, newBranch, newRole, setNewRole, hasCashier, newSendClosingWA, setNewSendClosingWA, dayStartHour, setDayStartHour, addStaff } = m
  return (
    <>
      {/* Add staff modal */}
      {showAdd && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:26,width:'100%',maxWidth:440,animation:'modalIn .2s ease',boxShadow:shadow.lg}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>إضافة موظف جديد</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>سيتم توليد رمز PIN تلقائياً</div>
              </div>
              <button onClick={()=>setShowAdd(false)} style={{width:32,height:32,borderRadius:radius.sm,border:`1.5px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:colors.text3}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:12,marginBottom:18}}>
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>اسم الموظف *</label>
                <input value={newName} onChange={e=>setNewName(e.target.value)} style={inp()} placeholder="مثال: أحمد محمد"/>
              </div>
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>رقم الجوال *</label>
                <div style={{display:'flex',gap:8}}>
                  <select value={staffCountry} onChange={e=>setStaffCountry(e.target.value)}
                    style={{padding:'10px 8px',border:`1px solid ${colors.border}`,borderRadius:8,fontFamily:'inherit',fontSize:12,color:colors.text,background:'white',cursor:'pointer'}}>
                    {[['+966','🇸🇦'],['+971','🇦🇪'],['+965','🇰🇼'],['+973','🇧🇭'],['+974','🇶🇦'],['+968','🇴🇲'],['+20','🇪🇬'],['+962','🇯🇴'],['+1','🇺🇸'],['+44','🇬🇧'],['+91','🇮🇳'],['+92','🇵🇰']].map(([code,flag])=>(
                      <option key={code} value={code}>{flag} {code}</option>
                    ))}
                  </select>
                  <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} style={{...inp(),direction:'ltr' as const,flex:1}} placeholder={staffCountry==='+966'?'5xxxxxxxx':staffCountry==='+20'?'1xxxxxxxxx':'xxxxxxxxxx'}/>
                </div>
              </div>
              {branches.length>1 && (
                <div>
                  <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>الفرع</label>
                  {/* الموظف ينضاف للفرع اللي شغّال فيه المالك حالياً — لتغييره بدّل الفرع من القائمة الجانبية */}
                  <div style={{...inp(),background:colors.bg,color:colors.text2,fontWeight:700}}>
                    {branches.find((b:any)=>b.id===newBranch)?.name||'—'}
                  </div>
                </div>
              )}
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>نوع الموظف</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button type="button" onClick={()=>setNewRole('staff')} style={{padding:'12px 10px',borderRadius:10,border:`1.5px solid ${newRole==='staff'?colors.primary:colors.border}`,background:newRole==='staff'?colors.primaryLight:'white',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const,transition:'all .15s',boxShadow:newRole==='staff'?`0 2px 8px ${colors.primary}22`:'none'}}>
                    <div style={{fontWeight:800,fontSize:font.sm,color:newRole==='staff'?colors.primary:colors.text2,marginBottom:3,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><User size={14} strokeWidth={2.25}/> موظف عادي</div>
                    <div style={{fontSize:10,color:newRole==='staff'?colors.primary:colors.text4,opacity:.8,lineHeight:1.4}}>يستخدم نظام الصرف والمخزون</div>
                  </button>
                  <button type="button" onClick={()=>{
                      if(!hasCashier){toast('الكاشير يحتاج الباقة الشاملة أو إضافة «إقفال الكاشير» من صفحة الإضافات','warning');return}
                      setNewRole('cashier')
                    }} style={{padding:'12px 10px',borderRadius:10,border:`1.5px solid ${newRole==='cashier'?colors.primary:colors.border}`,background:newRole==='cashier'?colors.primaryLight:'white',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const,transition:'all .15s',boxShadow:newRole==='cashier'?`0 2px 8px ${colors.primary}22`:'none',opacity:!hasCashier?.55:1,position:'relative' as const}}>
                    {!hasCashier && (
                      <div style={{position:'absolute',top:-8,left:-6,background:'#1c1c1a',color:'white',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99,display:'flex',alignItems:'center',gap:4}}><Lock size={9} strokeWidth={2.5}/> الشاملة</div>
                    )}
                    <div style={{fontWeight:800,fontSize:font.sm,color:newRole==='cashier'?colors.primary:colors.text2,marginBottom:3,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><Wallet size={14} strokeWidth={2.25}/> كاشير</div>
                    <div style={{fontSize:10,color:newRole==='cashier'?colors.primary:colors.text4,opacity:.8,lineHeight:1.4}}>يقفل الصندوق يومياً فقط</div>
                  </button>
                </div>
              </div>
              {newRole==='cashier' && (
                <div style={{background:colors.bg,borderRadius:radius.md,padding:'12px 14px'}}>
                  <div style={{fontSize:font.xs,fontWeight:700,color:colors.text3,marginBottom:4}}>اليوم الجديد يبدأ الساعة</div>
                  <div style={{fontSize:10,color:colors.text4,marginBottom:10,lineHeight:1.5}}>أي إقفال قبل هالساعة ينحسب على اليوم اللي قبل — مفيد لو المحل يقفل بعد 12 الليل</div>
                  <div>
                    <select value={dayStartHour} onChange={e=>setDayStartHour(Number(e.target.value))} style={inp()}>
                      {Array.from({length:11},(_,h)=>(
                        <option key={h} value={h}>{h===0 ? '12:00 منتصف الليل (بدون ترحيل)' : `${h}:00 ${h<6?'الفجر':'الصبح'}`}</option>
                      ))}
                    </select>
                    <div style={{fontSize:10.5,color:colors.text3,marginTop:8,lineHeight:1.6,background:'white',borderRadius:8,padding:'8px 10px',border:`1px solid ${colors.border}`}}>
                      {dayStartHour===0 ? 'كل تقفيل يتسجّل بتاريخ يومه بالضبط.' : <>مثال: لو الكاشير قفّل الأحد الساعة {dayStartHour===1?'12':dayStartHour-1}:30 {dayStartHour<=6?'الفجر':'الصبح'}، يتسجّل الإقفال على <b>السبت</b>.</>}
                    </div>
                  </div>
                  <label style={{display:'flex',alignItems:'center',gap:8,marginTop:12,padding:'10px 12px',background:'white',borderRadius:8,border:`1.5px solid ${newSendClosingWA?colors.primary:colors.border}`,cursor:'pointer'}}>
                    <input type="checkbox" checked={newSendClosingWA} onChange={e=>setNewSendClosingWA(e.target.checked)}
                      style={{accentColor:colors.primary,width:14,height:14}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:newSendClosingWA?colors.primary:colors.text2,display:'flex',alignItems:'center',gap:5}}><Smartphone size={13} strokeWidth={2.25}/> إرسال تفاصيل الإقفال للمالك عبر واتساب</div>
                      <div style={{fontSize:10,color:colors.text4,marginTop:2,lineHeight:1.4}}>{newSendClosingWA?'تفعّل: يوصل المالك تقرير الإقفال الكامل':'موقّف: يوصل المالك بس إشعار "الكاشير أقفل"، بدون تفاصيل'}</div>
                    </div>
                  </label>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={addStaff} style={{...btnPrimary,flex:2,padding:'12px',fontSize:font.sm,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Check size={15} strokeWidth={2.5}/> إضافة وتوليد PIN</button>
            </div>
            {newRole==='staff' && (
              <div style={{background:colors.bg,borderRadius:radius.md,padding:'14px 16px',marginTop:12}}>
                <div style={{fontSize:font.xs,fontWeight:700,color:colors.text3,marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>صلاحيات الموظف</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {key:'dispense',   label:'الصرف',      Icon:Send, locked:false},
                    {key:'inventory',  label:'المخزون',    Icon:Package, locked:false},
                    {key:'purchases',  label:'المشتريات',  Icon:ShoppingCart, locked:false},
                    {key:'reports',    label:'التقارير',   Icon:BarChart3, locked:false},
                    {key:'cashier',    label:'إقفال الكاشير', Icon:Wallet, locked:!hasCashier},
                  ].map(p=>(
                    <label key={p.key} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'white',borderRadius:8,border:`1.5px solid ${(newPermissions as any)[p.key]?colors.primary:colors.border}`,cursor:p.locked?'not-allowed':'pointer',transition:'all .15s'}}>
                      <input type="checkbox" checked={(newPermissions as any)[p.key]} disabled={p.locked}
                        onChange={e=>!p.locked&&setNewPermissions(prev=>({...prev,[p.key]:e.target.checked}))}
                        style={{accentColor:colors.primary,width:14,height:14}}/>
                      <span style={{fontSize:12,fontWeight:600,color:(newPermissions as any)[p.key]?colors.primary:colors.text2,display:'flex',alignItems:'center',gap:5}}><p.Icon size={13} strokeWidth={2.25}/> {p.label}</span>
                      {p.locked&&<span style={{fontSize:9,color:colors.text4}}>(افتراضي)</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
