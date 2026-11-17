'use client'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import type { LandingState } from './useLanding'

export default function TopNav({ m }: { m: LandingState }) {
  const { scrolled, menuOpen, setMenuOpen, router, navLinks, top, t } = m
  return (
    <>
      {/* القائمة العلوية */}
      <nav className={`lp-nav${scrolled?' on':''}`} style={{top}}>
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-brand"><img src="/storely-logo.png" alt=""/><span>Storely</span></Link>
          <div className="lp-desk lp-links">
            {navLinks.map(([l,h])=><a key={h} href={h}>{l}</a>)}
          </div>
          <div className="lp-desk" style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="lp-btn lp-btn-ghost" onClick={()=>router.push('/login')}>{t('navLogin')}</button>
            <Link className="lp-btn lp-btn-soft" href="/#demo">{t('navDemo')}</Link>
            <button className="lp-btn lp-btn-dark" onClick={()=>router.push('/login?mode=register')}>{t('navStart')}</button>
          </div>
          <button className="lp-mob lp-burger" aria-label={t('navMenu')} aria-expanded={menuOpen} aria-controls="lp-mob-menu" onClick={()=>setMenuOpen(o=>!o)}>{menuOpen?<X size={24} aria-hidden/>:<Menu size={24} aria-hidden/>}</button>
        </div>
        {menuOpen && (
          <div id="lp-mob-menu" className="lp-mob-menu">
            {navLinks.map(([l,h])=><a key={h} href={h} onClick={()=>setMenuOpen(false)}>{l}</a>)}
            <button className="lp-btn lp-btn-ghost" onClick={()=>router.push('/login')}>{t('navLogin')}</button>
            <Link className="lp-btn lp-btn-soft" href="/#demo" onClick={()=>setMenuOpen(false)}>{t('navDemo')}</Link>
            <button className="lp-btn lp-btn-dark" onClick={()=>router.push('/login?mode=register')}>{t('navStart')}</button>
          </div>
        )}
      </nav>
    </>
  )
}
