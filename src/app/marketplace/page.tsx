'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// حماية أمنية: يمنع عرض روابط خبيثة (javascript:, data:, إلخ) كرابط قابل للنقر
function isSafeUrl(url?: string | null): boolean {
  if (!url) return false
  return /^https?:\/\//i.test(url.trim())
}

const BUSINESS_TYPES = [
  {v:'الكل',icon:'🌟'},
  {v:'مطاعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخابز',icon:'🥖'},
  {v:'بقالة',icon:'🛒'},{v:'صيدليات',icon:'💊'},{v:'مستودعات',icon:'🏭'},
  {v:'متاجر إلكترونية',icon:'🛍️'},
]

export default function MarketplacePage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('الكل')
  const [search, setSearch] = useState('')
  const [orgType, setOrgType] = useState<string|null>(null)
  const [newSuppliers, setNewSuppliers] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string|null>(null)

  useEffect(()=>{
    loadSuppliers()
    // جيب نوع نشاط المنشأة من sessionStorage
    const orgBiz = sessionStorage.getItem('s_business_type')
    if(orgBiz) setFilter(orgBiz)
  },[])

  async function loadSuppliers() {
    setLoading(true)
    const sb = createClient()
    const { data } = await (sb as any).from('supplier_applications')
      .select('id,company_name,business_type,description,phone,whatsapp,logo_url,offer,website')
      .eq('status','approved')
      .eq('marketplace_consent',true)
      .order('created_at',{ascending:false})
    setSuppliers(data || [])

    const { data: profiles } = await (sb as any).from('supplier_profiles')
      .select('id,business_name,phone,location')
      .eq('status','active')
    if (profiles?.length) {
      const { data: allItems } = await (sb as any).from('supplier_catalog_items')
        .select('id,supplier_id,name,unit,price,image_url')
        .eq('is_available', true)
        .in('supplier_id', profiles.map((p:any)=>p.id))
      const withItems = (profiles||[]).map((p:any)=>({
        ...p,
        items: (allItems||[]).filter((it:any)=>it.supplier_id===p.id),
      })).filter((p:any)=>p.items.length>0)
      setNewSuppliers(withItems)
    }
    setLoading(false)
  }

  const filtered = suppliers.filter(s=>{
    const matchType = filter==='الكل' || s.business_type?.includes(filter)
    const matchSearch = !search || s.company_name?.includes(search) || s.description?.includes(search)
    return matchType && matchSearch
  })

  function getWhatsAppLink(s: any) {
    const phone = (s.whatsapp||s.phone||'').replace(/^0/,'966').replace(/[^0-9]/g,'')
    const msg = encodeURIComponent(`مرحباً، أنا عميل Storely وأود الاستفادة من عرضكم الخاص 🎁`)
    return `https://wa.me/${phone}?text=${msg}`
  }

  // الصفحة مقفلة مؤقتاً لين يتجمع موردون معتمدون فعليون
  const COMING_SOON = false
  if (COMING_SOON) return (
    <div style={{minHeight:'100vh',background:'#f0f4f8',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;800&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'32px 20px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <button onClick={()=>window.history.back()} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',borderRadius:10,padding:'8px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700}}>← رجوع</button>
        </div>
      </div>
      <div style={{maxWidth:600,margin:'80px auto',textAlign:'center' as const,padding:'0 20px'}}>
        <div style={{fontSize:56,marginBottom:20}}>🤝</div>
        <div style={{fontSize:22,fontWeight:900,color:'#0d2818',marginBottom:10}}>قريباً — موردونا المعتمدون</div>
        <div style={{fontSize:14,color:'#5f6b66',lineHeight:1.8}}>
          نشتغل حالياً على جمع أفضل الموردين المعتمدين ليكونوا في خدمتك بعروض وأولوية توصيل حصرية.<br/>
          تابعنا قريباً — الميزة راح تكون متاحة بأقرب وقت.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f4f8',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'32px 20px 24px'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <button onClick={()=>window.history.back()} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',borderRadius:10,padding:'8px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700}}>← رجوع</button>
            <div>
              <h1 style={{fontSize:22,fontWeight:900,color:'white',margin:0}}>🤝 الموردون المعتمدون</h1>
              <p style={{fontSize:12,color:'rgba(255,255,255,.6)',margin:'4px 0 0'}}>موردون معتمدون من Storely مع عروض وأولوية توصيل حصرية</p>
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ابحث عن مورد..."
            style={{width:'100%',padding:'12px 16px',border:'none',borderRadius:12,fontSize:14,fontFamily:'inherit',background:'rgba(255,255,255,.12)',color:'white',outline:'none'}}/>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'12px 20px',overflowX:'auto'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',gap:8}}>
          {BUSINESS_TYPES.map(t=>(
            <button key={t.v} onClick={()=>setFilter(t.v)}
              style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${filter===t.v?'#16a34a':'#e2e8f0'}`,background:filter===t.v?'#f0fdf4':'white',color:filter===t.v?'#16a34a':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0,transition:'all .15s'}}>
              {t.icon} {t.v}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:900,margin:'0 auto',padding:'20px'}}>
        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>جاري التحميل...</div>
        ) : filtered.length===0 ? (
          <div style={{textAlign:'center',padding:60}}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:8}}>لا يوجد موردون في هذا المجال</div>
            <div style={{fontSize:13,color:'#64748b'}}>جرّب تصفية مختلفة أو تواصل معنا لإضافة موردين</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {filtered.map(s=>(
              <div key={s.id} style={{background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.06)',border:'1px solid #f1f5f9',transition:'transform .15s,box-shadow .15s'}}>
                {/* Card Header */}
                <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'20px',display:'flex',alignItems:'center',gap:12}}>
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.company_name} style={{width:48,height:48,borderRadius:12,objectFit:'cover',border:'2px solid rgba(255,255,255,.2)'}}/>
                  ) : (
                    <div style={{width:48,height:48,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🏢</div>
                  )}
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:'white'}}>{s.company_name}</div>
                    <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap'}}>
                      {s.business_type?.slice(0,2).map((t:string)=>(
                        <span key={t} style={{fontSize:9,background:'rgba(255,255,255,.15)',color:'rgba(255,255,255,.8)',padding:'2px 6px',borderRadius:4,fontWeight:600}}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{marginRight:'auto'}}>
                    <span style={{background:'#16a34a',color:'white',fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20}}>✓ معتمد</span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{padding:'16px'}}>
                  {s.offer && (
                    <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 12px',marginBottom:12,display:'flex',gap:8,alignItems:'flex-start'}}>
                      <span style={{fontSize:16}}>🎁</span>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:'#92400e',marginBottom:2}}>عرض حصري لعملاء Storely</div>
                        <div style={{fontSize:12,color:'#78350f'}}>{s.offer}</div>
                      </div>
                    </div>
                  )}
                  {s.description && (
                    <p style={{fontSize:12,color:'#64748b',lineHeight:1.7,margin:'0 0 12px'}}>{s.description}</p>
                  )}
                  <div style={{display:'flex',gap:8}}>
                    <a href={getWhatsAppLink(s)} target="_blank" rel="noopener noreferrer"
                      style={{flex:1,padding:'10px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none',textAlign:'center',display:'block'}}>
                      📲 تواصل للحصول على العرض
                    </a>
                    {isSafeUrl(s.website) && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer"
                        style={{padding:'10px 14px',background:'#f1f5f9',color:'#475569',border:'none',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>
                        🌐
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* موردون جدد — من بوابة المورد المستقلة */}
        {newSuppliers.length > 0 && (
          <div style={{marginTop: filtered.length>0 ? 32 : 0}}>
            <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:14}}>✨ موردون جدد على Storely</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
              {newSuppliers.map((s:any)=>{
                const isOpen = expandedId===s.id
                const phone = (s.phone||'').replace(/^0/,'966').replace(/[^0-9]/g,'')
                const waMsg = encodeURIComponent(`مرحباً، أنا عميل Storely وأود الاستفسار عن أصنافكم 🙌`)
                return (
                  <div key={s.id} style={{background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.06)',border:'1px solid #f1f5f9'}}>
                    <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'20px',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:48,height:48,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🚚</div>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,color:'white'}}>{s.business_name}</div>
                        {s.location && <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:2}}>📍 {s.location}</div>}
                      </div>
                      <div style={{marginRight:'auto'}}>
                        <span style={{background:'#16a34a',color:'white',fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20}}>{s.items.length} صنف</span>
                      </div>
                    </div>
                    <div style={{padding:'16px'}}>
                      <button onClick={()=>setExpandedId(isOpen?null:s.id)}
                        style={{width:'100%',padding:'8px',background:'#f1f5f9',color:'#475569',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',marginBottom:isOpen?12:0,fontFamily:'inherit'}}>
                        {isOpen?'إخفاء الأصناف ▲':'عرض الأصناف ▼'}
                      </button>
                      {isOpen && (
                        <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginBottom:12}}>
                          {s.items.map((it:any)=>(
                            <div key={it.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px',background:'#f8fafc',borderRadius:8}}>
                              {it.image_url ? (
                                <img src={it.image_url} alt="" style={{width:36,height:36,borderRadius:6,objectFit:'cover'}}/>
                              ) : (
                                <div style={{width:36,height:36,borderRadius:6,background:'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📦</div>
                              )}
                              <div style={{flex:1}}>
                                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{it.name}</div>
                                <div style={{fontSize:10,color:'#64748b'}}>{it.unit}</div>
                              </div>
                              <div style={{fontSize:13,fontWeight:800,color:'#16a34a'}}>{it.price} ر.س</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {phone && (
                        <a href={`https://wa.me/${phone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                          style={{display:'block',padding:'10px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none',textAlign:'center'}}>
                          📲 تواصل مع المورد
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA للموردين */}
        <div style={{marginTop:32,background:'linear-gradient(135deg,#0d2818,#1a4731)',borderRadius:16,padding:'24px',textAlign:'center'}}>
          <div style={{fontSize:20,fontWeight:800,color:'white',marginBottom:8}}>هل أنت مورد؟</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.7)',marginBottom:16}}>انضم لشبكة موردينا المعتمدين واستفد من قاعدة عملائنا</div>
          <a href="/suppliers-join" style={{display:'inline-block',padding:'12px 28px',background:'#16a34a',color:'white',borderRadius:12,fontSize:14,fontWeight:700,textDecoration:'none',boxShadow:'0 4px 14px rgba(22,163,74,.3)'}}>
            تقدم الآن ←
          </a>
        </div>
      </div>
    </div>
  )
}
