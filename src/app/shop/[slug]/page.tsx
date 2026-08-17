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
  const links: {type:string;label:string;url:string}[] = Array.isArray((org as any).shop_links) ? (org as any).shop_links : []

  function PlatformIcon({ type }: { type: string }) {
    const common = { width: 22, height: 22, viewBox: '0 0 24 24' }
    if (type === 'whatsapp') return (
      <div style={{width:40,height:40,borderRadius:'50%',background:'#25D366',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg {...common} fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26C2.167 6.443 6.602 2.008 12.054 2.008c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" /></svg>
      </div>
    )
    if (type === 'instagram') return (
      <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg {...common} fill="none" stroke="white" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none"/></svg>
      </div>
    )
    if (type === 'tiktok') return (
      <div style={{width:40,height:40,borderRadius:'50%',background:'#010101',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width={20} height={20} viewBox="0 0 48 48" fill="none"><path fill="#25F4EE" d="M31.5 6c0 6.5 4.6 11 10.5 11v6c-4-.2-7.6-1.6-10.5-3.9V29c0 8-6.3 13.5-13.5 13.5S4.5 37 4.5 29 10.8 15.5 18 15.5c1 0 2 .1 2.9.3v6.4c-.9-.3-1.9-.4-2.9-.4-4 0-7 3.1-7 7s3 7 7 7 7-3.1 7-7V6h6.5z"/></svg>
      </div>
    )
    if (type === 'snapchat') return (
      <div style={{width:40,height:40,borderRadius:'50%',background:'#FFFC00',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg {...common} fill="none" stroke="#1c1917" strokeWidth={1.6}><path d="M12 3c-3 0-5 2.2-5 5.2v1.6c0 .3-.2.5-.6.7-.7.4-1.9.6-1.9 1.4 0 .5.6.8 1.4 1.1.4.1.5.4.4.7-.2.7-.5 1.5-1.3 1.9-.4.2-.9.3-.9.7 0 .5.9.7 1.7.9.1.3.1.7.3.9.3.3 1.3.1 2 .3.6.2 1.1 1 2.9 1s2.3-.8 2.9-1c.7-.2 1.7 0 2-.3.2-.2.2-.6.3-.9.8-.2 1.7-.4 1.7-.9 0-.4-.5-.5-.9-.7-.8-.4-1.1-1.2-1.3-1.9-.1-.3 0-.6.4-.7.8-.3 1.4-.6 1.4-1.1 0-.8-1.2-1-1.9-1.4-.4-.2-.6-.4-.6-.7V8.2C17 5.2 15 3 12 3z"/></svg>
      </div>
    )
    if (type === 'google_maps') return (
      <div style={{width:40,height:40,borderRadius:'50%',background:'#fff',border:'1.5px solid #e2e2df',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg {...common} fill="none"><path fill="#EA4335" d="M12 2C7.6 2 4 5.6 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
      </div>
    )
    return (
      <div style={{width:40,height:40,borderRadius:'50%',background:`${color}12`,border:`1.5px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg {...common} fill="none" stroke={color} strokeWidth={2}><path d="M10 13a5 5 0 007.07 0l1.93-1.93a5 5 0 00-7.07-7.07L10.5 5.5"/><path d="M14 11a5 5 0 00-7.07 0L5 12.93a5 5 0 007.07 7.07l1.43-1.43"/></svg>
      </div>
    )
  }
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
            <div style={{display:'flex',gap:10,flexWrap:'wrap' as const}}>
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" title={l.type==='website'?l.label:undefined} style={{textDecoration:'none',transition:'transform .15s'}}>
                  <PlatformIcon type={l.type} />
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
