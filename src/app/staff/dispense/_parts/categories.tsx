'use client'
import { Wheat, Milk, SprayCan, CupSoda, Drumstick, Carrot, FileText, Package, Tag } from 'lucide-react'

export const OTHER_CATEGORY = 'أخرى'

// أيقونة الفئة — رمادية بلون النص (تصميم «كاونتر»: ما فيه ألوان للفئات)
export function iconFor(cat: string, size = 18) {
  const c = (cat||'').toLowerCase()
  const p = { size, strokeWidth: 1.75 }
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
