import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getShopData(slug: string) {
  const supabase = sb()
  const { data: org } = await supabase.from('organizations').select('id,name,logo_url,shop_tagline,shop_enabled,shop_color,shop_display_name,shop_links').eq('shop_slug', slug).maybeSingle()
  if (!org || !(org as any).shop_enabled) return null

  const { data: invProducts } = await supabase.from('products').select('name,category,public_price,public_description,public_image_url').eq('org_id', (org as any).id).eq('show_on_shop', true)
  const { data: shopItems } = await supabase.from('shop_items').select('name,category,price,description,image_url').eq('org_id', (org as any).id)

  const normalized = [
    ...(invProducts || []).map((p: any) => ({ name: p.name, category: p.category || 'المنتجات', price: p.public_price, description: p.public_description, image_url: p.public_image_url })),
    ...(shopItems || []).map((it: any) => ({ name: it.name, category: it.category || 'منتجات خارجية', price: it.price, description: it.description, image_url: it.image_url })),
  ]

  return { org, products: normalized }
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
  const displayName = (org as any).shop_display_name || (org as any).name
  const links: {label:string;url:string}[] = Array.isArray((org as any).shop_links) ? (org as any).shop_links : []
  const categories = Array.from(new Set(products.map((p: any) => p.category)))

  return (
    <div style={{minHeight:'100vh',fontFamily:"'IBM Plex Sans Arabic',system-ui",direction:'rtl',background:'#faf8f5',color:'#1c1917'}}>
      {/* شريط تنقّل علوي — بسيط وأنيق */}
      <div style={{background:'white',borderBottom:'1px solid #ece8e2'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {(org as any).logo_url ? (
              <img src={(org as any).logo_url} alt={displayName} style={{width:44,height:44,borderRadius:'50%',objectFit:'cover',border:`1.5px solid ${color}33`}}/>
            ) : (
              <div style={{width:44,height:44,borderRadius:'50%',background:`${color}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color}}>
                {displayName?.[0] || '؟'}
              </div>
            )}
            <div>
              <div style={{fontSize:16,fontWeight:900,letterSpacing:'-0.3px'}}>{displayName}</div>
              {(org as any).shop_tagline && <div style={{fontSize:11,color:'#a8a29e'}}>{(org as any).shop_tagline}</div>}
            </div>
          </div>
          {links.length > 0 && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap' as const}}>
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,fontWeight:700,color,background:`${color}10`,border:`1px solid ${color}30`,borderRadius:99,padding:'6px 14px',textDecoration:'none'}}>
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'56px 24px 72px'}}>
        {products.length === 0 ? (
          <div style={{background:'white',borderRadius:20,padding:60,textAlign:'center' as const,color:'#a8a29e',border:'1px solid #ece8e2'}}>
            ما فيه منتجات معروضة حالياً
          </div>
        ) : categories.map((cat) => (
          <div key={cat as string} style={{marginBottom:72}}>
            <div style={{textAlign:'center' as const,marginBottom:44}}>
              <h2 style={{fontSize:34,fontWeight:900,color:'#1c1917',margin:0,letterSpacing:'-0.5px'}}>{cat as string}</h2>
              <div style={{width:52,height:3,background:color,borderRadius:99,margin:'16px auto 0'}}/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(420px,1fr))',gap:'40px 56px'}}>
              {products.filter((p: any) => p.category === cat).map((p: any, pi: number) => (
                <div key={pi} style={{display:'flex',gap:20,alignItems:'flex-start'}}>
                  <div style={{width:118,height:118,borderRadius:14,background:'#f0ece5',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <span style={{fontSize:28,opacity:.25}}>✦</span>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0,paddingTop:6}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:10}}>
                      <span style={{fontSize:16,fontWeight:800,color:'#1c1917',whiteSpace:'nowrap' as const}}>{p.name}</span>
                      <span style={{flex:1,borderBottom:'1.5px dotted #d6d0c8',position:'relative' as const,top:-3}}/>
                      {p.price != null && (
                        <span style={{fontSize:15,fontWeight:900,color,whiteSpace:'nowrap' as const}}>{p.price} ر.س</span>
                      )}
                    </div>
                    {p.description && (
                      <div style={{fontSize:12,color:'#78716c',lineHeight:1.8,marginTop:8}}>{p.description}</div>
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
          حقوق الملكية محفوظة لـ <b style={{color}}>Storely</b> — تشغيل متجر {displayName} بواسطة Storely
        </a>
      </div>
    </div>
  )
}
