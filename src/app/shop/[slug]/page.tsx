import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { getPublicMenu, safeDecode } from '@/lib/shopMenu'
import { ShopMenuView, ShopBranchPicker, ShopUnavailable, shopTitle } from '@/components/shop/ShopMenuView'

export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicMenu(sb(), slug)
  if (!data) return { title: 'متجر غير متاح' }
  const org = data.org as any
  const title = shopTitle(data)
  const description = org.shop_tagline || `تصفّح منتجات ${title} — بواسطة Storely`
  const image = org.logo_url
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : [], type: 'website' },
    twitter: { card: 'summary', title, description, images: image ? [image] : [] },
  }
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getPublicMenu(sb(), slug)
  if (!data) return <ShopUnavailable />
  // أكثر من فرع مشترك → الزبون يختار فرعه أول
  if (data.kind === 'pick') return <ShopBranchPicker data={data} slug={safeDecode(slug)} />
  return <ShopMenuView data={data} slug={safeDecode(slug)} />
}
