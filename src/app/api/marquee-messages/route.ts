import { NextResponse } from 'next/server'
import { getMarqueeMessages } from '@/lib/marquee'

// عام — تستخدمه الصفحة التسويقية لعرض رسائل الشريط المتحرك، بدون أي حاجة لتسجيل دخول
export async function GET() {
  return NextResponse.json({ messages: await getMarqueeMessages() })
}
