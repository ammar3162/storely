'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import type { LandingState } from './useLanding'

// القائمة العلوية بأسلوب أبل: شريط رفيع شفاف يبقى أعلى الصفحة، وزر «تسجيل الدخول» ظاهر دائماً بإطار.
// قائمة الجوال شاشة كاملة خارج الشريط (الضبابية في الشريط كانت تحبسها داخله فتظهر بارتفاع صفر).
export default function TopNav({ m }: { m: LandingState }) {
  const { menuOpen, setMenuOpen, router, navLinks, t } = m
  const close = () => setMenuOpen(false)
  const go = (href: string) => { close(); router.push(href) }

  useEffect(() => {
    if (!menuOpen) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { html.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [menuOpen, setMenuOpen])

  return (
    <>
      <nav className="lp-nav" aria-label={t('navMenu')}>
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-brand"><img src="/storely-logo.png" alt="" width={30} height={30} /><span>Storely</span></Link>
          <div className="lp-desk lp-links">
            {navLinks.map(([l, h]) => <a key={h} href={h}>{l}</a>)}
          </div>
          <div className="lp-nav-end">
            <button className="lp-btn lp-btn-line lp-btn-nav" onClick={() => router.push('/login')}>
              <span className="lp-desk-i">{t('navSignIn')}</span><span className="lp-mob-i">{t('navLogin')}</span>
            </button>
            <button className="lp-btn lp-btn-dark lp-btn-nav" onClick={() => router.push('/login?mode=register')}>{t('navStart')}</button>
            <button className="lp-mob lp-burger" aria-label={t('navMenu')} aria-expanded={menuOpen} aria-controls="lp-mob-menu" onClick={() => setMenuOpen(true)}>
              <Menu size={24} aria-hidden />
            </button>
          </div>
        </div>
      </nav>
      {menuOpen && (
        <div id="lp-mob-menu" className="lp-mob-menu" role="dialog" aria-modal="true" aria-label={t('navMenu')}>
          <div className="lp-mob-head">
            <Link href="/" className="lp-brand" onClick={close}><img src="/storely-logo.png" alt="" width={30} height={30} /><span>Storely</span></Link>
            <button className="lp-burger" aria-label={t('navClose')} onClick={close} autoFocus><X size={26} aria-hidden /></button>
          </div>
          <nav className="lp-mob-links" aria-label={t('navMenu')}>
            {navLinks.map(([l, h]) => <a key={h} href={h} onClick={close}>{l}</a>)}
          </nav>
          <div className="lp-mob-acts">
            <button className="lp-btn lp-btn-dark lp-btn-lg" onClick={() => go('/login?mode=register')}>{t('navStart')}</button>
            <button className="lp-btn lp-btn-line lp-btn-lg" onClick={() => go('/login')}>{t('navSignIn')}</button>
            <Link className="lp-btn lp-btn-soft lp-btn-lg" href="/#demo" onClick={close}>{t('navDemo')}</Link>
          </div>
        </div>
      )}
    </>
  )
}
