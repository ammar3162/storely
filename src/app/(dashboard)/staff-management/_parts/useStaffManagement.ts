'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getMe, getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'
import { currencySymbol } from '@/lib/currencySymbol'
import { confirmDialog } from '@/components/ConfirmDialog'
import { cache } from '@/lib/cache'
import { generatePin } from './helpers'

/** كل حالة ودوال صفحة الموظفين — منقولة كما هي من page.tsx */
export function useStaffManagement() {
  const [showUnassigned, setShowUnassigned] = useState(false)
  const [pickerFor, setPickerFor] = useState<string|null>(null)
  const [assigning, setAssigning] = useState(false)
  const orgPlan = typeof window!=='undefined' ? (sessionStorage.getItem('s_plan')||'basic') : 'basic'
  const [staff, setStaff]           = useState<any[]>([])
  const [branches, setBranches]     = useState<any[]>([])
  const [isOwnerSM, setIsOwnerSM]   = useState(false)
  const [moveFor, setMoveFor]       = useState<any|null>(null)   // الموظف اللي ننقله
  const [moveTo, setMoveTo]         = useState('')
  const [moving, setMoving]         = useState(false)
  const [orgId, setOrgId]           = useState('')
  const [curr, setCurr]             = useState('⃁')
  const [orgNotifyClosingWA, setOrgNotifyClosingWA] = useState(true)
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [newPermissions, setNewPermissions] = useState({dispense:false,inventory:false,purchases:false,reports:false,cashier:false})
  const [editingPerms, setEditingPerms] = useState<string|null>(null)
  const [editingRole, setEditingRole] = useState<string|null>(null)
  const [reportMode, setReportMode] = useState<'dispense'|'closings'>('dispense')
  const [editPerms, setEditPerms] = useState({dispense:true,inventory:false,purchases:false,reports:false,cashier:false})
  const [newName, setNewName]       = useState('')
  const [newPhone, setNewPhone]     = useState('')
  const [staffCountry, setStaffCountry] = useState(()=>sessionStorage.getItem('s_country_code')||'+966')
  const [newBranch, setNewBranch]   = useState(typeof window!=='undefined' ? (sessionStorage.getItem('s_branch_id')||'') : '')
  const [newRole, setNewRole]       = useState<'staff'|'cashier'>('staff')
  // الكاشير متاح بالشاملة/المتقدمة أو بإضافة «إقفال الكاشير» — من نفس مصدر الخادم (/api/me)
  const [hasCashier, setHasCashier] = useState(orgPlan!=='basic')
  const [newSendClosingWA, setNewSendClosingWA] = useState(true)
  const [revealedPin, setRevealedPin] = useState<{name:string,phone:string,pin:string}|null>(null)
  const [visiblePins, setVisiblePins] = useState<Record<string,boolean>>({})
  const [revealedPins, setRevealedPins] = useState<Record<string,string>>({})
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [editingStaffPhoneId, setEditingStaffPhoneId] = useState<string|null>(null)
  const [editStaffPhoneVal, setEditStaffPhoneVal] = useState('')
  const [savingStaffPhone, setSavingStaffPhone] = useState(false)

  async function saveStaffPhone(id: string) {
    if (!editStaffPhoneVal.trim()) { toast('أدخل رقم صحيح', 'warning'); return }
    setSavingStaffPhone(true)
    const r = await api.patch('/api/staff-members', { org_id: orgId, id, phone: editStaffPhoneVal.trim() })
    setSavingStaffPhone(false)
    if (!r.success) { toast(r.error || 'فشل التحديث', 'error'); return }
    setEditingStaffPhoneId(null)
    toast('✅ تم تحديث رقم الموظف')
    loadStaff(orgId)
  }
  const [visible, setVisible]       = useState(false)
  const [maxStaff, setMaxStaff]     = useState(999)
  const [products, setProducts]     = useState<any[]>([])
  const [assigningId, setAssigningId] = useState<string|null>(null)
  const [editingNameId, setEditingNameId] = useState<string|null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [reportStaff, setReportStaff] = useState<any|null>(null)
  const [staffReport, setStaffReport] = useState<any[]>([])
  const [staffClosings, setStaffClosings] = useState<any[]>([])
  const [reportLoading, setReportLoading] = useState(false)
  const [selectedProds, setSelectedProds] = useState<string[]>([])
  const [assignSearch, setAssignSearch] = useState('')

  const [sharedProducts, setSharedProducts] = useState<Record<string,string[]>>({})
  const [dayStartHour, setDayStartHour] = useState(4)   // بداية يوم العمل الجديد لإقفال الكاشير
  const [dayStartLoaded, setDayStartLoaded] = useState(4)
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [savingHours, setSavingHours] = useState(false)

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(orgId, ['staff_members'], ()=>{ if(orgId) loadStaff(orgId) })
  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    let oid = sessionStorage.getItem('s_org_id')
    // عرض كاش الموظفين فوراً لو متوفر -- يخلي الصفحة تبان فوراً بدل ما تنتظر رحلتين شبكة (مستخدم ثم بروفايل)
    if (oid) {
      const cachedStaff = cache.get('staff:'+oid)
      if (cachedStaff) { setStaff(cachedStaff); setLoading(false); setTimeout(()=>setVisible(true),50) }
    }
    if (!oid) {
      oid = await getOrgId(); if(!oid) return
    }
    setOrgId(oid)
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)); setIsOwnerSM(me?.role==='owner'); if(me?.org?.features) setHasCashier(!!me.org.features.cashier) })
    const settingsRes = await api.get('/api/org-settings', { org_id: oid })
    const orgLimits = settingsRes.settings
    const h = Number((orgLimits as any)?.business_day_start_hour ?? 4)
    setDayStartHour(h); setDayStartLoaded(h)
    setOrgNotifyClosingWA((orgLimits as any)?.notify_cashier_closing_wa!==false)
    // حد الموظفين صار خاص بكل فرع لحاله -- نجيبه من الفرع الحالي المختار، مو من المؤسسة كاملة
    const currentBranchId = sessionStorage.getItem('s_branch_id')
    if (currentBranchId) {
      const bl = await api.get('/api/branches', { org_id: oid, with_limits: 1 })
      const branchLimits = (bl.branches||[]).find((b:any)=>b.id===currentBranchId)
      setMaxStaff(branchLimits?.max_staff||3)
    } else {
      setMaxStaff(999) // ما فيه فرع محدد (يشوف كل الفروع) -- ما نقدر نطبّق حد واحد، السيرفر هو اللي يتحقق أصلاً
    }
    await Promise.all([loadStaff(oid),loadBranches(oid),loadProducts(oid)])
    setLoading(false); setTimeout(()=>setVisible(true),50)
  }

  const [orphans, setOrphans] = useState<any[]>([])   // موظفين فروعهم موقوفة

  async function loadStaff(oid:string) {
    const bid = sessionStorage.getItem('s_branch_id')
    const j = await api.get('/api/staff-members', { org_id: oid, branch_id: bid })
    if (!j.success) return
    setStaff(j.staff||[])
    setOrphans(j.orphans||[])
    cache.set('staff:'+oid, j.staff||[])
  }

  // موظف فرعه موقوف → ننقله للفرع المختار حالياً (يبقى موقوف لين المالك يفعّله)
  async function moveOrphanHere(s:any) {
    const bid = sessionStorage.getItem('s_branch_id')
    const bname = sessionStorage.getItem('s_branch_name') || 'الفرع الحالي'
    if (!bid) { toast('اختر الفرع من القائمة فوق أول','warning'); return }
    if(!(await confirmDialog({ title:`نقل ${s.name}`, message:`ينتقل ${s.name} إلى «${bname}» ويبقى موقوف — تقدر تفعّله بعدها من زر «تفعيل».`, confirmText:'نقل', type:'warning' }))) return
    const r = await api.patch('/api/staff-members', { org_id: orgId, id: s.id, branch_id: bid })
    if (!r.success) { toast(r.error || 'تعذر النقل','error'); return }
    toast(`تم نقل ${s.name} إلى ${bname}`); loadStaff(orgId)
  }

  async function loadProducts(oid:string) {
    const bidProd = sessionStorage.getItem('s_branch_id')
    const j = await api.get('/api/products', { org_id: oid, branch_id: bidProd })
    setProducts(j.products||[])
  }

  async function openReport(s:any, mode:'dispense'|'closings' = s.role==='cashier'?'closings':'dispense') {
    setReportStaff(s); setReportMode(mode)
    setReportLoading(true)
    const j = await api.get('/api/staff-members/report', { org_id: orgId, staff_id: s.id, ...(mode==='closings'?{view:'closings'}:{}) })
    if(mode==='closings'){
      setStaffClosings(j.closings||[])
      setReportLoading(false)
      return
    }
    setStaffReport(j.movements||[])
    setReportLoading(false)
  }

  async function openAssign(s:any) {
    setAssigningId(s.id)
    setSelectedProds(s.assigned_products||[])
    // المنتج ممكن يكون عند أكثر من موظف — نعرض بس مين عنده بعد للمعلومية
    const shared: Record<string,string[]> = {}
    staff.forEach((other:any)=>{
      if(other.id===s.id) return
      ;(other.assigned_products||[]).forEach((pid:string)=>{ (shared[pid] ||= []).push(other.name) })
    })
    setSharedProducts(shared)
  }

  async function saveAssigned() {
    const r = await api.post('/api/staff-members/assign', { org_id: orgId, staff_id: assigningId, product_ids: selectedProds })
    if (!r.success) { toast(r.error || 'فشل الحفظ', 'error'); return }
    toast('تم حفظ منتجات الموظف')
    setAssigningId(null)
    loadStaff(orgId)
  }

  async function quickAssignProduct(productId:string, staffId:string) {
    setAssigning(true)
    const target = staff.find((s:any)=>s.id===staffId)
    if(!target){ setAssigning(false); return }
    const r = await api.post('/api/staff-members/assign', { org_id: orgId, staff_id: staffId, add_product_id: productId })
    setAssigning(false)
    if(!r.success){ toast(r.error || 'فشل التخصيص — حاول مرة أخرى','error'); return }
    toast(`✅ تم تخصيص المنتج لـ${target.name}`)
    setPickerFor(null)
    loadStaff(orgId)
  }

  // نقل موظف لفرع ثاني (المالك، ولو عنده أكثر من فرع)
  async function confirmMove() {
    if (!moveFor || !moveTo || moving) return
    setMoving(true)
    const r = await api.patch('/api/staff-members', { org_id: orgId, id: moveFor.id, branch_id: moveTo })
    setMoving(false)
    if (!r.success) { toast(r.error || 'تعذر النقل','error'); return }
    const bname = branches.find((b:any)=>b.id===moveTo)?.name || 'الفرع'
    toast(`تم نقل ${moveFor.name} إلى ${bname}${(r as any).notes?.length ? ' — ' + (r as any).notes.join('، ') : ''}`)
    setMoveFor(null); setMoveTo(''); loadStaff(orgId)
  }

  async function loadBranches(oid:string) {
    const j = await api.get('/api/branches', { org_id: oid })
    const data = j.branches||[]
    setBranches(data)
    // خلّي الفرع الافتراضي هو الفرع النشط بالجلسة (اللي شغّال فيه المالك حالياً) —
    // لا تفرض دايماً أول فرع بالقائمة (كان يوقع الموظفين دايماً بالفرع الرئيسي)
    const activeBid = typeof window!=='undefined' ? sessionStorage.getItem('s_branch_id') : null
    if (activeBid && (data||[]).some((b:any)=>b.id===activeBid)) setNewBranch(activeBid)
    else if(data&&data.length>0) setNewBranch(data[0].id)
  }

  async function addStaff() {
    if(!newName.trim()||!newPhone.trim()){toast('أدخل اسم الموظف ورقم جواله','warning');return}
    const phoneRules: Record<string,number> = {'+966':9,'+971':9,'+965':8,'+973':8,'+974':8,'+968':8,'+20':10,'+962':9,'+1':10,'+44':10,'+91':10,'+92':10,'+880':10,'+63':10}
    const reqLen = phoneRules[staffCountry] || 9
    const cleanedPhone = newPhone.trim().replace(/^0+/,'')
    if(cleanedPhone.length !== reqLen){toast(`رقم الجوال يجب أن يكون ${reqLen} أرقام`,'warning');return}
    const cleanPhone=staffCountry + newPhone.trim().replace(/^0+/,'').replace(/\s/g,'')
    const pin=generatePin()
    const activeBranch = sessionStorage.getItem('s_branch_id') || newBranch || null
    const resData = await api.post('/api/add-staff', {org_id:orgId, branch_id:activeBranch, name:newName.trim(), phone:cleanPhone, pin, permissions:newPermissions, role:newRole, send_closing_whatsapp:newSendClosingWA})
    if(!resData.success){
      if((resData as any).duplicate) toast(resData.error,'error')
      else toast('خطأ: '+(resData.error||'حدث خطأ'),'error')
      return
    }
    if(newRole==='cashier' && dayStartHour!==dayStartLoaded){
      const r = await api.patch('/api/org-settings', {org_id:orgId, business_day_start_hour:dayStartHour})
      if (r.success) setDayStartLoaded(dayStartHour)
    }
    setRevealedPin({name:newName.trim(),phone:cleanPhone,pin})
    setNewName('');setNewPhone('');setNewRole('staff');setNewSendClosingWA(true);setShowAdd(false)
    loadStaff(orgId)
  }

  async function savePermissions(id:string) {
    const r = await api.patch('/api/staff-members', { org_id: orgId, id, permissions: editPerms })
    if (!r.success) { toast(r.error || 'فشل الحفظ', 'error'); return }
    toast('✅ تم حفظ الصلاحيات')
    setEditingPerms(null)
    loadStaff(orgId)
  }

  async function saveName() {
    if(!editingNameId || !editNameValue.trim()) return
    setSavingName(true)
    const r = await api.patch('/api/staff-members', { org_id: orgId, id: editingNameId, name: editNameValue.trim() })
    if (!r.success) { toast(r.error || 'فشل التحديث', 'error'); setSavingName(false); return }
    toast('✅ تم تحديث اسم الموظف')
    setEditingNameId(null)
    setSavingName(false)
    loadStaff(orgId)
  }

  async function saveShopHours() {
    setSavingHours(true)
    const r = await api.patch('/api/org-settings', {org_id:orgId, business_day_start_hour:dayStartHour})
    if (!r.success) { toast(r.error || 'فشل الحفظ', 'error'); setSavingHours(false); return }
    setDayStartLoaded(dayStartHour)
    toast('✅ تم حفظ بداية يوم العمل')
    setSavingHours(false)
    setShowHoursModal(false)
  }

  async function toggleActive(s:any) {
    const activating = !s.is_active
    // فحص إضافة "موظف إضافي" وحد الباقة عند إعادة التفعيل يصير على الخادم
    const r = await api.patch('/api/staff-members', { org_id: orgId, id: s.id, is_active: activating })
    if (!r.success) { toast(r.error || 'حدث خطأ', 'error'); return }
    toast(s.is_active?'تم إيقاف الموظف':'تم تفعيل الموظف')
    loadStaff(orgId)
  }

  async function deleteStaff(id:string) {
    if(!(await confirmDialog({ title: 'حذف الموظف', message: 'حذف هذا الموظف نهائياً؟' }))) return
    const r = await api.del('/api/staff-members', { org_id: orgId, id })
    if (!r.success) {
      // القيود صارت SET NULL بدل ما تمنع الحذف -- لو وصلنا هنا فهذا خطأ فعلي غير متوقع، مو قيد ربط بيانات عادي
      toast('حدث خطأ أثناء الحذف — حاول مرة أخرى', 'error')
      return
    }
    toast('تم الحذف'); loadStaff(orgId)
  }

  async function toggleSendClosingWA(id:string, current:boolean) {
    const r = await api.patch('/api/staff-members', { org_id: orgId, id, send_closing_whatsapp: !current })
    if (!r.success) { toast(r.error || 'حدث خطأ', 'error'); return }
    setStaff(prev=>prev.map((s:any)=>s.id===id?{...s,send_closing_whatsapp:!current}:s))
    toast(!current?'✅ راح توصل تفاصيل الإقفال كاملة عبر واتساب':'✅ راح يوصل بس إشعار بسيط بدون تفاصيل')
  }

  // أيقونة العين: الرمز المشفّر ينطلب من الخادم وقت الضغط، ويختفي تلقائياً بعد 20 ثانية
  async function togglePin(s:any) {
    if (visiblePins[s.id]) { setVisiblePins(v=>({...v,[s.id]:false})); return }
    if (String(s.pin||'').startsWith('$2') && !revealedPins[s.id]) {
      const r = await api.post('/api/staff-members/reveal-pin', { org_id: orgId, id: s.id })
      if (!r.success) { toast(r.error || 'ما نقدر نعرض هذا الرمز — ولّد رمز جديد', 'error'); return }
      setRevealedPins(v=>({...v,[s.id]:r.pin}))
    }
    setVisiblePins(v=>({...v,[s.id]:true}))
    setTimeout(()=>{ setVisiblePins(v=>({...v,[s.id]:false})); setRevealedPins(v=>{ const n={...v}; delete n[s.id]; return n }) }, 20000)
  }

  async function regeneratePin(id:string,name:string,phone:string) {
    // الرمز يتولّد ويتشفّر على الخادم، ويرجع هنا مرة وحدة عشان المالك يعطيه للموظف
    const r = await api.post('/api/staff-members/regenerate-pin', { org_id: orgId, id })
    if (!r.success) { toast(r.error || 'حدث خطأ', 'error'); return }
    setRevealedPin({name,phone,pin:r.pin}); loadStaff(orgId)
  }

  // نستثني من العرض بالكامل الموظفين الموقوفين بسبب إلغاء إضافة "موظف إضافي" (addon_subscription_id)
  // -- الموقوفين يدوياً من المالك (زي إجازة) يفضلون ظاهرين بقسم "موقوفون" عادي
  const visibleStaff = staff.filter(s => !s.hidden_from_list)
  const activeCount   = visibleStaff.filter(s=>s.is_active).length
  const inactiveCount = visibleStaff.filter(s=>!s.is_active).length

  return { showUnassigned, setShowUnassigned, pickerFor, setPickerFor, assigning, setAssigning, staff, setStaff, branches, setBranches, isOwnerSM, setIsOwnerSM, moveFor, setMoveFor, moveTo, setMoveTo, moving, setMoving, orgId, setOrgId, curr, setCurr, orgNotifyClosingWA, setOrgNotifyClosingWA, loading, setLoading, showAdd, setShowAdd, newPermissions, setNewPermissions, editingPerms, setEditingPerms, editingRole, setEditingRole, reportMode, setReportMode, editPerms, setEditPerms, newName, setNewName, newPhone, setNewPhone, staffCountry, setStaffCountry, newBranch, setNewBranch, newRole, setNewRole, hasCashier, setHasCashier, newSendClosingWA, setNewSendClosingWA, revealedPin, setRevealedPin, visiblePins, setVisiblePins, revealedPins, setRevealedPins, expandedId, setExpandedId, editingStaffPhoneId, setEditingStaffPhoneId, editStaffPhoneVal, setEditStaffPhoneVal, savingStaffPhone, setSavingStaffPhone, visible, setVisible, maxStaff, setMaxStaff, products, setProducts, assigningId, setAssigningId, editingNameId, setEditingNameId, editNameValue, setEditNameValue, savingName, setSavingName, reportStaff, setReportStaff, staffReport, setStaffReport, staffClosings, setStaffClosings, reportLoading, setReportLoading, selectedProds, setSelectedProds, assignSearch, setAssignSearch, sharedProducts, setSharedProducts, dayStartHour, setDayStartHour, dayStartLoaded, setDayStartLoaded, showHoursModal, setShowHoursModal, savingHours, setSavingHours, orphans, setOrphans, orgPlan, visibleStaff, activeCount, inactiveCount, saveStaffPhone, init, loadStaff, moveOrphanHere, loadProducts, openReport, openAssign, saveAssigned, quickAssignProduct, confirmMove, loadBranches, addStaff, savePermissions, saveName, saveShopHours, toggleActive, deleteStaff, toggleSendClosingWA, togglePin, regeneratePin }
}

export type StaffPage = ReturnType<typeof useStaffManagement>
