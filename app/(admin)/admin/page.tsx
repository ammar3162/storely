'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const [orgs, setOrgs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const supabase = createClient()

  useEffect(() => { loadOrgs() }, [])

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
    if (!confirm(`هل تريد حذف "${name}" نهائياً؟`)) return
    await supabase.from('products').delete().eq('org_id', id)
    await supabase.from('purchases').delete().eq('org_id', id)
    await supabase.from('dispenses').delete().eq('org_id', id)
    await supabase.from('profiles').delete().eq('org_id', id)
    await supabase.from('organizations').delete().eq('id', id)
    loadOrgs()
  }

  async function extendPlan(id: string) {
    const current = orgs.find(o => o.id === id)
    const base = current?.plan_ends_at && new Date(current.plan_ends_at) > new Date()
      ? new Date(current.plan_ends_at)
      : new Date()
    base.setDate(base.getDate() + 30)
    await supabase.from('organizations').update({ plan_ends_at: base.toISOString() }).eq('id', id)
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

  const statusConfig: Record<string,{label:string,bg:string,color:string,border:string}> = {
    active:  {label:'نشط',              bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0'},
    pending: {label:'بانتظار الموافقة', bg:'#fffbeb', color:'#d97706', border:'#fde68a'},
    blocked: {label:'موقوف',            bg:'#fef2f2', color:'#dc2626', border:'#fecaca'},
  }

  return (
    <div style={{direction:'rtl',fontFamily:'system-ui'}}>
      <style>{`
        @media(max-width:768px){.stats-grid{grid-template-columns:1fr 1fr !important}}
        .row-hover:hover{background:rgba(255,255,255,0.03) !important}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:28,fontWeight:900,color:'white',margin:0,letterSpacing:'-0.5px'}}>
          👑 إدارة العملاء
        </h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',margin:'4px 0 0'}}>
          {orgs.length} مؤسسة مسجلة
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {[
          {label:'إجمالي الحسابات', value:stats.total,   icon:'👥', color:'#a5b4fc', bg:'rgba(99,102,241,0.15)', border:'rgba(99,102,241,0.3)'},
          {label:'حسابات نشطة',    value:stats.active,  icon:'✅', color:'#6ee7b7', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.3)'},
          {label:'بانتظار الموافقة',value:stats.pending, icon:'⏳', color:'#fcd34d', bg:'rgba(245,158,11,0.15)', border:'rgba(245,158,11,0.3)'},
          {label:'موقوفة',          value:stats.blocked, icon:'🚫', color:'#fca5a5', bg:'rgba(239,68,68,0.15)',  border:'rgba(239,68,68,0.3)'},
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:16,padding:'18px 20px'}}>
            <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:30,fontWeight:900,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pending Alert */}
      {stats.pending > 0 && (
        <div style={{background:'rgba(245,158,11,0.1)',border:'2px solid rgba(245,158,11,0.3)',borderRadius:14,padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>⏳</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,color:'#fcd34d',fontSize:14}}>{stats.pending} حساب بانتظار موافقتك</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:2}}>راجع الحسابات وفعّلها أو ارفضها</div>
          </div>
          <button onClick={() => setFilter('pending')} style={{
            padding:'8px 14px',background:'#f59e0b',color:'white',
            border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'system-ui'
          }}>عرض الطلبات</button>
        </div>
      )}

      {/* Filters */}
      <div style={{background:'rgba(255,255,255,0.05)',borderRadius:14,padding:'14px 18px',marginBottom:16,border:'1px solid rgba(255,255,255,0.1)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,0.3)'}}>🔍</span>
          <input type="text" placeholder="ابحث باسم المؤسسة أو رقم الجوال..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{width:'100%',padding:'10px 36px 10px 14px',background:'rgba(255,255,255,0.08)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:13,outline:'none',color:'white',fontFamily:'system-ui',boxSizing:'border-box' as const}} />
        </div>
        <div style={{display:'flex',background:'rgba(255,255,255,0.08)',borderRadius:10,padding:3,gap:3}}>
          {[
            {key:'all',    label:`الكل (${stats.total})`},
            {key:'active', label:`✅ نشط (${stats.active})`},
            {key:'pending',label:`⏳ انتظار (${stats.pending})`},
            {key:'blocked',label:`🚫 موقوف (${stats.blocked})`},
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              padding:'7px 12px',border:'none',borderRadius:8,cursor:'pointer',
              background:filter===tab.key?'rgba(99,102,241,0.4)':'transparent',
              color:filter===tab.key?'white':'rgba(255,255,255,0.5)',
              fontWeight:filter===tab.key?700:500,fontSize:12,
              fontFamily:'system-ui',whiteSpace:'nowrap' as const,transition:'all 0.2s'
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{background:'rgba(255,255,255,0.03)',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'rgba(255,255,255,0.4)'}}>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <div style={{fontSize:14,fontWeight:600}}>جاري التحميل...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'rgba(255,255,255,0.4)'}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <div style={{fontSize:15,fontWeight:700}}>لا توجد نتائج</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
              <thead>
                <tr style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                  {['#','المؤسسة','المدير','الجوال','تاريخ التسجيل','انتهاء الاشتراك','الحالة','إجراءات'].map((h,i) => (
                    <th key={i} style={{padding:'13px 14px',color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,textAlign:'center',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap' as const}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org,i) => {
                  const sc       = statusConfig[org.status] || statusConfig['pending']
                  const owner    = org.profiles?.find((p:any) => p.role === 'owner') || org.profiles?.[0]
                  const isExpired = org.plan_ends_at && new Date(org.plan_ends_at) < new Date()
                  return (
                    <tr key={org.id} className="row-hover" style={{borderBottom:'1px solid rgba(255,255,255,0.05)',transition:'background 0.1s'}}>
                      <td style={{padding:'14px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:12}}>{i+1}</td>
                      <td style={{padding:'14px 16px',textAlign:'right'}}>
                        <div style={{fontWeight:800,fontSize:14,color:'white'}}>{org.name}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:2}}>{org.plan || 'basic'}</div>
                      </td>
                      <td style={{padding:'14px',textAlign:'center',fontSize:13,color:'rgba(255,255,255,0.7)',fontWeight:600}}>
                        {owner?.full_name || '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center',fontSize:13,color:'rgba(255,255,255,0.6)',direction:'ltr'}}>
                        {owner?.phone || '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.5)',whiteSpace:'nowrap' as const}}>
                        {org.created_at ? new Date(org.created_at).toLocaleDateString('ar-SA') : '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center'}}>
                        {org.plan_ends_at ? (
                          <span style={{
                            background:isExpired?'rgba(239,68,68,0.2)':'rgba(16,185,129,0.2)',
                            color:isExpired?'#fca5a5':'#6ee7b7',
                            padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:700,
                            whiteSpace:'nowrap' as const
                          }}>
                            {isExpired?'⚠️ ':''}{new Date(org.plan_ends_at).toLocaleDateString('ar-SA')}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{padding:'14px',textAlign:'center'}}>
                        <span style={{
                          background:sc.bg,color:sc.color,
                          padding:'4px 12px',borderRadius:50,fontSize:11,fontWeight:700,
                          border:`1px solid ${sc.border}`
                        }}>{sc.label}</span>
                      </td>
                      <td style={{padding:'14px',textAlign:'center'}}>
                        <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap'}}>
                          {org.status !== 'active' && (
                            <button onClick={() => updateStatus(org.id,'active')} style={{
                              padding:'6px 10px',background:'rgba(16,185,129,0.2)',color:'#6ee7b7',
                              border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,fontSize:11,
                              fontWeight:700,cursor:'pointer',fontFamily:'system-ui',whiteSpace:'nowrap' as const
                            }}>✅ تفعيل</button>
                          )}
                          {org.status === 'active' && (
                            <button onClick={() => extendPlan(org.id)} style={{
                              padding:'6px 10px',background:'rgba(99,102,241,0.2)',color:'#a5b4fc',
                              border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,fontSize:11,
                              fontWeight:700,cursor:'pointer',fontFamily:'system-ui',whiteSpace:'nowrap' as const
                            }}>➕ 30 يوم</button>
                          )}
                          {org.status !== 'blocked' && (
                            <button onClick={() => updateStatus(org.id,'blocked')} style={{
                              padding:'6px 10px',background:'rgba(245,158,11,0.2)',color:'#fcd34d',
                              border:'1px solid rgba(245,158,11,0.3)',borderRadius:8,fontSize:11,
                              fontWeight:700,cursor:'pointer',fontFamily:'system-ui',whiteSpace:'nowrap' as const
                            }}>🚫 إيقاف</button>
                          )}
                          {org.status === 'blocked' && (
                            <button onClick={() => updateStatus(org.id,'active')} style={{
                              padding:'6px 10px',background:'rgba(16,185,129,0.2)',color:'#6ee7b7',
                              border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,fontSize:11,
                              fontWeight:700,cursor:'pointer',fontFamily:'system-ui',whiteSpace:'nowrap' as const
                            }}>🔓 رفع الإيقاف</button>
                          )}
                          <button onClick={() => deleteOrg(org.id, org.name)} style={{
                            padding:'6px 10px',background:'rgba(239,68,68,0.2)',color:'#fca5a5',
                            border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,fontSize:11,
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