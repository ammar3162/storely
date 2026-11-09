import { storelyTokens as t } from '@/components/ui/design-tokens'
import {
  Home, BarChart3, Bell, Package, Send, ShoppingCart, ArrowLeftRight, Users, UserCog, Clock,
  UserRound, Store, Puzzle, Building2, GitCompare, Truck, Handshake, SlidersHorizontal, TrendingUp, Settings,
  type LucideIcon,
} from 'lucide-react'

// ألوان هادئة — fg للنص والأيقونة، bg خلفية فاتحة، soft للخطوط والأعمدة غير المختارة
export const TONES = {
  teal:    { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  rose:    { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  indigo:  { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  amber:   { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  violet:  { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  sky:     { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  emerald: { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  pink:    { fg:t.color.text, bg:t.color.background, soft:t.color.border },
  slate:   { fg:t.color.text, bg:t.color.background, soft:t.color.border },
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
  '/addons-market':    { tone: TONES.pink,    Icon: Puzzle },
  '/branches':         { tone: TONES.sky,     Icon: Building2 },
  '/branch-compare':   { tone: TONES.sky,     Icon: GitCompare },
  '/suppliers':        { tone: TONES.emerald, Icon: Truck },
  '/marketplace':      { tone: TONES.emerald, Icon: Handshake },
  '/ai-tools':         { tone: TONES.violet,  Icon: SlidersHorizontal },
  '/profitability':    { tone: TONES.emerald, Icon: TrendingUp },
  '/settings':         { tone: TONES.slate,   Icon: Settings },
}

export function pageToneFor(pathname: string) {
  const key = Object.keys(PAGE_TONES).find(k => pathname === k || pathname.startsWith(k + '/'))
  return key ? PAGE_TONES[key] : null
}
