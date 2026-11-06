'use client'
import { Package, ClipboardList, MessageCircle, Bike, BarChart3, Bell, UserRound } from 'lucide-react'
import type { Tab } from './tabs'
import type { SupplierDashboard } from './useSupplierDashboard'

/** الأرقام والقوائم المحسوبة للوحة — منقولة كما هي (كانت بعد شاشة التحميل) */
export function deriveView(m: SupplierDashboard) {
  const { profile, quoteRequests, chatMessages, activeTab } = m
  const pendingOrdersCount = quoteRequests.filter((r:any)=>r.status==='pending').length
  const acceptedCount = quoteRequests.filter((r:any)=>r.status==='accepted').length
  const openChatsCount = Array.from(new Set(chatMessages.map((m:any)=>m.org_id))).length

  const NAV_ITEMS: {id:Tab; label:string; Icon:any; badge?:number}[] = [
    { id:'products', label:'الأصناف والأسعار', Icon:Package },
    { id:'orders', label:'الطلبات', Icon:ClipboardList, badge: (pendingOrdersCount+acceptedCount) || undefined },
    { id:'chats', label:'المحادثات', Icon:MessageCircle, badge: openChatsCount || undefined },
    { id:'reps', label:'المناديب', Icon:Bike },
    { id:'reports', label:'التقارير والفواتير', Icon:BarChart3 },
    { id:'activity', label:'الإشعارات', Icon:Bell },
    { id:'account', label:'بيانات المنشأة', Icon:UserRound },
  ]
  const PAGE_HINT: Record<Tab,string> = {
    products:'الأصناف اللي يشوفها العملاء ويطلبونها منك',
    orders:'طلبات التسعير والتوريد من عملاء ستورلي',
    chats:'رسائل العملاء لك',
    reps:'مناديب التوصيل اللي تسند لهم الطلبات',
    reports:'مبيعاتك وفواتيرك الآجلة والمسددة',
    activity:'آخر ما صار في حسابك',
    account:'اسم منشأتك وموقعها',
  }
  const activeNav = NAV_ITEMS.find(n=>n.id===activeTab)!

  const activityFeed = [
    ...quoteRequests.map((r:any)=>({
      type:'order', at: r.created_at, org: r.org_name || 'عميل',
      text: `طلب تسعير جديد من ${r.org_name || 'عميل'} (${(r.items||[]).length} صنف)`,
    })),
    ...chatMessages.filter((m:any)=>m.sender_type==='customer').map((m:any)=>({
      type:'chat', at: m.created_at, org: m.org_name || 'عميل',
      text: `رسالة من ${m.org_name || 'عميل'}: "${m.message.slice(0,40)}${m.message.length>40?'...':''}"`,
    })),
  ].sort((a,b)=> new Date(b.at).getTime() - new Date(a.at).getTime())

  const fulfilledRequests = quoteRequests.filter((r:any)=>r.status==='fulfilled')
  const totalRevenue = fulfilledRequests.reduce((sum:number,r:any)=>sum + (Number(r.quoted_price)||0), 0)
  const totalOrders = quoteRequests.length
  const fulfilledCount = fulfilledRequests.length

  const itemFreq: Record<string, number> = {}
  quoteRequests.forEach((r:any)=>{ (r.items||[]).forEach((it:any)=>{ itemFreq[it.name] = (itemFreq[it.name]||0) + (Number(it.qty)||1) }) })
  const topItems = Object.entries(itemFreq).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const customerAgg: Record<string, {count:number; total:number}> = {}
  quoteRequests.forEach((r:any)=>{
    const key = r.org_name || 'عميل'
    if (!customerAgg[key]) customerAgg[key] = { count:0, total:0 }
    customerAgg[key].count += 1
    if (r.status==='fulfilled') customerAgg[key].total += Number(r.quoted_price)||0
  })
  const topCustomers = Object.entries(customerAgg).sort((a,b)=>b[1].count-a[1].count).slice(0,5)
  const repAgg: Record<string, number> = {}
  quoteRequests.forEach((r:any)=>{ if ((r.status==='confirmed'||r.status==='fulfilled') && r.rep_name) repAgg[r.rep_name] = (repAgg[r.rep_name]||0) + 1 })
  const repStats = Object.entries(repAgg).sort((a,b)=>b[1]-a[1])
  const unpaidInvoices = fulfilledRequests.filter((r:any)=>r.payment_status!=='paid')
  const paidInvoices = fulfilledRequests.filter((r:any)=>r.payment_status==='paid')
  const unpaidTotal = unpaidInvoices.reduce((sum:number,r:any)=>sum+(Number(r.quoted_price)||0),0)
  const paidTotal = paidInvoices.reduce((sum:number,r:any)=>sum+(Number(r.quoted_price)||0),0)
  const money = (n:any) => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2})

  const STATUS: Record<string,{label:string;tone:string}> = {
    pending:{label:'بانتظار سعرك',tone:'amber'}, quoted:{label:'أرسلت السعر',tone:'slate'},
    accepted:{label:'العميل وافق — أكّد التوريد',tone:'teal'}, confirmed:{label:'مجدول للتوريد',tone:'blue'},
    fulfilled:{label:'تم التوريد',tone:'green'},
  }
  const visible = profile?.is_visible!==false

  return { pendingOrdersCount, acceptedCount, openChatsCount, NAV_ITEMS, PAGE_HINT, activeNav, activityFeed, fulfilledRequests, totalRevenue, totalOrders, fulfilledCount, itemFreq, topItems, customerAgg, topCustomers, repAgg, repStats, unpaidInvoices, paidInvoices, unpaidTotal, paidTotal, money, STATUS, visible }
}

export type DashboardView = ReturnType<typeof deriveView>
