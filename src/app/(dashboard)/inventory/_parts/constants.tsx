'use client'
import { colors as dsColors } from '@/lib/ds'

// موحّد مع نظام التصميم المشترك (@/lib/ds)
export const C = {
  primary:dsColors.primary, primaryD:dsColors.primaryDark, primaryL:dsColors.primaryLight, primaryB:dsColors.primaryBorder,
  danger:dsColors.danger,  dangerL:dsColors.dangerLight,  dangerB:dsColors.dangerBorder,
  warning:dsColors.warning, warningL:dsColors.warningLight, warningB:dsColors.warningBorder,
  info:dsColors.info,    infoL:dsColors.infoLight,    infoB:dsColors.infoBorder,
  text:dsColors.text, text2:dsColors.text2, text3:dsColors.text3, text4:dsColors.text4,
  bg:dsColors.bg, surface:dsColors.surface, border:dsColors.border, border2:dsColors.border2,
}

export interface Product {
  id:string; name:string; sku:string|null; unit:string
  qty:number; reorder_point:number; category:string|null; expiry_date?:string|null
  org_id:string; is_active:boolean; created_at:string; updated_at:string
}

// منتجات مقترحة جاهزة حسب نوع النشاط — اختيارية بالكامل، تظهر بس لما يكون المخزون فارغ
export const STARTER_PRODUCTS: Record<string,{name:string;unit:string;category:string}[]> = {
  'مطعم':[
    {name:'دجاج',unit:'كيلو',category:'لحوم ودواجن'},{name:'لحم بقري',unit:'كيلو',category:'لحوم ودواجن'},
    {name:'أرز',unit:'كيس',category:'مواد غذائية'},{name:'طماطم',unit:'كيلو',category:'خضار وفواكه'},
    {name:'بصل',unit:'كيلو',category:'خضار وفواكه'},{name:'زيت طبخ',unit:'لتر',category:'مواد غذائية'},
    {name:'صوص باربكيو',unit:'زجاجة',category:'توابل وصلصات'},{name:'خبز',unit:'كيس',category:'مواد غذائية'},
    {name:'أكياس تغليف',unit:'كرتون',category:'تغليف'},{name:'مياه معدنية',unit:'كرتون',category:'مشروبات'},
  ],
  'كوفي':[
    {name:'حبوب قهوة',unit:'كيس',category:'قهوة'},{name:'حليب كامل الدسم',unit:'لتر',category:'حليب وكريمة'},
    {name:'شاي',unit:'علبة',category:'شاي وأعشاب'},{name:'سكر',unit:'كيس',category:'سكر ومحليات'},
    {name:'أكواب ورقية',unit:'كرتون',category:'أكواب وأغطية'},{name:'أغطية أكواب',unit:'كرتون',category:'أكواب وأغطية'},
    {name:'شوكولاتة',unit:'كيلو',category:'حلويات ومخبوزات'},{name:'كريمة خفق',unit:'لتر',category:'حليب وكريمة'},
  ],
  'مخبز':[
    {name:'دقيق',unit:'كيس',category:'دقيق وسكر'},{name:'سكر',unit:'كيس',category:'دقيق وسكر'},
    {name:'زبدة',unit:'كيلو',category:'زبدة وزيوت'},{name:'بيض',unit:'طبق',category:'بيض وألبان'},
    {name:'خميرة',unit:'كيس',category:'دقيق وسكر'},{name:'حليب',unit:'لتر',category:'بيض وألبان'},
    {name:'مكسرات مشكلة',unit:'كيلو',category:'مكسرات'},{name:'أكياس تغليف',unit:'كرتون',category:'تغليف'},
  ],
  'صيدلية':[
    {name:'باراسيتامول',unit:'علبة',category:'أدوية'},{name:'كمامات',unit:'كرتون',category:'مستلزمات طبية'},
    {name:'قفازات طبية',unit:'كرتون',category:'مستلزمات طبية'},{name:'معقم يدين',unit:'زجاجة',category:'مستلزمات طبية'},
    {name:'شاش طبي',unit:'علبة',category:'مستلزمات طبية'},{name:'فيتامينات',unit:'علبة',category:'مكملات غذائية'},
  ],
  // بقالة، مستودع، متجر إلكتروني، أخرى: أصنافها تعتمد كلياً على اختيار صاحب النشاط
  // (منتجات متنوعة جداً بلا معيار موحّد) — نكتفي لهم بالفئات المقترحة بدون قائمة أصناف جاهزة
}

export function StatusDot({ out, low }: { out: boolean; low: boolean }) {
  const c = out ? C.danger : low ? C.warning : C.primary
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12.5,fontWeight:500,color:C.text2}}><span style={{width:7,height:7,borderRadius:'50%',background:c}}/>{out?'نفد':low?'ناقص':'كافٍ'}</span>
}
