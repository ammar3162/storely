'use client'
import { colors, radius, font, card } from '@/lib/ds'
import { toast } from '@/components/toast'
import { WHATSAPP_PAUSED } from '@/lib/whatsappPause'
import { Package, BarChart3, ShieldCheck, Clock, Bell, BellOff, RefreshCw, Copy, Lock, Pencil } from 'lucide-react'
import { toLocalPhone, Avatar } from './helpers'
import type { StaffPage } from './useStaffManagement'

export default function StaffCard({ m, s, i }: { m: StaffPage; s: any; i: number }) {
  const { branches, isOwnerSM, setMoveFor, setMoveTo, setEditingPerms, setEditingRole, setEditPerms, hasCashier, visiblePins, revealedPins, expandedId, setExpandedId, editingStaffPhoneId, setEditingStaffPhoneId, editStaffPhoneVal, setEditStaffPhoneVal, savingStaffPhone, setEditingNameId, setEditNameValue, setShowHoursModal, saveStaffPhone, openReport, openAssign, toggleActive, deleteStaff, toggleSendClosingWA, togglePin, regeneratePin } = m
  return (
            <div key={s.id} className="staff-card su" style={{...card,padding:'16px 18px',animationDelay:`${i*0.05}s`}}>
              <div onClick={()=>setExpandedId(expandedId===s.id?null:s.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',flexWrap:'wrap' as const,gap:10}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <Avatar name={s.name} active={s.is_active}/>
                  <div>
                    <div style={{fontSize:font.base,fontWeight:700,color:colors.text,display:'flex',alignItems:'center',gap:8}}>
                      {s.name}
                      <button onClick={e=>{e.stopPropagation();setEditingNameId(s.id);setEditNameValue(s.name)}} style={{background:'transparent',border:'none',cursor:'pointer',padding:2,display:'flex',alignItems:'center',color:colors.text4,opacity:.7}} title="تعديل الاسم">
                        <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {!s.is_active&&<span style={{fontSize:10,color:colors.danger,background:colors.dangerLight,padding:'2px 8px',borderRadius:20,fontWeight:700,border:`1px solid ${colors.dangerBorder}`}}>موقوف</span>}
                    </div>
                    <div style={{fontSize:font.xs,color:colors.text4,marginTop:2,direction:'ltr',textAlign:'right' as const}}>
                      {toLocalPhone(s.phone)}{s.branches?.name?` · ${s.branches.name}`:''}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap' as const}}>
                  <button onClick={e=>{e.stopPropagation();openReport(s)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`,display:'flex',alignItems:'center',gap:5}}>
                    <BarChart3 size={13} strokeWidth={2.25}/> تقرير
                  </button>
                  <button onClick={e=>{e.stopPropagation();setEditingPerms(s.id);setEditPerms({dispense:true,inventory:false,purchases:false,reports:false,cashier:false,...(s.permissions||{}),...(s.role==='cashier'?{cashier:true}:{})});setEditingRole(s.role)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`,display:'flex',alignItems:'center',gap:5}}>
                    <ShieldCheck size={13} strokeWidth={2.25}/> صلاحيات
                  </button>
                  {s.permissions?.dispense && m.permOk('dispense') && (
                    <button onClick={e=>{e.stopPropagation();openAssign(s)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`,display:'flex',alignItems:'center',gap:5}}>
                      <Package size={13} strokeWidth={2.25}/> {s.assigned_products?.length>0?`${s.assigned_products.length} منتج`:'كل المنتجات'}
                    </button>
                  )}
                  {s.role==='cashier' && !hasCashier && (
                    <span title="الباقة الحالية ما فيها إقفال الكاشير — يرجع يشتغل بالترقية للمتوسطة أو بإضافة «إقفال الكاشير»" className="act-btn" style={{background:'#fffbeb',color:'#b45309',border:'1.5px solid #fde68a',display:'flex',alignItems:'center',gap:5,cursor:'default'}}>
                      <Lock size={13} strokeWidth={2.25}/> الكاشير مقفل بالباقة الحالية
                    </span>
                  )}
                  {s.role==='cashier' && hasCashier && (
                    <button onClick={e=>{e.stopPropagation();setShowHoursModal(true)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`,display:'flex',alignItems:'center',gap:5}}>
                      <Clock size={13} strokeWidth={2.25}/> بداية يوم العمل
                    </button>
                  )}
                  {s.role==='cashier' && hasCashier && !WHATSAPP_PAUSED && (
                    <button onClick={e=>{e.stopPropagation();toggleSendClosingWA(s.id, s.send_closing_whatsapp!==false)}} className="act-btn"
                      style={{background:s.send_closing_whatsapp!==false?'#f0fdfa':colors.bg,color:s.send_closing_whatsapp!==false?colors.primary:colors.text3,border:s.send_closing_whatsapp!==false?'none':`1.5px solid ${colors.border2}`,display:'flex',alignItems:'center',gap:5}}>
                      {s.send_closing_whatsapp!==false ? (<><Bell size={13} strokeWidth={2.25}/> تفاصيل الإقفال: مفعّل</>) : (<><BellOff size={13} strokeWidth={2.25}/> تفاصيل الإقفال: موقّف</>)}
                    </button>
                  )}
                  <button onClick={e=>{e.stopPropagation();regeneratePin(s.id,s.name,s.phone)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`,display:'flex',alignItems:'center',gap:5}}><RefreshCw size={13} strokeWidth={2.25}/> PIN جديد</button>
                  {isOwnerSM && branches.length > 1 && (
                    <button onClick={e=>{e.stopPropagation();setMoveFor(s);setMoveTo('')}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`}}>نقل لفرع</button>
                  )}
                  <button onClick={e=>{e.stopPropagation();toggleActive(s)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`}}>{s.is_active?'إيقاف':'تفعيل'}</button>
                  <button onClick={e=>{e.stopPropagation();deleteStaff(s.id)}} className="act-btn" style={{background:colors.dangerLight,color:colors.danger}}>حذف</button>
                  <svg width={14} height={14} fill="none" stroke={colors.text3} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{transition:'transform .2s',transform:expandedId===s.id?'rotate(180deg)':'none',marginRight:4}}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {expandedId===s.id&&(
                <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${colors.border}`,animation:'slideUp .2s ease'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                    <div style={{background:colors.bg,borderRadius:radius.md,padding:'12px 14px',border:`1px solid ${colors.border}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:colors.text4,marginBottom:6,textTransform:'uppercase' as const}}>رقم الجوال</div>
                      {editingStaffPhoneId===s.id ? (
                        <div onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:6}}>
                          <input value={editStaffPhoneVal} onChange={e=>setEditStaffPhoneVal(e.target.value)} dir="ltr" autoFocus
                            style={{fontSize:13,padding:'5px 8px',border:`1.5px solid ${colors.primary}`,borderRadius:6,width:120,fontFamily:'inherit'}}/>
                          <button onClick={()=>saveStaffPhone(s.id)} disabled={savingStaffPhone} style={{fontSize:11,fontWeight:700,color:'white',background:colors.primary,border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontFamily:'inherit'}}>{savingStaffPhone?'...':'حفظ'}</button>
                          <button onClick={()=>setEditingStaffPhoneId(null)} style={{fontSize:11,fontWeight:700,color:colors.text3,background:colors.bg,border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                        </div>
                      ) : (
                        <div onClick={e=>{e.stopPropagation();setEditingStaffPhoneId(s.id);setEditStaffPhoneVal(s.phone||'')}} style={{fontSize:font.base,fontWeight:800,color:colors.text,direction:'ltr',textAlign:'right' as const,cursor:'pointer',display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                          <Pencil size={11} strokeWidth={2.25} style={{opacity:.5}}/>{toLocalPhone(s.phone)}
                        </div>
                      )}
                    </div>
                    <div style={{background:colors.primaryLight,borderRadius:radius.md,padding:'12px 14px',border:`1px solid ${colors.primaryBorder}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:colors.primary,marginBottom:6,textTransform:'uppercase' as const}}>رمز PIN الحالي</div>
                      {String(s.pin||'').startsWith('$2') && !s.has_pin_enc ? (
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:colors.danger||'#dc2626',marginBottom:6}}>PIN قديم — لا يمكن استرجاعه</div>
                          <button onClick={e=>{e.stopPropagation();regeneratePin(s.id,s.name,s.phone)}} style={{fontSize:11,fontWeight:700,color:'white',background:colors.primary,border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
                            <RefreshCw size={12} strokeWidth={2.25}/> إعادة توليد PIN جديد
                          </button>
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{fontSize:28,fontWeight:900,color:colors.primary,letterSpacing:8,minWidth:90}}>
                            {visiblePins[s.id] ? (revealedPins[s.id] || s.pin) : '••••'}
                          </div>
                          <button onClick={e=>{e.stopPropagation();togglePin(s)}} style={{background:'transparent',border:'none',cursor:'pointer',padding:4,lineHeight:1,display:'flex',alignItems:'center'}} title={visiblePins[s.id]?'إخفاء':'إظهار'}>
                            {visiblePins[s.id] ? (
                              <svg width={20} height={20} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </svg>
                            ) : (
                              <svg width={20} height={20} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                          <button onClick={e=>{e.stopPropagation();regeneratePin(s.id,s.name,s.phone)}} style={{fontSize:11,fontWeight:700,color:colors.primary,background:'transparent',border:`1px solid ${colors.primaryBorder}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit'}}>
                            إعادة توليد
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:colors.text4,marginBottom:6,textTransform:'uppercase' as const}}>رابط دخول الموظف</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{fontSize:font.xs,color:colors.text,background:colors.bg,padding:'9px 12px',borderRadius:8,border:`1px solid ${colors.border}`,flex:1,direction:'ltr',textAlign:'left' as const,overflowX:'auto',whiteSpace:'nowrap' as const}}>https://storely.dev/staff</div>
                      <button onClick={()=>{navigator.clipboard.writeText('https://storely.dev/staff');toast('تم نسخ الرابط ✓')}} style={{background:colors.primary,color:'white',border:'none',borderRadius:8,padding:'9px 14px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:5}}>
                        <Copy size={13} strokeWidth={2.25}/> نسخ الكل
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
  )
}
