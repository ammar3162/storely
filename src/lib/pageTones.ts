import {
  Home, BarChart3, Bell, Package, Send, ShoppingCart, ArrowLeftRight, Users, UserCog, Clock,
  UserRound, Store, Puzzle, Building2, GitCompare, Truck, Handshake, Sparkles, TrendingUp, Settings,
  type LucideIcon,
} from 'lucide-react'

// ألوان هادئة — fg للنص والأيقونة، bg خلفية فاتحة، soft للخطوط والأعمدة غير المختارة
export const TONES = {
  teal:    { fg:'#0f766e', bg:'#ecfdf8', soft:'#99e0d6' },
  rose:    { fg:'#e11d48', bg:'#fff1f3', soft:'#fecdd6' },
  indigo:  { fg:'#4f46e5', bg:'#eef2ff', soft:'#c7d2fe' },
  amber:   { fg:'#c2410c', bg:'#fff7ed', soft:'#fed7aa' },
  violet:  { fg:'#7c3aed', bg:'#f5f3ff', soft:'#ddd6fe' },
  sky:     { fg:'#0369a1', bg:'#f0f9ff', soft:'#bae6fd' },
  emerald: { fg:'#047857', bg:'#ecfdf5', soft:'#a7f3d0' },
  pink:    { fg:'#be185d', bg:'#fdf2f8', soft:'#fbcfe8' },
  slate:   { fg:'#475569', bg:'#f1f5f9', soft:'#cbd5e1' },
} as const

export type Tone = (typeof TONES)[keyof typeof TONES]

// لون وأيقونة كل صفحة — يستخدمها عنوان الصفحة والعنصر المفتوح في القائمة الجانبية
export const PAGE_TONES: Record<string, { tone: Tone; Icon: LucideIcon }> = {
  '/dashboard':        { tone: TONES.teal,    Icon: Home },
  '/reports':          { tone: TONES.indigo,  Icon: BarChart3 },
  '/notifications':    { tone: TONES.rose,    Icon: Bell },
  '/inventory':        { tone: TONES.teal,    Icon: Package },
  '/dispense':         { tone: TONES.amber,   Icon: Send },
  '/purchases':        { tone: TONES.indigo,  Icon: ShoppingCart },
  '/transfer-stock':   { tone: TONES.sky,     Icon: ArrowLeftRight },
  '/staff-management': { tone: TONES.violet,  Icon: Users },
  '/hr-management':    { tone: TONES.violet,  Icon: UserCog },
  '/attendance':       { tone: TONES.violet,  Icon: Clock },
  '/branch-managers':  { tone: TONES.violet,  Icon: UserRound },
  '/online-store':     { tone: TONES.pink,    Icon: Store },
  '/addons-market':    { tone: TONES.pink,    Icon: Puzzle },
  '/branches':         { tone: TONES.sky,     Icon: Building2 },
  '/branch-compare':   { tone: TONES.sky,     Icon: GitCompare },
  '/suppliers':        { tone: TONES.emerald, Icon: Truck },
  '/marketplace':      { tone: TONES.emerald, Icon: Handshake },
  '/ai-tools':         { tone: TONES.violet,  Icon: Sparkles },
  '/profitability':    { tone: TONES.emerald, Icon: TrendingUp },
  '/settings':         { tone: TONES.slate,   Icon: Settings },
}

export function pageToneFor(pathname: string) {
  const key = Object.keys(PAGE_TONES).find(k => pathname === k || pathname.startsWith(k + '/'))
  return key ? PAGE_TONES[key] : null
}
