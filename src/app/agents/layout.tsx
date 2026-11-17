import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'برنامج سفراء Storely — مكافأة عن كل اشتراك',
  description: 'سجّل مجاناً سفيراً لـ Storely، واحصل على رابطك الخاص، واكسب مكافأة عن كل منشأة تشترك عن طريقك.',
}

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
