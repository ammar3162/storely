'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { WHATSAPP_PAUSED } from '@/lib/whatsappPause'

function generatePin() { return String(Math.floor(1000 + Math.random() * 9000)) }
const COUNTRY_CODES = ['+966','+971','+965','+973','+974','+968','+20','+962','+1','+44','+91','+92','+880','+63']
function toLocalPhone(phone: string) {
  if (!phone) return phone
  const code = COUNTRY_CODES.find(c => phone.startsWith(c))
  if (!code) return phone
  return '0' + phone.slice(code.length)
}

function Avatar({ name, active }: { name:string; active:boolean }) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{
      width:44,height:44,borderRadius:14,
      background:active?`linear-gradient(135deg,${colors.primary},#15803d)`:'linear-gradient(135deg,#94a3b8,#64748b)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:14,fontWeight:900,color:'white',flexShrink:0,
      boxShadow:active?`0 4px 12px ${colors.primary}33`:'none',
    }}>
      {initials||'؟'}
    </div>
  )
}

export default function StaffManagementPage() {
  const orgPlan = typeof window!=='undefined' ? (sessionStorage.getItem('s_plan')||'basic') : 'basic'
  const [staff, setStaff]           = useState<any[]>([])
  const [branches, setBranches]     = useState<any[]>([])
  const [orgId, setOrgId]           = useState('')
  const [orgNotifyClosingWA, setOrgNotifyClosingWA] = useState(true)
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [newPermissions, setNewPermissions] = useState({dispense:false,inventory:false,purchases:false,reports:false})
  const [editingPerms, setEditingPerms] = useState<string|null>(null)
  const [editPerms, setEditPerms] = useState({dispense:true,inventory:false,purchases:false,reports:false})
  const [newName, setNewName]       = useState('')
  const [newPhone, setNewPhone]     = useState('')
  const [staffCountry, setStaffCountry] = useState(()=>sessionStorage.getItem('s_country_code')||'+966')
  const [newBranch, setNewBranch]   = useState(typeof window!=='undefined' ? (sessionStorage.getItem('s_branch_id')||'') : '')
  const [newRole, setNewRole]       = useState<'staff'|'cashier'>('staff')
  const [newSendClosingWA, setNewSendClosingWA] = useState(true)
  const [revealedPin, setRevealedPin] = useState<{name:string,phone:string,pin:string}|null>(null)
  const [visiblePins, setVisiblePins] = useState<Record<string,boolean>>({})
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [editingStaffPhoneId, setEditingStaffPhoneId] = useState<string|null>(null)
  const [editStaffPhoneVal, setEditStaffPhoneVal] = useState('')
  const [savingStaffPhone, setSavingStaffPhone] = useState(false)

  async function saveStaffPhone(id: string) {
    if (!editStaffPhoneVal.trim()) { toast('أدخل رقم صحيح', 'warning'); return }
    setSavingStaffPhone(true)
    await (sb.from('staff_members' as any) as any).update({ phone: editStaffPhoneVal.trim() }).eq('id', id)
    setSavingStaffPhone(false)
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
  const [takenProducts, setTakenProducts] = useState<Record<string,string>>({})
  const [shopOpenTime, setShopOpenTime] = useState('')
  const [shopCloseTime, setShopCloseTime] = useState('')
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const sb = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const{data:{user}}=await sb.auth.getUser(); if(!user) return
    const{data:profile}=await sb.from('profiles').select('org_id').eq('id',user.id).single(); if(!profile?.org_id) return
    setOrgId(profile.org_id)
    const{data:orgLimits}=await (sb as any).from('organizations').select('max_staff,shop_open_time,shop_close_time,notify_cashier_closing_wa').eq('id',profile.org_id).single()
    setMaxStaff((orgLimits as any)?.max_staff||1)
    setShopOpenTime(((orgLimits as any)?.shop_open_time||'').slice(0,5))
    setShopCloseTime(((orgLimits as any)?.shop_close_time||'').slice(0,5))
    setOrgNotifyClosingWA((orgLimits as any)?.notify_cashier_closing_wa!==false)
    await Promise.all([loadStaff(profile.org_id),loadBranches(profile.org_id),loadProducts(profile.org_id)])
    setLoading(false); setTimeout(()=>setVisible(true),50)
  }

  async function loadStaff(oid:string) {
    const bid = sessionStorage.getItem('s_branch_id')
    let q = (sb.from('staff_members' as any) as any).select('*,branches(name)').eq('org_id',oid)
    if (bid) q = q.eq('branch_id', bid)
    const{data}=await q.order('created_at',{ascending:false})
    setStaff(data||[])
  }

  async function loadProducts(oid:string) {
    const bidProd = sessionStorage.getItem('s_branch_id')
    let pq = sb.from('products').select('id,name,unit,category').eq('org_id',oid).eq('is_active',true)
    if (bidProd) pq = pq.eq('branch_id', bidProd)
    const{data}=await pq.order('name')
    setProducts(data||[])
  }

  async function openReport(s:any) {
    setReportStaff(s)
    setReportLoading(true)
    if(s.role==='cashier'){
      const{data}=await sb.from('cashier_closings' as any)
        .select('id,status,closing_date,total_sales,network_amount,difference')
        .eq('staff_id',s.id)
        .order('closing_date',{ascending:false})
        .order('created_at',{ascending:false})
        .limit(50)
      setStaffClosings((data||[]) as any[])
      setReportLoading(false)
      return
    }
    const{data}=await sb.from('stock_movements')
      .select('id,qty_change,created_at,note,products!inner(name,unit)')
      .ilike('note', `%صرف بواسطة الموظف: ${s.name}%`)
      .eq('type','out')
      .order('created_at',{ascending:false})
      .limit(50)
    setStaffReport(data||[])
    setReportLoading(false)
  }

  async function openAssign(s:any) {
    setAssigningId(s.id)
    setSelectedProds(s.assigned_products||[])
    const taken: Record<string,string> = {}
    staff.forEach((other:any)=>{
      if(other.id===s.id) return
      ;(other.assigned_products||[]).forEach((pid:string)=>{ taken[pid] = other.name })
    })
    setTakenProducts(taken)
  }

  async function saveAssigned() {
    await (sb.from('staff_members' as any) as any).update({assigned_products:selectedProds}).eq('id',assigningId)
    toast('✅ تم حفظ المنتجات المخصصة')
    setAssigningId(null)
    loadStaff(orgId)
  }

  async function loadBranches(oid:string) {
    const{data}=await sb.from('branches').select('id,name').eq('org_id',oid).eq('is_active',true).order('created_at')
    setBranches(data||[])
    if(data&&data.length>0) setNewBranch(data[0].id)
  }

  async function addStaff() {
    if(!newName.trim()||!newPhone.trim()){toast('أدخل اسم الموظف ورقم جواله','warning');return}
    const phoneRules: Record<string,number> = {'+966':9,'+971':9,'+965':8,'+973':8,'+974':8,'+968':8,'+20':10,'+962':9,'+1':10,'+44':10,'+91':10,'+92':10,'+880':10,'+63':10}
    const reqLen = phoneRules[staffCountry] || 9
    const cleanedPhone = newPhone.trim().replace(/^0+/,'')
    if(cleanedPhone.length !== reqLen){toast(`رقم الجوال يجب أن يكون ${reqLen} أرقام`,'warning');return}
    if(staff.length>=maxStaff){toast(`باقتك تسمح بـ ${maxStaff} موظف فقط — يرجى الترقية`,'error');return}
    const cleanPhone=staffCountry + newPhone.trim().replace(/^0+/,'').replace(/\s/g,'')
    const pin=generatePin()
    const res = await fetch('/api/add-staff', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({org_id:orgId, branch_id:newBranch||null, name:newName.trim(), phone:cleanPhone, pin, permissions:newPermissions, role:newRole, send_closing_whatsapp:newSendClosingWA})
    })
    const resData = await res.json()
    const error = !res.ok ? resData.error : null
    if(error){
      if(res.status===409) toast('رقم الجوال هذا مسجّل لموظف آخر','error')
      else toast('خطأ: '+error,'error')
      return
    }
    if(newRole==='cashier' && shopOpenTime && shopCloseTime){
      await (sb.from('organizations' as any) as any).update({shop_open_time:shopOpenTime, shop_close_time:shopCloseTime}).eq('id',orgId)
    }
    setRevealedPin({name:newName.trim(),phone:cleanPhone,pin})
    setNewName('');setNewPhone('');setNewRole('staff');setNewSendClosingWA(true);setShowAdd(false)
    loadStaff(orgId)
  }

  async function savePermissions(id:string) {
    await (sb.from('staff_members' as any) as any).update({permissions:editPerms}).eq('id',id)
    toast('✅ تم حفظ الصلاحيات')
    setEditingPerms(null)
    loadStaff(orgId)
  }

  async function saveName() {
    if(!editingNameId || !editNameValue.trim()) return
    setSavingName(true)
    await (sb.from('staff_members' as any) as any).update({name:editNameValue.trim()}).eq('id',editingNameId)
    toast('✅ تم تحديث اسم الموظف')
    setEditingNameId(null)
    setSavingName(false)
    loadStaff(orgId)
  }

  async function saveShopHours() {
    if(!shopOpenTime||!shopCloseTime){toast('حدد وقت الفتح والإغلاق','warning');return}
    setSavingHours(true)
    await (sb.from('organizations' as any) as any).update({shop_open_time:shopOpenTime, shop_close_time:shopCloseTime}).eq('id',orgId)
    toast('✅ تم تحديث ساعات العمل')
    setSavingHours(false)
    setShowHoursModal(false)
  }

  async function toggleActive(id:string,current:boolean) {
    await (sb.from('staff_members' as any) as any).update({is_active:!current}).eq('id',id)
    toast(current?'تم إيقاف الموظف':'تم تفعيل الموظف')
    loadStaff(orgId)
  }

  async function deleteStaff(id:string) {
    if(!confirm('حذف هذا الموظف نهائياً؟')) return
    await (sb.from('staff_members' as any) as any).delete().eq('id',id)
    toast('تم الحذف'); loadStaff(orgId)
  }

  async function toggleSendClosingWA(id:string, current:boolean) {
    await (sb.from('staff_members' as any) as any).update({send_closing_whatsapp: !current}).eq('id',id)
    setStaff(prev=>prev.map((s:any)=>s.id===id?{...s,send_closing_whatsapp:!current}:s))
    toast(!current?'✅ راح توصل تفاصيل الإقفال كاملة عبر واتساب':'✅ راح يوصل بس إشعار بسيط بدون تفاصيل')
  }

  async function regeneratePin(id:string,name:string,phone:string) {
    const pin=generatePin()
    await (sb.from('staff_members' as any) as any).update({pin}).eq('id',id)
    setRevealedPin({name,phone,pin}); loadStaff(orgId)
  }

  const activeCount   = staff.filter(s=>s.is_active).length
  const inactiveCount = staff.filter(s=>!s.is_active).length

  if(loading) return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto'}}>
      <style>{`@keyframes sk{0%,100%{opacity:1}50%{opacity:.3}}.sk{animation:sk 1.6s ease-in-out infinite}`}</style>
      <div style={{height:20,width:120,background:colors.border2,borderRadius:6,marginBottom:8}} className="sk"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
        {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:80,borderRadius:radius.lg,background:colors.border}}/>))}
      </div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
        {[1,2,3].map(i=>(<div key={i} className="sk" style={{height:80,borderRadius:radius.lg,background:colors.border}}/>))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:font.family,direction:'rtl',maxWidth:900,margin:'0 auto',opacity:visible?1:0,transition:'opacity .4s ease'}}>
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:none}}
        .su{animation:slideUp .4s ease both}
        input:focus,select:focus{border-color:${colors.primary}!important;box-shadow:0 0 0 3px ${colors.primaryLight}!important}
        .staff-card{transition:all .2s cubic-bezier(.4,0,.2,1)}
        .staff-card:hover{box-shadow:${shadow.md}!important}
        .act-btn{border:none;border-radius:8px;padding:6px 12px;font-size:${font.xs};font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
        .act-btn:hover{transform:scale(1.05)}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}} className="su">
        <div>
          <h1 style={pageTitle}>الموظفون</h1>
          <p style={pageSub}>أضف موظفين بصلاحيات صرف فقط — يدخلون برقم جوالهم ورمز PIN</p>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{...btnPrimary,padding:'10px 18px',fontSize:font.sm,display:'flex',alignItems:'center',gap:6}}>
          <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          موظف جديد
        </button>
      </div>

      {!orgNotifyClosingWA && staff.some((s:any)=>s.role==='cashier') && (
        <div style={{background:colors.warningLight,border:`1.5px solid ${colors.warningBorder}`,borderRadius:radius.md,padding:'12px 16px',marginBottom:16,fontSize:font.sm,color:colors.warning,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18}}>⚠️</span>
          <div>
            <b>تقارير إقفال الكاشير عبر واتساب موقّفة من الإعدادات العامة.</b> الخيارات تحت لكل موظف (مفعّل/موقّف) ما راح تشتغل حتى تفعّلها من <a href="/settings" style={{color:colors.warning,textDecoration:'underline',fontWeight:700}}>الإعدادات ← الإشعارات</a>.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="su" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20,animationDelay:'.05s'}}>
        {[
          {label:'إجمالي الموظفين',value:staff.length,      color:colors.info,    bg:colors.infoLight,    border:colors.infoBorder,    icon:'👥'},
          {label:'موظفون نشطون',   value:activeCount,         color:colors.primary, bg:colors.primaryLight, border:colors.primaryBorder, icon:'✅'},
          {label:'موقوفون',        value:inactiveCount,       color:colors.danger,  bg:colors.dangerLight,  border:colors.dangerBorder,  icon:'⏸'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:radius.lg,padding:'16px',border:`1.5px solid ${s.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:'uppercase' as const,letterSpacing:'.06em'}}>{s.label}</div>
              <span style={{fontSize:18}}>{s.icon}</span>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revealed PIN card */}
      {revealedPin && (
        <div className="su" style={{...card,padding:20,marginBottom:18,background:colors.primaryLight,border:`1.5px solid ${colors.primaryBorder}`,animationDelay:'.08s'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <div style={{width:40,height:40,borderRadius:12,background:colors.primary,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>✅</div>
            <div>
              <div style={{fontSize:font.base,fontWeight:800,color:colors.text}}>تم إضافة {revealedPin.name}</div>
              <div style={{fontSize:font.xs,color:colors.text3}}>شارك هذي البيانات مع الموظف</div>
            </div>
          </div>
          <div style={{background:'white',borderRadius:radius.md,padding:'14px 16px',marginBottom:14,border:`1px solid ${colors.primaryBorder}`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:12}}>
              <div>
                <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:4}}>رقم الجوال</div>
                <div style={{fontSize:font.lg,fontWeight:800,color:colors.text,direction:'ltr',textAlign:'right' as const}}>{revealedPin.phone}</div>
              </div>
              <div>
                <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:4}}>رمز PIN</div>
                <div style={{fontSize:32,fontWeight:900,color:colors.primary,letterSpacing:8}}>{revealedPin.pin}</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:font.xs,color:colors.text4,fontWeight:700,marginBottom:6}}>رابط الدخول</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <div style={{fontSize:font.xs,color:colors.text,background:colors.bg,padding:'8px 12px',borderRadius:8,border:`1px solid ${colors.border}`,flex:1,direction:'ltr',textAlign:'left' as const,overflowX:'auto',whiteSpace:'nowrap' as const}}>https://storely.dev/staff</div>
                <button onClick={()=>{navigator.clipboard.writeText('https://storely.dev/staff');toast('تم نسخ الرابط ✓')}} style={{background:colors.primary,color:'white',border:'none',borderRadius:8,padding:'8px 14px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,whiteSpace:'nowrap' as const}}>
                  📋 نسخ الكل
                </button>
              </div>
            </div>
          </div>
          <button onClick={()=>setRevealedPin(null)} style={{...btnSecondary,padding:'8px 16px',fontSize:font.xs}}>إخفاء ✓</button>
        </div>
      )}

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
              {branches.length>1&&(
                <div>
                  <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>الفرع</label>
                  <select value={newBranch} onChange={e=>setNewBranch(e.target.value)} style={inp()}>
                    {branches.map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
              )}
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>نوع الموظف</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button type="button" onClick={()=>setNewRole('staff')} style={{padding:'12px 10px',borderRadius:10,border:`1.5px solid ${newRole==='staff'?colors.primary:colors.border}`,background:newRole==='staff'?colors.primaryLight:'white',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const,transition:'all .15s',boxShadow:newRole==='staff'?`0 2px 8px ${colors.primary}22`:'none'}}>
                    <div style={{fontWeight:800,fontSize:font.sm,color:newRole==='staff'?colors.primary:colors.text2,marginBottom:3}}>👤 موظف عادي</div>
                    <div style={{fontSize:10,color:newRole==='staff'?colors.primary:colors.text4,opacity:.8,lineHeight:1.4}}>يستخدم نظام الصرف والمخزون</div>
                  </button>
                  <button type="button" onClick={()=>{
                      if(orgPlan==='basic'){toast('ميزة الكاشير تتطلب الباقة المتوسطة فأعلى — يرجى الترقية','warning');return}
                      setNewRole('cashier')
                    }} style={{padding:'12px 10px',borderRadius:10,border:`1.5px solid ${newRole==='cashier'?colors.primary:colors.border}`,background:newRole==='cashier'?colors.primaryLight:'white',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const,transition:'all .15s',boxShadow:newRole==='cashier'?`0 2px 8px ${colors.primary}22`:'none',opacity:orgPlan==='basic'?.55:1,position:'relative' as const}}>
                    {orgPlan==='basic' && (
                      <div style={{position:'absolute',top:-8,left:-6,background:'#1c1c1a',color:'white',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99}}>🔒 المتوسطة</div>
                    )}
                    <div style={{fontWeight:800,fontSize:font.sm,color:newRole==='cashier'?colors.primary:colors.text2,marginBottom:3}}>💰 كاشير</div>
                    <div style={{fontSize:10,color:newRole==='cashier'?colors.primary:colors.text4,opacity:.8,lineHeight:1.4}}>يقفل الصندوق يومياً فقط</div>
                  </button>
                </div>
              </div>
              {newRole==='cashier' && (
                <div style={{background:colors.bg,borderRadius:radius.md,padding:'12px 14px'}}>
                  <div style={{fontSize:font.xs,fontWeight:700,color:colors.text3,marginBottom:4,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>ساعات عمل المحل</div>
                  <div style={{fontSize:10,color:colors.text4,marginBottom:10,lineHeight:1.5}}>يستخدمها النظام ليحدد تاريخ يوم العمل الصحيح لو المحل يقفل بعد منتصف الليل</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <label style={{fontSize:10,fontWeight:700,color:colors.text3,display:'block',marginBottom:4}}>وقت الفتح</label>
                      <input type="time" value={shopOpenTime} onChange={e=>setShopOpenTime(e.target.value)} style={inp()}/>
                    </div>
                    <div>
                      <label style={{fontSize:10,fontWeight:700,color:colors.text3,display:'block',marginBottom:4}}>وقت الإغلاق</label>
                      <input type="time" value={shopCloseTime} onChange={e=>setShopCloseTime(e.target.value)} style={inp()}/>
                    </div>
                  </div>
                  <label style={{display:'flex',alignItems:'center',gap:8,marginTop:12,padding:'10px 12px',background:'white',borderRadius:8,border:`1.5px solid ${newSendClosingWA?colors.primary:colors.border}`,cursor:'pointer'}}>
                    <input type="checkbox" checked={newSendClosingWA} onChange={e=>setNewSendClosingWA(e.target.checked)}
                      style={{accentColor:colors.primary,width:14,height:14}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:newSendClosingWA?colors.primary:colors.text2}}>📲 إرسال تفاصيل الإقفال للمالك عبر واتساب</div>
                      <div style={{fontSize:10,color:colors.text4,marginTop:2,lineHeight:1.4}}>{newSendClosingWA?'تفعّل: يوصل المالك تقرير الإقفال الكامل':'موقّف: يوصل المالك بس إشعار "الكاشير أقفل"، بدون تفاصيل'}</div>
                    </div>
                  </label>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={addStaff} style={{...btnPrimary,flex:2,padding:'12px',fontSize:font.sm}}>✓ إضافة وتوليد PIN</button>
            </div>
            {newRole==='staff' && (
              <div style={{background:colors.bg,borderRadius:radius.md,padding:'14px 16px',marginTop:12}}>
                <div style={{fontSize:font.xs,fontWeight:700,color:colors.text3,marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'.05em'}}>صلاحيات الموظف</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {key:'dispense',   label:'الصرف',      icon:'📤', locked:false},
                    {key:'inventory',  label:'المخزون',    icon:'📦', locked:false},
                    {key:'purchases',  label:'المشتريات',  icon:'🛒', locked:false},
                    {key:'reports',    label:'التقارير',   icon:'📊', locked:false},
                  ].map(p=>(
                    <label key={p.key} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'white',borderRadius:8,border:`1.5px solid ${(newPermissions as any)[p.key]?colors.primary:colors.border}`,cursor:p.locked?'not-allowed':'pointer',transition:'all .15s'}}>
                      <input type="checkbox" checked={(newPermissions as any)[p.key]} disabled={p.locked}
                        onChange={e=>!p.locked&&setNewPermissions(prev=>({...prev,[p.key]:e.target.checked}))}
                        style={{accentColor:colors.primary,width:14,height:14}}/>
                      <span style={{fontSize:12,fontWeight:600,color:(newPermissions as any)[p.key]?colors.primary:colors.text2}}>{p.icon} {p.label}</span>
                      {p.locked&&<span style={{fontSize:9,color:colors.text4}}>(افتراضي)</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Products Modal */}
      {assigningId && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:26,width:'100%',maxWidth:480,maxHeight:'80vh',display:'flex',flexDirection:'column' as const,boxShadow:'0 32px 80px rgba(0,0,0,.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontSize:font.md,fontWeight:800,color:colors.text}}>تخصيص المنتجات</div>
                <div style={{fontSize:font.xs,color:colors.text4,marginTop:2}}>اختر المنتجات التي يراها هذا الموظف فقط</div>
              </div>
              <button onClick={()=>setAssigningId(null)} style={{width:32,height:32,borderRadius:radius.sm,border:`1.5px solid ${colors.border2}`,background:colors.bg,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:colors.text3}}>×</button>
            </div>
            
            {/* اختيار الكل */}
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button onClick={()=>setSelectedProds(products.filter((p:any)=>!takenProducts[p.id]).map((p:any)=>p.id))}
                style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${colors.border2}`,background:colors.bg,color:colors.text2,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                اختيار الكل
              </button>
              <button onClick={()=>setSelectedProds([])}
                style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${colors.border2}`,background:colors.bg,color:colors.text2,fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                إلغاء الكل
              </button>
              <span style={{fontSize:font.xs,color:colors.text4,alignSelf:'center',marginRight:'auto'}}>
                {selectedProds.length===0?'كل المنتجات':`${selectedProds.length} منتج مختار`}
              </span>
            </div>

            {/* قائمة المنتجات */}
            <div style={{overflowY:'auto',flex:1,display:'flex',flexDirection:'column' as const,gap:6,marginBottom:16}}>
              {products.map((p:any)=>{
                const selected = selectedProds.includes(p.id)
                const takenBy = takenProducts[p.id]
                if(takenBy){
                  return (
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${colors.border}`,background:'#f5f5f4',opacity:.6,cursor:'not-allowed'}}>
                      <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${colors.border2}`,background:'white',flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:font.sm,fontWeight:700,color:colors.text3}}>{p.name}</div>
                        <div style={{fontSize:10,color:colors.text4}}>{p.category||'—'} · {p.unit}</div>
                      </div>
                      <span style={{fontSize:9,fontWeight:700,color:colors.warning||'#d97706',background:colors.warningLight||'#fffbeb',padding:'3px 8px',borderRadius:20,whiteSpace:'nowrap' as const,flexShrink:0}}>🔒 {takenBy}</span>
                    </div>
                  )
                }
                return (
                  <div key={p.id} onClick={()=>setSelectedProds(prev=>selected?prev.filter(id=>id!==p.id):[...prev,p.id])}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${selected?colors.primary:colors.border}`,background:selected?colors.primaryLight:colors.bg,cursor:'pointer',transition:'all .15s'}}>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${selected?colors.primary:colors.border2}`,background:selected?colors.primary:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                      {selected&&<span style={{color:'white',fontSize:12,fontWeight:900}}>✓</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:font.sm,fontWeight:700,color:colors.text}}>{p.name}</div>
                      <div style={{fontSize:10,color:colors.text4}}>{p.category||'—'} · {p.unit}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setAssigningId(null)} style={{...btnSecondary,flex:1,padding:'12px',fontSize:font.sm}}>إلغاء</button>
              <button onClick={saveAssigned} style={{...btnPrimary,flex:2,padding:'12px',fontSize:font.sm}}>💾 حفظ التخصيص</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Report Modal */}
      {/* modal صلاحيات */}
      {editingNameId && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:24,width:'100%',maxWidth:360,boxShadow:shadow.lg}}>
            <div style={{fontSize:font.md,fontWeight:800,color:colors.text,marginBottom:16}}>تعديل اسم الموظف</div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5}}>الاسم</label>
              <input value={editNameValue} onChange={e=>setEditNameValue(e.target.value)} style={inp()} placeholder="اسم الموظف"
                onKeyDown={e=>{if(e.key==='Enter')saveName()}}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setEditingNameId(null)} style={{...btnSecondary,flex:1,padding:'12px'}}>إلغاء</button>
              <button onClick={saveName} disabled={savingName||!editNameValue.trim()} style={{...btnPrimary,flex:2,padding:'12px',opacity:savingName?.7:1}}>{savingName?'جاري الحفظ...':'✓ حفظ'}</button>
            </div>
          </div>
        </div>
      )}

      {showHoursModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:colors.surface,borderRadius:radius.xl,padding:24,width:'100%',maxWidth:380,boxShadow:shadow.lg}}>
            <div style={{fontSize:font.md,fontWeight:800,color:colors.text,marginBottom:6}}>ساعات عمل المحل</div>
            <div style={{fontSize:11,color:colors.text4,marginBottom:16,lineHeight:1.5}}>يستخدمها النظام ليحدد تاريخ يوم العمل الصحيح لو المحل يقفل بعد منتصف الليل</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18}}>
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5}}>وقت الفتح</label>
                <input type="time" value={shopOpenTime} onChange={e=>setShopOpenTime(e.target.value)} style={inp()}/>
              </div>
              <div>
                <label style={{fontSize:font.xs,fontWeight:700,color:colors.text3,display:'block',marginBottom:5}}>وقت الإغلاق</label>
                <input type="time" value={shopCloseTime} onChange={e=>setShopCloseTime(e.target.value)} style={inp()}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowHoursModal(false)} style={{...btnSecondary,flex:1,padding:'12px'}}>إلغاء</button>
              <button onClick={saveShopHours} disabled={savingHours} style={{...btnPrimary,flex:2,padding:'12px'}}>{savingHours?'جاري الحفظ...':'✓ حفظ'}</button>
            </div>
          </div>
        </div>
      )}

      {editingPerms && (
        <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setEditingPerms(null)}>
          <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:400,fontFamily:'inherit'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:800,color:'#1c1c1a',marginBottom:4}}>🔐 صلاحيات الموظف</div>
            <div style={{fontSize:12,color:'#888780',marginBottom:20}}>{staff.find(s=>s.id===editingPerms)?.name}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
              {[
                {key:'dispense',   label:'الصرف',      icon:'📤', locked:false},
                {key:'inventory',  label:'المخزون',    icon:'📦', locked:false},
                {key:'purchases',  label:'المشتريات',  icon:'🛒', locked:false},
                {key:'reports',    label:'التقارير',   icon:'📊', locked:false},
              ].map(p=>(
                <label key={p.key} style={{display:'flex',alignItems:'center',gap:8,padding:'12px',background:(editPerms as any)[p.key]?'#f0fdf4':'#f9fafb',borderRadius:10,border:`1.5px solid ${(editPerms as any)[p.key]?'#16a34a':'#e5e7eb'}`,cursor:p.locked?'not-allowed':'pointer',transition:'all .15s'}}>
                  <input type="checkbox" checked={(editPerms as any)[p.key]} disabled={p.locked}
                    onChange={e=>!p.locked&&setEditPerms(prev=>({...prev,[p.key]:e.target.checked}))}
                    style={{accentColor:'#16a34a',width:16,height:16}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:(editPerms as any)[p.key]?'#16a34a':'#374151'}}>{p.icon} {p.label}</div>
                    {p.locked&&<div style={{fontSize:10,color:'#9ca3af'}}>افتراضي</div>}
                  </div>
                </label>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>savePermissions(editingPerms)} style={{flex:2,padding:'12px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>💾 حفظ الصلاحيات</button>
              <button onClick={()=>setEditingPerms(null)} style={{flex:1,padding:'12px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:10,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {reportStaff && reportStaff.role==='cashier' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:560,maxHeight:'85vh',display:'flex',flexDirection:'column',fontFamily:'inherit',direction:'rtl'}}>
            <div style={{padding:'18px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#1c1c1a'}}>تقارير إقفال {reportStaff.name}</div>
                <div style={{fontSize:11,color:'#888780',marginTop:2}}>آخر 50 تقرير إقفال</div>
              </div>
              <button onClick={()=>setReportStaff(null)} style={{width:30,height:30,borderRadius:'50%',border:'1px solid #e0e0dd',background:'#f5f5f4',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#5f5e5a'}}>✕</button>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:'14px 20px',borderBottom:'1px solid #f0f0f0',flexShrink:0}}>
              {[
                {label:'عدد التقارير', value:staffClosings.length, color:'#0891b2'},
                {label:'حالات عجز', value:staffClosings.filter((c:any)=>c.status==='deficit').length, color:'#e24b4a'},
                {label:'حالات زيادة', value:staffClosings.filter((c:any)=>c.status==='surplus').length, color:'#378add'},
              ].map((s,i)=>(
                <div key={i} style={{background:'#f9f9f8',borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:700,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
                  <div style={{fontSize:10,color:'#888780',marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* List */}
            <div style={{overflowY:'auto',flex:1}}>
              {reportLoading?(
                <div style={{padding:'40px',textAlign:'center',color:'#888780',fontSize:13}}>جاري التحميل...</div>
              ):staffClosings.length===0?(
                <div style={{padding:'40px',textAlign:'center',fontSize:13,color:'#888780'}}>لا توجد تقارير إقفال بعد</div>
              ):staffClosings.map((c:any,i:number)=>{
                const statusLabel:Record<string,string> = {deficit:'عجز',surplus:'زيادة',balanced:'مطابق'}
                const statusColor:Record<string,string> = {deficit:'#e24b4a',surplus:'#378add',balanced:'#16a34a'}
                return(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 20px',borderBottom:i<staffClosings.length-1?'1px solid #f5f5f4':'none'}}>
                    <div style={{width:36,height:36,borderRadius:10,background:statusColor[c.status]+'15',border:`1px solid ${statusColor[c.status]}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:16}}>{c.status==='balanced'?'✅':c.status==='deficit'?'⚠️':'📈'}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'#1c1c1a'}}>{new Date(c.closing_date).toLocaleDateString('ar-SA',{weekday:'short',month:'short',day:'numeric'})}</div>
                      <div style={{fontSize:10,color:'#888780',marginTop:1}}>مبيعات {Number(c.total_sales).toFixed(0)} ر.س · شبكة {Number(c.network_amount).toFixed(0)} ر.س</div>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:statusColor[c.status],flexShrink:0}}>
                      {statusLabel[c.status]}{c.status!=='balanced'?` (${Math.abs(Number(c.difference)).toFixed(0)} ر.س)`:''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {reportStaff && reportStaff.role!=='cashier' && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(6px)'}}>
          <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:540,maxHeight:'85vh',display:'flex',flexDirection:'column',fontFamily:'inherit',direction:'rtl'}}>
            <div style={{padding:'18px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#1c1c1a'}}>تقرير {reportStaff.name}</div>
                <div style={{fontSize:11,color:'#888780',marginTop:2}}>آخر 50 عملية صرف</div>
              </div>
              <button onClick={()=>setReportStaff(null)} style={{width:30,height:30,borderRadius:'50%',border:'1px solid #e0e0dd',background:'#f5f5f4',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#5f5e5a'}}>✕</button>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:'14px 20px',borderBottom:'1px solid #f0f0f0',flexShrink:0}}>
              {[
                {label:'عمليات الصرف', value:staffReport.length, color:'#378add'},
                {label:'أصناف مختلفة', value:new Set(staffReport.map((m:any)=>(m.products as any)?.name)).size, color:'#16a34a'},
                {label:'إجمالي الكميات', value:staffReport.reduce((s:number,m:any)=>s+Math.abs(m.qty_change),0), color:'#ba7517'},
              ].map((s,i)=>(
                <div key={i} style={{background:'#f9f9f8',borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:700,color:s.color,fontVariantNumeric:'tabular-nums'}}>{s.value}</div>
                  <div style={{fontSize:10,color:'#888780',marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* List */}
            <div style={{overflowY:'auto',flex:1}}>
              {reportLoading?(
                <div style={{padding:'40px',textAlign:'center',color:'#888780',fontSize:13}}>جاري التحميل...</div>
              ):staffReport.length===0?(
                <div style={{padding:'40px',textAlign:'center',fontSize:13,color:'#888780'}}>لا توجد عمليات صرف بعد</div>
              ):staffReport.map((m:any,i:number)=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 20px',borderBottom:i<staffReport.length-1?'1px solid #f5f5f4':'none'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#e24b4a'}}>{Math.abs(m.qty_change)}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1c1c1a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(m.products as any)?.name||'—'}</div>
                    <div style={{fontSize:10,color:'#888780',marginTop:1}}>{new Date(m.created_at).toLocaleDateString('ar-SA',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:'#e24b4a',flexShrink:0}}>
                    -{Math.abs(m.qty_change)} <span style={{fontSize:10,color:'#888780',fontWeight:400}}>{(m.products as any)?.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff list */}
      {staff.length===0 ? (
        <div style={{...card,padding:56,textAlign:'center'}} className="su">
          <div style={{fontSize:52,marginBottom:14}}>👥</div>
          <div style={{fontSize:font.base,fontWeight:700,color:colors.text2,marginBottom:6}}>لا يوجد موظفين بعد</div>
          <div style={{fontSize:font.sm,color:colors.text4,marginBottom:20}}>أضف أول موظف وشارك معه بيانات الدخول</div>
          <button onClick={()=>setShowAdd(true)} style={{...btnPrimary,padding:'10px 24px',fontSize:font.sm}}>+ إضافة أول موظف</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
          {staff.map((s:any,i)=>(
            <div key={s.id} className="staff-card su" style={{...card,padding:'16px 18px',animationDelay:`${i*0.05}s`}}>
              <div onClick={()=>setExpandedId(expandedId===s.id?null:s.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
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
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button onClick={e=>{e.stopPropagation();openReport(s)}} className="act-btn" style={{background:'#eff6ff',color:'#2563eb'}}>
                    📊 تقرير
                  </button>
                  <button onClick={e=>{e.stopPropagation();setEditingPerms(s.id);setEditPerms(s.permissions||{dispense:true,inventory:false,purchases:false,reports:false})}} className="act-btn" style={{background:'#f5f3ff',color:'#7c3aed'}}>
                    🔐 صلاحيات
                  </button>
                  {s.permissions?.dispense && (
                    <button onClick={e=>{e.stopPropagation();openAssign(s)}} className="act-btn" style={{background:colors.warningLight||'#fffbeb',color:colors.warning||'#d97706'}}>
                      📦 {s.assigned_products?.length>0?`${s.assigned_products.length} منتج`:'كل المنتجات'}
                    </button>
                  )}
                  {s.role==='cashier' && (
                    <button onClick={e=>{e.stopPropagation();setShowHoursModal(true)}} className="act-btn" style={{background:'#ecfeff',color:'#0891b2'}}>
                      ⏰ ساعات العمل
                    </button>
                  )}
                  {s.role==='cashier' && !WHATSAPP_PAUSED && (
                    <button onClick={e=>{e.stopPropagation();toggleSendClosingWA(s.id, s.send_closing_whatsapp!==false)}} className="act-btn"
                      style={{background:s.send_closing_whatsapp!==false?'#f0fdf4':colors.bg,color:s.send_closing_whatsapp!==false?colors.primary:colors.text3,border:s.send_closing_whatsapp!==false?'none':`1.5px solid ${colors.border2}`}}>
                      {s.send_closing_whatsapp!==false?'📲 تفاصيل الإقفال: مفعّل':'📴 تفاصيل الإقفال: موقّف'}
                    </button>
                  )}
                  <button onClick={e=>{e.stopPropagation();regeneratePin(s.id,s.name,s.phone)}} className="act-btn" style={{background:colors.infoLight,color:colors.info}}>PIN جديد</button>
                  <button onClick={e=>{e.stopPropagation();toggleActive(s.id,s.is_active)}} className="act-btn" style={{background:colors.bg,color:colors.text2,border:`1.5px solid ${colors.border2}`}}>{s.is_active?'إيقاف':'تفعيل'}</button>
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
                          <span style={{fontSize:12,opacity:.5}}>✏️</span>{toLocalPhone(s.phone)}
                        </div>
                      )}
                    </div>
                    <div style={{background:colors.primaryLight,borderRadius:radius.md,padding:'12px 14px',border:`1px solid ${colors.primaryBorder}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:colors.primary,marginBottom:6,textTransform:'uppercase' as const}}>رمز PIN الحالي</div>
                      {String(s.pin||'').startsWith('$2') ? (
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:colors.danger||'#dc2626',marginBottom:6}}>PIN قديم — لا يمكن استرجاعه</div>
                          <button onClick={e=>{e.stopPropagation();regeneratePin(s.id,s.name,s.phone)}} style={{fontSize:11,fontWeight:700,color:'white',background:colors.primary,border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontFamily:'inherit'}}>
                            🔄 إعادة توليد PIN جديد
                          </button>
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{fontSize:28,fontWeight:900,color:colors.primary,letterSpacing:8,minWidth:90}}>
                            {visiblePins[s.id] ? s.pin : '••••'}
                          </div>
                          <button onClick={e=>{e.stopPropagation();setVisiblePins(v=>({...v,[s.id]:!v[s.id]}))}} style={{background:'transparent',border:'none',cursor:'pointer',padding:4,lineHeight:1,display:'flex',alignItems:'center'}} title={visiblePins[s.id]?'إخفاء':'إظهار'}>
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
                      <button onClick={()=>{navigator.clipboard.writeText('https://storely.dev/staff');toast('تم نسخ الرابط ✓')}} style={{background:colors.primary,color:'white',border:'none',borderRadius:8,padding:'9px 14px',fontSize:font.xs,fontWeight:700,cursor:'pointer',fontFamily:font.family,whiteSpace:'nowrap' as const}}>
                        📋 نسخ الكل
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
