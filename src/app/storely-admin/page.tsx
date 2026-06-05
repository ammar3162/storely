'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type User = {
  id: string
  full_name: string
  phone: string
  role: string
  status: string
  created_at: string
  org_name: string
  email?: string
}

export default function StorelyAdminPage() {
  const [users, setUsers]     = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [authed, setAuthed]   = useState(false)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [saving, setSaving]   = useState<string|null>(null)
  const sb = createClient()

  const ADMIN_PASS = 'storely@2026'

  function checkPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASS) {
      setAuthed(true)
      loadUsers()
    } else {
      alert('كلمة المرور غلط')
    }
  }

  async function loadUsers() {
    setLoading(true)
    const { data } = await sb
      .from('profiles')
      .select('id,full_name,phone,role,status,created_at,org_id,organizations(name)')
      .order('created_at',{ascending:false})
    if (data) {
      setUsers(data.map((p:any) => ({
        id: p.id,
        full_name: p.full_name||'—',
        phone: p.phone||'—',
        role: p.role,
        status: p.status||'pending',
        created_at: p.created_at,
        org_name: p.organizations?.name||'—',
      })))
    }
    setLoading(false)
    setIsAdmin(true)
  }

  async function updateStatus(userId: string, status: string) {
    setSaving(userId)
    await sb.from('profiles').update({status}).eq('id',userId)
    await loadUsers()
    setSaving(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.includes(search)||u.org_name?.includes(search)||u.phone?.includes(search)
    const matchFilter = filter==='all'||u.status===filter
    return matchSearch && matchFilter
  })

  const counts = {
    all:       users.length,
    pending:   users.filter(u=>u.status==='pending').length,
    active:    users.filter(u=>u.status==='active').length,
    suspended: users.filter(u=>u.status==='suspended').length,
    deleted:   users.filter(u=>u.status==='deleted').length,
  }

  const statusCfg: Record<string,{label:string;color:string;bg:string;border:string}> = {
    pending:   {label:'بانتظار التفعيل', color:'#92400e', bg:'#fef3c7', border:'#fcd34d'},
    active:    {label:'مفعّل',           color:'#166534', bg:'#dcfce7', border:'#86efac'},
    suspended: {label:'موقوف',          color:'#991b1b', bg:'#fee2e2', border:'#fca5a5'},
    deleted:   {label:'محذوف',          color:'#6b7280', bg:'#f3f4f6', border:'#d1d5db'},
  }

  const inp: React.CSSProperties = {
    width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,
    fontSize:14,outline:'none',background:'white',color:'#1e293b',fontFamily:'inherit',
  }

  if (!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#1a4731,#0d2818)',direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:'white',borderRadius:20,padding:'40px',width:'100%',maxWidth:380,boxShadow:'0 25px 60px rgba(0,0,0,0.3)',textAlign:'center'}}>
        <div style={{width:64,height:64,background:'#e8f7ee',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 16px'}}>🔐</div>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:4}}>لوحة إدارة Storely</h1>
        <p style={{fontSize:12,color:'#94a3b8',marginBottom:24}}>أدخل كلمة مرور الأدمن</p>
        <form onSubmit={checkPassword}>
          <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
            style={{...inp,marginBottom:16,textAlign:'center',fontSize:18,letterSpacing:4}} placeholder="••••••••"/>
          <button type="submit" style={{width:'100%',padding:'12px',background:'#1a4731',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            دخول
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl'}}>
      <style>{`
        .at{width:100%;border-collapse:collapse}
        .at th{padding:10px 14px;color:#94a3b8;font-size:10px;font-weight:700;text-align:right;border-bottom:1px solid #e8ecf0;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;background:#f8fafc}
        .at td{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .at tr:hover td{background:#f8fafc}
        .ab{padding:6px 12px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all 0.15s;white-space:nowrap}
        @media(max-width:768px){.at th:nth-child(3),.at td:nth-child(3){display:none}}
      `}</style>

      {/* Header */}
      <div style={{background:'linear-gradient(160deg,#1a4731,#0d2818)',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,background:'#2d7a4f',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏪</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'white'}}>Storely Admin</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>لوحة إدارة المستخدمين</div>
          </div>
        </div>
        <button onClick={()=>setAuthed(false)} style={{padding:'7px 14px',background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          خروج
        </button>
      </div>

      <div style={{padding:'20px',maxWidth:1100,margin:'0 auto'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {label:'إجمالي',       value:counts.all,       color:'#1e40af', bg:'#dbeafe'},
            {label:'بانتظار',      value:counts.pending,   color:'#92400e', bg:'#fef3c7'},
            {label:'مفعّلون',      value:counts.active,    color:'#166534', bg:'#dcfce7'},
            {label:'موقوفون',      value:counts.suspended, color:'#991b1b', bg:'#fee2e2'},
          ].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
              <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{background:'white',borderRadius:12,padding:'14px 16px',marginBottom:14,border:'1px solid #e8ecf0',display:'flex',gap:10,flexWrap:'wrap' as const,alignItems:'center'}}>
          <input style={{padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',background:'white',color:'#1e293b',fontFamily:'inherit',flex:1,minWidth:160}}
            placeholder="🔍 بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
            {(['all','pending','active','suspended','deleted'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'7px 14px',borderRadius:8,border:'1.5px solid '+(filter===f?'#1a4731':'#e2e8f0'),background:filter===f?'#1a4731':'white',color:filter===f?'white':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                {f==='all'?'الكل':f==='pending'?'بانتظار':f==='active'?'مفعّل':f==='suspended'?'موقوف':'محذوف'}
                {' '}{counts[f]>0?`(${counts[f]})`:''}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden'}}>
          {loading ? (
            <div style={{padding:48,textAlign:'center',color:'#94a3b8',fontSize:13}}>جاري التحميل...</div>
          ) : filtered.length===0 ? (
            <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>
              <div style={{fontSize:32,marginBottom:10}}>👤</div>
              <div style={{fontSize:14,fontWeight:600,color:'#475569'}}>لا توجد نتائج</div>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="at">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>المؤسسة</th>
                    <th>الجوال</th>
                    <th>تاريخ التسجيل</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u=>{
                    const cfg = statusCfg[u.status]||statusCfg.pending
                    const isSaving = saving===u.id
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:32,height:32,background:'#e8f7ee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#1a4731',flexShrink:0}}>
                              {u.full_name?.[0]||'؟'}
                            </div>
                            <div>
                              <div style={{fontWeight:600,color:'#0f172a',fontSize:13}}>{u.full_name}</div>
                              <div style={{fontSize:10,color:'#94a3b8'}}>{u.role==='owner'?'مالك':'موظف'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{fontWeight:500,color:'#334155'}}>{u.org_name}</td>
                        <td style={{color:'#64748b',fontSize:12}}>{u.phone}</td>
                        <td style={{color:'#94a3b8',fontSize:11,whiteSpace:'nowrap' as const}}>{new Date(u.created_at).toLocaleDateString('ar-SA')}</td>
                        <td>
                          <span style={{background:cfg.bg,color:cfg.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,border:'1px solid '+cfg.border,whiteSpace:'nowrap' as const}}>
                            {cfg.label}
                          </span>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                            {u.status!=='active' && u.status!=='deleted' && (
                              <button className="ab" disabled={!!isSaving} onClick={()=>updateStatus(u.id,'active')}
                                style={{background:'#dcfce7',color:'#166534'}}>
                                {isSaving?'...':'✓ تفعيل'}
                              </button>
                            )}
                            {u.status==='active' && (
                              <button className="ab" disabled={!!isSaving} onClick={()=>updateStatus(u.id,'suspended')}
                                style={{background:'#fef3c7',color:'#92400e'}}>
                                {isSaving?'...':'⏸ إيقاف'}
                              </button>
                            )}
                            {u.status==='suspended' && (
                              <button className="ab" disabled={!!isSaving} onClick={()=>updateStatus(u.id,'active')}
                                style={{background:'#dcfce7',color:'#166534'}}>
                                {isSaving?'...':'▶ تفعيل'}
                              </button>
                            )}
                            {u.status!=='deleted' && (
                              <button className="ab" disabled={!!isSaving}
                                onClick={()=>{if(confirm('حذف هذا المستخدم؟')) updateStatus(u.id,'deleted')}}
                                style={{background:'#fee2e2',color:'#991b1b'}}>
                                {isSaving?'...':'✕ حذف'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
