import { createClient } from '@supabase/supabase-js'
import { StorelyCard, StorelyPageHeader } from '@/components/ui'
import { Package, Search, Star } from 'lucide-react'
import { storelyTokens as uiTokens } from '@/components/ui/design-tokens'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getShopData(slug: string) {
  const supabase = sb()
  const { data: org } = await supabase.from('organizations').select('id,name,logo_url,shop_tagline,shop_enabled,shop_color,shop_display_name,shop_links,shop_hours').eq('shop_slug', slug).maybeSingle()
  if (!org || !(org as any).shop_enabled) return null

  // لازم اشتراك فعّال بإضافة "المنتجات" — وإلا الصفحة العامة تختفي حتى لو مفعّلة داخلياً
  const { data: addon } = await supabase.from('marketplace_addons').select('id').eq('slug', 'online_menu').maybeSingle()
  if (!addon) return null
  const { data: sub } = await supabase.from('org_addon_subscriptions').select('status,expires_at').eq('org_id', (org as any).id).eq('addon_id', (addon as any).id).eq('status', 'active').maybeSingle()
  if (!sub || new Date((sub as any).expires_at) <= new Date()) return null

  const { data: invProducts } = await supabase.from('products').select('name,category,public_price,public_description,public_image_url,sort_order').eq('org_id', (org as any).id).eq('show_on_shop', true)
  const { data: shopItems } = await supabase.from('shop_items').select('name,category,price,description,image_url,is_featured,sort_order').eq('org_id', (org as any).id)

  const normalized = [
    ...(invProducts || []).map((p: any) => ({ name: p.name, category: p.category || 'المنتجات', price: p.public_price, description: p.public_description, image_url: p.public_image_url, is_featured: false, sort_order: p.sort_order || 0 })),
    ...(shopItems || []).map((it: any) => ({ name: it.name, category: it.category || 'منتجات المتجر', price: it.price, description: it.description, image_url: it.image_url, is_featured: !!it.is_featured, sort_order: it.sort_order || 0 })),
  ].sort((a, b) => a.sort_order - b.sort_order)

  return { org, products: normalized }
}

