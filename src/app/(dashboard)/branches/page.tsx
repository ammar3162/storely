'use client'
export const dynamic = 'force-dynamic'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import { StorelyCard } from '@/components/ui/card'
import { StorelyFormField } from '@/components/ui/form-field'
import { StorelyStatusBadge } from '@/components/ui/status-badge'
import { StorelyTableActionGroup } from '@/components/ui/table-action'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { cache } from '@/lib/cache'
import { ListSkeleton } from '@/components/PageSkeleton'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { PauseCircle, MapPin, Plus, AlertTriangle } from 'lucide-react'


const BRANCH_STYLES = `
  .branches-page,.br-loading{font-family:${T.typography.family};direction:rtl;color:${T.color.text};line-height:${T.typography.lineHeight}}
  .branches-page{max-width:1100px;min-width:0;margin:0 auto;padding:${T.spacing[6]}px;background:${T.color.background};border-radius:${T.radius.panel};font-size:${T.typography.body}px}
  .branches-page *{box-sizing:border-box}
  .branches-page>header{margin-bottom:${T.spacing[6]}px}
  .branches-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
  .branches-page>header p{font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .branches-page>header b{color:${T.color.navy};font-weight:600}
  .branches-page .br-workspace{background:${T.color.surface};border-color:${T.color.border};border-radius:${T.radius.card};margin-bottom:${T.spacing[6]}px;min-width:0}
  .br-record{padding:${T.spacing[6]}px;border-bottom:1px solid ${T.color.border};min-width:0}
  .br-record:last-child{border-bottom:0}
  .br-record-main{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:start;gap:${T.spacing[3]}px}
  .br-identity{min-width:0;overflow-wrap:anywhere}
  .br-identity-link{cursor:pointer}
  .br-identity-link>.br-section-title{display:flex;align-items:center;flex-wrap:wrap;gap:${T.spacing[2]}px;margin:0;font-size:16px;font-weight:600}
  .br-identity>.br-supporting:first-child{font-size:16px;font-weight:600;color:${T.color.text}!important}
  .br-identity .br-supporting{margin-top:${T.spacing[1]}px}
  .br-section-title{font-size:${T.typography.section}px;font-weight:600;line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[4]}px}
  .br-supporting{font-size:${T.typography.supporting}px;color:${T.color.textMuted};line-height:1.8}
  .br-strong{font-weight:600}
  .branches-page .br-button{height:auto;min-height:36px;max-width:100%;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.navy};font-family:inherit;font-size:${T.typography.body}px;font-weight:600;line-height:1.6;white-space:normal;box-shadow:none;cursor:pointer;gap:${T.spacing[2]}px}
  .branches-page .br-button:hover:not(:disabled){background:${T.color.infoBg};border-color:${T.color.infoBorder}}
  .branches-page .br-button:disabled{cursor:not-allowed;opacity:.5}
  .branches-page .br-primary{background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .branches-page .br-primary:hover:not(:disabled){background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .branches-page .br-danger{background:${T.color.surface};border-color:${T.color.dangerBorder};color:${T.color.danger}}
  .branches-page .br-danger:hover:not(:disabled){background:${T.color.dangerBg};border-color:${T.color.dangerBorder}}
  .branches-page .br-branch-icon{width:36px;height:36px;min-height:36px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid ${T.color.border};border-radius:${T.radius.control};background:${T.color.surface};font-size:18px;flex-shrink:0}
  .branches-page .br-edit-icon{width:32px;height:32px;min-height:32px;padding:0;border-color:transparent;background:transparent;font-size:${T.typography.supporting}px}
  .br-record-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:${T.spacing[2]}px;max-width:100%}
  .br-record-actions .br-button{font-size:${T.typography.supporting}px}
  .branches-page .br-permanent-action{color:${T.color.danger};border-color:transparent}
  .branches-page .br-permanent-action:hover{border-color:${T.color.dangerBorder};background:${T.color.dangerBg}}
  .br-phone{margin-top:${T.spacing[4]}px;padding-top:${T.spacing[4]}px;margin-inline-start:48px;border-top:1px solid ${T.color.border};min-width:0}
  .br-stack{display:flex;flex-direction:column;gap:${T.spacing[3]}px}
  .br-edit-row{display:flex;align-items:center;gap:${T.spacing[2]}px;flex-wrap:wrap;min-width:0}
  .br-edit-row>.br-control{flex:1 1 160px;width:160px}
  .br-edit-row>.br-button{flex-shrink:0}
  .branches-page .br-phone-trigger,.branches-page .br-phone-fallback{height:auto;min-height:32px;padding:0;justify-content:flex-start;text-align:start;border-color:transparent;background:transparent;color:${T.color.textMuted};font-size:${T.typography.supporting}px;line-height:1.8}
  .br-phone-trigger>span,.br-phone-fallback{text-decoration:underline;text-underline-offset:3px}
  .branches-page .br-phone-trigger:hover,.branches-page .br-phone-fallback:hover{background:transparent;color:${T.color.navy}}
  .branches-page .br-control{width:100%;min-width:0;height:44px;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.text};font-family:inherit;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .branches-page .br-control::placeholder{color:${T.color.textSubtle};opacity:1}
  .branches-page .br-control:focus-visible,.branches-page button:focus-visible,.branches-page .br-checkbox:focus-visible{outline:2px solid ${T.color.navy};outline-offset:2px;box-shadow:${T.shadow.focus}}
  .br-inactive-header{padding:${T.spacing[5]}px ${T.spacing[6]}px;border-bottom:1px solid ${T.color.border};font-size:${T.typography.body}px;font-weight:600;line-height:1.8}
  .br-inactive-header .br-strong{font-weight:400}
  .br-inactive-row{padding:${T.spacing[5]}px ${T.spacing[6]}px;display:grid;grid-template-columns:36px minmax(0,1fr) auto auto;align-items:start;gap:${T.spacing[3]}px}
  .br-add{padding:${T.spacing[6]}px}
  .br-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${T.spacing[4]}px;margin-bottom:${T.spacing[5]}px}
  .branches-page label{font-size:${T.typography.supporting}px;line-height:${T.typography.lineHeight};color:${T.color.textMuted}}
  .branches-page .br-full{width:100%;min-height:40px}
  .br-limit{padding:${T.spacing[5]}px ${T.spacing[6]}px;border:1px solid ${T.color.warningBorder};border-radius:${T.radius.card};background:${T.color.surface};font-size:${T.typography.body}px;color:${T.color.textMuted};line-height:1.8}
  .br-limit>.br-link{display:block;margin-top:${T.spacing[2]}px}
  .br-link{color:${T.color.navy};font-weight:600;text-decoration:underline;text-underline-offset:3px}
  .br-overlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:${T.spacing[6]}px}
  .br-backdrop{position:absolute;inset:0;background:${T.color.backdrop}}
  .br-dialog{position:relative;width:100%;max-height:calc(100dvh - 48px);overflow-y:auto;overscroll-behavior:contain;padding:${T.spacing[6]}px;background:${T.color.surface};border:1px solid ${T.color.border};border-radius:${T.radius.panel};box-shadow:${T.shadow.panel};min-height:0;overflow-wrap:anywhere}
  .br-delete-dialog{max-width:440px}
  .br-copy-dialog{max-width:520px;display:flex;flex-direction:column}
  .br-dialog>.br-section-title{margin-bottom:${T.spacing[3]}px;flex-shrink:0}
  .br-dialog-description{font-size:${T.typography.body}px;line-height:1.8;margin-bottom:${T.spacing[5]}px}
  .br-copy-dialog>.br-supporting{margin-bottom:${T.spacing[5]}px;flex-shrink:0}
  .br-warning-icon{font-size:24px;line-height:1;margin-bottom:${T.spacing[4]}px}
  .br-field-label{font-size:${T.typography.body}px;font-weight:600;line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[2]}px}
  .br-dialog>.br-control{flex-shrink:0}
  .br-error{font-size:${T.typography.supporting}px;color:${T.color.danger};line-height:1.8;margin-top:${T.spacing[2]}px}
  .br-dialog-footer{display:flex;align-items:stretch;flex-wrap:wrap;gap:${T.spacing[2]}px;padding-top:${T.spacing[5]}px;margin-top:${T.spacing[5]}px;border-top:1px solid ${T.color.border};flex-shrink:0}
  .br-dialog-footer>.br-button{flex:1 1 120px}
  .branches-page .br-confirm-delete{background:${T.color.danger};border-color:${T.color.danger};color:${T.color.surface}}
  .branches-page .br-confirm-delete:hover:not(:disabled){background:${T.color.danger};border-color:${T.color.danger};color:${T.color.surface}}
  .br-copy-toolbar{display:flex;align-items:center;justify-content:space-between;gap:${T.spacing[3]}px;flex-wrap:wrap;padding-block:${T.spacing[3]}px;margin-bottom:${T.spacing[3]}px;border-block:1px solid ${T.color.border};flex-shrink:0}
  .br-copy-list{display:flex;flex-direction:column;gap:${T.spacing[2]}px;overflow-y:auto;min-height:0;flex:1 1 auto}
  .br-copy-option{display:flex;align-items:flex-start;gap:${T.spacing[3]}px;min-height:48px;padding:${T.spacing[3]}px;border:1px solid ${T.color.border};border-radius:${T.radius.control};background:${T.color.surface};cursor:pointer}
  .br-copy-option:has(input:checked){border-color:${T.color.navy};background:${T.color.infoBg}}
  .br-copy-option>span:first-of-type{flex:1;min-width:0;overflow-wrap:anywhere;font-size:${T.typography.body}px}
  .br-copy-option>span:last-child{font-size:${T.typography.supporting}px}
  .br-checkbox{width:16px;height:16px;flex-shrink:0;margin-top:${T.spacing[1]}px;accent-color:${T.color.navy}}
  .br-loading{padding:${T.spacing[8]}px;text-align:center;font-size:${T.typography.body}px;color:${T.color.textMuted}}
  @media(max-width:640px){
    .branches-page{padding:${T.spacing[4]}px}
    .br-record,.br-add,.br-inactive-row,.br-inactive-header{padding:${T.spacing[5]}px}
    .br-record-main{grid-template-columns:36px minmax(0,1fr)}
    .br-record-actions{grid-column:1/-1;justify-content:flex-start;padding-top:${T.spacing[2]}px}
    .br-phone{margin-inline-start:0}
    .br-fields{grid-template-columns:minmax(0,1fr)}
    .br-inactive-row{grid-template-columns:36px minmax(0,1fr)}
    .br-inactive-row>.br-button{grid-column:1/-1;width:100%}
    .br-edit-row>.br-control{flex-basis:100%;width:100%}
    .br-overlay{padding:${T.spacing[3]}px}
    .br-dialog{padding:${T.spacing[5]}px;max-height:calc(100dvh - 24px)}
    .br-copy-dialog>.br-dialog-footer{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
    .br-copy-dialog>.br-dialog-footer>.br-primary{grid-column:1/-1}
    .br-limit{padding:${T.spacing[5]}px}
  }
`

