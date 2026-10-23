import type { Metadata } from 'next'
import UnsubscribeForm from './UnsubscribeForm'

export const metadata: Metadata = { title: 'إلغاء الاشتراك بالإعلانات — Storely', robots: { index: false } }

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e = '', t = '' } = await searchParams
  return (
    <div style={{ minHeight: '100vh', background: '#eef4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'IBM Plex Sans Arabic',system-ui", direction: 'rtl' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', border: '1px solid #e2e8f0', borderRadius: 20, padding: '32px 24px', textAlign: 'center' }}>
        <img src="/storely-logo.png" alt="Storely" width={48} height={48} style={{ display: 'block', margin: '0 auto 14px', borderRadius: 12 }} />
        <UnsubscribeForm email={e} token={t} />
      </div>
    </div>
  )
}