function isOpenNow(hours: any): { known: boolean; open: boolean; label: string } {
  if (!hours?.enabled) return { known: false, open: true, label: '' }
  if (hours.is24h) return { known: true, open: true, label: 'مفتوح الآن · 24 ساعة' }
  const now = new Date()
  const saudiMinutes = ((now.getUTCHours() + 3) % 24) * 60 + now.getUTCMinutes()
  const [oh, om] = String(hours.open || '09:00').split(':').map(Number)
  const [ch, cm] = String(hours.close || '22:00').split(':').map(Number)
  const openM = oh * 60 + om, closeM = ch * 60 + cm
  const open = closeM > openM ? (saudiMinutes >= openM && saudiMinutes < closeM) : (saudiMinutes >= openM || saudiMinutes < closeM)
  return { known: true, open, label: open ? `مفتوح الآن · يغلق ${hours.close}` : `مغلق الآن · يفتح ${hours.open}` }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getShopData(slug)
  if (!data) return { title: 'متجر غير متاح' }
  const { org } = data
  const displayName = (org as any).shop_display_name || (org as any).name
  const description = (org as any).shop_tagline || `تصفّح منتجات ${displayName} — بواسطة Storely`
  const image = (org as any).logo_url
  return {
    title: displayName,
    description,
    openGraph: { title: displayName, description, images: image ? [image] : [], type: 'website' },
    twitter: { card: 'summary', title: displayName, description, images: image ? [image] : [] },
  }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getShopData(slug)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center !p-5 text-center text-[var(--storely-navy)]" style={{direction:'rtl', background:uiTokens.color.background}}>
        <div>
          <div className="text-2xl !mb-4"><Search size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /></div>
          <div className="text-lg font-semibold" style={{color:uiTokens.color.text}}>هذا المتجر غير متاح حالياً</div>
        </div>
      </div>
    )
  }

  const { org, products } = data
  const color = (org as any).shop_color || '#0f766e'
  const displayName = (org as any).shop_display_name || (org as any).name
  const links: {type:string;label:string;url:string}[] = Array.isArray((org as any).shop_links) ? (org as any).shop_links : []
  const categories = Array.from(new Set(products.map((p: any) => p.category)))
  const status = isOpenNow((org as any).shop_hours)

  function PlatformIcon({ type }: { type: string }) {
    const common = { width: 22, height: 22, viewBox: '0 0 24 24' }
    if (type === 'whatsapp') return (
      <div className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:uiTokens.color.background}}>
        <svg {...common} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26C2.167 6.443 6.602 2.008 12.054 2.008c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" /></svg>
      </div>
    )
    if (type === 'instagram') return (
      <div className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:uiTokens.color.surface}}>
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none"/></svg>
      </div>
    )
    if (type === 'tiktok') return (
      <div className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:uiTokens.color.surface}}>
        <svg width={20} height={20} viewBox="0 0 48 48" fill="none"><path fill="currentColor" d="M31.5 6c0 6.5 4.6 11 10.5 11v6c-4-.2-7.6-1.6-10.5-3.9V29c0 8-6.3 13.5-13.5 13.5S4.5 37 4.5 29 10.8 15.5 18 15.5c1 0 2 .1 2.9.3v6.4c-.9-.3-1.9-.4-2.9-.4-4 0-7 3.1-7 7s3 7 7 7 7-3.1 7-7V6h6.5z"/></svg>
      </div>
    )
    if (type === 'snapchat') return (
      <div className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:uiTokens.color.background}}>
        <svg {...common} fill="none" stroke="#1c1917" strokeWidth={1.6}><path d="M12 3c-3 0-5 2.2-5 5.2v1.6c0 .3-.2.5-.6.7-.7.4-1.9.6-1.9 1.4 0 .5.6.8 1.4 1.1.4.1.5.4.4.7-.2.7-.5 1.5-1.3 1.9-.4.2-.9.3-.9.7 0 .5.9.7 1.7.9.1.3.1.7.3.9.3.3 1.3.1 2 .3.6.2 1.1 1 2.9 1s2.3-.8 2.9-1c.7-.2 1.7 0 2-.3.2-.2.2-.6.3-.9.8-.2 1.7-.4 1.7-.9 0-.4-.5-.5-.9-.7-.8-.4-1.1-1.2-1.3-1.9-.1-.3 0-.6.4-.7.8-.3 1.4-.6 1.4-1.1 0-.8-1.2-1-1.9-1.4-.4-.2-.6-.4-.6-.7V8.2C17 5.2 15 3 12 3z"/></svg>
      </div>
    )
    if (type === 'google_maps') return (
      <div className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:uiTokens.color.surface, border:`1px solid ${uiTokens.color.border}`}}>
        <svg {...common} fill="none"><path fill="currentColor" d="M12 2C7.6 2 4 5.6 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
      </div>
    )
    return (
      <div className="rounded-[var(--radius-sm)] flex items-center justify-center" style={{width:40, height:40, background:`${color}12`, border:`1.5px solid ${color}30`}}>
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 13a5 5 0 007.07 0l1.93-1.93a5 5 0 00-7.07-7.07L10.5 5.5"/><path d="M14 11a5 5 0 00-7.07 0L5 12.93a5 5 0 007.07 7.07l1.43-1.43"/></svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden text-[var(--storely-navy)]" style={{direction:'rtl', background:uiTokens.color.background, color:uiTokens.color.text}}>

      <div style={{background:uiTokens.color.surface, borderBottom:`1px solid ${uiTokens.color.border}`}}>
        <div className="max-w-6xl !my-0 !mx-auto !py-5 !px-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {(org as any).logo_url ? (
              <img src={(org as any).logo_url} alt={displayName} className="rounded-[var(--radius-sm)] object-cover" style={{width:44, height:44, border:`1.5px solid ${color}33`}}/>
            ) : (
              <div className="rounded-[var(--radius-sm)] flex items-center justify-center text-base font-semibold" style={{width:44, height:44, background:`${color}12`, color}}>
                {displayName?.[0] || '؟'}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StorelyPageHeader title={displayName} className="!mb-0" />
                {status.known && (
                  <span className="inline-flex items-center gap-2 text-xs font-semibold !py-1 !px-2 rounded-[var(--radius)]" style={{background:status.open?uiTokens.color.successBg:uiTokens.color.dangerBg, color:status.open?uiTokens.color.success:uiTokens.color.danger, border:`1px solid ${status.open?uiTokens.color.successBorder:uiTokens.color.dangerBorder}`}}>
                    <span className="rounded-full" style={{width:6, height:6, background:status.open?uiTokens.color.success:uiTokens.color.danger}}/>
                    {status.label}
                  </span>
                )}
              </div>
              {(org as any).shop_tagline && <div className="text-xs !mt-0" style={{color:uiTokens.color.textMuted}}>{(org as any).shop_tagline}</div>}
            </div>
          </div>
          {links.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {links.map((l, i) => (
                <a  key={i} href={l.url} target="_blank" rel="noopener noreferrer" title={l.type==='website'?l.label:undefined} style={{textDecoration:'none'}}>
                  <PlatformIcon type={l.type} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl !my-0 !mx-auto !pt-8 !px-6 !pb-8">
        {products.length === 0 ? (
          <StorelyCard className="min-w-0 rounded-[var(--radius)] !p-8 text-center" style={{background:uiTokens.color.surface, color:uiTokens.color.textMuted, border:`1px solid ${uiTokens.color.border}`}}>
            ما فيه منتجات معروضة حالياً
          </StorelyCard>
        ) : categories.map((cat) => (
          <div key={cat as string} className="!mb-8">
            <div className="text-center !mb-8">
              <h2 className="text-[28px] font-semibold !m-0" style={{color:uiTokens.color.text}}>{cat as string}</h2>
              <div className="rounded-[var(--radius)] !mt-4 !mx-auto !mb-0" style={{width:52, height:3, background:color}}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {products.filter((p: any) => p.category === cat).map((p: any, pi: number) => (
                <div key={pi} className="flex gap-5 items-start">
                  <div className="rounded-[var(--radius)] shrink-0 flex items-center justify-center relative" style={{width:96, height:96, background:uiTokens.color.background, overflow:'hidden'}}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full object-cover" style={{height:'100%'}}/>
                    ) : (
                      <span className="text-[28px]" style={{opacity:.25}}><Package size={20} /></span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 !pt-1" style={{minWidth:0}}>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-semibold whitespace-normal break-words" style={{color:uiTokens.color.text}}>{p.name}</span>
                      {p.is_featured && (
                        <span className="text-xs font-semibold rounded-[var(--radius)] !py-0 !px-2 whitespace-normal break-words" style={{color:uiTokens.color.warning, background:uiTokens.color.warningBg, border:`1px solid ${uiTokens.color.warningBorder}`}}><Star size={18} className="inline-block shrink-0 align-middle" aria-hidden="true" /> الأكثر مبيعاً</span>
                      )}
                      <span className="min-w-0 flex-1 relative" style={{minWidth:20, borderBottom:`1px dotted ${uiTokens.color.border}`, top:-3}}/>
                      {p.price != null && (
                        <span className="text-base font-semibold whitespace-normal break-words" style={{color}}>{p.price} ر.س</span>
                      )}
                    </div>
                    {p.description && (
                      <div className="text-sm !mt-2" style={{color:uiTokens.color.textMuted, lineHeight:1.8}}>{p.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center !py-6 !px-5" style={{borderTop:`1px solid ${uiTokens.color.border}`, background:uiTokens.color.surface}}>
        <a  href="https://storely.dev" target="_blank" rel="noopener noreferrer" className="text-sm" style={{color:uiTokens.color.textMuted, textDecoration:'none'}}>
          حقوق الملكية محفوظة لـ <b  style={{color}}>Storely</b> — تشغيل متجر {displayName} بواسطة Storely
        </a>
      </div>
    </div>
  )
}
