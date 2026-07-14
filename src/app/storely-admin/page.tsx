'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// حماية أمنية: يمنع عرض روابط خبيثة (javascript:, data:, إلخ) كرابط قابل للنقر
function isSafeUrl(url?: string | null): boolean {
  if (!url) return false
  return /^https?:\/\//i.test(url.trim())
}

type User = {
  id:string; full_name:string; phone:string; role:string
  status:string; created_at:string; org_id:string; org_name:string
  subscription_type:string; subscription_ends_at:string|null
  max_branches:number; requested_plan:string
}

const STATUS: Record<string,{label:string;color:string;bg:string;dot:string}> = {
  pending:   {label:'بانتظار', color:'#92400e', bg:'#fef3c7', dot:'#f59e0b'},
  active:    {label:'مفعّل',   color:'#166534', bg:'#dcfce7', dot:'#16a34a'},
  suspended: {label:'موقوف',  color:'#991b1b', bg:'#fee2e2', dot:'#ef4444'},
  deleted:   {label:'محذوف',  color:'#6b7280', bg:'#f3f4f6', dot:'#9ca3af'},
}

const PLANS = [
  {v:1,  label:'الأساسية',  price:'149 ر.س', desc:'فرع · 2 موظف · 3 موردين',                    color:'#16a34a', maxStaff:2,   maxSup:3},
  {v:3,  label:'المتوسطة',  price:'249 ر.س', desc:'3 فروع · 10 موظفين · 10 موردين',              color:'#2563eb', maxStaff:10,  maxSup:10},
  {v:10, label:'المتقدمة',  price:'399 ر.س', desc:'فروع غير محدودة · موظفون وموردون غير محدودين', color:'#7c3aed', maxStaff:999, maxSup:999},
]

