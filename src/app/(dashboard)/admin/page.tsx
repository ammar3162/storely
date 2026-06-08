'use client'
export const dynamic = 'force-dynamic'
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
  org_id: string
}

export default function AdminPage() {
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [saving, setSaving]     = useState<string|null>(null)
  const sb = createClient()

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb.from('admins').select('id').eq('id', user.id).single()
    if (!data) { setIsAdmin(false); setLoading(false); return }
    setIsAdmin(true)
    loadUsers()
  }

  async function loadUsers() {
    setLoading(true)
    const { data } = await sb
      .from('profiles')
      .select('id, full_name, phone, role, status, created_at, org_id, organizations(name)')
      .order('created_at', { ascending: false })
    if (data) {
      setUsers(data.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone || '—',
        role: p.role,
        status: p.status || 'pending',
        created_at: p.created_at,
        org_name: p.organizations?.name || '—',
        org_id: p.org_id,
      })))
    }
    setLoading(false)
  }

  async function updateStatus(userId: string, status: string) {
    setSaving(userId)
    await sb.from('profiles').update({ status }).eq('id', userId)
    await loadUsers()
    setSaving(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.includes(search) || u.org_name?.includes(search) || u.phone?.includes(search)
    const matchFilter = filter === 'all' || u.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    all:       users.length,
    pending:   users.filter(u => u.status === 'pending').length,
    active:    users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    deleted:   users.filter(u => u.status === 'deleted').length,
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:   { label:'بانتظار التفعيل', color:'#92400e', bg:'#fef3c7', border:'#fcd34d' },
    active:    { label:'مفعّل',           color:'#166534', bg:'#dcfce7', border:'#86efac' },
    suspended: { label:'موقوف مؤقتاً',   color:'#991b1b', bg:'#fee2e2', border:'#fca5a5' },
    deleted:   { label:'محذوف',          color:'#6b7280', bg:'#f3f4f6', border:'#d1d5db' },
  }

  const inp: React.CSSProperties = {
    padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:13, outline:'none', background:'white', color:'#1e293b', fontFamily:'inherit',
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:12}}>
      <div style={{width:36,height:36,border:'3px solid #e2e8f0',borderTopColor:'#1a4731',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!isAdmin) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',direction:'rtl'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:8}}>غير مصرح</div>
        <div style={{fontSize:13,color:'#64748b'}}>ليس لديك صلاحية الوصول لهذه الصفحة</div>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',maxWidth:1100,margin:'0 auto'}}>
      <style>{`
        .u-table{width:100%;border-collapse:collapse}
        .u-table th{padding:10px 14px;color:#94a3b8;fontSize:10px;font-weight:700;text-align:right;border-bottom:1px solid #e8ecf0;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap}
        .u-table td{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155}
        .u-table tr:hover td{background:#f8fafc}
        .action-btn{padding:6px 12px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all 0.15s}
        @media(max-width:768px){.u-table th:nth-child(3),.u-table td:nth-child(3),.u-table th:nth-child(4),.u-table td:nth-child(4){display:none}}
      `}</style>

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:3}}>لوحة الأدمن</h1>
        <p style={{fontSize:12,color:'#64748b'}}>إدارة المستخدمين والاشتراكات</p>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'إجمالي المستخدمين', value:counts.all,       color:'#1e40af', bg:'#dbeafe'},
          {label:'بانتظار التفعيل',   value:counts.pending,   color:'#92400e', bg:'#fef3c7'},
          {label:'مفعّلون',           value:counts.active,    color:'#166534', bg:'#dcfce7'},
          {label:'موقوفون',           value:counts.suspended, color:'#991b1b', bg:'#fee2e2'},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:10,padding:'14px 16px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:'white',borderRadius:12,padding:'14px 16px',marginBottom:14,border:'1px solid #e8ecf0',display:'flex',gap:10,flexWrap:'wrap' as const,alignItems:'center'}}>
        <input style={{...inp,flex:1,minWidth:160}} placeholder="🔍 بحث بالاسم أو المؤسسة..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
          {[
            {key:'all',       label:'الكل'},
            {key:'pending',   label:'بانتظار'},
            {key:'active',    label:'مفعّل'},
            {key:'suspended', label:'موقوف'},
            {key:'deleted',   label:'محذوف'},
          ].map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)}
              style={{padding:'7px 14px',borderRadius:8,border:'1.5px solid '+(filter===f.key?'#1a4731':'#e2e8f0'),background:filter===f.key?'#1a4731':'white',color:filter===f.key?'white':'#64748b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              {f.label} {f.key==='all'?counts.all:counts[f.key as keyof typeof counts]>0?`(${counts[f.key as keyof typeof counts]})`:''} 
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{background:'white',borderRadius:12,border:'1px solid #e8ecf0',overflow:'hidden'}}>
        {filtered.length===0 ? (
          <div style={{padding:48,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:32,marginBottom:10}}>👤</div>
            <div style={{fontSize:14,fontWeight:600,color:'#475569'}}>لا توجد نتائج</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="u-table">
              <thead>
                <tr style={{background:'#f8fafc'}}>
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
                  const cfg = statusConfig[u.status]||statusConfig.pending
                  const isSaving = saving===u.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,background:'#e8f7ee',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#1a4731',flexShrink:0}}>
                            {u.full_name?.[0]||'؟'}
                          </div>
                          <div>
                            <div style={{fontWeight:600,color:'#0f172a',fontSize:13}}>{u.full_name||'—'}</div>
                            <div style={{fontSize:10,color:'#94a3b8'}}>{u.role==='owner'?'مالك':'موظف'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{fontWeight:500}}>{u.org_name}</td>
                      <td style={{color:'#64748b',fontSize:12}}>{u.phone}</td>
                      <td style={{color:'#94a3b8',fontSize:11}}>{new Date(u.created_at).toLocaleDateString('ar-SA')}</td>
                      <td>
                        <span style={{background:cfg.bg,color:cfg.color,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,border:'1px solid '+cfg.border,whiteSpace:'nowrap' as const}}>
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                          {u.status!=='active' && u.status!=='deleted' && (
                            <button className="action-btn" disabled={isSaving} onClick={()=>updateStatus(u.id,'active')}
                              style={{background:'#dcfce7',color:'#166534'}}>
                              {isSaving?'...':'✓ تفعيل'}
                            </button>
                          )}
                          {u.status==='active' && (
                            <button className="action-btn" disabled={isSaving} onClick={()=>updateStatus(u.id,'suspended')}
                              style={{background:'#fef3c7',color:'#92400e'}}>
                              {isSaving?'...':'⏸ إيقاف'}
                            </button>
                          )}
                          {u.status==='suspended' && (
                            <button className="action-btn" disabled={isSaving} onClick={()=>updateStatus(u.id,'active')}
                              style={{background:'#dcfce7',color:'#166534'}}>
                              {isSaving?'...':'▶ تفعيل'}
                            </button>
                          )}
                          {u.status!=='deleted' && (
                            <button className="action-btn" disabled={isSaving}
                              onClick={()=>{ if(window.confirm('حذف هذا المستخدم نهائياً؟')) updateStatus(u.id,'deleted') }}
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
  )
}
