import {
  ArrowDownUp, Bell, Boxes, ChartNoAxesCombined, CircleCheck, Clock3, Coffee,
  FileScan, Handshake, Hospital, Hotel, Lightbulb, ListFilter, LockKeyhole,
  MessageCircle, Package, PencilLine, Pill, Receipt, Recycle, School, ShoppingBag,
  ShoppingCart, SlidersHorizontal, Target, Trash2, TrendingUp, Truck, Users,
  Utensils, Warehouse, Wheat, Building2, AlertTriangle, Save, User, Snail, CalendarDays, CalendarRange,
  Hand, Lock, Gem, MapPin, Store, ClipboardList, Settings, FileText, Siren, Flame, Camera, Image as ImageIcon,
  Medal, Search, StickyNote, Repeat, Download, Send,
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
  '⚠️': AlertTriangle, '💾': Save, '🔐': LockKeyhole, '👤': User, '🐌': Snail, '📅': CalendarDays,
  '📆': CalendarRange, '👆': Hand, '🔒': Lock, '💎': Gem, '📍': MapPin, '🏪': Store, '📋': ClipboardList,
  '⚙️': Settings, '📄': FileText, '🚨': Siren, '🔥': Flame, '📷': Camera, '🖼️': ImageIcon, '🥇': Medal,
  '🥈': Medal, '🥉': Medal, '🔍': Search, '📝': StickyNote, '🔁': Repeat, '📥': Download, '📤': Send,
} as const

export function FeatureIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = featureIcons[name as keyof typeof featureIcons] ?? ListFilter
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} />
}
