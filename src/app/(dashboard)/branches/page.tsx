'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, font, card, btnPrimary, inp, pageTitle, pageSub } from '@/lib/ds'

export default function BranchesPage() {
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [maxBranches, setMaxBranches] = useState(1)
  const [branches, setBranches] = useState<any[]>([])
  const [inactiveBranches, setInactiveBranches] = useState<any[]>([])
  const [newBranch, setNewBranch] = useState({name:'',location:''})
  const [branchSaving, setBranchSaving] = useState(false)
  const [editingPhoneId, setEditingPhoneId] = useState<string|null>(null)
  const [editPhoneValue, setEditPhoneValue] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneOtpStep, setPhoneOtpStep] = useState<'phone'|'otp'>('phone')
  const [phoneOtpValue, setPhoneOtpValue] = useState('')
  const [phoneOtpError, setPhoneOtpError] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [reactivatingId, setReactivatingId] = useState<string|null>(null)
  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState<any|null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingBranch, setDeletingBranch] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function deleteBranchPermanently() {
    if (!confirmDeleteBranch) return
    setDeleteError('')
    setDeletingBranch(true)
    const{data:{user}}=await sb.auth.getUser()
    if(!user){setDeletingBranch(false);return}
    const res = await fetch('/api/delete-branch', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ branch_id: confirmDeleteBranch.id, org_id: orgId, user_id: user.id })
    })
    const data = await res.json()
    setDeletingBranch(false)
    if (!res.ok || !data.success) {
      setDeleteError(data.error || 'حدث خطأ أثناء الحذف')
      return
    }
    setBranches(prev=>prev.filter((b:any)=>b.id!==confirmDeleteBranch.id))
    setInactiveBranches(prev=>prev.filter((b:any)=>b.id!==confirmDeleteBranch.id))
    setConfirmDeleteBranch(null); setDeleteConfirmText('')
  }

  useEffect(()=>{ init() },[])

  async function init() {
    const{data:{user}}=await sb.auth.getUser()
    if(!user){setLoading(false);return}
    const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single()
    if(!profile?.org_id){setLoading(false);return}
    setOrgId(profile.org_id)
    const{data:org}=await (sb.from('organizations' as any) as any).select('max_branches').eq('id',profile.org_id).single()
    setMaxBranches((org as any)?.max_branches||1)
    const{data:bList}=await sb.from('branches').select('*').eq('org_id',profile.org_id).eq('is_active',true).order('created_at')
    setBranches(bList||[])
    const{data:iList}=await sb.from('branches').select('*').eq('org_id',profile.org_id).eq('is_active',false).order('created_at')
    setInactiveBranches(iList||[])
    setLoading(false)
  }

  async function addBranch() {
    if(!newBranch.name.trim()) return
    setBranchSaving(true)
    await sb.from('branches').insert({ org_id:orgId, name:newBranch.name.trim(), location:newBranch.location.trim()||null })
    const{data:bList}=await sb.from('branches').select('*').eq('org_id',orgId).eq('is_active',true).order('created_at')
    setBranches(bList||[]); setNewBranch({name:'',location:''}); setBranchSaving(false)
  }

  async function deleteBranch(id:string) {
    if(branches.length<=1){alert('لا يمكن حذف الفرع الوحيد');return}
    if(!confirm('إيقاف هذا الفرع؟ بياناته تبقى محفوظة ويمكن تفعيله لاحقاً.')) return
    await sb.from('branches').update({is_active:false} as any).eq('id',id)
    const stopped = branches.find((b:any)=>b.id===id)
    setBranches(prev=>prev.filter((b:any)=>b.id!==id))
    if (stopped) setInactiveBranches(prev=>[...prev, stopped])
  }

  async function reactivateBranch(id:string) {
    setReactivatingId(id)
    await sb.from('branches').update({is_active:true} as any).eq('id',id)
    const b = inactiveBranches.find((x:any)=>x.id===id)
    setInactiveBranches(prev=>prev.filter((x:any)=>x.id!==id))
    if (b) setBranches(prev=>[...prev, b])
    setReactivatingId(null)
  }

  function resetPhoneEdit() {
    setEditingPhoneId(null); setEditPhoneValue(''); setPhoneOtpStep('phone'); setPhoneOtpValue(''); setPhoneOtpError('')
  }

  async function sendBranchPhoneOtp() {
    const cleanPhone = editPhoneValue.trim().replace(/^0+/, '')
    if (!cleanPhone) {
      // السماح بمسح الرقم المخصص بدون تحقق (رجوع لرقم المؤسسة الرئيسي)
      await saveBranchPhone(editingPhoneId!, null)
      return
    }
    setPhoneOtpError(''); setSendingOtp(true)
    const res = await fetch('/api/send-otp', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ phone: cleanPhone, countryCode: '+966' })
    })
    const data = await res.json()
    setSendingOtp(false)
    if (!res.ok || data.error) { setPhoneOtpError(data.error || 'تعذر إرسال رمز التحقق'); return }
    setPhoneOtpStep('otp')
  }

  async function verifyBranchPhoneOtp(id:string) {
    const cleanPhone = editPhoneValue.trim().replace(/^0+/, '')
    setPhoneOtpError(''); setSavingPhone(true)
    const res = await fetch('/api/verify-otp', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ phone: cleanPhone, countryCode: '+966', otp: phoneOtpValue.trim() })
    })
    const data = await res.json()
    if (!res.ok || data.error) { setPhoneOtpError(data.error || 'رمز التحقق غير صحيح'); setSavingPhone(false); return }
    await saveBranchPhone(id, cleanPhone)
  }

  async function saveBranchPhone(id:string, verifiedNumber:string|null) {
    setSavingPhone(true)
    await (sb.from('branches' as any) as any).update({ whatsapp_number: verifiedNumber }).eq('id', id)
    setBranches((prev:any[]) => prev.map(b => b.id===id ? {...b, whatsapp_number: verifiedNumber} : b))
    resetPhoneEdit(); setSavingPhone(false)
  }

  function selectBranch(b:any){
    sessionStorage.setItem('s_branch_id',b.id)
    sessionStorage.setItem('s_branch_name',b.name)
    window.location.href='/dashboard'
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:colors.text3,fontFamily:font.family}}>جاري التحميل...</div>

  return (
    <div style={{padding:'24px',maxWidth:900,margin:'0 auto',fontFamily:font.family,direction:'rtl'}}>
      <h1 style={pageTitle}>إدارة الفروع</h1>
      <p style={pageSub}>كل فرع له مخزونه المستقل. الباقة الحالية تسمح بـ <b style={{color:colors.primary}}>{maxBranches} فرع</b>.</p>

      {branches.length>0&&(
        <div style={{...card,overflow:'hidden',marginBottom:16,marginTop:20}}>
          {branches.map((b:any,i:number)=>(
            <div key={b.id} style={{padding:'14px 16px',borderBottom:i<branches.length-1?`1px solid ${colors.border}`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>selectBranch(b)}
                  style={{width:36,height:36,borderRadius:10,background:i===0?colors.primaryLight:colors.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${i===0?colors.primaryBorder:colors.border}`,cursor:'pointer'}}>
                  {i===0?'🏠':'🏪'}
                </button>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>selectBranch(b)}>
                  <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{b.name}</div>
                  {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>📍 {b.location}</div>}
                </div>
                <button onClick={()=>selectBranch(b)} style={{background:colors.primaryLight,color:colors.primary,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                  دخول ←
                </button>
                {i===0
                  ? <span style={{fontSize:font.xs,color:colors.primary,padding:'4px 10px',background:colors.primaryLight,borderRadius:20,border:`1px solid ${colors.primaryBorder}`,fontWeight:700}}>رئيسي</span>
                  : (
                    <>
                      <button onClick={()=>deleteBranch(b.id)} style={{background:colors.dangerLight,color:colors.danger,border:`1px solid ${colors.dangerBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>إيقاف</button>
                      <button onClick={()=>{setConfirmDeleteBranch(b);setDeleteConfirmText('');setDeleteError('')}} style={{background:'none',color:colors.text4,border:`1px solid ${colors.border}`,borderRadius:radius.sm,padding:'6px 10px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>حذف نهائي</button>
                    </>
                  )}
              </div>
              <div style={{marginTop:10,marginRight:48}}>
                {editingPhoneId===b.id ? (
                  phoneOtpStep==='phone' ? (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <input value={editPhoneValue} onChange={e=>setEditPhoneValue(e.target.value)} placeholder="5xxxxxxxx" dir="ltr"
                          style={{...inp(),padding:'6px 10px',fontSize:font.xs,flex:1}}/>
                        <button onClick={sendBranchPhoneOtp} disabled={sendingOtp}
                          style={{background:colors.primary,color:'white',border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                          {sendingOtp?'...':editPhoneValue.trim()?'إرسال رمز التحقق':'حفظ'}
                        </button>
                        <button onClick={resetPhoneEdit}
                          style={{background:colors.bg,color:colors.text3,border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                          إلغاء
                        </button>
                      </div>
                      {phoneOtpError && <div style={{fontSize:10,color:colors.danger}}>{phoneOtpError}</div>}
                    </div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{fontSize:10,color:colors.text3}}>أرسلنا رمز تحقق عبر واتساب للرقم {editPhoneValue} — أدخله للتأكيد</div>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <input value={phoneOtpValue} onChange={e=>setPhoneOtpValue(e.target.value)} placeholder="رمز التحقق" dir="ltr" maxLength={6}
                          style={{...inp(),padding:'6px 10px',fontSize:font.xs,flex:1}}/>
                        <button onClick={()=>verifyBranchPhoneOtp(b.id)} disabled={savingPhone}
                          style={{background:colors.primary,color:'white',border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                          {savingPhone?'...':'تأكيد'}
                        </button>
                        <button onClick={resetPhoneEdit}
                          style={{background:colors.bg,color:colors.text3,border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                          إلغاء
                        </button>
                      </div>
                      {phoneOtpError && <div style={{fontSize:10,color:colors.danger}}>{phoneOtpError}</div>}
                    </div>
                  )
                ) : (
                  <button onClick={()=>{setEditingPhoneId(b.id);setEditPhoneValue(b.whatsapp_number||'')}}
                    style={{background:'none',border:'none',color:colors.text4,fontSize:11,cursor:'pointer',fontFamily:font.family,padding:0,display:'flex',alignItems:'center',gap:4}}>
                    📱 {b.whatsapp_number ? `رقم مخصص: ${b.whatsapp_number}` : 'استخدام رقم مخصص لهذا الفرع (اختياري)'}
                    <span style={{textDecoration:'underline'}}>تعديل</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveBranches.length>0&&(
        <div style={{...card,overflow:'hidden',marginBottom:16,opacity:.8}}>
          <div style={{padding:'10px 16px',borderBottom:`1px solid ${colors.border}`,fontSize:font.xs,fontWeight:700,color:colors.text4}}>فروع موقوفة ({inactiveBranches.length})</div>
          {inactiveBranches.map((b:any,i:number)=>(
            <div key={b.id} style={{padding:'14px 16px',borderBottom:i<inactiveBranches.length-1?`1px solid ${colors.border}`:'none',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:colors.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${colors.border}`}}>⏸</div>
              <div style={{flex:1}}>
                <div style={{fontSize:font.sm,fontWeight:700,color:colors.text3}}>{b.name}</div>
                {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>📍 {b.location}</div>}
              </div>
              <button onClick={()=>reactivateBranch(b.id)} disabled={reactivatingId===b.id || branches.length>=maxBranches}
                style={{background:colors.primaryLight,color:colors.primary,border:`1px solid ${colors.primaryBorder}`,borderRadius:radius.sm,padding:'6px 12px',fontSize:font.xs,fontWeight:700,cursor:(reactivatingId===b.id||branches.length>=maxBranches)?'not-allowed':'pointer',fontFamily:font.family,opacity:branches.length>=maxBranches?.5:1}}>
                {reactivatingId===b.id?'...':branches.length>=maxBranches?'الباقة ممتلئة':'تفعيل'}
              </button>
              <button onClick={()=>{setConfirmDeleteBranch(b);setDeleteConfirmText('');setDeleteError('')}} style={{background:'none',color:colors.text4,border:`1px solid ${colors.border}`,borderRadius:radius.sm,padding:'6px 10px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>حذف نهائي</button>
            </div>
          ))}
        </div>
      )}

      {branches.length < maxBranches ? (
        <div style={{...card,padding:'18px',background:colors.bg}}>
          <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,marginBottom:14}}>➕ إضافة فرع جديد</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:6}}>اسم الفرع *</label><input value={newBranch.name} onChange={e=>setNewBranch({...newBranch,name:e.target.value})} style={inp()} placeholder="مثال: فرع الرياض"/></div>
            <div><label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:6}}>الموقع (اختياري)</label><input value={newBranch.location} onChange={e=>setNewBranch({...newBranch,location:e.target.value})} style={inp()} placeholder="مثال: حي النزهة"/></div>
          </div>
          <button onClick={addBranch} disabled={branchSaving||!newBranch.name.trim()} style={{...btnPrimary,width:'100%',padding:'12px'}}>
            {branchSaving?'جاري الإضافة...':'+ إضافة فرع'}
          </button>
        </div>
      ) : (
        <div style={{...card,padding:'16px',background:colors.warningLight||'#fffbeb',textAlign:'center',fontSize:font.sm,color:colors.text3}}>
          وصلت للحد الأقصى لباقتك ({maxBranches} فرع) — رقّي باقتك لإضافة المزيد
        </div>
      )}

      {confirmDeleteBranch && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(6px)'}} onClick={()=>!deletingBranch&&setConfirmDeleteBranch(null)}/>
          <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:400,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{width:48,height:48,borderRadius:12,background:colors.dangerLight,border:`1px solid ${colors.dangerBorder}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>⚠️</div>
            <div style={{fontSize:15,fontWeight:800,color:colors.text,textAlign:'center',marginBottom:6}}>حذف الفرع نهائياً</div>
            <div style={{fontSize:13,color:colors.text3,textAlign:'center',lineHeight:1.7,marginBottom:16}}>
              سيتم حذف <b style={{color:colors.text}}>{confirmDeleteBranch.name}</b> وكل بياناته (منتجات، مشتريات، مبيعات، موظفين) نهائياً. هذا الإجراء لا يمكن التراجع عنه إطلاقاً.
            </div>
            <div style={{fontSize:12,fontWeight:700,color:colors.text3,marginBottom:6}}>اكتب اسم الفرع للتأكيد:</div>
            <input value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} placeholder={confirmDeleteBranch.name}
              style={{...inp(),marginBottom:14,boxSizing:'border-box' as const}}/>
            {deleteError && <div style={{fontSize:12,color:colors.danger,fontWeight:600,marginBottom:12,textAlign:'center'}}>⚠️ {deleteError}</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirmDeleteBranch(null)} disabled={deletingBranch}
                style={{flex:1,padding:'11px',background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border}`,borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                إلغاء
              </button>
              <button onClick={deleteBranchPermanently} disabled={deletingBranch || deleteConfirmText!==confirmDeleteBranch.name}
                style={{flex:2,padding:'11px',background:colors.danger,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:(deletingBranch||deleteConfirmText!==confirmDeleteBranch.name)?'not-allowed':'pointer',fontFamily:font.family,opacity:(deleteConfirmText!==confirmDeleteBranch.name)?.5:1}}>
                {deletingBranch?'جاري الحذف...':'تأكيد الحذف النهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
