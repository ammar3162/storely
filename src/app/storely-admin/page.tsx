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
  org_id: string
  org_name: string
  subscription_type: string
  subscription_ends_at: string | null
}

export default function StorelyAdminPage() {
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(false)
  const [authed, setAuthed]     = useState(false)
  const [password, setPassword] = useState('')
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [saving, setSaving]     = useState<string|null>(null)
  const sb = createClient()
  const PASS = 'storely@2026'

  function login(e: React.FormEvent) {
    e.preventDefault()
    if (password === PASS) { setAuthed(true); loadUsers() }
    else alert('كلمة المرور خطأ')
  }

  async function loadUsers() {
    setLoading(true)
    const { data } = await sb.from('profiles')
      .select('id,full_name,phone,role,status,created_at,org_id,subscription_type,subscription_ends_at,organizations(name)')
      .order('created_at',{ascending:false})
    if (data) setUsers(data.map((p:any) => ({
      id: p.id, full_name: p.full_name||'—', phone: p.phone||'—',
      role: p.role, status: p.status||'pending', created_at: p.created_at,
      org_id: p.org_id,
      org_name: p.organizations?.name||'—',
      subscription_type: p.subscription_type||'trial',
      subscription_ends_at: p.subscription_ends_at||null,
    })))
    setLoading(false)
  }

  async function activate(userId: string, type: 'trial'|'paid') {
    setSaving(userId)
    const ends = type === 'paid' ? new Date(Date.now() + 30*24*60*60*1000).toISOString() : null
    await sb.from('profiles').update({ status:'active', subscription_type:type, subscription_ends_at:ends }).eq('id',userId)
    await loadUsers()
    setSaving(null)
  }

  async function suspend(userId: string) {
    setSaving(userId)
    await sb.from('profiles').update({ status:'suspended' }).eq('id',userId)
    await loadUsers()
    setSaving(null)
  }

  async function remove(userId: string, orgId: string) {
    setSaving(userId)
    // احذف كل بيانات المؤسسة
    const { data: products } = await sb.from('products').select('id').eq('org_id', orgId)
    const productIds = (products||[]).map((p:any) => p.id)
    if (productIds.length > 0) {
      await sb.from('stock_movements').delete().in('product_id', productIds)
    }
    await sb.from('products').delete().eq('org_id', orgId)
    await sb.from('whatsapp_logs').delete().eq('org_id', orgId)
    await sb.from('notifications').delete().eq('org_id', orgId)
    await sb.from('purchases').delete().eq('org_id', orgId)
    await sb.from('profiles').delete().eq('org_id', orgId)
    await sb.from('organizations').delete().eq('id', orgId)
    await loadUsers()
    setSaving(null)
  }

  function daysLeft(endsAt: string|null) {
    if (!endsAt) return null
    const diff = new Date(endsAt).getTime() - Date.now()
    return Math.ceil(diff / (1000*60*60*24))
  }

  const filtered = users.filter(u => {
    const ms = u.full_name?.includes(search)||u.org_name?.includes(search)||u.phone?.includes(search)
    const mf = filter==='all'||u.status===filter
    return ms && mf
  })

  const counts = {
    all: users.length,
    pending: users.filter(u=>u.status==='pending').length,
    active: users.filter(u=>u.status==='active').length,
    suspended: users.filter(u=>u.status==='suspended').length,
    deleted: users.filter(u=>u.status==='deleted').length,
  }

  const sCfg: Record<string,{label:string;color:string;bg:string;border:string}> = {
    pending:   {label:'بانتظار', color:'#92400e', bg:'#fef3c7', border:'#fcd34d'},
    active:    {label:'مفعّل',   color:'#166534', bg:'#dcfce7', border:'#86efac'},
    suspended: {label:'موقوف',  color:'#991b1b', bg:'#fee2e2', border:'#fca5a5'},
    deleted:   {label:'محذوف',  color:'#6b7280', bg:'#f3f4f6', border:'#d1d5db'},
  }

  const inp: React.CSSProperties = { width:'100%',padding:'10px 14px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:14,outline:'none',background:'white',color:'#1e293b',fontFamily:'inherit' }

  if (!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#1a4731,#0d2818)',direction:'rtl',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:'white',borderRadius:20,padding:'40px',width:'100%',maxWidth:380,boxShadow:'0 25px 60px rgba(0,0,0,0.3)',textAlign:'center'}}>
        <div style={{width:64,height:64,background:'#e8f7ee',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 16px'}}>🔐</div>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:4}}>Storely Admin</h1>
        <p style={{fontSize:12,color:'#94a3b8',marginBottom:24}}>أدخل كلمة مرور الأدمن</p>
        <form onSubmit={login}>
          <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={{...inp,marginBottom:16,textAlign:'center',fontSize:20,letterSpacing:6}} placeholder="••••••••"/>
          <button type="submit" style={{width:'100%',padding:'12px',background:'#1a4731',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>دخول</button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5',fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl'}}>
      <style>{`
        .at{width:100%;border-collapse:collapse}
        .at th{padding:10px 14px;color:#94a3b8;font-size:10px;font-weight:700;text-align:right;border-bottom:1px solid #e8ecf0;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;background:#f8fafc}
        .at td{padding:11px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;vertical-align:middle}
        .at tr:hover td{background:#f8fafc}
        .ab{padding:5px 10px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all 0.15s;white-space:nowrap}
        @media(max-width:768px){.at th:nth-child(3),.at td:nth-child(3){display:none}}
      `}</style>

      <div style={{background:'linear-gradient(160deg,#1a4731,#0d2818)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:34,height:34,background:'#2d7a4f',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>🏪</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'white'}}>Storely Admin</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>إدارة المستخدمين والاشتراكات</div>
          </div>
        </div>
        <button onClick={()=>setAuthed(false)} style={{padding:'7px 14px',background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>خروج</button>
      </div>

      <div style={{padding:'20px',maxWidth:1200,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {label:'إجمالي',  value:counts.all,       color:'#1e40af',bg:'#dbeafe'},
            {label:'بانتظار', value:counts.pending,   color:'#92400e',bg:'#fef3c7'},
            {label:'مفعّل',   value:counts.active,    color:'#166534',bg:'#dcfce7'},
            {label:'موقوف',   value:counts.suspended, color:'#991b1b',bg:'#fee2e2'},
          ].map((s,i)=>(
            <div key={i} style={{background:s.bg,borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{background:'white',borderRadius:12,padding:'14px 16px',marginBottom:14,border:'1px solid #e8ecf0',display:'flex',gap:10,flexWrap:'wrap' as const,alignItems:'center'}}>
          <input style={{padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',background:'white',color:'#1e293b',fontFamily:'inherit',flex:1,minWidth:160}} placeholder="🔍 بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
            {(['all','pending','active','suspended','deleted'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid '+(filter===f?'#1a4731':'#e2e8f0'),background:filter===f?'#1a4731':'white',color:filter===f?'white':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                {f==='all'?'الكل':f==='pending'?'بانتظار':f==='active'?'مفعّل':f==='suspended'?'موقوف':'محذوف'} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden'}}>
          {loading ? (
            <div style={{padding:48,textAlign:'center',color:'#94a3b8',fontSize:13}}>جاري التحميل...</div>
          ) : filtered.length===0 ? (
            <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}><div style={{fontSize:32,marginBottom:10}}>👤</div><div style={{fontSize:14,fontWeight:600,color:'#475569'}}>لا توجد نتائج</div></div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="at">
                <thead><tr><th>المستخدم</th><th>المؤسسة</th><th>الجوال</th><th>الاشتراك</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
                <tbody>
                  {filtered.map(u=>{
                    const cfg = sCfg[u.status]||sCfg.pending
                    const isSaving = saving===u.id
                    const days = daysLeft(u.subscription_ends_at)
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div style={{width:32,height:32,background:'#e8f7ee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#1a4731',flexShrink:0}}>{u.full_name?.[0]||'؟'}</div>
                            <div>
                              <div style={{fontWeight:600,color:'#0f172a',fontSize:13}}>{u.full_name}</div>
                              <div style={{fontSize:10,color:'#94a3b8'}}>{new Date(u.created_at).toLocaleDateString('ar-SA')}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{fontWeight:500}}>{u.org_name}</td>
                        <td style={{color:'#64748b',fontSize:12}}>{u.phone}</td>
                        <td>
                          {u.subscription_type==='paid' && u.subscription_ends_at ? (
                            <div>
                              <span style={{background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600}}>اشتراك مدفوع</span>
                              <div style={{fontSize:10,marginTop:3,color:days!==null&&days<=7?'#ef4444':'#94a3b8',fontWeight:days!==null&&days<=7?700:400}}>
                                {days!==null&&days>0?`ينتهي بعد ${days} يوم`:days!==null&&days<=0?'انتهى الاشتراك':'—'}
                              </div>
                            </div>
                          ) : u.subscription_type==='trial' ? (
                            <span style={{background:'#f3e8ff',color:'#6b21a8',padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600}}>تجربة</span>
                          ) : (
                            <span style={{color:'#94a3b8',fontSize:11}}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{background:cfg.bg,color:cfg.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,border:'1px solid '+cfg.border,whiteSpace:'nowrap' as const}}>
                            {cfg.label}
                          </span>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:5,flexWrap:'wrap' as const}}>
                            {u.status==='pending' && (<>
                              <button className="ab" disabled={!!isSaving} onClick={()=>activate(u.id,'trial')} style={{background:'#f3e8ff',color:'#6b21a8'}}>{isSaving?'...':'🎁 تجربة'}</button>
                              <button className="ab" disabled={!!isSaving} onClick={()=>activate(u.id,'paid')} style={{background:'#dcfce7',color:'#166534'}}>{isSaving?'...':'✓ اشتراك'}</button>
                            </>)}
                            {u.status==='active' && (<>
                              {u.subscription_type==='trial' && <button className="ab" disabled={!!isSaving} onClick={()=>activate(u.id,'paid')} style={{background:'#dcfce7',color:'#166534'}}>{isSaving?'...':'↑ اشتراك'}</button>}
                              {u.subscription_type==='paid' && <button className="ab" disabled={!!isSaving} onClick={()=>activate(u.id,'paid')} style={{background:'#dbeafe',color:'#1e40af'}}>{isSaving?'...':'↻ تجديد'}</button>}
                              <button className="ab" disabled={!!isSaving} onClick={()=>suspend(u.id)} style={{background:'#fef3c7',color:'#92400e'}}>{isSaving?'...':'⏸ إيقاف'}</button>
                            </>)}
                            {u.status==='suspended' && (
                              <button className="ab" disabled={!!isSaving} onClick={()=>activate(u.id,u.subscription_type as any)} style={{background:'#dcfce7',color:'#166534'}}>{isSaving?'...':'▶ تفعيل'}</button>
                            )}
                            {u.status!=='deleted' && (
                              <button className="ab" disabled={!!isSaving} onClick={()=>{if(confirm('حذف المؤسسة وكل بياناتها نهائياً؟')) remove(u.id, u.org_id)}} style={{background:'#fee2e2',color:'#991b1b'}}>{isSaving?'...':'✕'}</button>
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
