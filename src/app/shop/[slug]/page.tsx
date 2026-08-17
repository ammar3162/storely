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
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#faf8f5',padding:20,textAlign:'center' as const}}>
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
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#faf8f5',color:'#1c1917'}}>
      {/* شريط تنقّل علوي — بسيط وأنيق */}
      <div style={{background:'white',borderBottom:'1px solid #ece8e2'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {(org as any).logo_url ? (
              <img src={(org as any).logo_url} alt={(org as any).name} style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:`1.5px solid ${color}33`}}/>
            ) : (
              <div style={{width:44,height:44,borderRadius:'50%',background:`${color}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color}}>
                {(org as any).name?.[0] || '؟'}
              </div>
            )}
            <div>
              <div style={{fontSize:16,fontWeight:900,letterSpacing:'-0.3px'}}>{(org as any).name}</div>
              {(org as any).shop_tagline && <div style={{fontSize:11,color:'#a8a29e'}}>{(org as any).shop_tagline}</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'56px 24px 72px'}}>
        {products.length === 0 ? (
          <div style={{background:'white',borderRadius:20,padding:60,textAlign:'center' as const,color:'#a8a29e',border:'1px solid #ece8e2'}}>
            ما فيه منتجات معروضة حالياً
          </div>
        ) : categories.map((cat, ci) => (
          <div key={cat as string} style={{marginBottom:72}}>
            {/* عنوان القسم — كبير ومتمركز بأسلوب المنيو الأنيقة */}
            <div style={{textAlign:'center' as const,marginBottom:44}}>
              <h2 style={{fontSize:34,fontWeight:900,color:'#1c1917',margin:0,letterSpacing:'-0.5px'}}>{cat as string}</h2>
              <div style={{width:52,height:3,background:color,borderRadius:99,margin:'16px auto 0'}}/>
            </div>

            {/* صفوف المنتجات — صورة + نص بخط منقّط للسعر */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(420px,1fr))',gap:'40px 56px'}}>
              {products.filter((p: any) => (p.category || 'المنتجات') === cat).map((p: any) => (
                <div key={p.id} style={{display:'flex',gap:20,alignItems:'flex-start'}}>
                  <div style={{width:118,height:118,borderRadius:14,background:'#f0ece5',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {p.public_image_url ? (
                      <img src={p.public_image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <span style={{fontSize:28,opacity:.25}}>✦</span>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0,paddingTop:6}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:10}}>
                      <span style={{fontSize:16,fontWeight:800,color:'#1c1917',whiteSpace:'nowrap' as const}}>{p.name}</span>
                      <span style={{flex:1,borderBottom:'1.5px dotted #d6d0c8',position:'relative' as const,top:-3}}/>
                      {p.public_price != null && (
                        <span style={{fontSize:15,fontWeight:900,color,whiteSpace:'nowrap' as const}}>{p.public_price} ر.س</span>
                      )}
                    </div>
                    {p.public_description && (
                      <div style={{fontSize:12,color:'#78716c',lineHeight:1.8,marginTop:8}}>{p.public_description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{textAlign:'center' as const,padding:'28px 20px',borderTop:'1px solid #ece8e2',background:'white'}}>
        <a href="https://storely.dev" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#a8a29e',textDecoration:'none'}}>
          حقوق الملكية محفوظة لـ <b style={{color}}>Storely</b> — تشغيل متجر {(org as any).name} بواسطة Storely
        </a>
      </div>
    </div>
  )
}