export default function BranchesPage() {
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState('')
  const [maxBranches, setMaxBranches] = useState(1)
  // طلب فرع إضافي فوق باقته (lib/extraBranch): السعر وكم يقدر يوصل — يوافق عليه الأدمن
  const [offer, setOffer] = useState<any>(null)
  const [buyingBranch, setBuyingBranch] = useState(false)
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
    toast('تم تعديل اسم الفرع')
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
    api.get('/api/branches/extra', { org_id: oid }).then(o => setOffer(o.success ? o.offer : null)).catch(() => setOffer(null))
    setBranches(j.branches||[])
    cache.set('branches:'+oid, j.branches||[])
    setInactiveBranches(j.inactive||[])
    setLoading(false)
  }

  // تحديث فوري: فرع انضاف/توقف من جهاز ثاني أو تغيّرت إضافة الفروع
  useLiveRefresh(orgId || null, ['branches', 'org_addon_subscriptions'], () => { init() })

  // يطلب فرع إضافي — بعد موافقة الأدمن ينضاف لباقته وفاتورته، وبعدها يقدر يسجّل الفرع الجديد
  async function buyBranch() {
    if (!offer?.canAdd) return
    const ok = await confirmDialog({
      title: 'طلب فرع إضافي',
      message: `الفرع الإضافي بـ${offer.price} ريال شهرياً${offer.yearly ? ' (بخصم السنوي)' : ''}، ومعه ${offer.staff} موظفين و${offer.suppliers} موردين. بعد الموافقة يُضاف إلى فاتورتك، ويُحتسب على الأيام المتبقية من اشتراكك فقط.`,
      confirmText: 'إرسال الطلب', type: 'success',
    })
    if (!ok) return
    setBuyingBranch(true)
    const r = await api.post('/api/branches/extra', { org_id: orgId })
    setBuyingBranch(false)
    if (!r.success) { toast(r.error || 'فشل إرسال الطلب — حاول مرة أخرى', 'error'); return }
    toast('تم استلام طلبك — سيصلك إشعار فور تفعيل الفرع')
    init()
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
    toast('تم إضافة الفرع')
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
    toast(`تم نسخ ${rows.length} منتج للفرع الجديد (بدون كميات)`)
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
    toast('تم إعادة تفعيل الفرع')
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
    toast('تم حفظ رقم الفرع')
  }

  function selectBranch(b:any){
    sessionStorage.setItem('s_branch_id',b.id)
    sessionStorage.setItem('s_branch_name',b.name)
    window.location.href='/dashboard'
  }

  if (loading) return <ListSkeleton/>

  return (
    <div className="branches-page">
      <style>{BRANCH_STYLES}</style>
      <StorelyPageHeader
        title="إدارة الفروع"
        description={<>كل فرع له مخزونه المستقل. باقتك مع الإضافات تسمح بـ <b>{maxBranches} فرع</b>.</>}
      />

      {branches.length>0&&(
        <StorelyCard className="br-workspace br-active">
          {branches.map((b:any,i:number)=>(
            <div className="br-record" key={b.id}>
              <div className="br-record-main">
                <StorelyButton className="br-button br-branch-icon" onClick={()=>selectBranch(b)}>
                  {i===0?'':''}
                </StorelyButton>
                <div className="br-identity">
                  {editingNameId===b.id ? (
                    <div className="br-edit-row"  onClick={e=>e.stopPropagation()}>
                      <input className="br-control" value={editNameValue} onChange={e=>setEditNameValue(e.target.value)} autoFocus
                        />
                      <StorelyButton className="br-button br-primary" variant="primary" onClick={()=>saveBranchName(b.id)} disabled={savingName}>
                        {savingName?'...':'حفظ'}
                      </StorelyButton>
                      <StorelyButton className="br-button" onClick={()=>setEditingNameId(null)}>
                        إلغاء
                      </StorelyButton>
                    </div>
                  ) : (
                    <div className="br-identity-link"  onClick={()=>selectBranch(b)}>
                      <div className="br-section-title" style={{color:T.color.text}}>
                        {b.name}
                        <StorelyButton className="br-button br-edit-icon" onClick={e=>{e.stopPropagation();setEditingNameId(b.id);setEditNameValue(b.name)}}>
                                                  </StorelyButton>
                      </div>
                      {b.location&&<div className="br-supporting" style={{color:T.color.textMuted,display:'inline-flex',alignItems:'center',gap:4}}><MapPin size={12}/>{b.location}</div>}
                    </div>
                  )}
                </div>
                <StorelyTableActionGroup className="br-record-actions">
                <StorelyButton className="br-button" onClick={()=>selectBranch(b)}>
                  دخول ←
                </StorelyButton>
                {i===0
                  ? <StorelyStatusBadge status="info" className="br-strong" style={{color:T.color.navy}}>رئيسي</StorelyStatusBadge>
                  : (
                    <>
                      <StorelyButton className="br-button br-danger" variant="danger" onClick={()=>deleteBranch(b.id)}>إيقاف</StorelyButton>
                      <StorelyButton className="br-button br-permanent-action" onClick={()=>{setConfirmDeleteBranch(b);setDeleteConfirmText('');setDeleteError('')}}>حذف نهائي</StorelyButton>
                    </>
                  )}

                </StorelyTableActionGroup>
              </div>
              <div className="br-phone">
                {editingPhoneId===b.id ? (
                  phoneOtpStep==='phone' ? (
                    <div className="br-stack">
                      <div className="br-edit-row">
                        <input className="br-control" value={editPhoneValue} onChange={e=>setEditPhoneValue(e.target.value)} placeholder="5xxxxxxxx" dir="ltr"
                          />
                        <StorelyButton className="br-button br-primary" variant="primary" onClick={sendBranchPhoneOtp} disabled={sendingOtp}>
                          {sendingOtp?'...':editPhoneValue.trim()?'إرسال رمز التحقق':'حفظ'}
                        </StorelyButton>
                        <StorelyButton className="br-button" onClick={resetPhoneEdit}>
                          إلغاء
                        </StorelyButton>
                      </div>
                      {phoneOtpError && <div className="br-error" style={{color:T.color.danger}}>{phoneOtpError}</div>}
                    </div>
                  ) : (
                    <div className="br-stack">
                      <div className="br-supporting" style={{color:T.color.textMuted}}>أرسلنا رمز تحقق عبر واتساب للرقم {editPhoneValue} — أدخله للتأكيد</div>
                      <div className="br-edit-row">
                        <input className="br-control" value={phoneOtpValue} onChange={e=>setPhoneOtpValue(e.target.value)} placeholder="رمز التحقق" dir="ltr" maxLength={6}
                          />
                        <StorelyButton className="br-button br-primary" variant="primary" onClick={()=>verifyBranchPhoneOtp(b.id)} disabled={savingPhone}>
                          {savingPhone?'...':'تأكيد'}
                        </StorelyButton>
                        <StorelyButton className="br-button" onClick={resetPhoneEdit}>
                          إلغاء
                        </StorelyButton>
                      </div>
                      <StorelyButton className="br-button br-phone-fallback" onClick={()=>saveBranchPhone(b.id, editPhoneValue.trim().replace(/^0+/, ''))} disabled={savingPhone}>
                        ما وصلني الرمز — احفظ بدون تحقق مؤقتاً
                      </StorelyButton>
                      {phoneOtpError && <div className="br-error" style={{color:T.color.danger}}>{phoneOtpError}</div>}
                    </div>
                  )
                ) : (
                  <StorelyButton className="br-button br-phone-trigger" onClick={()=>{setEditingPhoneId(b.id);setEditPhoneValue(b.whatsapp_number||'')}}>
                    {b.whatsapp_number ? `رقم مخصص: ${b.whatsapp_number}` : 'استخدام رقم مخصص لهذا الفرع (اختياري)'}
                    <span >تعديل</span>
                  </StorelyButton>
                )}
              </div>
            </div>
          ))}
        </StorelyCard>
      )}

      {inactiveBranches.length>0&&(
        <StorelyCard className="br-workspace br-inactive">
          <div className="br-inactive-header" style={{color:T.color.textMuted}}>
            فروع موقوفة ({inactiveBranches.length})
            {branches.length<maxBranches
              ? <span className="br-strong" style={{color:T.color.navy}}> — لديك مكان لـ{maxBranches-branches.length} فرع، اختر الفرع الذي تريد تفعيله</span>
              : <span className="br-strong"> — لتفعيل فرع: أوقف فرعاً نشطاً بدلاً منه{offer?.canAdd && <span className="hide-in-app">، أو اطلب فرعاً إضافياً من الأسفل</span>}</span>}
          </div>
          {inactiveBranches.map((b:any,i:number)=>(
            <div className="br-inactive-row" key={b.id} style={{borderBottom:i<inactiveBranches.length-1?`1px solid ${T.color.border}`:'none'}}>
              <div className="br-branch-icon"><PauseCircle size={18}/></div>
              <div className="br-identity">
                <div className="br-supporting" style={{color:T.color.textMuted}}>{b.name}</div>
                {b.location&&<div className="br-supporting" style={{color:T.color.textMuted,display:'inline-flex',alignItems:'center',gap:4}}><MapPin size={12}/>{b.location}</div>}
                {b.plan_locked_at&&<div className="br-supporting" style={{color:T.color.warning}}>موقوف لأن عدد الفروع تجاوز حد الباقة — يعود عند ترقية الباقة أو إضافة فرع</div>}
              </div>
              <StorelyButton className="br-button" onClick={()=>reactivateBranch(b.id)} disabled={reactivatingId===b.id || branches.length>=maxBranches}>
                {reactivatingId===b.id?'...':branches.length>=maxBranches?'الباقة ممتلئة':'تفعيل'}
              </StorelyButton>
              <StorelyButton className="br-button br-permanent-action" onClick={()=>{setConfirmDeleteBranch(b);setDeleteConfirmText('');setDeleteError('')}}>حذف نهائي</StorelyButton>
            </div>
          ))}
        </StorelyCard>
      )}

      {branches.length < maxBranches ? (
        <StorelyCard className="br-workspace br-add">
          <div className="br-section-title" style={{color:T.color.text,display:'flex',alignItems:'center',gap:8}}><Plus size={16}/>إضافة فرع جديد</div>
          <div className="br-fields">
            <StorelyFormField label={<>اسم الفرع *</>} htmlFor="branch-field-1"><input id="branch-field-1" className="br-control" value={newBranch.name} onChange={e=>setNewBranch({...newBranch,name:e.target.value})}  placeholder="مثال: فرع الرياض"/></StorelyFormField>
            <StorelyFormField label={<>الموقع (اختياري)</>} htmlFor="branch-field-2"><input id="branch-field-2" className="br-control" value={newBranch.location} onChange={e=>setNewBranch({...newBranch,location:e.target.value})}  placeholder="مثال: حي النزهة"/></StorelyFormField>
          </div>
          <StorelyButton className="br-button br-primary br-full" variant="primary" onClick={addBranch} disabled={branchSaving||!newBranch.name.trim()}>
            {branchSaving?'جارٍ الإضافة...':'+ إضافة فرع'}
          </StorelyButton>
        </StorelyCard>
      ) : (
        <div className="br-limit" style={{color:T.color.textMuted}}>
          باقتك فيها {maxBranches} {maxBranches===1?'فرع':'فروع'} وكلها مستخدمة.
          {offer?.pending > 0 && (
            <div className="br-strong" style={{marginTop:10,color:T.color.navy}}>طلب {offer.pending === 1 ? 'فرع إضافي' : `${offer.pending} فروع إضافية`} قيد المراجعة — سيصلك إشعار فور التفعيل</div>
          )}
          {offer?.canAdd ? (
            <div className="hide-in-app" style={{marginTop:12}}>
              <StorelyButton variant="primary" onClick={buyBranch} disabled={buyingBranch}>
                {buyingBranch ? 'جارٍ الإرسال...' : `+ اطلب فرعاً إضافياً (${offer.price} ريال شهرياً)`}
              </StorelyButton>
              <div className="br-supporting" style={{marginTop:8}}>معه {offer.staff} موظفين و{offer.suppliers} موردين · يمكنك الوصول إلى {offer.maxTotal} فروع</div>
            </div>
          ) : offer?.nextPlan && !offer?.pending ? (
            <a className="hide-in-app br-link" href="/settings" style={{display:'block',marginTop:10,color:T.color.navy}}>وصلت إلى أقصى عدد فروع في باقتك ({offer.maxTotal}) — رقِّ باقتك من الإعدادات لإضافة المزيد</a>
          ) : offer ? (
            <a className="hide-in-app br-link" href="https://wa.me/966594351667" target="_blank" rel="noreferrer" style={{display:'block',marginTop:10,color:T.color.navy}}>تحتاج إلى أكثر من {offer.maxTotal} فروع؟ تواصل معنا لباقة المؤسسات</a>
          ) : null}
        </div>
      )}

      {confirmDeleteBranch && (
        <div className="br-overlay">
          <div className="br-backdrop"  onClick={()=>!deletingBranch&&setConfirmDeleteBranch(null)}/>
          <div className="br-dialog br-delete-dialog">
            <div className="br-warning-icon"><AlertTriangle size={28}/></div>
            <div className="br-section-title" style={{color:T.color.text}}>حذف الفرع نهائياً</div>
            <div className="br-dialog-description" style={{color:T.color.textMuted}}>
              سيتم حذف <b style={{color:T.color.text}}>{confirmDeleteBranch.name}</b> وكل بياناته (منتجات، مشتريات، مبيعات، موظفين) نهائياً. هذا الإجراء لا يمكن التراجع عنه إطلاقاً.
            </div>
            <div className="br-field-label" style={{color:T.color.textMuted}}>اكتب اسم الفرع للتأكيد:</div>
            <input className="br-control" value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} placeholder={confirmDeleteBranch.name}
              />
            {deleteError && <div className="br-error" style={{color:T.color.danger}}>{deleteError}</div>}
            <div className="br-dialog-footer">
              <StorelyButton className="br-button" onClick={()=>setConfirmDeleteBranch(null)} disabled={deletingBranch}>
                إلغاء
              </StorelyButton>
              <StorelyButton className="br-button br-danger br-confirm-delete" variant="danger" onClick={deleteBranchPermanently} disabled={deletingBranch || deleteConfirmText!==confirmDeleteBranch.name}>
                {deletingBranch?'جاري الحذف...':'تأكيد الحذف النهائي'}
              </StorelyButton>
            </div>
          </div>
        </div>
      )}

      {showCopyProducts && (
        <div className="br-overlay">
          <div className="br-backdrop"  onClick={()=>{if(!copyingProducts)setShowCopyProducts(false)}}/>
          <div className="br-dialog br-copy-dialog">
            <div className="br-section-title" style={{color:T.color.text}}>نسخ منتجات للفرع الجديد</div>
            <div className="br-supporting" style={{color:T.color.textMuted}}>اختر المنتجات التي تريد إضافتها لهذا الفرع (بنفس الاسم والوحدة ودون أي كمية — يبدأ الفرع بمخزون صفر)</div>

            <div className="br-copy-toolbar">
              <span className="br-supporting" style={{color:T.color.textMuted}}>{selectedProductIds.size} من {sourceProducts.length} محدد</span>
              <StorelyButton className="br-button" onClick={()=>setSelectedProductIds(selectedProductIds.size===sourceProducts.length?new Set():new Set(sourceProducts.map((p:any)=>p.id)))}>
                {selectedProductIds.size===sourceProducts.length?'إلغاء تحديد الكل':'تحديد الكل'}
              </StorelyButton>
            </div>

            <div className="br-copy-list">
              {sourceProducts.map((p:any)=>{
                const checked = selectedProductIds.has(p.id)
                return (
                  <label className="br-copy-option" key={p.id}>
                    <input className="br-checkbox" type="checkbox" checked={checked} onChange={()=>{
                      const next=new Set(selectedProductIds)
                      if(checked) next.delete(p.id); else next.add(p.id)
                      setSelectedProductIds(next)
                    }} />
                    <span className="br-strong" style={{color:T.color.text}}>{p.name}</span>
                    <span className="br-supporting" style={{color:T.color.textMuted}}>{p.unit}</span>
                  </label>
                )
              })}
            </div>

            <div className="br-dialog-footer">
              <StorelyButton className="br-button" onClick={()=>setShowCopyProducts(false)} disabled={copyingProducts||undoingBranch}>
                الفرع بدون نسخ منتجات
              </StorelyButton>
              <StorelyButton className="br-button br-danger" variant="danger" onClick={undoAddBranch} disabled={copyingProducts||undoingBranch}>
                {undoingBranch?'جاري التراجع...':'تراجع عن الإضافة'}
              </StorelyButton>
              <StorelyButton className="br-button br-primary" variant="primary" onClick={confirmCopyProducts} disabled={copyingProducts}>
                {copyingProducts?'جاري النسخ...':`إضافة ${selectedProductIds.size} منتج`}
              </StorelyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
