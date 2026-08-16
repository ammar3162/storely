import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getShopData(slug: string) {
  const supabase = sb()
  const { data: org } = await supabase.from('organizations').select('id,name,logo_url,shop_tagline,shop_enabled').eq('shop_slug', slug).maybeSingle()
  if (!org || !(org as any).shop_enabled) return null
  const { data: products } = await supabase.from('products').select('id,name,unit,category,public_price,public_description,public_image_url').eq('org_id', (org as any).id).eq('show_on_shop', true).order('category')
  return { org, products: products || [] }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getShopData(slug)

  if (!data) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#f8fafc',padding:20,textAlign:'center' as const}}>
        <div>
          <div style={{fontSize:48,marginBottom:16}}>🔍</div>
          <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>هذا المتجر غير متاح حالياً</div>
        </div>
      </div>
    )
  }

  const { org, products } = data
  const categories = Array.from(new Set(products.map((p: any) => p.category || 'المنتجات')))

  return (
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#f8fafc'}}>
      <div style={{background:'linear-gradient(135deg,#15803d,#16a34a)',padding:'48px 20px 60px',textAlign:'center' as const,color:'white'}}>
        {(org as any).logo_url ? (
          <img src={(org as any).logo_url} alt={(org as any).name} style={{width:80,height:80,borderRadius:20,objectFit:'cover',marginBottom:16,border:'3px solid rgba(255,255,255,.3)'}}/>
        ) : (
          <div style={{width:80,height:80,borderRadius:20,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:900,margin:'0 auto 16px'}}>
            {(org as any).name?.[0] || '؟'}
          </div>
        )}
        <h1 style={{fontSize:28,fontWeight:900,margin:'0 0 6px'}}>{(org as any).name}</h1>
        {(org as any).shop_tagline && <p style={{fontSize:14,opacity:.9,margin:0}}>{(org as any).shop_tagline}</p>}
      </div>

      <div style={{maxWidth:1000,margin:'-32px auto 0',padding:'0 20px 60px'}}>
        {products.length === 0 ? (
          <div style={{background:'white',borderRadius:20,padding:60,textAlign:'center' as const,color:'#94a3b8',boxShadow:'0 4px 24px rgba(0,0,0,.06)'}}>
            ما فيه منتجات معروضة حالياً
          </div>
        ) : categories.map((cat) => (
          <div key={cat as string} style={{marginBottom:32}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:14,paddingRight:4}}>{cat as string}</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
              {products.filter((p: any) => (p.category || 'المنتجات') === cat).map((p: any) => (
                <div key={p.id} style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,.05)',border:'1px solid #f1f5f9'}}>
                  <div style={{width:'100%',aspectRatio:'4/3',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                    {p.public_image_url ? (
                      <img src={p.public_image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <span style={{fontSize:40,opacity:.3}}>📦</span>
                    )}
                  </div>
                  <div style={{padding:16}}>
                    <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:6}}>{p.name}</div>
                    {p.public_description && <div style={{fontSize:12,color:'#64748b',lineHeight:1.6,marginBottom:10}}>{p.public_description}</div>}
                    {p.public_price != null && (
                      <div style={{fontSize:16,fontWeight:900,color:'#16a34a'}}>{p.public_price} ر.س</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{textAlign:'center' as const,padding:'24px 20px',borderTop:'1px solid #e2e8f0',background:'white'}}>
        <a href="https://storely.dev" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#94a3b8',textDecoration:'none'}}>
          حقوق الملكية محفوظة لـ <b style={{color:'#16a34a'}}>Storely</b> — تشغيل متجر {(org as any).name} بواسطة Storely
        </a>
      </div>
    </div>
  )
}
