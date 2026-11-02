import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'برنامج سفراء Storely — اكسب على كل اشتراك',
  description: 'سجّل مجاناً كسفير لـ Storely، خذ رابطك الخاص، واكسب مكافأة على كل منشأة تشترك عن طريقك.',
}

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return children
}
