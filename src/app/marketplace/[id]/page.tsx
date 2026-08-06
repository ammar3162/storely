'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SupplierStorefrontPage() {
  const params = useParams()
  const router = useRouter()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(()=>{ load() },[supplierId])

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data: s } = await (sb as any).from('supplier_profiles')
      .select('id,business_name,phone,location,status')
      .eq('id', supplierId).eq('status','active').maybeSingle()
    if (!s) { setNotFound(true); setLoading(false); return }
    setSupplier(s)

    const { data: it } = await (sb as any).from('supplier_catalog_items')
      .select('id,name,unit,price,image_url')
      .eq('supplier_id', supplierId).eq('is_available', true)
      .order('created_at', { ascending: false })
    setItems(it || [])
    setLoading(false)
  }

  function getWhatsAppLink() {
    const phone = (supplier?.phone||'').replace(/^0/,'966').replace(/[^0-9]/g,'')
    const msg = encodeURIComponent(`مرحباً، أنا عميل Storely وأود الاستفسار عن أصنافكم 🙌`)
    return `https://wa.me/${phone}?text=${msg}`
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f4f8'}}>
      <div style={{width:36,height:36,border:'3px solid #bbf7d0',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound || !supplier) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',background:'#f0f4f8',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',padding:20}}>
      <div style={{fontSize:48,marginBottom:12}}>🔍</div>
      <div style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>هذا المورد غير موجود</div>
      <button onClick={()=>router.push('/marketplace')} style={{marginTop:16,padding:'10px 20px',background:'#16a34a',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>← رجوع للموردين</button>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f0f4f8',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0d2818,#1a4731)',padding:'32px 20px'}}>
        <div style={{maxWidth:800,margin:'0 auto'}}>
          <button onClick={()=>router.push('/marketplace')} style={{background:'rgba(255,255,255,.1)',border:'none',color:'white',borderRadius:10,padding:'8px 14px',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,marginBottom:20}}>← رجوع للموردين</button>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:64,height:64,borderRadius:16,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30}}>🚚</div>
            <div>
              <h1 style={{fontSize:22,fontWeight:900,color:'white',margin:0}}>{supplier.business_name}</h1>
              {supplier.location && <p style={{fontSize:13,color:'rgba(255,255,255,.7)',margin:'6px 0 0'}}>📍 {supplier.location}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:800,margin:'0 auto',padding:'24px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{fontSize:16,fontWeight:800,color:'#0f172a',margin:0}}>الأصناف المتوفرة ({items.length})</h2>
          {supplier.phone && (
            <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer"
              style={{padding:'10px 18px',background:'#16a34a',color:'white',borderRadius:10,fontSize:13,fontWeight:700,textDecoration:'none'}}>
              📲 تواصل مع المورد
            </a>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{textAlign:'center' as const,padding:60,background:'white',borderRadius:16}}>
            <div style={{fontSize:44,marginBottom:10}}>📦</div>
            <div style={{fontSize:14,color:'#64748b'}}>ما فيه أصناف متوفرة حالياً</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
            {items.map((it:any)=>(
              <div key={it.id} style={{background:'white',borderRadius:14,overflow:'hidden',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} style={{width:'100%',height:140,objectFit:'cover'}}/>
                ) : (
                  <div style={{width:'100%',height:140,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>📦</div>
                )}
                <div style={{padding:'12px 14px'}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{it.name}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{it.unit}</div>
                  <div style={{fontSize:16,fontWeight:900,color:'#16a34a',marginTop:8}}>{it.price} ر.س</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
