'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { colors, radius, font, card, btnPrimary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { cache } from '@/lib/cache'

export default function BranchesPage() {
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [maxBranches, setMaxBranches] = useState(1)
  const [branches, setBranches] = useState<any[]>([])
  const [inactiveBranches, setInactiveBranches] = useState<any[]>([])
  const [newBranch, setNewBranch] = useState({name:'',location:''})
  const [branchSaving, setBranchSaving] = useState(false)
  const [editingNameId, setEditingNameId] = useState<string|null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
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
  const [showCopyProducts, setShowCopyProducts] = useState(false)
  const [pendingBranchReload, setPendingBranchReload] = useState(false)
  useEffect(() => {
    if (pendingBranchReload && !showCopyProducts) window.location.reload()
  }, [showCopyProducts, pendingBranchReload])
  const [newBranchId, setNewBranchId] = useState('')
  const [sourceProducts, setSourceProducts] = useState<any[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [copyingProducts, setCopyingProducts] = useState(false)
  const [undoingBranch, setUndoingBranch] = useState(false)
  const [copySourceBranchId, setCopySourceBranchId] = useState('')

  async function deleteBranchPermanently() {
    if (!confirmDeleteBranch) return
    setDeleteError('')
    setDeletingBranch(true)
    const data = await api.post('/api/delete-branch', { branch_id: confirmDeleteBranch.id, org_id: orgId })
    setDeletingBranch(false)
    if (!data.success) {
      setDeleteError(data.error || 'حدث خطأ أثناء الحذف')
      return
    }
    setBranches(prev=>prev.filter((b:any)=>b.id!==confirmDeleteBranch.id))
    setInactiveBranches(prev=>prev.filter((b:any)=>b.id!==confirmDeleteBranch.id))
    setConfirmDeleteBranch(null); setDeleteConfirmText('')
  }

  async function saveBranchName(id:string) {
    const trimmed = editNameValue.trim()
    if(!trimmed){ toast('أدخل اسم الفرع','warning'); return }
    setSavingName(true)
    const r=await api.patch('/api/branches',{org_id:orgId,id,name:trimmed})
    setSavingName(false)
    if(!r.success){ toast('فشل تعديل الاسم — حاول مرة أخرى','error'); return }
    setBranches(prev=>prev.map((br:any)=>br.id===id?{...br,name:trimmed}:br))
    toast('✅ تم تعديل اسم الفرع')
    setEditingNameId(null)
  }

  useEffect(()=>{ init() },[])

  async function init() {
    let oid = sessionStorage.getItem('s_org_id')
    // عرض كاش الفروع فوراً لو متوفر
    if (oid) {
      const cachedBranches = cache.get('branches:'+oid)
      if (cachedBranches) { setBranches(cachedBranches); setLoading(false) }
    }
    if (!oid) {
      oid = await getOrgId()
      if(!oid){setLoading(false);return}
    }
    setOrgId(oid)
    const j = await api.get('/api/branches', { org_id: oid, include_inactive: 1 })
    if (!j.success) { setLoading(false); return }
    setMaxBranches(j.max_branches||1)
    setBranches(j.branches||[])
    cache.set('branches:'+oid, j.branches||[])
    setInactiveBranches(j.inactive||[])
    setLoading(false)
  }

  async function addBranch() {
    if(!newBranch.name.trim()) return
    setBranchSaving(true)
    const cr=await api.post('/api/branches',{ org_id:orgId, name:newBranch.name.trim(), location:newBranch.location.trim()||null })
    const created=cr.branch
    if(!cr.success||!created){toast(cr.error||'فشل إضافة الفرع — حاول مرة أخرى','error');setBranchSaving(false);return}
    const bj=await api.get('/api/branches',{org_id:orgId})
    const bList=bj.branches||[]
    setBranches(bList); cache.set('branches:'+orgId, bList); setNewBranch({name:'',location:''}); setBranchSaving(false)
    toast('✅ تم إضافة الفرع')
    setPendingBranchReload(true)

    // نعرض عليه منتجات الفرع الأساسي (الأقدم) عشان يختار أيها يبيها بالفرع الجديد — بدون كميات
    const mainBranch = ((bList||[]) as any[]).find((b:any)=>b.id!==created.id)
    if(mainBranch){
      const pj=await api.get('/api/branches/copy-products',{org_id:orgId,from_branch_id:mainBranch.id})
      const prods=pj.products
      if(prods && prods.length>0){
        setSourceProducts(prods)
        setSelectedProductIds(new Set(prods.map((p:any)=>p.id)))
        setNewBranchId(created.id)
        setCopySourceBranchId(mainBranch.id)
        setShowCopyProducts(true)
      }
    }
  }

  async function undoAddBranch() {
    setUndoingBranch(true)
    await api.post('/api/delete-branch', { branch_id: newBranchId, org_id: orgId })
    setBranches(prev=>prev.filter((b:any)=>b.id!==newBranchId))
    setUndoingBranch(false)
    setShowCopyProducts(false)
    toast('تم التراجع عن إضافة الفرع')
  }

  async function confirmCopyProducts() {
    if(selectedProductIds.size===0){ setShowCopyProducts(false); return }
    setCopyingProducts(true)
    const ids = sourceProducts.filter(p=>selectedProductIds.has(p.id)).map(p=>p.id)
    const r=await api.post('/api/branches/copy-products',{ org_id:orgId, from_branch_id:copySourceBranchId, to_branch_id:newBranchId, product_ids:ids })
    const rows={length:r.count||ids.length}
    setCopyingProducts(false)
    if(!r.success){toast('فشل نسخ المنتجات — حاول تضيفها يدوياً من صفحة المخزون','error');setShowCopyProducts(false);return}
    toast(`✅ تم نسخ ${rows.length} منتج للفرع الجديد (بدون كميات)`)
    setShowCopyProducts(false)
  }

  async function deleteBranch(id:string) {
    if(branches.length<=1){toast('لا يمكن حذف الفرع الوحيد','warning');return}
    if(!(await confirmDialog({ title: 'إيقاف الفرع', message: 'إيقاف هذا الفرع؟ بياناته تبقى محفوظة ويمكن تفعيله لاحقاً.', type: 'warning' }))) return
    const r=await api.patch('/api/branches',{org_id:orgId,id,is_active:false})
    if(!r.success){toast(r.error||'فشل إيقاف الفرع — حاول مرة أخرى','error');return}
    const stopped = branches.find((b:any)=>b.id===id)
    setBranches(prev=>prev.filter((b:any)=>b.id!==id))
    if (stopped) setInactiveBranches(prev=>[...prev, stopped])
    toast('تم إيقاف الفرع')
  }

  async function reactivateBranch(id:string) {
    setReactivatingId(id)
    const r=await api.patch('/api/branches',{org_id:orgId,id,is_active:true})
    if(!r.success){toast(r.error||'فشل إعادة تفعيل الفرع — حاول مرة أخرى','error');setReactivatingId(null);return}
    const b = inactiveBranches.find((x:any)=>x.id===id)
    setInactiveBranches(prev=>prev.filter((x:any)=>x.id!==id))
    if (b) setBranches(prev=>[...prev, b])
    setReactivatingId(null)
    toast('✅ تم إعادة تفعيل الفرع')
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
    const r=await api.patch('/api/branches',{org_id:orgId,id,whatsapp_number:verifiedNumber})
    setSavingPhone(false)
    if(!r.success){toast('فشل حفظ رقم الواتساب — حاول مرة أخرى','error');return}
    setBranches((prev:any[]) => prev.map(b => b.id===id ? {...b, whatsapp_number: verifiedNumber} : b))
    resetPhoneEdit()
    toast('✅ تم حفظ رقم الفرع')
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
      <p style={pageSub}>كل فرع له مخزونه المستقل. باقتك مع الإضافات تسمح بـ <b style={{color:colors.primary}}>{maxBranches} فرع</b>.</p>

      {branches.length>0&&(
        <div style={{...card,overflow:'hidden',marginBottom:16,marginTop:20}}>
          {branches.map((b:any,i:number)=>(
            <div key={b.id} style={{padding:'14px 16px',borderBottom:i<branches.length-1?`1px solid ${colors.border}`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>selectBranch(b)}
                  style={{width:36,height:36,borderRadius:10,background:i===0?colors.primaryLight:colors.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,border:`1px solid ${i===0?colors.primaryBorder:colors.border}`,cursor:'pointer'}}>
                  {i===0?'🏠':'🏪'}
                </button>
                <div style={{flex:1}}>
                  {editingNameId===b.id ? (
                    <div style={{display:'flex',gap:6,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                      <input value={editNameValue} onChange={e=>setEditNameValue(e.target.value)} autoFocus
                        style={{...inp(),padding:'6px 10px',fontSize:font.sm,flex:1,fontWeight:700}}/>
                      <button onClick={()=>saveBranchName(b.id)} disabled={savingName}
                        style={{background:colors.primary,color:'white',border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family,flexShrink:0}}>
                        {savingName?'...':'حفظ'}
                      </button>
                      <button onClick={()=>setEditingNameId(null)}
                        style={{background:colors.bg,color:colors.text3,border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font.family,flexShrink:0}}>
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div style={{cursor:'pointer'}} onClick={()=>selectBranch(b)}>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text,display:'flex',alignItems:'center',gap:6}}>
                        {b.name}
                        <button onClick={e=>{e.stopPropagation();setEditingNameId(b.id);setEditNameValue(b.name)}}
                          style={{background:'none',border:'none',color:colors.text4,fontSize:11,cursor:'pointer',padding:0}}>
                          ✏️
                        </button>
                      </div>
                      {b.location&&<div style={{fontSize:font.xs,color:colors.text4,marginTop:1}}>📍 {b.location}</div>}
                    </div>
                  )}
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
                      <button onClick={()=>saveBranchPhone(b.id, editPhoneValue.trim().replace(/^0+/, ''))} disabled={savingPhone}
                        style={{background:'none',border:'none',color:colors.text4,fontSize:10,cursor:'pointer',fontFamily:font.family,padding:0,textDecoration:'underline',textAlign:'right'}}>
                        ما وصلني الرمز — احفظ بدون تحقق مؤقتاً
                      </button>
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
          وصلت للحد الأقصى ({maxBranches} فرع).
          <a href="/addons-market" style={{display:'block',marginTop:10,color:colors.primary,fontWeight:700,textDecoration:'none'}}>+ أضف فرعاً (من صفحة الإضافات)</a>
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

      {showCopyProducts && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.4)',backdropFilter:'blur(6px)'}} onClick={()=>{if(!copyingProducts)setShowCopyProducts(false)}}/>
          <div style={{background:'white',borderRadius:16,padding:22,width:'100%',maxWidth:420,maxHeight:'80vh',display:'flex',flexDirection:'column' as const,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontSize:15,fontWeight:800,color:colors.text,marginBottom:4}}>📦 نسخ منتجات للفرع الجديد</div>
            <div style={{fontSize:11,color:colors.text3,marginBottom:14,lineHeight:1.6}}>اختر المنتجات اللي تحب تضيفها لهذا الفرع (بنفس الاسم والوحدة، بدون أي كمية — يبدأ الفرع بمخزون صفر)</div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${colors.border2}`}}>
              <span style={{fontSize:11,color:colors.text3}}>{selectedProductIds.size} من {sourceProducts.length} محدد</span>
              <button onClick={()=>setSelectedProductIds(selectedProductIds.size===sourceProducts.length?new Set():new Set(sourceProducts.map((p:any)=>p.id)))}
                style={{fontSize:11,color:colors.primary,background:'none',border:'none',cursor:'pointer',fontWeight:700,fontFamily:font.family}}>
                {selectedProductIds.size===sourceProducts.length?'إلغاء تحديد الكل':'تحديد الكل'}
              </button>
            </div>

            <div style={{overflowY:'auto' as const,flex:1,display:'flex',flexDirection:'column' as const,gap:6,marginBottom:14}}>
              {sourceProducts.map((p:any)=>{
                const checked = selectedProductIds.has(p.id)
                return (
                  <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:checked?colors.primaryLight:colors.bg,border:`1px solid ${checked?colors.primaryBorder:colors.border2}`,borderRadius:8,cursor:'pointer'}}>
                    <input type="checkbox" checked={checked} onChange={()=>{
                      const next=new Set(selectedProductIds)
                      if(checked) next.delete(p.id); else next.add(p.id)
                      setSelectedProductIds(next)
                    }} style={{width:16,height:16}}/>
                    <span style={{fontSize:12,fontWeight:600,color:colors.text,flex:1}}>{p.name}</span>
                    <span style={{fontSize:10,color:colors.text4}}>{p.unit}</span>
                  </label>
                )
              })}
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowCopyProducts(false)} disabled={copyingProducts||undoingBranch}
                style={{flex:1,padding:'11px',background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                الفرع بدون نسخ منتجات
              </button>
              <button onClick={undoAddBranch} disabled={copyingProducts||undoingBranch}
                style={{flex:1,padding:'11px',background:colors.dangerLight,color:colors.danger,border:`1.5px solid ${colors.dangerBorder}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:font.family}}>
                {undoingBranch?'جاري التراجع...':'تراجع عن الإضافة'}
              </button>
              <button onClick={confirmCopyProducts} disabled={copyingProducts}
                style={{flex:2,padding:'11px',background:colors.primary,color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:copyingProducts?'not-allowed':'pointer',fontFamily:font.family,opacity:copyingProducts?.6:1}}>
                {copyingProducts?'جاري النسخ...':`إضافة ${selectedProductIds.size} منتج`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
