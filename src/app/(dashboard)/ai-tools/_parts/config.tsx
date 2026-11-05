'use client'
import { colors as dsColors } from '@/lib/ds'

// موحّد مع نظام التصميم المشترك (@/lib/ds)
export const C = {
  primary:dsColors.primary, primaryD:dsColors.primaryDark, primaryL:dsColors.primaryLight, primaryB:dsColors.primaryBorder,
  text:dsColors.text, text2:dsColors.text2, text3:dsColors.text3, text4:dsColors.text4,
  bg:dsColors.bg, surface:dsColors.surface, border:dsColors.border, border2:dsColors.border2,
}

export const TOOLS = [
  {
    href:'/purchases',
    icon:'📸',
    title:'مسح الفواتير بالذكاء الاصطناعي',
    desc:'صوّر فاتورة الشراء، ودع الذكاء الاصطناعي يستخرج المورد والأصناف والمبلغ تلقائياً',
    color:'#f97316',
    bg:'#fff7ed',
    border:'#fed7aa',
    features:['استخراج تلقائي للبيانات','دعم فواتير متعددة الأصناف','تحديث المخزون فوراً'],
    minPlan:'basic',
  },
  {
    href:'#smart-order',
    icon:'🛒',
    title:'اقتراح الشراء الذكي',
    desc:'يحسب الكمية المثلى لكل صنف بناءً على معدل الصرف الفعلي ويرسلها للمورد عبر واتساب',
    color:'#029FA2',
    bg:'#f0fdfa',
    border:'#99f6e4',
    features:['حساب الكمية المثلى','إرسال للمورد واتساب','بناءً على 90 يوم صرف'],
    minPlan:'pro',
  },
  {
    href:'/branch-compare',
    icon:'📊',
    title:'مقارنة الفروع',
    desc:'قارن أداء كل فرع من حيث الصرف والمشتريات والأصناف الناقصة',
    color:'#3b82f6',
    bg:'#eff6ff',
    border:'#bfdbfe',
    features:['مقارنة الصرف','أفضل الأصناف لكل فرع','تحليل أسبوعي وشهري'],
    minPlan:'pro',
  },
]

export function planAllows(userPlan:string, minPlan:string, hasAiAddon:boolean){
  if (userPlan === 'basic' && hasAiAddon) return true // عميل الأساسية اللي اشترى إضافة الذكاء الاصطناعي
  const order = ['basic','pro','advanced']
  return order.indexOf(userPlan) >= order.indexOf(minPlan)
}

