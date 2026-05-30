'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [orgs, setOrgs]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) { router.push('/dashboard'); return }
    setIsAdmin(true)
    loadOrgs()
  }

  async function loadOrgs() {
    setLoading(true)
    const { data } = await supabase
      .from('organizations')
      .select(`*, profiles(id, full_name, phone, role)`)
      .order('created_at', { ascending: false })
    setOrgs(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('organizations').update({
      status,
      approved_at: status === 'active' ? new Date().toISOString() : null
    }).eq('id', id)
    loadOrgs()
  }

  async function deleteOrg(id: string, name: string) {
    if (!confirm(`هل تريد حذف "${name}" نهائياً؟ لا يمكن التراجع!`)) return
    await supabase.from('products').delete().eq('org_id', id)
    await supabase.from('purchases').delete().eq('org_id', id)
    await supabase.from('dispenses').delete().eq('org_id', id)
    await supabase.from('profiles').delete().eq('org_id', id)
    await supabase.from('organizations').delete().eq('id', id)
    loadOrgs()
  }

  const filtered = orgs.filter(o => {
    const matchSearch = o.name?.includes(search) || o.profiles?.[0]?.phone?.includes(search)
    const matchFilter = filter === 'all' ? true : o.status === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total:   orgs.length,
    active:  orgs.filter(o => o.status === 'active').length,
    pending: orgs.filter(o => o.status === 'pending').length,
    blocked: orgs.filter(o => o.status === 'blocked').length,
  }

  const statusConfig: Record<string,{label:string,bg:string,color:string}> = {
    active:  {label:'نشط',           bg:'#f0fdf4', color:'#16a34a'},
    pending: {label:'بانتظار الموافقة', bg:'#fffbeb', color:'#d97706'},
    blocked: {label:'موقوف',          bg:'#fef2f2', color:'#dc2626'},
  }

  if (!isAdmin) return null

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        @media(max-width:768px){
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .header-row{flex-direction:column !important;align-items:flex-start !important}
        }
        .row-hover:hover{background:#f8faff !important}
      `}</style>

      {/* Header */}
      <div style={{
        background:'linear-gradient(135deg,#0f172a,#1e293b)',
        borderRadius:20,padding:'24px 28px',marginBottom:24,
        display:'flex',justifyContent:'space-between',alignItems:'center',
        flexWrap:'wrap',gap:12
      }}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:'white',margin:0}}>👑 لوحة الأدمن</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',margin:'4px 0 0'}}>إدارة حسابات العملاء</p>
        </div>
        <button onClick={loadOrgs} style={{
          padding:'10px 18px',background:'rgba(255,255,255,0.1)',color:'white',
          border:'1.5px solid rgba(255,255,255,0.2)',borderRadius:12,
          fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'
        }}>🔄 تحديث</button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {label:'إجمالي الحسابات', value:stats.total,   icon:'👥', color:'#6366f1', bg:'#eef2ff', border:'#c7d2fe'},
          {label:'حسابات نشطة',    value:stats.active,  icon:'✅', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0'},
          {label:'بانتظار الموافقة',value:stats.pending, icon:'⏳', color:'#d97706', bg:'#fffbeb', border:'#fde68a'},
          {label:'موقوفة',          value:stats.blocked, icon:'🚫', color:'#dc2626', bg:'#fef2f2', border:'#fecaca'},
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
            <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pending Alert */}
      {stats.pending > 0 && (
        <div style={{background:'linear-gradient(135deg,#fffbeb,#fef3c7)',border:'2px solid #fcd34d',borderRadius:14,padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>⏳</span>
          <div>
            <div style={{fontWeight:800,color:'#92400e',fontSize:14}}>
              {stats.pending} حساب بانتظار موافقتك
            </div>
            <div style={{fontSize:12,color:'#b45309',marginTop:2}}>راجع الحسابات أدناه وفعّلها أو ارفضها</div>
          </div>
          <button onClick={() => setFilter('pending')} style={{
            marginRight:'auto',padding:'8px 14px',background:'#f59e0b',color:'white',
            border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'
          }}>عرض الطلبات</button>
        </div>
      )}

      {/* Filters */}
      <div style={{background:'white',borderRadius:14,padding:'14px 18px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}>🔍</span>
          <input type="text" placeholder="ابحث باسم المؤسسة أو رقم الجوال..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{width:'100%',padding:'10px 14px 10px 14px',paddingRight:36,border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,outline:'none',background:'white',fontFamily:'system-ui',boxSizing:'border-box' as const}} />
        </div>
        <div style={{display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,gap:3}}>
          {[
            {key:'all',    label:`الكل (${stats.total})`},
            {key:'active', label:`✅ نشط (${stats.active})`},
            {key:'pending',label:`⏳ انتظار (${stats.pending})`},
            {key:'blocked',label:`🚫 موقوف (${stats.blocked})`},
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              padding:'7px 12px',border:'none',borderRadius:8,cursor:'pointer',
              background:filter===tab.key?'white':'transparent',
              color:filter===tab.key?'#6366f1':'#64748b',
              fontWeight:filter===tab.key?700:500,fontSize:12,
              boxShadow:filter===tab.key?'0 1px 4px rgba(0,0,0,0.1)':'none',
              fontFamily:'system-ui',whiteSpace:'nowrap' as const
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{background:'white',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <div style={{fontSize:14,fontWeight:600}}>جاري التحميل...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div style={{fontSize:15,fontWeight:700,color:'#475569'}}>لا توجد نتائج</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead>
                <tr style={{background:'linear-gradient(135deg,#f8fafc,#f1f5f9)',borderBottom:'2px solid #e2e8f0'}}>
                  {['#','المؤسسة','المدير','الجوال','تاريخ التسجيل','انتهاء الاشتراك','الحالة','إجراءات'].map((h,i) => (
                    <th key={i} style={{padding:'13px 14px',color:'#475569',fontSize:11,fontWeight:700,textAlign:'center',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap' as const}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org,i) => {
                  const sc      = statusConfig[org.status] || statusConfig['pending']
                  const owner   = org.profiles?.find((p:any) => p.role === 'owner') || org.profiles?.[0]
                  const isExpired = org.plan_ends_at && new Date(org.plan_ends_at) < new Date()
                  return (
                    <tr key={org.id} className="row-hover" style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa',transition:'background 0.1s'}}>
                      <td style={{padding:'14px',textAlign:'center',color:'#94a3b8',fontSize:12,fontWeight:600}}>{i+1}</td>
                      <td style={{padding:'14px 16px',textAlign:'right'}}>
                        <div style={{fontWeight:800,fontSize:14,color:'#0f172a'}}>{org.name}</div>
                        <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{org.plan || 'basic'}</div>
                      </td>
                      <td style={{padding:'14px',textAlign:'center',fontSize:13,color:'#475569',fontWeight:600}}>
                        {owner?.full_name || '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center',fontSize:13,color:'#475569',direction:'ltr'}}>
                        {owner?.phone || '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center',fontSize:12,color:'#64748b',whiteSpace:'nowrap' as const}}>
                        {org.created_at ? new Date(org.created_at).toLocaleDateString('ar-SA') : '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center'}}>
                        {org.plan_ends_at ? (
                          <span style={{
                            background:isExpired?'#fee2e2':'#f0fdf4',
                            color:isExpired?'#dc2626':'#16a34a',
                            padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:700,
                            whiteSpace:'nowrap' as const
                          }}>
                            {isExpired?'⚠️ منتهي':'✅ '}{new Date(org.plan_ends_at).toLocaleDateString('ar-SA')}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center'}}>
                        <span style={{...sc,padding:'5px 12px',borderRadius:50,fontSize:12,fontWeight:700}}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{padding:'14px',textAlign:'center'}}>
                        <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
                          {org.status !== 'active' && (
                            <button onClick={() => updateStatus(org.id,'active')} style={{
                              padding:'6px 12px',background:'#f0fdf4',color:'#16a34a',
                              border:'1.5px solid #bbf7d0',borderRadius:8,fontSize:11,
                              fontWeight:700,cursor:'pointer',fontFamily:'system-ui',whiteSpace:'nowrap' as const
                            }}>✅ تفعيل</button>
                          )}
                          {org.status !== 'blocked' && (
                            <button onClick={() => updateStatus(org.id,'blocked')} style={{
                              padding:'6px 12px',background:'#fffbeb',color:'#d97706',
                              border:'1.5px solid #fde68a',borderRadius:8,fontSize:11,
                              fontWeight:700,cursor:'pointer',fontFamily:'system-ui',whiteSpace:'nowrap' as const
                            }}>🚫 إيقاف</button>
                          )}
                          <button onClick={() => deleteOrg(org.id, org.name)} style={{
                            padding:'6px 12px',background:'#fef2f2',color:'#ef4444',
                            border:'1.5px solid #fecaca',borderRadius:8,fontSize:11,
                            fontWeight:700,cursor:'pointer',fontFamily:'system-ui'
                          }}>🗑️</button>
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