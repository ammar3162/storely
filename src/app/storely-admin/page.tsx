'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type User = {
  id: string; full_name: string; phone: string; role: string
  status: string; created_at: string; org_id: string; org_name: string
  subscription_type: string; subscription_ends_at: string|null; branch_count: number|null
  max_branches: number
  requested_plan: string
}

const STATUS: Record<string,{label:string;color:string;bg:string;border:string}> = {
  pending:   {label:'بانتظار', color:'#92400e', bg:'#fef3c7', border:'#fcd34d'},
  active:    {label:'مفعّل',   color:'#166534', bg:'#dcfce7', border:'#86efac'},
  suspended: {label:'موقوف',  color:'#991b1b', bg:'#fee2e2', border:'#fca5a5'},
  deleted:   {label:'محذوف',  color:'#6b7280', bg:'#f3f4f6', border:'#d1d5db'},
}

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false)
  const [pass, setPass]       = useState('')
  const [passErr, setPassErr] = useState(false)
  const [users, setUsers]     = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [saving, setSaving]   = useState<string|null>(null)
  const [selected, setSelected] = useState<User|null>(null)
  const [renewDays, setRenewDays] = useState(30)
  const [confirmDel, setConfirmDel] = useState<User|null>(null)
  const sb = createClient()

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pass})})
    if (res.ok) { const token = crypto.randomUUID(); document.cookie = 'storely_admin_token='+token+';path=/;max-age=86400;SameSite=Strict;Secure'; sessionStorage.setItem('storely_admin_pass', pass); setAuthed(true); loadUsers() }
    else { setPassErr(true); setTimeout(()=>setPassErr(false),2000) }
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
      branch_count:(p as any).branch_count||null,
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminPass },
      body: JSON.stringify({ userId, type, ends })
    })
    const data = await res.json()
    if (!data.success) { alert('خطأ في التفعيل: ' + (data.error || 'unknown')); setSaving(null); return }
    try {
      await fetch('/api/notify-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminPass },
        body: JSON.stringify({ userId, subscriptionType: type, subscriptionEndsAt: ends })
      })
    } catch(e) { console.error('WhatsApp failed:', e) }
    await loadUsers(); setSaving(null); setSelected(null)
  }

  async function suspend(userId: string) {
    setSaving(userId)
    await sb.from('profiles').update({status:'suspended'}).eq('id',userId)
    await loadUsers(); setSaving(null); setSelected(null)
  }

  async function updateMaxBranches(orgId: string, value: number) {
    setSaving(orgId)
    const planName = value===1?'basic':value<=3?'pro':'advanced'
    const maxStaff = value===1?1:value<=3?5:999
    const maxSuppliers = value===1?1:value<=3?5:999
    await (sb.from('organizations') as any).update({
      max_branches:value,
      plan:planName,
      max_staff:maxStaff,
      max_suppliers:maxSuppliers
    }).eq('id',orgId)
    setUsers(prev => prev.map(u => u.org_id===orgId ? {...u, max_branches:value} : u))
    setSelected(prev => prev && prev.org_id===orgId ? {...prev, max_branches:value} : prev)
    setSaving(null)
  }

  async function doDelete(u: User) {
    setSaving(u.id)
    await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem('storely_admin_pass') || '' },
      body: JSON.stringify({ userId: u.id, orgId: u.org_id || null })
    })
    await loadUsers(); setSaving(null); setConfirmDel(null); setSelected(null)
  }

  function daysLeft(endsAt: string|null) {
    if (!endsAt) return null
    return Math.ceil((new Date(endsAt).getTime()-Date.now())/(1000*60*60*24))
  }

  const filtered = users.filter(u=>{
    const ms = u.full_name?.includes(search)||u.org_name?.includes(search)||u.phone?.includes(search)
    return ms && (filter==='all'||u.status===filter)
  })

  const counts = {
    all:users.length,
    pending:users.filter(u=>u.status==='pending').length,
    active:users.filter(u=>u.status==='active').length,
    suspended:users.filter(u=>u.status==='suspended').length,
  }

  const totalRevenue = users.filter(u=>u.subscription_type==='paid'&&u.status==='active').length * 99

  // ── Login Screen ──
  if (!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0f172a,#1e293b)',direction:'rtl',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",padding:20}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
      <div style={{background:'white',borderRadius:24,padding:40,width:'100%',maxWidth:380,boxShadow:'0 32px 80px rgba(0,0,0,.4)',textAlign:'center',animation:'fadeUp .3s ease'}}>
        <div style={{width:72,height:72,background:'linear-gradient(135deg,#16a34a,#15803d)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:34,margin:'0 auto 20px',boxShadow:'0 8px 24px rgba(22,163,74,.3)'}}>🔐</div>
        <h1 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:6}}>Storely Admin</h1>
        <p style={{fontSize:13,color:'#94a3b8',marginBottom:28}}>لوحة تحكم المشرف</p>
        <form onSubmit={login}>
          <input type="password" required value={pass} onChange={e=>setPass(e.target.value)}
            style={{width:'100%',padding:'14px',border:`2px solid ${passErr?'#ef4444':'#e2e8f0'}`,borderRadius:14,fontSize:22,textAlign:'center',letterSpacing:8,outline:'none',fontFamily:'inherit',marginBottom:14,boxSizing:'border-box',transition:'border .2s',animation:passErr?'shake .3s ease':'none'}}
            placeholder="••••••••"/>
          {passErr&&<div style={{fontSize:12,color:'#ef4444',marginBottom:12,fontWeight:600}}>كلمة المرور خطأ</div>}
          <button type="submit" style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(22,163,74,.3)'}}>
            دخول ←
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f5f7fa',direction:'rtl',fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ru{animation:fadeUp .25s ease both}
        .urow{transition:background .12s;cursor:pointer}
        .urow:hover td{background:#fafafa}
        input:focus{outline:none!important;border-color:#16a34a!important;box-shadow:0 0 0 3px rgba(22,163,74,.1)!important}
        .filt-btn{padding:8px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;border:1.5px solid #e2e8f0;background:white;color:#64748b}
        .filt-btn.active{background:#0f172a;color:white;border-color:#0f172a}
        @media(max-width:768px){.hide-mob{display:none!important}.stats-grid{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      {/* Delete Confirm Modal */}
      {confirmDel && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)'}} onClick={()=>setConfirmDel(null)}/>
          <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:360,position:'relative',animation:'modalIn .2s ease',boxShadow:'0 24px 64px rgba(0,0,0,.25)'}}>
            <div style={{width:56,height:56,borderRadius:16,background:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:26}}>⚠️</div>
            <h3 style={{fontSize:17,fontWeight:800,color:'#0f172a',textAlign:'center',marginBottom:8}}>حذف المؤسسة نهائياً</h3>
            <p style={{fontSize:13,color:'#64748b',textAlign:'center',lineHeight:1.7,marginBottom:6}}>
              سيتم حذف <b style={{color:'#0f172a'}}>{confirmDel.org_name}</b> وكل بياناتها:
            </p>
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',marginBottom:20,fontSize:12,color:'#991b1b',lineHeight:1.8}}>
              ❌ المنتجات والمخزون<br/>
              ❌ المشتريات والفواتير<br/>
              ❌ الإشعارات والسجلات<br/>
              ❌ المستخدمين والحساب
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:'12px',background:'#f8fafc',color:'#64748b',border:'1.5px solid #e2e8f0',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
              <button onClick={()=>doDelete(confirmDel)} disabled={saving===confirmDel.id} style={{flex:2,padding:'12px',background:'#ef4444',color:'white',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {saving===confirmDel.id?'جاري الحذف...':'🗑️ حذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)'}} onClick={()=>setSelected(null)}/>
          <div style={{background:'white',borderRadius:24,width:'100%',maxWidth:440,position:'relative',animation:'modalIn .2s ease',boxShadow:'0 24px 64px rgba(0,0,0,.2)',overflow:'hidden'}}>
            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',padding:'24px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'white',flexShrink:0}}>
                {selected.full_name[0]||'؟'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:16,fontWeight:800,color:'white'}}>{selected.full_name}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,.5)',marginTop:2}}>{selected.org_name}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{width:32,height:32,borderRadius:9,background:'rgba(255,255,255,.1)',border:'none',color:'rgba(255,255,255,.7)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>

            <div style={{padding:'20px'}}>
              {/* Info Grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                {[
                  {label:'الجوال',      value:selected.phone},
                  {label:'تاريخ التسجيل', value:new Date(selected.created_at).toLocaleDateString('ar-SA')},
                  {label:'نوع الاشتراك', value:selected.subscription_type==='paid'?'مدفوع':'تجربة'},
                  {label:'الحالة',       value:STATUS[selected.status]?.label||selected.status},
                  {label:'org_id',       value:selected.org_id?.slice(0,12)+'...'},
                  {label:'انتهاء الاشتراك', value:selected.subscription_ends_at?new Date(selected.subscription_ends_at).toLocaleDateString('ar-SA'):'—'},
                  {label:'الباقة المطلوبة', value:selected.requested_plan==='basic'?'🟢 الأساسية':selected.requested_plan==='pro'?'🔵 المتوسطة':selected.requested_plan==='advanced'?'🟣 المتقدمة':selected.requested_plan},
                ].map((item,i)=>(
                  <div key={i} style={{background:'#f8fafc',borderRadius:10,padding:'10px 12px',border:'1px solid #f1f5f9'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:4}}>{item.label}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Subscription Days */}
              {(selected.status==='pending'||selected.status==='active') && (
                <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'14px',marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#166534',marginBottom:10}}>⚙️ تحديد مدة الاشتراك</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
                    {[7,30,90,365].map(d=>(
                      <button key={d} onClick={()=>setRenewDays(d)} style={{padding:'8px 4px',borderRadius:9,border:`1.5px solid ${renewDays===d?'#16a34a':'#e2e8f0'}`,background:renewDays===d?'#16a34a':'white',color:renewDays===d?'white':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                        {d<30?d+' أيام':d===30?'شهر':d===90?'3 أشهر':'سنة'}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>activate(selected.id,'trial',renewDays)} disabled={!!saving} style={{flex:1,padding:'11px',background:'#f5f3ff',color:'#6d28d9',border:'1.5px solid #ddd6fe',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                      {saving===selected.id?'...':'🎁 تجربة'}
                    </button>
                    <button onClick={()=>activate(selected.id,'paid',renewDays)} disabled={!!saving} style={{flex:2,padding:'11px',background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(22,163,74,.25)'}}>
                      {saving===selected.id?'...':'✅ تفعيل اشتراك مدفوع'}
                    </button>
                  </div>
                </div>
              )}

              {/* Plan Selection */}
              <div style={{background:'#eff6ff',border:'1.5px solid #bfdbfe',borderRadius:12,padding:'14px',marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1d4ed8',marginBottom:10}}>📦 الباقة المشتركة</div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {[
                    {v:1, plan:'basic',    label:'الأساسية',  price:'149 ر.س', desc:'فرع — موظف واحد',          color:'#16a34a', maxStaff:1},
                    {v:3, plan:'pro',      label:'المتوسطة',  price:'249 ر.س', desc:'3 فروع — موظفون غير محدودين', color:'#2563eb', maxStaff:999},
                    {v:10,plan:'advanced', label:'المتقدمة',  price:'399 ر.س', desc:'فروع غير محدودة',           color:'#7c3aed', maxStaff:999},
                  ].map(opt=>(
                    <button key={opt.v} onClick={()=>updateMaxBranches(selected.org_id,opt.v)} disabled={!!saving||!selected.org_id}
                      style={{padding:'10px 12px',borderRadius:10,border:`1.5px solid ${selected.max_branches===opt.v?opt.color:'#e2e8f0'}`,background:selected.max_branches===opt.v?opt.color+'12':'white',cursor:(!selected.org_id||!!saving)?'not-allowed':'pointer',fontFamily:'inherit',display:'flex',justifyContent:'space-between',alignItems:'center',opacity:!selected.org_id?0.5:1}}>
                      <div style={{textAlign:'right' as const}}>
                        <div style={{fontSize:13,fontWeight:800,color:selected.max_branches===opt.v?opt.color:'#0f172a'}}>{opt.label}</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{opt.desc}</div>
                      </div>
                      <div style={{fontSize:13,fontWeight:800,color:selected.max_branches===opt.v?opt.color:'#64748b'}}>{opt.price}</div>
                    </button>
                  ))}
                </div>
                {!selected.org_id && <div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>لا توجد مؤسسة مرتبطة بعد</div>}
              </div>

              <div style={{display:'flex',gap:8}}>
                {selected.status==='active' && (
                  <button onClick={()=>suspend(selected.id)} disabled={!!saving} style={{flex:1,padding:'11px',background:'#fffbeb',color:'#d97706',border:'1.5px solid #fde68a',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {saving===selected.id?'...':'⏸ إيقاف'}
                  </button>
                )}
                {selected.status==='suspended' && (
                  <button onClick={()=>activate(selected.id,selected.subscription_type,30)} disabled={!!saving} style={{flex:1,padding:'11px',background:'#f0fdf4',color:'#16a34a',border:'1.5px solid #bbf7d0',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    {saving===selected.id?'...':'▶ إعادة تفعيل'}
                  </button>
                )}
                {selected.status!=='deleted' && (
                  <button onClick={()=>{setSelected(null);setConfirmDel(selected)}} style={{flex:1,padding:'11px',background:'#fef2f2',color:'#ef4444',border:'1.5px solid #fecaca',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    🗑️ حذف
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 4px 20px rgba(0,0,0,.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:38,height:38,background:'linear-gradient(135deg,#16a34a,#15803d)',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,boxShadow:'0 4px 12px rgba(22,163,74,.3)'}}>🏪</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'white'}}>Storely Admin</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>لوحة إدارة المشرف</div>
          </div>
        </div>
        <button onClick={()=>setAuthed(false)} style={{padding:'8px 16px',background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.7)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'}>
          خروج
        </button>
      </div>

      <div style={{padding:'20px',maxWidth:1200,margin:'0 auto'}}>
        <div style={{marginBottom:16}}><a href='/storely-admin/monitoring' style={{padding:'8px 16px',background:'#1e293b',color:'#94a3b8',border:'1px solid #334155',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>📊 مراقبة النظام</a></div>

        {counts.pending > 0 && (
          <div style={{background:'#fffbeb',border:'2px solid #fcd34d',borderRadius:14,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:14,cursor:'pointer'}}
            onClick={()=>setFilter('pending')}>
            <div style={{width:42,height:42,borderRadius:12,background:'#fef3c7',border:'1.5px solid #fcd34d',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🔔</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'#92400e'}}>{counts.pending} مستخدم بانتظار الموافقة</div>
              <div style={{fontSize:12,color:'#b45309',marginTop:2}}>اضغط لعرض الطلبات والموافقة عليها</div>
            </div>
            <div style={{background:'#f59e0b',color:'white',borderRadius:99,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,flexShrink:0}}>{counts.pending}</div>
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid ru" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {label:'إجمالي المستخدمين', value:counts.all,       sub:'مستخدم',    color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe'},
            {label:'بانتظار التفعيل',   value:counts.pending,   sub:'طلب جديد',  color:'#d97706', bg:'#fffbeb', border:'#fde68a'},
            {label:'مفعّلون',           value:counts.active,    sub:'مستخدم نشط', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0'},
            {label:'الإيرادات التقديرية', value:totalRevenue+'﷼', sub:'شهرياً',  color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe'},
          ].map((s,i)=>(
            <div key={i} style={{background:'white',borderRadius:16,padding:'16px',border:`1.5px solid ${s.border}`,boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase' as const,letterSpacing:'.07em',marginBottom:8}}>{s.label}</div>
              <div style={{fontSize:26,fontWeight:900,color:s.color,letterSpacing:'-0.5px'}}>{s.value}</div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="ru" style={{background:'white',borderRadius:16,padding:'14px 16px',marginBottom:14,border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.04)',display:'flex',gap:10,flexWrap:'wrap' as const,alignItems:'center'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <svg style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث بالاسم أو المؤسسة أو الجوال..."
              style={{width:'100%',padding:'10px 36px 10px 12px',border:'1.5px solid #f1f5f9',borderRadius:11,fontSize:13,background:'#fafafa',color:'#0f172a',fontFamily:'inherit',outline:'none'}}/>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
            {(['all','pending','active','suspended'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`filt-btn${filter===f?' active':''}`}>
                {f==='all'?'الكل':f==='pending'?'بانتظار':f==='active'?'مفعّل':'موقوف'}
                <span style={{marginRight:4,opacity:.7}}>({counts[f]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="ru" style={{background:'white',borderRadius:16,border:'1px solid #f1f5f9',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
          {loading ? (
            <div style={{padding:64,textAlign:'center'}}>
              <div style={{width:40,height:40,border:'3px solid #f1f5f9',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 14px'}}/>
              <div style={{fontSize:13,color:'#94a3b8'}}>جاري تحميل البيانات...</div>
            </div>
          ) : filtered.length===0 ? (
            <div style={{padding:64,textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:12}}>👤</div>
              <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:4}}>لا توجد نتائج</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>جرب تغيير معايير البحث</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse' as const,minWidth:600}}>
                <thead>
                  <tr style={{background:'#fafafa',borderBottom:'1.5px solid #f1f5f9'}}>
                    {['المستخدم','المؤسسة','الجوال','الاشتراك','الحالة','إجراء'].map((h,i)=>(
                      <th key={i} className={i===2?'hide-mob':''} style={{padding:'11px 16px',color:'#94a3b8',fontSize:10,fontWeight:700,textAlign:'right' as const,textTransform:'uppercase' as const,letterSpacing:'.06em',whiteSpace:'nowrap' as const}}>
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
                    const isWarn = days!==null&&days>0&&days<=7
                    return (
                      <tr key={u.id} className="urow" onClick={()=>setSelected(u)} style={{borderBottom:'1px solid #f8fafc'}}>
                        <td style={{padding:'13px 16px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#16a34a,#15803d)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',flexShrink:0}}>
                              {u.full_name[0]||'؟'}
                            </div>
                            <div>
                              <div style={{fontWeight:700,color:'#0f172a',fontSize:13}}>{u.full_name}</div>
                              <div style={{fontSize:10,color:'#94a3b8',marginTop:1}}>{new Date(u.created_at).toLocaleDateString('ar-SA')}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'13px 16px',fontSize:13,fontWeight:600,color:'#334155'}}>{u.org_name}</td>
                        <td className="hide-mob" style={{padding:'13px 16px',fontSize:12,color:'#64748b',direction:'ltr',textAlign:'right' as const}}>{u.phone}</td>
                        <td style={{padding:'13px 16px'}}>
                          <div>
                            <span style={{
                              background:u.subscription_type==='paid'?'#eff6ff':'#f5f3ff',
                              color:u.subscription_type==='paid'?'#1d4ed8':'#6d28d9',
                              padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,
                              border:`1px solid ${u.subscription_type==='paid'?'#bfdbfe':'#ddd6fe'}`,
                            }}>
                              {u.subscription_type==='paid'?'مدفوع':'تجربة'}
                            </span>
                            {days!==null&&(
                              <div style={{fontSize:10,marginTop:4,fontWeight:700,color:isExp?'#ef4444':isWarn?'#f59e0b':'#94a3b8'}}>
                                {isExp?'⚠️ انتهى':isWarn?`⏰ ${days} يوم متبقي`:`${days} يوم`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{padding:'13px 16px'}}>
                          <span style={{background:cfg.bg,color:cfg.color,padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:700,border:`1px solid ${cfg.border}`,whiteSpace:'nowrap' as const}}>
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{padding:'13px 16px'}}>
                          <button onClick={e=>{e.stopPropagation();setSelected(u)}} style={{padding:'7px 14px',background:'#f8fafc',color:'#334155',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .12s'}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor='#16a34a'}
                            onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
                            إدارة
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {filtered.length>0&&(
            <div style={{padding:'12px 16px',background:'#fafafa',borderTop:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,color:'#94a3b8'}}>{filtered.length} من {users.length} مستخدم</span>
              <button onClick={loadUsers} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'white',color:'#334155',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                تحديث
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
