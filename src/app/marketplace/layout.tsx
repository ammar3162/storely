import HelpVideoButton from '@/components/HelpVideoButton'

// صفحة الموردين المعتمدين برا لوحة التحكم — نضيف زر فيديو الشرح العائم
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<HelpVideoButton variant="floating" /></>
}
