'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api-client'
import { getAddonsMarket } from '@/lib/addonsCache'
import { getMe } from '@/lib/session'
import { planKeyOf, billLines, planPriceFor, planLabel as planLabelFor } from '@/lib/planPricing'
import { DAYS, TABS, parsePhone } from './constants'

/** حالة صفحة الإعدادات ودوالها — منقولة كما هي من page.tsx */
export function useSettings() {
  const [loading, setLoading]           = useState(true)
  const [showDelete, setShowDelete]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting]           = useState(false)
  const [deleteMsg, setDeleteMsg]         = useState<{ok:boolean;text:string}|null>(null)
  const [saving, setSaving]             = useState(false)
  const [sending, setSending]           = useState(false)
  const [saveOk, setSaveOk]             = useState(false)
  const [sendMsg, setSendMsg]           = useState<{ok:boolean;text:string}|null>(null)
  const [orgId, setOrgId]               = useState('')
  const [isOwner, setIsOwner]           = useState(false)
  const [lastSent, setLastSent]         = useState<string|null>(null)
  const [lastBackup, setLastBackup]     = useState<string|null>(null)
  const [backups, setBackups]           = useState<any[]>([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMsg, setBackupMsg]       = useState<{ok:boolean;text:string}|null>(null)
  const [branches, setBranches]         = useState<any[]>([])
  const [inactiveBranches, setInactiveBranches] = useState<any[]>([])
  const [reactivatingId, setReactivatingId] = useState<string|null>(null)

  // الفروع الموقوفة تتحدث فوراً (باقي الإعدادات نموذج يعدّله المالك، ما نكتب فوقه)
  useLiveRefresh(orgId || null, ['branches'], () => { if (orgId) loadInactiveBranches(orgId) })

  async function loadInactiveBranches(oid:string) {
    const j=await api.get('/api/branches',{org_id:oid,include_inactive:1})
    setInactiveBranches(j.inactive||[])
  }

  async function reactivateBranch(id:string) {
    setReactivatingId(id)
    const r=await api.patch('/api/branches',{org_id:orgId,id,is_active:true})
    if(!r.success){ alert(r.error||'فشل إعادة التفعيل'); setReactivatingId(null); return }
    const b = inactiveBranches.find((x:any)=>x.id===id)
    setInactiveBranches(prev=>prev.filter((x:any)=>x.id!==id))
    if (b) setBranches(prev=>[...prev, b])
    setReactivatingId(null)
  }
  const [maxBranches, setMaxBranches]   = useState<number>(1)
  const [newBranch, setNewBranch]       = useState({name:'',location:''})
  const [editingPhoneId, setEditingPhoneId] = useState<string|null>(null)
  const [editPhoneValue, setEditPhoneValue] = useState('')
  const [savingPhone, setSavingPhone]       = useState(false)

  async function saveBranchPhone(id: string) {
    setSavingPhone(true)
    const r=await api.patch('/api/branches',{org_id:orgId,id,whatsapp_number:editPhoneValue.trim()||null})
    if(!r.success){ alert(r.error||'فشل الحفظ'); setSavingPhone(false); return }
    setBranches((prev:any[]) => prev.map(b => b.id===id ? {...b, whatsapp_number: editPhoneValue.trim() || null} : b))
    setEditingPhoneId(null); setSavingPhone(false)
  }
  const [branchSaving, setBranchSaving] = useState(false)
  const [pwForm, setPwForm]             = useState({current:'',newPw:'',confirm:''})
  const [pwSaving, setPwSaving]         = useState(false)
  const [pwMsg, setPwMsg]               = useState<{ok:boolean;text:string}|null>(null)
  const [activeTab, setActiveTab]       = useState('org')
  useEffect(()=>{ const t=new URLSearchParams(window.location.search).get('tab'); if(t&&TABS.some(x=>x.key===t)) setActiveTab(t) },[])
  const [visible, setVisible]           = useState(false)
  const [countryCode, setCountryCode]   = useState('+966')
  const [logoUrl, setLogoUrl]           = useState<string|null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [planName, setPlanName]         = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly'|'yearly'>('monthly')
  const [userEmail, setUserEmail]       = useState('')
  const [userPhone, setUserPhone]       = useState('')
  const [userFullName, setUserFullName] = useState('')
  const [userId, setUserId]             = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [personalSaveOk, setPersonalSaveOk] = useState(false)
  const [subEndsAt, setSubEndsAt]       = useState<string|null>(null)
  const [planKey, setPlanKey]           = useState<string>('')
  const [lockedPlan, setLockedPlan]     = useState<number|null>(null)  // سعر مثبّت لمشترك قبل تغيير الأسعار
  const [billAddons, setBillAddons]     = useState<any[]>([])
  const [discount, setDiscount]         = useState<any>(null)  // خصم خاص من لوحة الإدارة
  const [form, setForm] = useState({
    name:'', whatsapp_number:'',
    notify_schedule:'daily',
    notify_time:'08:00',
    notify_days:['0'],
    notify_cashier_closing_wa:true,
    notify_supplier_wa:true,
  })
  const sb = createClient()

  useEffect(()=>{ load() },[])

  async function savePersonalInfo() {
    if (!userId) return
    setSavingPersonal(true)
    const r = await api.patch('/api/me', { full_name: userFullName.trim(), phone: userPhone.trim() })
    setSavingPersonal(false)
    if (!r.success) { alert('فشل حفظ البيانات الشخصية: ' + (r.error||'')); return }
    setPersonalSaveOk(true); setTimeout(()=>setPersonalSaveOk(false),3000)
  }

  async function changePassword(e:React.FormEvent) {
    e.preventDefault(); setPwMsg(null)
    if (pwForm.newPw.length < 6) { setPwMsg({ok:false,text:'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'}); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ok:false,text:'كلمتا المرور غير متطابقتين'}); return }
    setPwSaving(true)
    const sb2 = createClient()
    const { data:{user} } = await sb2.auth.getUser()
    if (!user?.email) { setPwMsg({ok:false,text:'حدث خطأ، حاول مرة أخرى'}); setPwSaving(false); return }
    const { error: signErr } = await sb2.auth.signInWithPassword({ email: user.email, password: pwForm.current })
    if (signErr) { setPwMsg({ok:false,text:'كلمة المرور الحالية غير صحيحة'}); setPwSaving(false); return }
    const { error } = await sb2.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) { setPwMsg({ok:false,text:'حدث خطأ في تغيير كلمة المرور'}); return }
    setPwMsg({ok:true,text:'تم تغيير كلمة المرور بنجاح ✅'})
    setPwForm({current:'',newPw:'',confirm:''})
  }

  async function load() {
    setLoading(true)
    // لو المعرّف محفوظ بالجلسة، نطلق استعلام المؤسسة/الفروع فوراً بالتوازي مع فحص المستخدم -- بدل ما ننتظره بالتتابع
    // لو المعرّف محفوظ بالجلسة، نطلق استعلام المؤسسة/الفروع فوراً بالتوازي مع بيانات المستخدم
    const cachedOid = sessionStorage.getItem('s_org_id')
    const loadOrg = (oid:string) => Promise.all([
      api.get('/api/org-settings',{org_id:oid,scope:'full'}),
      api.get('/api/branches',{org_id:oid}),
    ])
    const [me, orgBranchesEarly] = await Promise.all([getMe(), cachedOid ? loadOrg(cachedOid) : null])
    if (!me) return
    const user = { id: me.user_id, email: me.email }
    setOrgId(me.org_id)
    setIsOwner(me.role === 'owner')
    setUserFullName(me.full_name||'')
    setUserPhone(me.phone||'')
    const [orgRes, branchesRes] = (cachedOid===me.org_id && orgBranchesEarly) || await loadOrg(me.org_id)
    const org=orgRes.settings as any
    const bList=branchesRes.branches
    if(org){
      const parsed = parsePhone(org.whatsapp_number||'')
      setCountryCode(parsed.countryCode)
      setForm({ name:org.name||'', whatsapp_number:parsed.number||'', notify_schedule:org.notify_schedule||'daily', notify_time:org.notify_time||'08:00', notify_days:org.notify_days||['0'], notify_cashier_closing_wa:org.notify_cashier_closing_wa!==false, notify_supplier_wa:org.notify_supplier_wa!==false })
      setLastSent(org.last_notified_at||null)
      setLastBackup(org.last_backup_at||null)
      setMaxBranches(me.org?.max_branches||org.max_branches||1)
      setUserEmail(user.email||'');setUserId(user.id)
      setLogoUrl(org.logo_url||null)
      setPlanName(planLabelFor(org.plan, me.org?.max_branches||org.max_branches))
      setPlanKey(org.plan||'')
      setLockedPlan(org.locked_plan_monthly ?? null)
      setDiscount(me.org || null)
      setBillingCycle(org.billing_cycle==='yearly'?'yearly':'monthly')
      setSubEndsAt(org.subscription_ends_at||null)
      setBranches(bList||[])
      loadInactiveBranches(me.org_id)
      getAddonsMarket(me.org_id).then(j=>{ if(j.success) setBillAddons(j.addons||[]) })
    }
    setLoading(false)
    setTimeout(()=>setVisible(true),50)
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const fullPhone = countryCode + form.whatsapp_number.replace(/^0+/, '')
    const r = await api.patch('/api/org-settings', { org_id:orgId, name:form.name, whatsapp_number:fullPhone, notify_schedule:form.notify_schedule, notify_time:form.notify_time, notify_days:form.notify_days, notify_cashier_closing_wa:form.notify_cashier_closing_wa, notify_supplier_wa:form.notify_supplier_wa })
    setSaving(false)
    if (!r.success) { alert('فشل حفظ الإعدادات: ' + (r.error||'')); return }
    setSaveOk(true)
    // القائمة الجانبية تجيب اسم المنشأة مرة وحدة بس وقت فتح الصفحة —
    // نعيد تحميل الصفحة عشان تنعكس التغييرات فوراً بكل مكان يعرض اسم المنشأة
    setTimeout(()=>window.location.reload(),900)
  }

  async function uploadLogo(file: File) {
    if (!orgId) return
    setLogoUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${orgId}/logo-${Date.now()}.${ext}`   // مجلد المنشأة (سياسة التخزين تسمح بمجلدها بس)
    const { error: upErr } = await sb.storage.from('invoices').upload(path, file, { upsert: true })
    if (upErr) { alert('فشل رفع الصورة: ' + upErr.message); setLogoUploading(false); return }
    const { data: pub } = sb.storage.from('invoices').getPublicUrl(path)
    const updRes = await api.patch('/api/org-settings', { org_id: orgId, logo_url: pub.publicUrl })
    if (!updRes.success) { alert('فشل حفظ رابط الصورة: ' + (updRes.error||'')); setLogoUploading(false); return }
    setLogoUrl(pub.publicUrl)
    setLogoUploading(false)
    // تحديث الـ sidebar تلقائياً
    window.dispatchEvent(new CustomEvent('logo-updated', { detail: pub.publicUrl }))
  }

  async function sendNow() {
    setSending(true); setSendMsg(null)
    try {
      const data=await api.post('/api/notify-low-stock',{org_id:orgId})
      if(data.success){setSendMsg({ok:true,text:data.message||'تم إرسال الإشعار بنجاح'});setLastSent(new Date().toISOString())}
      else setSendMsg({ok:false,text:data.message||'فشل الإرسال'})
    } catch{setSendMsg({ok:false,text:'خطأ في الاتصال'})}
    setSending(false); setTimeout(()=>setSendMsg(null),6000)
  }

  async function loadBackups() {
    const res=await fetch('/api/backup/list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
    const data=await res.json(); if(data.success) setBackups(data.backups||[])
  }

  async function runBackup() {
    setBackupLoading(true); setBackupMsg(null)
    try {
      const res=await fetch('/api/backup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId})})
      const data=await res.json()
      if(data.success){setBackupMsg({ok:true,text:'تم إنشاء نسخة احتياطية بنجاح'});setLastBackup(new Date().toISOString());loadBackups()}
      else setBackupMsg({ok:false,text:'فشل إنشاء النسخة الاحتياطية'})
    } catch{setBackupMsg({ok:false,text:'خطأ في الاتصال'})}
    setBackupLoading(false); setTimeout(()=>setBackupMsg(null),5000)
  }

  async function addBranch() {
    if(!newBranch.name.trim()) return
    setBranchSaving(true)
    // الخادم يفرض حد الفروع بالباقة (كانت هذي الصفحة تتجاوزه)
    const cr=await api.post('/api/branches',{ org_id:orgId, name:newBranch.name.trim(), location:newBranch.location.trim()||null })
    if(!cr.success){ alert(cr.error||'فشل إضافة الفرع'); setBranchSaving(false); return }
    const bj=await api.get('/api/branches',{org_id:orgId})
    setBranches(bj.branches||[]); setNewBranch({name:'',location:''}); setBranchSaving(false)
  }

  async function deleteBranch(id:string) {
    if(branches.length<=1){alert('لا يمكن حذف الفرع الوحيد');return}
    const r=await api.patch('/api/branches',{org_id:orgId,id,is_active:false})
    if(!r.success){ alert(r.error||'فشل إيقاف الفرع'); return }
    setBranches(prev=>prev.filter((b:any)=>b.id!==id))
  }

  function toggleDay(day:string) {
    const days=form.notify_days.includes(day)?form.notify_days.filter(d=>d!==day):[...form.notify_days,day]
    if(days.length===0) return
    setForm({...form,notify_days:days})
  }

  function scheduleLabel() {
    if(form.notify_schedule==='manual') return 'يدوي فقط'
    if(form.notify_schedule==='daily') return `يومياً الساعة ${form.notify_time}`
    const dayLabels=form.notify_days.map(d=>DAYS.find(x=>x.key===d)?.label).join('، ')
    return `أسبوعياً (${dayLabels}) الساعة ${form.notify_time}`
  }

  async function deleteAccount() {
    if(deleteConfirm !== form.name) { setDeleteMsg({ok:false,text:'اسم المنشأة غير صحيح'}); return }
    setDeleting(true)
    try {
      const data=await api.post('/api/delete-account',{org_id:orgId})
      if(data.success){
        await sb.auth.signOut()
        window.location.href='/login?deletion_scheduled=1'
      } else {
        setDeleteMsg({ok:false,text:'حدث خطأ أثناء الحذف — تواصل معنا'})
        setDeleting(false)
      }
    } catch {
      setDeleteMsg({ok:false,text:'خطأ في الاتصال'})
      setDeleting(false)
    }
  }

  const pk = planKeyOf(planKey, maxBranches)
  const planPrice = planPriceFor(pk, lockedPlan)
  const planLabel = `الباقة ${planPrice.label} — ${billingCycle==='yearly' ? `${planPrice.yearly} ⃁/سنة` : `${planPrice.monthly} ⃁/شهر`}`
  const bill = billLines(pk, billingCycle, billAddons, lockedPlan, discount)

  return { loading, setLoading, showDelete, setShowDelete, deleteConfirm, setDeleteConfirm, deleting, setDeleting, deleteMsg, setDeleteMsg, saving, setSaving, sending, setSending, saveOk, setSaveOk, sendMsg, setSendMsg, orgId, setOrgId, isOwner, setIsOwner, lastSent, setLastSent, lastBackup, setLastBackup, backups, setBackups, backupLoading, setBackupLoading, backupMsg, setBackupMsg, branches, setBranches, inactiveBranches, setInactiveBranches, reactivatingId, setReactivatingId, maxBranches, setMaxBranches, newBranch, setNewBranch, editingPhoneId, setEditingPhoneId, editPhoneValue, setEditPhoneValue, savingPhone, setSavingPhone, branchSaving, setBranchSaving, pwForm, setPwForm, pwSaving, setPwSaving, pwMsg, setPwMsg, activeTab, setActiveTab, visible, setVisible, countryCode, setCountryCode, logoUrl, setLogoUrl, logoUploading, setLogoUploading, planName, setPlanName, billingCycle, setBillingCycle, userEmail, setUserEmail, userPhone, setUserPhone, userFullName, setUserFullName, userId, setUserId, savingPersonal, setSavingPersonal, personalSaveOk, setPersonalSaveOk, subEndsAt, setSubEndsAt, planKey, setPlanKey, lockedPlan, setLockedPlan, billAddons, setBillAddons, discount, setDiscount, form, setForm, sb, pk, planPrice, planLabel, bill, loadInactiveBranches, reactivateBranch, saveBranchPhone, savePersonalInfo, changePassword, load, handleSave, uploadLogo, sendNow, loadBackups, runBackup, addBranch, deleteBranch, toggleDay, scheduleLabel, deleteAccount }
}

export type SettingsState = ReturnType<typeof useSettings>
