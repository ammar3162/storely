import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { getPublicMenu, safeDecode } from '@/lib/shopMenu'
import { ShopMenuView, ShopBranchPicker, ShopUnavailable, shopTitle } from '@/components/shop/ShopMenuView'

export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ slug: string; branch: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, branch } = await params
  const data = await getPublicMenu(sb(), slug, branch)
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

// منيو فرع معيّن — لو الفرع ما عاد مشترك يرجع الزبون لاختيار الفرع
export default async function ShopBranchPage({ params }: Params) {
  const { slug, branch } = await params
  const data = await getPublicMenu(sb(), slug, branch)
  if (!data) return <ShopUnavailable />
  if (data.kind === 'pick') return <ShopBranchPicker data={data} slug={safeDecode(slug)} />
  return <ShopMenuView data={data} slug={safeDecode(slug)} />
}