export default function AdminPage() {
  const [authed, setAuthed]     = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [currentAdmin, setCurrentAdmin] = useState<{id:string;email:string;full_name:string;role?:string;permissions?:Record<string,boolean>}|null>(null)
  const [pass, setPass]         = useState('')
  const [passErr, setPassErr]   = useState(false)
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [saving, setSaving]     = useState<string|null>(null)
  const [selected, setSelected] = useState<User|null>(null)
  const [renewDays, setRenewDays] = useState(30)
  const [confirmDel, setConfirmDel] = useState<User|null>(null)
  const [tab, setTab]           = useState<'users'|'stats'|'suppliers'|'dashboard'|'packages'|'analytics'|'admins'>('dashboard')
  const [adminsList, setAdminsList] = useState<any[]>([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPass, setNewAdminPass] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminPerms, setNewAdminPerms] = useState<Record<string,boolean>>({})
  const [addAdminSaving, setAddAdminSaving] = useState(false)
  const [addAdminError, setAddAdminError] = useState('')

  const PERMISSION_LABELS: Record<string,string> = {
    manage_users: 'إدارة المستخدمين (تفعيل/إيقاف/حذف)',
    manage_suppliers: 'إدارة طلبات الموردين',
    view_analytics: 'عرض التحليلات',
    manage_packages: 'إدارة الباقات',
    manage_backups: 'إدارة النسخ الاحتياطية',
    manage_admins: 'إدارة المشرفين',
  }

  async function loadAdmins() {
    setAdminsLoading(true)
    const res = await fetch('/api/admin/list-admins', { headers: { 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' } })
    const data = await res.json()
    if (data.admins) setAdminsList(data.admins)
    setAdminsLoading(false)
  }

  async function createAdmin() {
    setAddAdminError('')
    if (!newAdminEmail || !newAdminPass || !newAdminName) { setAddAdminError('أدخل كل البيانات'); return }
    setAddAdminSaving(true)
    const res = await fetch('/api/admin/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' },
      body: JSON.stringify({ email: newAdminEmail, password: newAdminPass, full_name: newAdminName, permissions: newAdminPerms }),
    })
    const data = await res.json()
    setAddAdminSaving(false)
    if (!res.ok) { setAddAdminError(data.error || 'حدث خطأ'); return }
    setNewAdminEmail(''); setNewAdminPass(''); setNewAdminName(''); setNewAdminPerms({}); setShowAddAdmin(false)
    loadAdmins()
  }

  async function toggleAdminActive(adminId: string, isActive: boolean) {
    await fetch('/api/admin/update-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' },
      body: JSON.stringify({ admin_id: adminId, is_active: isActive }),
    })
    loadAdmins()
  }

  const [editingAdminId, setEditingAdminId] = useState<string|null>(null)
  const [editAdminName, setEditAdminName] = useState('')
  const [editAdminEmail, setEditAdminEmail] = useState('')
  const [editAdminPerms, setEditAdminPerms] = useState<Record<string,boolean>>({})
  const [editAdminNewPass, setEditAdminNewPass] = useState('')
  const [editAdminError, setEditAdminError] = useState('')
  const [editAdminSaving, setEditAdminSaving] = useState(false)
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] = useState<any|null>(null)
  const [deleteAdminSaving, setDeleteAdminSaving] = useState(false)

  function startEditAdmin(a: any) {
    setEditingAdminId(a.id)
    setEditAdminName(a.full_name)
    setEditAdminEmail(a.email)
    setEditAdminPerms(a.permissions || {})
    setEditAdminNewPass('')
    setEditAdminError('')
  }

  async function saveAdminEdit() {
    setEditAdminError('')
    setEditAdminSaving(true)
    const res = await fetch('/api/admin/update-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' },
      body: JSON.stringify({
        admin_id: editingAdminId,
        full_name: editAdminName,
        email: editAdminEmail,
        permissions: editAdminPerms,
        new_password: editAdminNewPass || undefined,
      }),
    })
    const data = await res.json()
    setEditAdminSaving(false)
    if (!res.ok) { setEditAdminError(data.error || 'حدث خطأ'); return }
    setEditingAdminId(null)
    loadAdmins()
  }

  async function deleteAdminNow() {
    setDeleteAdminSaving(true)
    const res = await fetch('/api/admin/delete-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' },
      body: JSON.stringify({ admin_id: confirmDeleteAdmin.id }),
    })
    setDeleteAdminSaving(false)
    if (res.ok) { setConfirmDeleteAdmin(null); loadAdmins() }
  }
  const [dashStats, setDashStats] = useState<any>({})
  const [dashLoading, setDashLoading] = useState(false)
  const [supplierApps, setSupplierApps] = useState<any[]>([])
  const [suppLoading, setSuppLoading] = useState(false)
  const sb = createClient()

  useEffect(() => {
    const saved = sessionStorage.getItem('storely_admin_info')
    if (saved) {
      try { setCurrentAdmin(JSON.parse(saved)) } catch {}
    }
  }, [])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:adminEmail,password:pass})})
    const data = await res.json()
    if (res.ok && data.success) {
      document.cookie = `storely_admin_token=${data.token};path=/;max-age=86400;SameSite=Strict;Secure`
      document.cookie = `storely_admin_auth=true;path=/;max-age=86400;SameSite=Strict;Secure`
      sessionStorage.setItem('storely_admin_pass', data.token) // رمز الجلسة الآمن، يُستخدم كمفتاح تحقق لكل الإجراءات
      sessionStorage.setItem('storely_admin_session_token', data.token)
      sessionStorage.setItem('storely_admin_info', JSON.stringify(data.admin))
      setCurrentAdmin(data.admin)
      // نوجّهه لأول تبويب مسموح له فيه (لو ما عنده صلاحية Dashboard)
      const perms = data.admin.permissions || {}
      if (data.admin.role !== 'super_admin' && !perms.manage_users && !perms.view_analytics) {
        if (perms.manage_suppliers) { setTab('suppliers'); loadSupplierApps() }
        else if (perms.manage_packages) setTab('packages')
      }
      setAuthed(true); loadUsers()
    } else { setPassErr(true); setTimeout(()=>setPassErr(false),2000) }
  }

  async function deleteSupplierApp(id: string) {
    const sb = (await import('@/lib/supabase/client')).createClient()
    await (sb as any).from('supplier_applications').delete().eq('id', id)
    loadSupplierApps()
  }

  async function loadDashStats() {
    setDashLoading(true)
    const db = createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: totalUsers },
      { count: newThisMonth },
      { count: trialUsers },
      { count: paidUsers },
      { data: expiringSoon }
    ] = await Promise.all([
      db.from('profiles').select('*',{count:'exact',head:true}),
      db.from('profiles').select('*',{count:'exact',head:true}).gte('created_at',startOfMonth),
      db.from('profiles').select('*',{count:'exact',head:true}).eq('subscription_type','trial'),
      db.from('profiles').select('*',{count:'exact',head:true}).eq('subscription_type','paid'),
      db.from('profiles').select('full_name,subscription_ends_at,phone').lte('subscription_ends_at', new Date(Date.now()+7*24*60*60*1000).toISOString()).gte('subscription_ends_at', now.toISOString()).order('subscription_ends_at').limit(5)
    ])

    setDashStats({ totalUsers, newThisMonth, trialUsers, paidUsers, expiringSoon: expiringSoon||[] })
    setDashLoading(false)
  }

  async function loadSupplierApps() {
    setSuppLoading(true)
    const sb = createClient()
    const { data } = await sb.from('supplier_applications' as any).select('*').order('created_at', {ascending:false})
    setSupplierApps(data || [])
    setSuppLoading(false)
  }

  async function updateSupplierStatus(id: string, status: string) {
    const sb = createClient()
    if(status==='rejected') {
      await (sb as any).from('supplier_applications').delete().eq('id', id)
    } else {
      await (sb as any).from('supplier_applications').update({status}).eq('id', id)
    }
    loadSupplierApps()
  }

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/list-users', { headers: { 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' } })
    const { users: data } = await res.json()
    if (data) setUsers(data.map((p:any)=>({
      id:p.id, full_name:p.full_name||'—', phone:p.phone||'—',
      role:p.role, status:p.status||'pending', created_at:p.created_at,
      org_id:p.org_id, org_name:p.organizations?.name||'—',
      subscription_type:p.subscription_type||'trial',
      subscription_ends_at:p.subscription_ends_at||null,
      max_branches:p.organizations?.max_branches||1,
      requested_plan:p.organizations?.requested_plan||'—',
    })))
    setLoading(false)
  }

  async function activate(userId: string, type: string, days: number) {
    setSaving(userId)
    const ends = new Date(Date.now() + days*24*60*60*1000).toISOString()
    const adminPass = sessionStorage.getItem('storely_admin_pass') || ''
    const res = await fetch('/api/admin/activate-user', {
      method:'POST', headers:{'Content-Type':'application/json','x-admin-key':adminPass},
      body: JSON.stringify({ userId, type, ends })
    })
    const data = await res.json()
    if (!data.success) { alert('خطأ: ' + (data.error||'unknown')); setSaving(null); return }
    try {
      await fetch('/api/notify-activation', {
        method:'POST', headers:{'Content-Type':'application/json','x-admin-key':adminPass},
        body: JSON.stringify({ userId, subscriptionType:type, subscriptionEndsAt:ends })
      })
    } catch {}
    await loadUsers(); setSaving(null); setSelected(null)
  }

  async function suspend(userId: string) {
    setSaving(userId)
    await sb.from('profiles').update({status:'suspended'}).eq('id',userId)
    await loadUsers(); setSaving(null); setSelected(null)
  }

  async function updatePlan(orgId: string, value: number) {
    setSaving(orgId)
    const plan = PLANS.find(p=>p.v===value)!
    await (sb.from('organizations') as any).update({
      max_branches:value, plan:value===1?'basic':value<=3?'pro':'advanced',
      max_staff:plan.maxStaff, max_suppliers:plan.maxSup
    }).eq('id',orgId)
    setUsers(prev=>prev.map(u=>u.org_id===orgId?{...u,max_branches:value}:u))
    setSelected(prev=>prev&&prev.org_id===orgId?{...prev,max_branches:value}:prev)
    setSaving(null)
  }

  async function doDelete(u: User) {
    setSaving(u.id)
    const res = await fetch('/api/admin/delete-user', {
      method:'POST', headers:{'Content-Type':'application/json','x-admin-key':sessionStorage.getItem('storely_admin_pass')||''},
      body: JSON.stringify({ userId:u.id, orgId:u.org_id||null })
    })
    const data = await res.json().catch(()=>({success:false}))
    if (!res.ok || !data.success) {
      alert('⚠️ فشل الحذف (جزئياً أو كلياً):\n' + (data.details ? data.details.join('\n') : data.error||'خطأ غير معروف'))
      setSaving(null)
      return
    }
    await loadUsers(); setSaving(null); setConfirmDel(null); setSelected(null)
  }

  function daysLeft(endsAt: string|null) {
    if (!endsAt) return null
    return Math.ceil((new Date(endsAt).getTime()-Date.now())/(1000*60*60*24))
  }

  const filtered = users.filter(u => {
    const ms = u.full_name?.includes(search)||u.org_name?.includes(search)||u.phone?.includes(search)
    return ms && (filter==='all'||u.status===filter)
  })

  const stats = {
    total: users.length,
    pending: users.filter(u=>u.status==='pending').length,
    active: users.filter(u=>u.status==='active').length,
    suspended: users.filter(u=>u.status==='suspended').length,
    trial: users.filter(u=>u.subscription_type==='trial'&&u.status==='active').length,
    paid: users.filter(u=>u.subscription_type==='paid'&&u.status==='active').length,
    revenue: users.filter(u=>u.subscription_type==='paid'&&u.status==='active').reduce((sum,u)=>sum+(u.max_branches===1?149:u.max_branches<=3?249:399),0),
    expiringSoon: users.filter(u=>{
      const d = daysLeft(u.subscription_ends_at)
      return d!==null && d>0 && d<=3 && u.status==='active'
    }).length,
  }

  // ── Login ──
  if (!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',padding:20}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        @keyframes pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.7;transform:scale(1.05)}}
      `}</style>
      <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
        <div style={{position:'absolute',top:'-20%',right:'-10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,.08),transparent 70%)',animation:'pulse 6s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:'-10%',left:'-5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,.05),transparent 70%)',animation:'pulse 8s ease-in-out infinite 2s'}}/>
      </div>
      <div style={{background:'#ffffff',borderRadius:24,padding:'44px 40px',width:'100%',maxWidth:400,boxShadow:'0 24px 60px rgba(15,23,42,.1)',border:'1px solid #f1f5f9',animation:'fadeUp .4s ease',position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{width:72,height:72,background:'linear-gradient(135deg,#16a34a,#15803d)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 20px',boxShadow:'0 8px 24px rgba(22,163,74,.25)'}}>🔐</div>
        <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:6}}>Storely Admin</h1>
        <p style={{fontSize:13,color:'#94a3b8',marginBottom:32}}>لوحة تحكم المشرف — وصول خاص</p>
        <form onSubmit={login}>
          <input type="email" required value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} dir="ltr"
            style={{width:'100%',padding:'14px 16px',border:`2px solid ${passErr?'#ef4444':'#e2e8f0'}`,borderRadius:14,fontSize:15,outline:'none',fontFamily:'inherit',marginBottom:10,boxSizing:'border-box',transition:'all .2s',background:'#f8fafc'}}
            placeholder="admin@storely.dev" autoFocus/>
          <input type="password" required value={pass} onChange={e=>setPass(e.target.value)}
            style={{width:'100%',padding:'16px',border:`2px solid ${passErr?'#ef4444':'#e2e8f0'}`,borderRadius:14,fontSize:24,textAlign:'center',letterSpacing:10,outline:'none',fontFamily:'inherit',marginBottom:14,boxSizing:'border-box',transition:'all .2s',background:'#f8fafc',animation:passErr?'shake .3s ease':'none'}}
            placeholder="••••••••"/>
          {passErr && <div style={{fontSize:12,color:'#ef4444',marginBottom:14,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>⚠️ بيانات الدخول غير صحيحة</div>}
          <button type="submit" style={{width:'100%',padding:'15px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 6px 20px rgba(22,163,74,.3)',transition:'all .2s'}}>
            دخول ←
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',direction:'rtl',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",color:'#0f172a'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        .ru{animation:fadeUp .3s ease both}
        .urow{transition:background .1s;cursor:pointer;border-bottom:1px solid #f1f5f9}
        .urow:hover{background:#f8fafc}
        .stat-card{background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;transition:all .2s;box-shadow:0 1px 3px rgba(15,23,42,.04)}
        .stat-card:hover{border-color:#cbd5e1;box-shadow:0 4px 12px rgba(15,23,42,.06);transform:translateY(-2px)}
        .tab-btn{padding:8px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;border:none}
        .filt-btn{padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid #e5e7eb;background:#ffffff;color:#64748b}
        .filt-btn.act{background:#16a34a;color:white;border-color:#16a34a}
        .action-btn{padding:8px 16px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid #e5e7eb;background:#ffffff;color:#475569}
        .action-btn:hover{border-color:#16a34a;color:#16a34a;background:#f0fdf4}
        input:focus{outline:none!important;border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.1)!important}
        @media(max-width:768px){.hide-mob{display:none!important}.stats-grid{grid-template-columns:repeat(2,1fr)!important}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
      `}</style>

      {/* Delete Modal */}
      {confirmDel && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.4)',backdropFilter:'blur(6px)'}} onClick={()=>setConfirmDel(null)}/>
          <div style={{background:'#ffffff',border:'1px solid #e5e7eb',borderRadius:20,padding:28,width:'100%',maxWidth:360,position:'relative',animation:'modalIn .2s ease',boxShadow:'0 32px 80px rgba(15,23,42,.25)'}}>
            <div style={{width:52,height:52,borderRadius:14,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24}}>🗑️</div>
            <h3 style={{fontSize:17,fontWeight:800,color:'#0f172a',textAlign:'center',marginBottom:8}}>حذف نهائي</h3>
            <p style={{fontSize:13,color:'#64748b',textAlign:'center',lineHeight:1.7,marginBottom:16}}>
              سيتم حذف <b style={{color:'#0f172a'}}>{confirmDel.org_name}</b> وجميع بياناتها بشكل نهائي
            </p>
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',marginBottom:20,fontSize:12,color:'#dc2626',lineHeight:1.9}}>
              ❌ المنتجات والمخزون · ❌ المشتريات · ❌ الإشعارات · ❌ الحساب
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:'12px',background:'#f1f5f9',color:'#475569',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={()=>doDelete(confirmDel)} disabled={saving===confirmDel.id}
                style={{flex:2,padding:'12px',background:'#ef4444',color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {saving===confirmDel.id?'جاري الحذف...':'حذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.35)',backdropFilter:'blur(6px)'}} onClick={()=>setSelected(null)}/>
          <div style={{background:'#ffffff',border:'1px solid #e5e7eb',borderRadius:24,width:'100%',maxWidth:480,position:'relative',animation:'modalIn .2s ease',boxShadow:'0 32px 80px rgba(15,23,42,.2)',overflow:'hidden',maxHeight:'90vh',overflowY:'auto'}}>
            {/* Modal Header */}
            <div style={{background:'#f8fafc',padding:'22px 24px',display:'flex',alignItems:'center',gap:14,borderBottom:'1px solid #e5e7eb',position:'sticky',top:0,zIndex:10}}>
              <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'white',flexShrink:0}}>
                {selected.full_name[0]||'؟'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{selected.full_name}</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2,display:'flex',alignItems:'center',gap:8}}>
                  <span>{selected.org_name}</span>
                  <span style={{width:4,height:4,borderRadius:'50%',background:'#cbd5e1',display:'inline-block'}}/>
                  <span>{selected.phone}</span>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{width:32,height:32,borderRadius:9,background:'#f1f5f9',border:'none',color:'#64748b',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>

            <div style={{padding:'20px 24px'}}>
              {/* Status & Type badges */}
              <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
                <span style={{background:STATUS[selected.status]?.bg,color:STATUS[selected.status]?.color,padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
                  {STATUS[selected.status]?.label||selected.status}
                </span>
                <span style={{background:selected.subscription_type==='paid'?'#eff6ff':'#f5f3ff',color:selected.subscription_type==='paid'?'#2563eb':'#7c3aed',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
                  {selected.subscription_type==='paid'?'💳 مدفوع':'🎁 تجربة مجانية'}
                </span>
                {(() => { const d = daysLeft(selected.subscription_ends_at); return d !== null ? (
                  <span style={{background:d<=0?'#fef2f2':d<=3?'#fffbeb':'#f0fdf4',color:d<=0?'#dc2626':d<=3?'#d97706':'#16a34a',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
                    {d<=0?'⚠️ منتهي':d<=3?`⏰ ${d} أيام`:d<=7?`${d} أيام`:`${d} يوم`}
                  </span>
                ) : null })()}
              </div>

              {/* Info Grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
                {[
                  {label:'تاريخ التسجيل', value:new Date(selected.created_at).toLocaleDateString('ar-SA')},
                  {label:'انتهاء الاشتراك', value:selected.subscription_ends_at?new Date(selected.subscription_ends_at).toLocaleDateString('ar-SA'):'—'},
                  {label:'الباقة المطلوبة', value:selected.requested_plan==='basic'?'الأساسية':selected.requested_plan==='pro'?'المتوسطة':selected.requested_plan==='advanced'?'المتقدمة':selected.requested_plan},
                  {label:'الفروع المسموحة', value:`${selected.max_branches} ${selected.max_branches===1?'فرع':'فروع'}`},
                ].map((item,i)=>(
                  <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px',border:'1px solid #f1f5f9'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{item.label}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'#334155'}}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Activate Section */}
              {(selected.status==='pending'||selected.status==='active'||selected.status==='suspended') && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:14,padding:16,marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#15803d',marginBottom:12}}>⚙️ تحديد مدة الاشتراك</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12}}>
                    {[7,30,90,365].map(d=>(
                      <button key={d} onClick={()=>setRenewDays(d)}
                        style={{padding:'9px 4px',borderRadius:9,border:`1.5px solid ${renewDays===d?'#16a34a':'#e5e7eb'}`,background:renewDays===d?'#16a34a':'#ffffff',color:renewDays===d?'white':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                        {d<30?d+' أيام':d===30?'شهر':d===90?'3 أشهر':'سنة'}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>activate(selected.id,'trial',renewDays)} disabled={!!saving}
                      style={{flex:1,padding:'11px',background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      {saving===selected.id?'...':'🎁 تجربة'}
                    </button>
                    <button onClick={()=>activate(selected.id,'paid',renewDays)} disabled={!!saving}
                      style={{flex:2,padding:'11px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(22,163,74,.25)'}}>
                      {saving===selected.id?'...':'✅ تفعيل مدفوع'}
                    </button>
                  </div>
                </div>
              )}

              {/* Plan Selection */}
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:14,padding:16,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1d4ed8',marginBottom:12}}>📦 تغيير الباقة</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {PLANS.map(p=>(
                    <button key={p.v} onClick={()=>updatePlan(selected.org_id,p.v)} disabled={!!saving||!selected.org_id}
                      style={{padding:'12px 14px',borderRadius:10,border:`1.5px solid ${selected.max_branches===p.v?p.color:'#e5e7eb'}`,background:selected.max_branches===p.v?p.color+'0d':'#ffffff',cursor:(!selected.org_id||!!saving)?'not-allowed':'pointer',fontFamily:'inherit',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all .15s'}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:13,fontWeight:800,color:selected.max_branches===p.v?p.color:'#0f172a'}}>{p.label}</div>
                        <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{p.desc}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:13,fontWeight:800,color:selected.max_branches===p.v?p.color:'#64748b'}}>{p.price}</span>
                        {selected.max_branches===p.v&&<span style={{fontSize:16}}>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{display:'flex',gap:8}}>
                {selected.status==='active' && (
                  <button onClick={()=>suspend(selected.id)} disabled={!!saving}
                    style={{flex:1,padding:'11px',background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {saving===selected.id?'...':'⏸ إيقاف'}
                  </button>
                )}
                {selected.status==='suspended' && (
                  <button onClick={()=>activate(selected.id,selected.subscription_type,30)} disabled={!!saving}
                    style={{flex:1,padding:'11px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {saving===selected.id?'...':'▶ إعادة تفعيل'}
                  </button>
                )}
                {selected.status!=='deleted' && (
                  <button onClick={()=>{setSelected(null);setConfirmDel(selected)}}
                    style={{flex:1,padding:'11px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    🗑️ حذف
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Nav */}
      <div style={{background:'#ffffff',borderBottom:'1px solid #e5e7eb',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60,position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 3px rgba(15,23,42,.03)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#16a34a,#15803d)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>Storely Admin</div>
            <div style={{fontSize:10,color:'#94a3b8'}}>لوحة التحكم</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {currentAdmin?.role==='super_admin' && (
            <a href="/storely-admin/monitoring" style={{padding:'7px 14px',background:'#ffffff',color:'#475569',border:'1px solid #e5e7eb',borderRadius:9,fontSize:12,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>
              📊 مراقبة
            </a>
          )}
          {currentAdmin?.role==='super_admin' && (
            <a href="/storely-admin/notifications" style={{padding:'7px 14px',background:'#ffffff',color:'#475569',border:'1px solid #e5e7eb',borderRadius:9,fontSize:12,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>
              🔔 الإشعارات
            </a>
          )}
          {(currentAdmin?.role==='super_admin' || currentAdmin?.permissions?.manage_users || currentAdmin?.permissions?.view_analytics) && (
            <button onClick={()=>setTab('dashboard')} style={{padding:'7px 14px',background:tab==='dashboard'?'#2563eb':'#ffffff',color:tab==='dashboard'?'white':'#475569',border:`1px solid ${tab==='dashboard'?'#2563eb':'#e5e7eb'}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              📊 Dashboard
            </button>
          )}
          {(currentAdmin?.role==='super_admin' || currentAdmin?.permissions?.manage_users) && (
            <button onClick={()=>setTab('users')} style={{padding:'7px 14px',background:tab==='users'?'#7c3aed':'#ffffff',color:tab==='users'?'white':'#475569',border:`1px solid ${tab==='users'?'#7c3aed':'#e5e7eb'}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              👥 المستخدمون
            </button>
          )}
          {(currentAdmin?.role==='super_admin' || currentAdmin?.permissions?.manage_suppliers) && (
            <button onClick={()=>{setTab('suppliers');loadSupplierApps()}} style={{padding:'7px 14px',background:tab==='suppliers'?'#16a34a':'#ffffff',color:tab==='suppliers'?'white':'#475569',border:`1px solid ${tab==='suppliers'?'#16a34a':'#e5e7eb'}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
              🤝 الموردون {supplierApps.filter(s=>s.status==='pending').length>0&&<span style={{background:'#ef4444',color:'white',borderRadius:99,padding:'1px 6px',fontSize:10}}>{supplierApps.filter(s=>s.status==='pending').length}</span>}
            </button>
          )}
          {(currentAdmin?.role==='super_admin' || currentAdmin?.permissions?.view_analytics) && (
            <button onClick={()=>{setTab('analytics');loadDashStats()}} style={{padding:'7px 14px',background:tab==='analytics'?'#0891b2':'#ffffff',color:tab==='analytics'?'white':'#475569',border:`1px solid ${tab==='analytics'?'#0891b2':'#e5e7eb'}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              📈 التحليلات
            </button>
          )}
          {(currentAdmin?.role==='super_admin' || currentAdmin?.permissions?.manage_packages) && (
            <button onClick={()=>setTab('packages')} style={{padding:'7px 14px',background:tab==='packages'?'#f59e0b':'#ffffff',color:tab==='packages'?'white':'#475569',border:`1px solid ${tab==='packages'?'#f59e0b':'#e5e7eb'}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              📦 الباقات
            </button>
          )}
          {currentAdmin?.role==='super_admin' && (
            <button onClick={()=>{setTab('admins');loadAdmins()}} style={{padding:'7px 14px',background:tab==='admins'?'#0f172a':'#ffffff',color:tab==='admins'?'white':'#475569',border:`1px solid ${tab==='admins'?'#0f172a':'#e5e7eb'}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              🛡️ المشرفين
            </button>
          )}
          <button onClick={loadUsers} style={{padding:'7px 14px',background:'#ffffff',color:'#475569',border:'1px solid #e5e7eb',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
            ↺ تحديث
          </button>
          <button onClick={()=>setAuthed(false)} style={{padding:'7px 14px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            خروج
          </button>
          {currentAdmin && (
            <span style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginRight:6}}>👤 {currentAdmin.full_name}</span>
          )}
        </div>
      </div>

      <div style={{padding:'24px',maxWidth:1300,margin:'0 auto'}}>

        {/* Alert: pending users */}
        {stats.pending > 0 && (
          <div onClick={()=>setFilter('pending')} className="ru"
            style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:14,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:14,cursor:'pointer',transition:'all .2s'}}>
            <div style={{width:40,height:40,borderRadius:11,background:'#fef3c7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🔔</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'#92400e'}}>{stats.pending} مستخدم بانتظار الموافقة</div>
              <div style={{fontSize:12,color:'#b45309',marginTop:2}}>اضغط لعرض الطلبات</div>
            </div>
            <div style={{background:'#f59e0b',color:'white',borderRadius:99,minWidth:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:15,padding:'0 10px'}}>{stats.pending}</div>
          </div>
        )}

        {/* Alert: expiring soon */}
        {stats.expiringSoon > 0 && (
          <div className="ru" style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:14,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:40,height:40,borderRadius:11,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>⏰</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#991b1b'}}>{stats.expiringSoon} تجربة ستنتهي خلال 3 أيام</div>
              <div style={{fontSize:12,color:'#b91c1c',marginTop:2}}>يرجى التواصل معهم للاشتراك</div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid ru" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {label:'إجمالي المستخدمين', value:stats.total, sub:'مستخدم مسجل', icon:'👥', color:'#2563eb', glow:'#eff6ff'},
            {label:'مفعّلون',           value:stats.active, sub:'نشط الآن',    icon:'✅', color:'#16a34a', glow:'#f0fdf4'},
            {label:'في التجربة',        value:stats.trial,  sub:'مجانية',      icon:'🎁', color:'#7c3aed', glow:'#f5f3ff'},
            {label:'الإيراد الشهري',    value:stats.revenue+'﷼', sub:'مدفوع', icon:'💰', color:'#d97706', glow:'#fffbeb'},
          ].map((s,i)=>(
            <div key={i} className="stat-card" style={{animationDelay:`${i*.05}s`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.08em'}}>{s.label}</div>
                <div style={{width:36,height:36,borderRadius:10,background:s.glow,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{s.icon}</div>
              </div>
              <div style={{fontSize:28,fontWeight:900,color:s.color,letterSpacing:'-0.5px',marginBottom:4}}>{s.value}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="ru" style={{background:'#ffffff',borderRadius:14,padding:'12px 16px',marginBottom:14,border:'1px solid #e5e7eb',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم أو المؤسسة أو الجوال..."
              style={{width:'100%',padding:'10px 36px 10px 12px',border:'1px solid #e5e7eb',borderRadius:10,fontSize:13,background:'#f8fafc',color:'#0f172a',fontFamily:'inherit',outline:'none',transition:'all .2s'}}/>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {([
              {k:'all',l:'الكل',c:stats.total},
              {k:'pending',l:'بانتظار',c:stats.pending},
              {k:'active',l:'مفعّل',c:stats.active},
              {k:'suspended',l:'موقوف',c:stats.suspended},
            ]).map(f=>(
              <button key={f.k} onClick={()=>setFilter(f.k)} className={`filt-btn${filter===f.k?' act':''}`}>
                {f.l} <span style={{opacity:.6}}>({f.c})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="ru" style={{background:'#ffffff',borderRadius:16,border:'1px solid #e5e7eb',overflow:'hidden'}}>
          {loading ? (
            <div style={{padding:64,textAlign:'center'}}>
              <div style={{width:36,height:36,border:'3px solid #e5e7eb',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 14px'}}/>
              <div style={{fontSize:13,color:'#94a3b8'}}>جاري تحميل البيانات...</div>
            </div>
          ) : filtered.length===0 ? (
            <div style={{padding:64,textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:12}}>👤</div>
              <div style={{fontSize:15,fontWeight:700,color:'#94a3b8'}}>لا توجد نتائج</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                <thead>
                  <tr style={{background:'#f8fafc',borderBottom:'1px solid #e5e7eb'}}>
                    {['المستخدم','المؤسسة','الجوال','الباقة','الاشتراك','الحالة','إجراء'].map((h,i)=>(
                      <th key={i} className={i===2?'hide-mob':''} style={{padding:'12px 16px',color:'#94a3b8',fontSize:10,fontWeight:700,textAlign:'right',textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap'}}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u=>{
                    const cfg = STATUS[u.status]||STATUS.pending
                    const days = daysLeft(u.subscription_ends_at)
                    const isExp = days!==null&&days<=0
                    const isWarn = days!==null&&days>0&&days<=3
                    const planLabel = u.max_branches===1?'أساسية':u.max_branches<=3?'متوسطة':'متقدمة'
                    const planColor = u.max_branches===1?'#16a34a':u.max_branches<=3?'#2563eb':'#7c3aed'
                    return (
                      <tr key={u.id} className="urow" onClick={()=>setSelected(u)}>
                        <td style={{padding:'14px 16px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'white',flexShrink:0}}>
                              {u.full_name[0]||'؟'}
                            </div>
                            <div>
                              <div style={{fontWeight:700,color:'#0f172a',fontSize:13}}>{u.full_name}</div>
                              <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{new Date(u.created_at).toLocaleDateString('ar-SA')}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'14px 16px',fontSize:13,fontWeight:600,color:'#475569'}}>{u.org_name}</td>
                        <td className="hide-mob" style={{padding:'14px 16px',fontSize:12,color:'#64748b',direction:'ltr',textAlign:'right'}}>{u.phone}</td>
                        <td style={{padding:'14px 16px'}}>
                          <span style={{fontSize:11,fontWeight:700,color:planColor,background:planColor+'12',padding:'3px 10px',borderRadius:20,border:`1px solid ${planColor}30`}}>
                            {planLabel}
                          </span>
                        </td>
                        <td style={{padding:'14px 16px'}}>
                          <div>
                            <span style={{background:u.subscription_type==='paid'?'#eff6ff':'#f5f3ff',color:u.subscription_type==='paid'?'#2563eb':'#7c3aed',padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700}}>
                              {u.subscription_type==='paid'?'💳 مدفوع':'🎁 تجربة'}
                            </span>
                            {days!==null&&(
                              <div style={{fontSize:10,marginTop:4,fontWeight:700,color:isExp?'#ef4444':isWarn?'#d97706':'#94a3b8'}}>
                                {isExp?'⚠️ منتهي':isWarn?`⏰ ${days} أيام`:days<=7?`${days} أيام`:null}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{padding:'14px 16px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:7,height:7,borderRadius:'50%',background:cfg.dot,flexShrink:0}}/>
                            <span style={{fontSize:12,fontWeight:700,color:cfg.color,background:cfg.bg,padding:'3px 10px',borderRadius:20}}>
                              {cfg.label}
                            </span>
                          </div>
                        </td>
                        <td style={{padding:'14px 16px'}}>
                          <button onClick={e=>{e.stopPropagation();setSelected(u)}} className="action-btn">
                            إدارة ←
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length>0&&(
            <div style={{padding:'12px 16px',background:'#f8fafc',borderTop:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'#94a3b8'}}>{filtered.length} من {users.length} مستخدم</span>
              <span style={{fontSize:12,color:'#cbd5e1'}}>آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}</span>
            </div>
          )}
        </div>
      </div>
      {/* ═══ Dashboard Tab ═══ */}
      {tab==='dashboard' && (
        <div style={{padding:'0 24px 24px',maxWidth:1300,margin:'0 auto'}}>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>📊 Dashboard</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
            {[
              {label:'إجمالي المستخدمين',value:stats.total,icon:'👥',color:'#2563eb'},
              {label:'مستخدمون جدد هذا الشهر',value:dashStats.newThisMonth||0,icon:'🆕',color:'#16a34a'},
              {label:'في التجربة المجانية',value:dashStats.trialUsers||0,icon:'⏳',color:'#d97706'},
              {label:'مشتركون مدفوعون',value:dashStats.paidUsers||0,icon:'💳',color:'#7c3aed'},
            ].map((s,i)=>(
              <div key={i} style={{background:'#ffffff',borderRadius:14,padding:'20px',border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
                <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:'#64748b',marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* اشتراكات تنتهي قريباً */}
          <div style={{background:'#ffffff',borderRadius:14,padding:'20px',border:'1px solid #e5e7eb',marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:'#d97706',marginBottom:12}}>⚠️ اشتراكات تنتهي خلال 7 أيام</div>
            {dashStats.expiringSoon?.length===0 ? (
              <div style={{color:'#94a3b8',fontSize:13}}>لا توجد اشتراكات منتهية قريباً</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {(dashStats.expiringSoon||[]).map((u:any,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#fffbeb',borderRadius:10,border:'1px solid #fde68a'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{u.full_name}</span>
                    <span style={{fontSize:12,color:'#d97706'}}>{new Date(u.subscription_ends_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={loadDashStats} disabled={dashLoading}
            style={{padding:'10px 20px',background:'#2563eb',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            {dashLoading?'⏳ جاري التحميل...':'🔄 تحديث'}
          </button>
        </div>
      )}

      {/* ═══ Analytics Tab ═══ */}
      {tab==='analytics' && (
        <div style={{padding:'0 24px 24px',maxWidth:1300,margin:'0 auto'}}>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>📈 التحليلات</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{background:'#ffffff',borderRadius:14,padding:'20px',border:'1px solid #e5e7eb'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏆 أكثر المنشآت نشاطاً</div>
              {users.slice(0,5).map((u,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                  <span style={{fontSize:12,color:'#475569'}}>{u.org_name}</span>
                  <span style={{fontSize:11,color:'#16a34a',fontWeight:700}}>{u.subscription_type}</span>
                </div>
              ))}
            </div>
            <div style={{background:'#ffffff',borderRadius:14,padding:'20px',border:'1px solid #e5e7eb'}}>
              <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:12}}>📊 توزيع الباقات</div>
              {[
                {label:'الأساسية',count:users.filter(u=>u.max_branches===1).length,color:'#16a34a'},
                {label:'المتوسطة',count:users.filter(u=>u.max_branches===3).length,color:'#2563eb'},
                {label:'المتقدمة',count:users.filter(u=>u.max_branches>3).length,color:'#7c3aed'},
                {label:'تجربة مجانية',count:users.filter(u=>u.subscription_type==='trial').length,color:'#d97706'},
              ].map((p,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:12,color:'#475569'}}>{p.label}</span>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:80,height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${users.length>0?(p.count/users.length)*100:0}%`,background:p.color,borderRadius:99}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:p.color,width:20}}>{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Packages Tab ═══ */}
      {tab==='packages' && (
        <div style={{padding:'0 24px 24px',maxWidth:1300,margin:'0 auto'}}>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>📦 إدارة الباقات</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {[
              {name:'الأساسية',price:'149',color:'#16a34a',branches:1,staff:2,suppliers:3},
              {name:'المتوسطة',price:'249',color:'#2563eb',branches:3,staff:10,suppliers:10},
              {name:'المتقدمة',price:'399',color:'#7c3aed',branches:999,staff:999,suppliers:999},
            ].map((p,i)=>(
              <div key={i} style={{background:'#ffffff',borderRadius:14,padding:'20px',border:`1px solid ${p.color}30`}}>
                <div style={{fontSize:14,fontWeight:800,color:p.color,marginBottom:4}}>{p.name}</div>
                <div style={{fontSize:28,fontWeight:900,color:'#0f172a',marginBottom:12}}>{p.price} ر.س</div>
                <div style={{display:'flex',flexDirection:'column',gap:6,fontSize:12,color:'#64748b'}}>
                  <div>🏪 {p.branches===999?'غير محدود':p.branches} فروع</div>
                  <div>👥 {p.staff===999?'غير محدود':p.staff} موظفين</div>
                  <div>🚚 {p.suppliers===999?'غير محدود':p.suppliers} موردين</div>
                </div>
                <div style={{marginTop:12,fontSize:12,fontWeight:700,color:p.color}}>
                  {users.filter(u=>u.subscription_type==='paid'&&(
                    p.name==='الأساسية'?u.max_branches<=1:
                    p.name==='المتوسطة'?(u.max_branches>1&&u.max_branches<=3):
                    u.max_branches>3
                  )).length} مستخدم مدفوع
                  {' · '}
                  {users.filter(u=>u.subscription_type==='trial'&&(
                    p.name==='الأساسية'?u.max_branches<=1:
                    p.name==='المتوسطة'?(u.max_branches>1&&u.max_branches<=3):
                    u.max_branches>3
                  )).length} تجربة
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Admins Tab ═══ */}
      {tab==='admins' && (
        <div style={{padding:'0 24px 24px',maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>🛡️ إدارة المشرفين</div>
            <button onClick={()=>setShowAddAdmin(v=>!v)} style={{padding:'8px 16px',background:'#0f172a',color:'white',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {showAddAdmin?'إلغاء':'+ إضافة مشرف'}
            </button>
          </div>

          {showAddAdmin && (
            <div style={{background:'#ffffff',borderRadius:14,padding:20,border:'1px solid #e5e7eb',marginBottom:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                <input value={newAdminName} onChange={e=>setNewAdminName(e.target.value)} placeholder="الاسم الكامل"
                  style={{padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                <input value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="الإيميل" type="email" dir="ltr"
                  style={{padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
              </div>
              <input value={newAdminPass} onChange={e=>setNewAdminPass(e.target.value)} placeholder="كلمة المرور (8 أحرف على الأقل)" type="password"
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:14,boxSizing:'border-box'}}/>

              <div style={{fontSize:12,fontWeight:700,color:'#475569',marginBottom:8}}>الصلاحيات:</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                {Object.entries(PERMISSION_LABELS).map(([key,label])=>(
                  <label key={key} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:newAdminPerms[key]?'#f0fdf4':'#f8fafc',border:`1px solid ${newAdminPerms[key]?'#bbf7d0':'#e2e8f0'}`,borderRadius:8,cursor:'pointer',fontSize:12}}>
                    <input type="checkbox" checked={!!newAdminPerms[key]} onChange={e=>setNewAdminPerms(prev=>({...prev,[key]:e.target.checked}))}/>
                    {label}
                  </label>
                ))}
              </div>

              {addAdminError && <div style={{fontSize:12,color:'#dc2626',fontWeight:600,marginBottom:12}}>⚠️ {addAdminError}</div>}
              <button onClick={createAdmin} disabled={addAdminSaving}
                style={{width:'100%',padding:'11px',background:'#16a34a',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {addAdminSaving?'⏳ جاري الإضافة...':'إضافة المشرف'}
              </button>
            </div>
          )}

          {adminsLoading ? (
            <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>جاري التحميل...</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {adminsList.map(a=>(
                <div key={a.id} style={{background:'#ffffff',borderRadius:14,padding:'16px 20px',border:'1px solid #e5e7eb'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{a.full_name}</span>
                        {a.role==='super_admin' && <span style={{fontSize:10,fontWeight:700,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:20,padding:'2px 8px'}}>مشرف كامل</span>}
                        {!a.is_active && <span style={{fontSize:10,fontWeight:700,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:20,padding:'2px 8px'}}>معطّل</span>}
                      </div>
                      <div style={{fontSize:12,color:'#94a3b8',marginTop:3}} dir="ltr">{a.email}</div>
                      {a.role!=='super_admin' && (
                        <div style={{fontSize:11,color:'#64748b',marginTop:6}}>
                          {Object.entries(a.permissions||{}).filter(([,v])=>v).map(([k])=>PERMISSION_LABELS[k]||k).join(' · ') || 'بدون صلاحيات محددة'}
                        </div>
                      )}
                    </div>
                    {a.role!=='super_admin' && (
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>editingAdminId===a.id?setEditingAdminId(null):startEditAdmin(a)}
                          style={{padding:'6px 14px',background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          {editingAdminId===a.id?'إغلاق':'تعديل'}
                        </button>
                        <button onClick={()=>toggleAdminActive(a.id, !a.is_active)}
                          style={{padding:'6px 14px',background:a.is_active?'#fef2f2':'#f0fdf4',color:a.is_active?'#dc2626':'#16a34a',border:`1px solid ${a.is_active?'#fecaca':'#bbf7d0'}`,borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          {a.is_active?'تعطيل':'تفعيل'}
                        </button>
                        <button onClick={()=>setConfirmDeleteAdmin(a)}
                          style={{padding:'6px 14px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          حذف
                        </button>
                      </div>
                    )}
                  </div>

                  {editingAdminId===a.id && (
                    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #f1f5f9'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                        <input value={editAdminName} onChange={e=>setEditAdminName(e.target.value)} placeholder="الاسم الكامل"
                          style={{padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                        <input value={editAdminEmail} onChange={e=>setEditAdminEmail(e.target.value)} placeholder="الإيميل" type="email" dir="ltr"
                          style={{padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                      </div>
                      <input value={editAdminNewPass} onChange={e=>setEditAdminNewPass(e.target.value)} placeholder="كلمة مرور جديدة (اتركه فاضي لو ما تبي تغييرها)" type="password"
                        style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:14,boxSizing:'border-box'}}/>

                      <div style={{fontSize:12,fontWeight:700,color:'#475569',marginBottom:8}}>الصلاحيات:</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                        {Object.entries(PERMISSION_LABELS).map(([key,label])=>(
                          <label key={key} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:editAdminPerms[key]?'#f0fdf4':'#f8fafc',border:`1px solid ${editAdminPerms[key]?'#bbf7d0':'#e2e8f0'}`,borderRadius:8,cursor:'pointer',fontSize:12}}>
                            <input type="checkbox" checked={!!editAdminPerms[key]} onChange={e=>setEditAdminPerms(prev=>({...prev,[key]:e.target.checked}))}/>
                            {label}
                          </label>
                        ))}
                      </div>

                      {editAdminError && <div style={{fontSize:12,color:'#dc2626',fontWeight:600,marginBottom:12}}>⚠️ {editAdminError}</div>}
                      <button onClick={saveAdminEdit} disabled={editAdminSaving}
                        style={{width:'100%',padding:'11px',background:'#2563eb',color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        {editAdminSaving?'⏳ جاري الحفظ...':'حفظ التعديلات'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {confirmDeleteAdmin && (
            <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
              <div style={{position:'absolute',inset:0,background:'rgba(15,23,42,.4)',backdropFilter:'blur(6px)'}} onClick={()=>!deleteAdminSaving&&setConfirmDeleteAdmin(null)}/>
              <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:360,position:'relative',boxShadow:'0 24px 60px rgba(0,0,0,.2)'}}>
                <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:8,textAlign:'center'}}>حذف حساب المشرف</div>
                <div style={{fontSize:13,color:'#64748b',textAlign:'center',marginBottom:20,lineHeight:1.7}}>
                  سيتم حذف <b style={{color:'#0f172a'}}>{confirmDeleteAdmin.full_name}</b> ({confirmDeleteAdmin.email}) نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setConfirmDeleteAdmin(null)} disabled={deleteAdminSaving}
                    style={{flex:1,padding:'11px',background:'#f1f5f9',color:'#475569',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    إلغاء
                  </button>
                  <button onClick={deleteAdminNow} disabled={deleteAdminSaving}
                    style={{flex:2,padding:'11px',background:'#dc2626',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {deleteAdminSaving?'جاري الحذف...':'تأكيد الحذف'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Supplier Applications Tab ═══ */}
      {tab==='suppliers' && (
        <div style={{padding:'0 24px 24px',maxWidth:1300,margin:'0 auto'}}>
          <div style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:16}}>🤝 طلبات الشراكة ({supplierApps.length})</div>
          {suppLoading ? (
            <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>جاري التحميل...</div>
          ) : supplierApps.length===0 ? (
            <div style={{background:'#ffffff',borderRadius:14,padding:40,textAlign:'center',color:'#94a3b8',border:'1px solid #e5e7eb'}}>لا توجد طلبات بعد</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {supplierApps.map(s=>(
                <div key={s.id} style={{background:'#ffffff',borderRadius:14,padding:'18px 20px',border:'1px solid #e5e7eb'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{s.company_name}</div>
                        <span style={{padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,
                          background:s.status==='pending'?'#fffbeb':s.status==='approved'?'#f0fdf4':'#fef2f2',
                          color:s.status==='pending'?'#d97706':s.status==='approved'?'#16a34a':'#dc2626'}}>
                          {s.status==='pending'?'بانتظار':s.status==='approved'?'✅ موافق':'❌ مرفوض'}
                        </span>
                      </div>
                      <div style={{display:'flex',gap:16,fontSize:12,color:'#64748b',marginBottom:8}}>
                        <span>👤 {s.contact_name}</span>
                        <span>📱 {s.phone}</span>
                        {s.email&&<span>📧 {s.email}</span>}
                        {isSafeUrl(s.website)&&<a href={s.website} target="_blank" rel="noopener noreferrer" style={{color:'#2563eb',textDecoration:'none'}}>🌐 الموقع</a>}
                      </div>
                      {s.business_type?.length>0&&(
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                          {s.business_type.map((t:string)=>(
                            <span key={t} style={{background:'#f1f5f9',padding:'2px 8px',borderRadius:6,fontSize:11,color:'#475569'}}>{t}</span>
                          ))}
                        </div>
                      )}
                      {s.description&&<div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>{s.description}</div>}
                    </div>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                        style={{padding:'7px 12px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none'}}>
                        📲 واتساب
                      </a>
                      {s.status==='pending'&&<>
                        <button onClick={()=>updateSupplierStatus(s.id,'approved')}
                          style={{padding:'7px 12px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          ✅ موافقة
                        </button>
                        <button onClick={()=>updateSupplierStatus(s.id,'rejected')}
                          style={{padding:'7px 12px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          ❌ رفض
                        </button>
                      </>}
                      <button onClick={()=>deleteSupplierApp(s.id)}
                        style={{padding:'7px 12px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        حذف
                      </button>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:'#cbd5e1',marginTop:8}}>{new Date(s.created_at).toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
