'use client'
import { Wheat, Milk, SprayCan, CupSoda, Drumstick, Carrot, FileText, Package, Tag } from 'lucide-react'

export const CATEGORY_COLORS = ['#0f766e','#2563eb','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#4f46e5']
export const OTHER_CATEGORY = 'أخرى'

export function colorFor(cat: string) {
  // لون ثابت حسب اسم الفئة نفسه — مو حسب ترتيبها بقائمة متغيّرة (كانت تتغيّر مع تغيّر نمط الاستخدام)
  let hash = 0
  for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) >>> 0
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length]
}

export function iconFor(cat: string, size = 20) {
  const c = (cat||'').toLowerCase()
  const p = { size, strokeWidth: 2 }
  if(c.includes('غذائ')||c.includes('طعام')||c.includes('اكل')||c.includes('أكل')||c.includes('خبز')) return <Wheat {...p}/>
  if(c.includes('لبن')||c.includes('حليب')||c.includes('بيض')||c.includes('ألبان')||c.includes('جبن')) return <Milk {...p}/>
  if(c.includes('نظاف')||c.includes('تنظيف')) return <SprayCan {...p}/>
  if(c.includes('مشروب')||c.includes('عصير')) return <CupSoda {...p}/>
  if(c.includes('لحم')||c.includes('دجاج')) return <Drumstick {...p}/>
  if(c.includes('خضار')||c.includes('فواكه')) return <Carrot {...p}/>
  if(c.includes('ورق')||c.includes('مكتب')) return <FileText {...p}/>
  if(c === 'أخرى' || c.includes('اخرى')) return <Package {...p}/>
  return <Tag {...p}/>
}
