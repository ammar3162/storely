'use client'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import type { LandingState } from './useLanding'

// القائمة العلوية بأسلوب أبل: شريط رفيع شفاف يبقى أعلى الصفحة، وعلى الجوال قائمة تملأ الشاشة
export default function TopNav({ m }: { m: LandingState }) {
  const { menuOpen, setMenuOpen, router, navLinks, t } = m
  const close = () => setMenuOpen(false)
  return (
    <nav className="lp-nav" aria-label={t('navMenu')}>
      <div className="lp-wrap lp-nav-in">
        <Link href="/" className="lp-brand"><img src="/storely-logo.png" alt="" width={30} height={30} /><span>Storely</span></Link>
        <div className="lp-desk lp-links">
          {navLinks.map(([l, h]) => <a key={h} href={h}>{l}</a>)}
        </div>
        <div className="lp-nav-end">
          <button className="lp-desk lp-btn lp-btn-ghost" onClick={() => router.push('/login')}>{t('navLogin')}</button>
          <button className="lp-btn lp-btn-dark" onClick={() => router.push('/login?mode=register')}>{t('navStart')}</button>
          <button className="lp-mob lp-burger" aria-label={t('navMenu')} aria-expanded={menuOpen} aria-controls="lp-mob-menu" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div id="lp-mob-menu" className="lp-mob-menu">
          {navLinks.map(([l, h]) => <a key={h} href={h} onClick={close}>{l}</a>)}
          <Link className="lp-btn lp-btn-line lp-btn-lg" href="/#demo" onClick={close}>{t('navDemo')}</Link>
          <button className="lp-btn lp-btn-soft lp-btn-lg" onClick={() => router.push('/login')}>{t('navLogin')}</button>
        </div>
      )}
    </nav>
  )
}
