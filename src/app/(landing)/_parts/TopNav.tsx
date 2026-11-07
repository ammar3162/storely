'use client'
import type { LandingState } from './useLanding'

export default function TopNav({ m }: { m: LandingState }) {
  const { scrolled, menuOpen, setMenuOpen, router, navLinks, top, t } = m
  return (
    <>
      {/* القائمة العلوية */}
      <nav className={`lp-nav${scrolled?' on':''}`} style={{top}}>
        <div className="lp-wrap lp-nav-in">
          <a href="/" className="lp-brand"><img src="/storely-logo.png" alt=""/><span>Storely</span></a>
          <div className="lp-desk lp-links">
            {navLinks.map(([l,h])=><a key={h} href={h}>{l}</a>)}
          </div>
          <div className="lp-desk" style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="lp-btn lp-btn-ghost" onClick={()=>router.push('/login')}>{t('navLogin')}</button>
            <a className="lp-btn lp-btn-soft" href="/#demo">{t('navDemo')}</a>
            <button className="lp-btn lp-btn-dark" onClick={()=>router.push('/login?mode=register')}>{t('navStart')}</button>
          </div>
          <button className="lp-mob lp-burger" aria-label="القائمة" onClick={()=>setMenuOpen(o=>!o)}>{menuOpen?'✕':'☰'}</button>
        </div>
        {menuOpen && (
          <div className="lp-mob-menu">
            {navLinks.map(([l,h])=><a key={h} href={h} onClick={()=>setMenuOpen(false)}>{l}</a>)}
            <button className="lp-btn lp-btn-ghost" onClick={()=>router.push('/login')}>{t('navLogin')}</button>
            <a className="lp-btn lp-btn-soft" href="/#demo">{t('navDemo')}</a>
            <button className="lp-btn lp-btn-dark" onClick={()=>router.push('/login?mode=register')}>{t('navStart')}</button>
          </div>
        )}
      </nav>
    </>
  )
}
