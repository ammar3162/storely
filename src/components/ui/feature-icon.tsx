import {
  ArrowDownUp, Bell, Boxes, ChartNoAxesCombined, CircleCheck, Clock3, Coffee,
  FileScan, Handshake, Hospital, Hotel, Lightbulb, ListFilter, LockKeyhole,
  MessageCircle, Package, PencilLine, Pill, Receipt, Recycle, School, ShoppingBag,
  ShoppingCart, SlidersHorizontal, Target, Trash2, TrendingUp, Truck, Users,
  Utensils, Warehouse, Wheat, Building2,
} from 'lucide-react'

// One outline family for existing decorative feature glyphs. Labels/data stay intact.
const featureIcons = {
  '📸': FileScan, '🛒': ShoppingCart, '📊': ChartNoAxesCombined,
  '⚡': TrendingUp, '💰': Receipt, '♻️': Recycle, '📦': Package,
  '💡': Lightbulb, '📈': TrendingUp, '🧠': SlidersHorizontal,
  '✨': SlidersHorizontal, '🔮': Boxes, '🔔': Bell, '🗑️': Trash2,
  '💬': MessageCircle, '⏱️': Clock3, '🔒✨': LockKeyhole,
  '🍔': Utensils, '☕': Coffee, '🥖': Wheat, '💊': Pill,
  '🏭': Warehouse, '🛍️': ShoppingBag, '🏨': Hotel, '🏥': Hospital,
  '🏫': School, '🎯': Target, '🤝': Handshake, '🎉': CircleCheck,
  '📲': MessageCircle, '👥': Users, '🏢': Building2, '✅': CircleCheck, '✏️': PencilLine,
  '🚚': Truck, '🔄': ArrowDownUp,
} as const

export function FeatureIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = featureIcons[name as keyof typeof featureIcons] ?? ListFilter
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} />
}
