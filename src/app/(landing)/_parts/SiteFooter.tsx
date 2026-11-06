'use client'
import { SOCIAL_LINKS } from '../landing-data'
import type { LandingState } from './useLanding'

export default function SiteFooter({ m }: { m: LandingState }) {
  const { lang, t } = m
  return (
    <>
      {/* التذييل */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-foot-grid">
            <div>
              <div className="lp-brand" style={{color:'#fff'}}><img src="/storely-logo.png" alt=""/><span>Storely</span></div>
              <p className="lp-foot-tag">{t('footerTagline')}</p>
              <div className="lp-foot-social">
                {SOCIAL_LINKS.map(s=>(
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={s.path}/></svg>
                  </a>
                ))}
              </div>
            </div>
            {[
              {title:t('footerPlatform'),links:[[t('footerLogin'),'/login'],[t('footerSignup'),'/login?mode=register'],[t('footerPricing'),'#pricing']]},
              {title:t('footerLegal'),links:[[t('footerPrivacy'),'/privacy'],[t('footerTerms'),'/terms'],[t('footerSecurity'),'/security']]},
              {title:t('footerContact'),links:[[t('footerWhatsapp'),'https://wa.me/966594351667'],[t('footerEmail'),'mailto:support@storely.dev']]},
            ].map((col,i)=>(
              <div key={i}>
                <div className="lp-foot-title">{col.title}</div>
                {col.links.map(([l,h])=><a key={l} href={h} className="lp-foot-link">{l}</a>)}
              </div>
            ))}
          </div>
          <div className="lp-foot-bottom">
            <div>
              <div>{t('footerRights')} {new Date().getFullYear()} ©</div>
              <small>{lang==='ar'?'مؤسسة باسم علي خلوي لتقنية المعلومات، رقم السجل التجاري 7055023522':'Basim Ali Khulwi Information Technology Est., Commercial Registration No. 7055023522'}</small>
            </div>
            <div dir="ltr">storely.dev</div>
          </div>
        </div>
      </footer>
    </>
  )
}
