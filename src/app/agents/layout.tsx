import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'برنامج مناديب Storely — اكسب على كل اشتراك',
  description: 'سجّل مجاناً كمندوب لـ Storely، خذ رابطك الخاص، واكسب مكافأة على كل منشأة تشترك عن طريقك.',
}

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
