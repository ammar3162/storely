'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const [tab, setTab]           = useState<'users'|'stats'|'suppliers'>('users')
  const [supplierApps, setSupplierApps] = useState<any[]>([])
  const [suppLoading, setSuppLoading] = useState(false)
  const sb = createClient()

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pass})})
    if (res.ok) {
      const token = crypto.randomUUID()
      document.cookie = `storely_admin_token=${token};path=/;max-age=86400;SameSite=Strict;Secure`
      document.cookie = `storely_admin_auth=true;path=/;max-age=86400;SameSite=Strict;Secure`
      sessionStorage.setItem('storely_admin_pass', pass)
      setAuthed(true); loadUsers()
    } else { setPassErr(true); setTimeout(()=>setPassErr(false),2000) }
  }

  async function deleteSupplierApp(id: string) {
    const sb = (await import('@/lib/supabase/client')).createClient()
    await (sb as any).from('supplier_applications').delete().eq('id', id)
    loadSupplierApps()
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
      // عند الرفض احذفه مباشرة
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
    await fetch('/api/admin/delete-user', {
      method:'POST', headers:{'Content-Type':'application/json','x-admin-key':sessionStorage.getItem('storely_admin_pass')||''},
      body: JSON.stringify({ userId:u.id, orgId:u.org_id||null })
    })
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
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',padding:20}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        @keyframes pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.7;transform:scale(1.05)}}
      `}</style>
      <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
        <div style={{position:'absolute',top:'-20%',right:'-10%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,.12),transparent 70%)',animation:'pulse 6s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:'-10%',left:'-5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(74,222,128,.08),transparent 70%)',animation:'pulse 8s ease-in-out infinite 2s'}}/>
      </div>
      <div style={{background:'rgba(255,255,255,.97)',borderRadius:24,padding:'44px 40px',width:'100%',maxWidth:400,boxShadow:'0 32px 80px rgba(0,0,0,.5)',animation:'fadeUp .4s ease',position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{width:72,height:72,background:'linear-gradient(135deg,#16a34a,#15803d)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 20px',boxShadow:'0 8px 24px rgba(22,163,74,.3)'}}>🔐</div>
        <h1 style={{fontSize:24,fontWeight:900,color:'#0f172a',marginBottom:6}}>Storely Admin</h1>
        <p style={{fontSize:13,color:'#94a3b8',marginBottom:32}}>لوحة تحكم المشرف — وصول خاص</p>
        <form onSubmit={login}>
          <input type="password" required value={pass} onChange={e=>setPass(e.target.value)}
            style={{width:'100%',padding:'16px',border:`2px solid ${passErr?'#ef4444':'#e2e8f0'}`,borderRadius:14,fontSize:24,textAlign:'center',letterSpacing:10,outline:'none',fontFamily:'inherit',marginBottom:14,boxSizing:'border-box',transition:'all .2s',background:'#f8fafc',animation:passErr?'shake .3s ease':'none'}}
            placeholder="••••••••" autoFocus/>
          {passErr && <div style={{fontSize:12,color:'#ef4444',marginBottom:14,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>⚠️ كلمة المرور غير صحيحة</div>}
          <button type="submit" style={{width:'100%',padding:'15px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 6px 20px rgba(22,163,74,.3)',transition:'all .2s'}}>
            دخول ←
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',direction:'rtl',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",color:'white'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        .ru{animation:fadeUp .3s ease both}
        .urow{transition:background .1s;cursor:pointer;border-bottom:1px solid #1e293b}
        .urow:hover{background:#1e293b}
        .stat-card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:20px;transition:all .2s}
        .stat-card:hover{border-color:#475569;transform:translateY(-2px)}
        .tab-btn{padding:8px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;border:none}
        .filt-btn{padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid #334155;background:transparent;color:#64748b}
        .filt-btn.act{background:#16a34a;color:white;border-color:#16a34a}
        .action-btn{padding:8px 16px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid #334155;background:#1e293b;color:#94a3b8}
        .action-btn:hover{border-color:#16a34a;color:#16a34a}
        input:focus{outline:none!important;border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.15)!important}
        @media(max-width:768px){.hide-mob{display:none!important}.stats-grid{grid-template-columns:repeat(2,1fr)!important}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:99px}
      `}</style>

      {/* Delete Modal */}
      {confirmDel && (
        <div style={{position:'fixed',inset:0,zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(6px)'}} onClick={()=>setConfirmDel(null)}/>
          <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:20,padding:28,width:'100%',maxWidth:360,position:'relative',animation:'modalIn .2s ease',boxShadow:'0 32px 80px rgba(0,0,0,.6)'}}>
            <div style={{width:52,height:52,borderRadius:14,background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24}}>🗑️</div>
            <h3 style={{fontSize:17,fontWeight:800,color:'white',textAlign:'center',marginBottom:8}}>حذف نهائي</h3>
            <p style={{fontSize:13,color:'#94a3b8',textAlign:'center',lineHeight:1.7,marginBottom:16}}>
              سيتم حذف <b style={{color:'white'}}>{confirmDel.org_name}</b> وجميع بياناتها بشكل نهائي
            </p>
            <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:10,padding:'10px 14px',marginBottom:20,fontSize:12,color:'#fca5a5',lineHeight:1.9}}>
              ❌ المنتجات والمخزون · ❌ المشتريات · ❌ الإشعارات · ❌ الحساب
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:'12px',background:'#334155',color:'#94a3b8',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
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
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(6px)'}} onClick={()=>setSelected(null)}/>
          <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:24,width:'100%',maxWidth:480,position:'relative',animation:'modalIn .2s ease',boxShadow:'0 32px 80px rgba(0,0,0,.6)',overflow:'hidden',maxHeight:'90vh',overflowY:'auto'}}>
            {/* Modal Header */}
            <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',padding:'22px 24px',display:'flex',alignItems:'center',gap:14,borderBottom:'1px solid #334155',position:'sticky',top:0,zIndex:10}}>
              <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'white',flexShrink:0}}>
                {selected.full_name[0]||'؟'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:16,fontWeight:800,color:'white'}}>{selected.full_name}</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2,display:'flex',alignItems:'center',gap:8}}>
                  <span>{selected.org_name}</span>
                  <span style={{width:4,height:4,borderRadius:'50%',background:'#334155',display:'inline-block'}}/>
                  <span>{selected.phone}</span>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{width:32,height:32,borderRadius:9,background:'#334155',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>

            <div style={{padding:'20px 24px'}}>
              {/* Status & Type badges */}
              <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
                <span style={{background:STATUS[selected.status]?.bg,color:STATUS[selected.status]?.color,padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
                  {STATUS[selected.status]?.label||selected.status}
                </span>
                <span style={{background:selected.subscription_type==='paid'?'rgba(29,78,216,.2)':'rgba(109,40,217,.2)',color:selected.subscription_type==='paid'?'#93c5fd':'#c4b5fd',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
                  {selected.subscription_type==='paid'?'💳 مدفوع':'🎁 تجربة مجانية'}
                </span>
                {(() => { const d = daysLeft(selected.subscription_ends_at); return d !== null ? (
                  <span style={{background:d<=0?'rgba(239,68,68,.2)':d<=3?'rgba(245,158,11,.2)':'rgba(22,163,74,.2)',color:d<=0?'#fca5a5':d<=3?'#fcd34d':'#86efac',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>
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
                  <div key={i} style={{background:'#0f172a',borderRadius:10,padding:'10px 12px',border:'1px solid #1e293b'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#475569',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{item.label}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Activate Section */}
              {(selected.status==='pending'||selected.status==='active'||selected.status==='suspended') && (
                <div style={{background:'rgba(22,163,74,.08)',border:'1px solid rgba(22,163,74,.2)',borderRadius:14,padding:16,marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#4ade80',marginBottom:12}}>⚙️ تحديد مدة الاشتراك</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12}}>
                    {[7,30,90,365].map(d=>(
                      <button key={d} onClick={()=>setRenewDays(d)}
                        style={{padding:'9px 4px',borderRadius:9,border:`1.5px solid ${renewDays===d?'#16a34a':'#334155'}`,background:renewDays===d?'#16a34a':'#0f172a',color:renewDays===d?'white':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                        {d<30?d+' أيام':d===30?'شهر':d===90?'3 أشهر':'سنة'}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>activate(selected.id,'trial',renewDays)} disabled={!!saving}
                      style={{flex:1,padding:'11px',background:'rgba(109,40,217,.15)',color:'#c4b5fd',border:'1px solid rgba(109,40,217,.3)',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      {saving===selected.id?'...':'🎁 تجربة'}
                    </button>
                    <button onClick={()=>activate(selected.id,'paid',renewDays)} disabled={!!saving}
                      style={{flex:2,padding:'11px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(22,163,74,.3)'}}>
                      {saving===selected.id?'...':'✅ تفعيل مدفوع'}
                    </button>
                  </div>
                </div>
              )}

              {/* Plan Selection */}
              <div style={{background:'rgba(29,78,216,.08)',border:'1px solid rgba(29,78,216,.2)',borderRadius:14,padding:16,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'#93c5fd',marginBottom:12}}>📦 تغيير الباقة</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {PLANS.map(p=>(
                    <button key={p.v} onClick={()=>updatePlan(selected.org_id,p.v)} disabled={!!saving||!selected.org_id}
                      style={{padding:'12px 14px',borderRadius:10,border:`1.5px solid ${selected.max_branches===p.v?p.color:'#334155'}`,background:selected.max_branches===p.v?p.color+'15':'#0f172a',cursor:(!selected.org_id||!!saving)?'not-allowed':'pointer',fontFamily:'inherit',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all .15s'}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:13,fontWeight:800,color:selected.max_branches===p.v?p.color:'#e2e8f0'}}>{p.label}</div>
                        <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{p.desc}</div>
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
                    style={{flex:1,padding:'11px',background:'rgba(245,158,11,.1)',color:'#fcd34d',border:'1px solid rgba(245,158,11,.2)',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {saving===selected.id?'...':'⏸ إيقاف'}
                  </button>
                )}
                {selected.status==='suspended' && (
                  <button onClick={()=>activate(selected.id,selected.subscription_type,30)} disabled={!!saving}
                    style={{flex:1,padding:'11px',background:'rgba(22,163,74,.1)',color:'#4ade80',border:'1px solid rgba(22,163,74,.2)',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {saving===selected.id?'...':'▶ إعادة تفعيل'}
                  </button>
                )}
                {selected.status!=='deleted' && (
                  <button onClick={()=>{setSelected(null);setConfirmDel(selected)}}
                    style={{flex:1,padding:'11px',background:'rgba(239,68,68,.1)',color:'#fca5a5',border:'1px solid rgba(239,68,68,.2)',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    🗑️ حذف
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Nav */}
      <div style={{background:'#0f172a',borderBottom:'1px solid #1e293b',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#16a34a,#15803d)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'white'}}>Storely Admin</div>
            <div style={{fontSize:10,color:'#475569'}}>لوحة التحكم</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <a href="/storely-admin/monitoring" style={{padding:'7px 14px',background:'#1e293b',color:'#94a3b8',border:'1px solid #334155',borderRadius:9,fontSize:12,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>
            📊 مراقبة
          </a>
          <a href="/storely-admin/notifications" style={{padding:'7px 14px',background:'#1e293b',color:'#94a3b8',border:'1px solid #334155',borderRadius:9,fontSize:12,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>
            🔔 الإشعارات
          </a>
          <button onClick={()=>{setTab('suppliers');loadSupplierApps()}} style={{padding:'7px 14px',background:tab==='suppliers'?'#16a34a':'#1e293b',color:tab==='suppliers'?'white':'#94a3b8',border:`1px solid ${tab==='suppliers'?'#16a34a':'#334155'}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
            🤝 طلبات الموردين {supplierApps.filter(s=>s.status==='pending').length>0&&<span style={{background:'#ef4444',color:'white',borderRadius:99,padding:'1px 6px',fontSize:10}}>{supplierApps.filter(s=>s.status==='pending').length}</span>}
          </button>
          <button onClick={loadUsers} style={{padding:'7px 14px',background:'#1e293b',color:'#94a3b8',border:'1px solid #334155',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
            ↺ تحديث
          </button>
          <button onClick={()=>setAuthed(false)} style={{padding:'7px 14px',background:'rgba(239,68,68,.1)',color:'#fca5a5',border:'1px solid rgba(239,68,68,.2)',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            خروج
          </button>
        </div>
      </div>

      <div style={{padding:'24px',maxWidth:1300,margin:'0 auto'}}>

        {/* Alert: pending users */}
        {stats.pending > 0 && (
          <div onClick={()=>setFilter('pending')} className="ru"
            style={{background:'rgba(245,158,11,.08)',border:'1.5px solid rgba(245,158,11,.3)',borderRadius:14,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:14,cursor:'pointer',transition:'all .2s'}}>
            <div style={{width:40,height:40,borderRadius:11,background:'rgba(245,158,11,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🔔</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'#fcd34d'}}>{stats.pending} مستخدم بانتظار الموافقة</div>
              <div style={{fontSize:12,color:'#92400e',marginTop:2}}>اضغط لعرض الطلبات</div>
            </div>
            <div style={{background:'#f59e0b',color:'white',borderRadius:99,minWidth:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:15,padding:'0 10px'}}>{stats.pending}</div>
          </div>
        )}

        {/* Alert: expiring soon */}
        {stats.expiringSoon > 0 && (
          <div className="ru" style={{background:'rgba(239,68,68,.08)',border:'1.5px solid rgba(239,68,68,.2)',borderRadius:14,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:40,height:40,borderRadius:11,background:'rgba(239,68,68,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>⏰</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#fca5a5'}}>{stats.expiringSoon} تجربة ستنتهي خلال 3 أيام</div>
              <div style={{fontSize:12,color:'#991b1b',marginTop:2}}>يرجى التواصل معهم للاشتراك</div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid ru" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {label:'إجمالي المستخدمين', value:stats.total, sub:'مستخدم مسجل', icon:'👥', color:'#60a5fa', glow:'rgba(96,165,250,.15)'},
            {label:'مفعّلون',           value:stats.active, sub:'نشط الآن',    icon:'✅', color:'#4ade80', glow:'rgba(74,222,128,.15)'},
            {label:'في التجربة',        value:stats.trial,  sub:'مجانية',      icon:'🎁', color:'#c4b5fd', glow:'rgba(196,181,253,.15)'},
            {label:'الإيراد الشهري',    value:stats.revenue+'﷼', sub:'مدفوع', icon:'💰', color:'#fcd34d', glow:'rgba(252,211,77,.15)'},
          ].map((s,i)=>(
            <div key={i} className="stat-card" style={{animationDelay:`${i*.05}s`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em'}}>{s.label}</div>
                <div style={{width:36,height:36,borderRadius:10,background:s.glow,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{s.icon}</div>
              </div>
              <div style={{fontSize:28,fontWeight:900,color:s.color,letterSpacing:'-0.5px',marginBottom:4}}>{s.value}</div>
              <div style={{fontSize:11,color:'#475569'}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="ru" style={{background:'#1e293b',borderRadius:14,padding:'12px 16px',marginBottom:14,border:'1px solid #334155',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke="#475569" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم أو المؤسسة أو الجوال..."
              style={{width:'100%',padding:'10px 36px 10px 12px',border:'1px solid #334155',borderRadius:10,fontSize:13,background:'#0f172a',color:'#e2e8f0',fontFamily:'inherit',outline:'none',transition:'all .2s'}}/>
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
        <div className="ru" style={{background:'#1e293b',borderRadius:16,border:'1px solid #334155',overflow:'hidden'}}>
          {loading ? (
            <div style={{padding:64,textAlign:'center'}}>
              <div style={{width:36,height:36,border:'3px solid #334155',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 14px'}}/>
              <div style={{fontSize:13,color:'#475569'}}>جاري تحميل البيانات...</div>
            </div>
          ) : filtered.length===0 ? (
            <div style={{padding:64,textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:12}}>👤</div>
              <div style={{fontSize:15,fontWeight:700,color:'#475569'}}>لا توجد نتائج</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                <thead>
                  <tr style={{background:'#0f172a',borderBottom:'1px solid #1e293b'}}>
                    {['المستخدم','المؤسسة','الجوال','الباقة','الاشتراك','الحالة','إجراء'].map((h,i)=>(
                      <th key={i} className={i===2?'hide-mob':''} style={{padding:'12px 16px',color:'#475569',fontSize:10,fontWeight:700,textAlign:'right',textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap'}}>
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
                              <div style={{fontWeight:700,color:'#e2e8f0',fontSize:13}}>{u.full_name}</div>
                              <div style={{fontSize:10,color:'#475569',marginTop:1}}>{new Date(u.created_at).toLocaleDateString('ar-SA')}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'14px 16px',fontSize:13,fontWeight:600,color:'#94a3b8'}}>{u.org_name}</td>
                        <td className="hide-mob" style={{padding:'14px 16px',fontSize:12,color:'#64748b',direction:'ltr',textAlign:'right'}}>{u.phone}</td>
                        <td style={{padding:'14px 16px'}}>
                          <span style={{fontSize:11,fontWeight:700,color:planColor,background:planColor+'15',padding:'3px 10px',borderRadius:20,border:`1px solid ${planColor}30`}}>
                            {planLabel}
                          </span>
                        </td>
                        <td style={{padding:'14px 16px'}}>
                          <div>
                            <span style={{background:u.subscription_type==='paid'?'rgba(29,78,216,.2)':'rgba(109,40,217,.2)',color:u.subscription_type==='paid'?'#93c5fd':'#c4b5fd',padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700}}>
                              {u.subscription_type==='paid'?'💳 مدفوع':'🎁 تجربة'}
                            </span>
                            {days!==null&&(
                              <div style={{fontSize:10,marginTop:4,fontWeight:700,color:isExp?'#ef4444':isWarn?'#f59e0b':'#475569'}}>
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
            <div style={{padding:'12px 16px',background:'#0f172a',borderTop:'1px solid #1e293b',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'#475569'}}>{filtered.length} من {users.length} مستخدم</span>
              <span style={{fontSize:12,color:'#334155'}}>آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}</span>
            </div>
          )}
        </div>
      </div>
      {/* ═══ Supplier Applications Tab ═══ */}
      {tab==='suppliers' && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:16}}>🤝 طلبات الشراكة ({supplierApps.length})</div>
          {suppLoading ? (
            <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>جاري التحميل...</div>
          ) : supplierApps.length===0 ? (
            <div style={{background:'#1e293b',borderRadius:14,padding:40,textAlign:'center',color:'#64748b'}}>لا توجد طلبات بعد</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {supplierApps.map(s=>(
                <div key={s.id} style={{background:'#1e293b',borderRadius:14,padding:'18px 20px',border:'1px solid #334155'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <div style={{fontSize:15,fontWeight:800,color:'white'}}>{s.company_name}</div>
                        <span style={{padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,
                          background:s.status==='pending'?'rgba(245,158,11,.15)':s.status==='approved'?'rgba(22,163,74,.15)':'rgba(239,68,68,.15)',
                          color:s.status==='pending'?'#fcd34d':s.status==='approved'?'#4abe7a':'#fca5a5'}}>
                          {s.status==='pending'?'بانتظار':s.status==='approved'?'✅ موافق':'❌ مرفوض'}
                        </span>
                      </div>
                      <div style={{display:'flex',gap:16,fontSize:12,color:'#94a3b8',marginBottom:8}}>
                        <span>👤 {s.contact_name}</span>
                        <span>📱 {s.phone}</span>
                        {s.email&&<span>📧 {s.email}</span>}
                        {s.website&&<a href={s.website} target="_blank" style={{color:'#60a5fa',textDecoration:'none'}}>🌐 الموقع</a>}
                      </div>
                      {s.business_type?.length>0&&(
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                          {s.business_type.map((t:string)=>(
                            <span key={t} style={{background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:6,fontSize:11,color:'#94a3b8'}}>{t}</span>
                          ))}
                        </div>
                      )}
                      {s.description&&<div style={{fontSize:12,color:'#64748b',marginTop:4}}>{s.description}</div>}
                    </div>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <a href={`https://wa.me/${s.phone.replace(/[^0-9]/g,'')}`} target="_blank"
                        style={{padding:'7px 12px',background:'rgba(22,163,74,.15)',color:'#4abe7a',border:'1px solid rgba(22,163,74,.2)',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none'}}>
                        📲 واتساب
                      </a>
                      {s.status==='pending'&&<>
                        <button onClick={()=>updateSupplierStatus(s.id,'approved')}
                          style={{padding:'7px 12px',background:'rgba(22,163,74,.15)',color:'#4abe7a',border:'1px solid rgba(22,163,74,.2)',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          ✅ موافقة
                        </button>
                        <button onClick={()=>updateSupplierStatus(s.id,'rejected')}
                          style={{padding:'7px 12px',background:'rgba(239,68,68,.1)',color:'#fca5a5',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          ❌ رفض
                        </button>
                      </>}
                      <button onClick={()=>deleteSupplierApp(s.id)}
                        style={{padding:'7px 12px',background:'rgba(239,68,68,.1)',color:'#fca5a5',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        حذف
                      </button>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:'#475569',marginTop:8}}>{new Date(s.created_at).toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
