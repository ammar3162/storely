import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getShopData(slug: string) {
  const supabase = sb()
  const { data: org } = await supabase.from('organizations').select('id,name,logo_url,shop_tagline,shop_enabled,shop_color').eq('shop_slug', slug).maybeSingle()
  if (!org || !(org as any).shop_enabled) return null
  const { data: products } = await supabase.from('products').select('id,name,unit,category,public_price,public_description,public_image_url').eq('org_id', (org as any).id).eq('show_on_shop', true).order('category')
  return { org, products: products || [] }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getShopData(slug)

  if (!data) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#fafaf9',padding:20,textAlign:'center' as const}}>
        <div>
          <div style={{fontSize:48,marginBottom:16}}>🔍</div>
          <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>هذا المتجر غير متاح حالياً</div>
        </div>
      </div>
    )
  }

  const { org, products } = data
  const color = (org as any).shop_color || '#15803d'
  const categories = Array.from(new Set(products.map((p: any) => p.category || 'المنتجات')))

  return (
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#fafaf9',color:'#1c1917'}}>
      {/* شريط علوي رفيع */}
      <div style={{height:4,background:color}}/>

      {/* الهيدر — أنيق وهادئ */}
      <div style={{padding:'56px 20px 40px',textAlign:'center' as const,background:'#fff',borderBottom:'1px solid #f0efed'}}>
        {(org as any).logo_url ? (
          <img src={(org as any).logo_url} alt={(org as any).name} style={{width:76,height:76,borderRadius:'50%',objectFit:'cover',marginBottom:18,boxShadow:'0 4px 16px rgba(0,0,0,.08)',border:`3px solid ${color}22`}}/>
        ) : (
          <div style={{width:76,height:76,borderRadius:'50%',background:`${color}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900,margin:'0 auto 18px',color,border:`2px solid ${color}30`}}>
            {(org as any).name?.[0] || '؟'}
          </div>
        )}
        <h1 style={{fontSize:30,fontWeight:900,margin:'0 0 8px',letterSpacing:'-0.5px',color:'#0c0a09'}}>{(org as any).name}</h1>
        {(org as any).shop_tagline && <p style={{fontSize:14,color:'#78716c',margin:'0 auto',maxWidth:420,lineHeight:1.7}}>{(org as any).shop_tagline}</p>}
        <div style={{width:40,height:3,background:color,borderRadius:99,margin:'20px auto 0'}}/>
      </div>

      <div style={{maxWidth:1040,margin:'0 auto',padding:'48px 20px 60px'}}>
        {products.length === 0 ? (
          <div style={{background:'white',borderRadius:20,padding:60,textAlign:'center' as const,color:'#a8a29e',border:'1px solid #f0efed'}}>
            ما فيه منتجات معروضة حالياً
          </div>
        ) : categories.map((cat, ci) => (
          <div key={cat as string} style={{marginBottom:48}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
              <div style={{width:6,height:22,background:color,borderRadius:99}}/>
              <h2 style={{fontSize:19,fontWeight:800,color:'#1c1917',margin:0,letterSpacing:'-0.3px'}}>{cat as string}</h2>
              <div style={{flex:1,height:1,background:'#f0efed'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:20}}>
              {products.filter((p: any) => (p.category || 'المنتجات') === cat).map((p: any) => (
                <div key={p.id} style={{background:'white',borderRadius:20,overflow:'hidden',border:'1px solid #f0efed',transition:'all .2s'}}>
                  <div style={{width:'100%',aspectRatio:'4/3',background:'#f5f5f4',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative' as const}}>
                    {p.public_image_url ? (
                      <img src={p.public_image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <span style={{fontSize:36,opacity:.25}}>✦</span>
                    )}
                  </div>
                  <div style={{padding:'18px 18px 20px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:8}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#1c1917',lineHeight:1.4}}>{p.name}</div>
                      {p.public_price != null && (
                        <div style={{fontSize:15,fontWeight:900,color,whiteSpace:'nowrap' as const}}>{p.public_price}<span style={{fontSize:11,fontWeight:700,marginRight:2}}> ر.س</span></div>
                      )}
                    </div>
                    {p.public_description && <div style={{fontSize:12,color:'#78716c',lineHeight:1.7}}>{p.public_description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{textAlign:'center' as const,padding:'28px 20px',borderTop:'1px solid #f0efed',background:'white'}}>
        <a href="https://storely.dev" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#a8a29e',textDecoration:'none'}}>
          حقوق الملكية محفوظة لـ <b style={{color}}>Storely</b> — تشغيل متجر {(org as any).name} بواسطة Storely
        </a>
      </div>
    </div>
  )
}
