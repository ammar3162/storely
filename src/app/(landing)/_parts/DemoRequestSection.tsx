'use client'
import { BRANCH_OPTIONS, BRANCH_OPTIONS_EN } from '../landing-data'
import { WA_ICON } from './constants'
import type { LandingState } from './useLanding'

export default function DemoRequestSection({ m }: { m: LandingState }) {
  const { form, setForm, agreed, setAgreed, submitting, submitMsg, lang, t, submitDemoRequest } = m
  return (
    <>
      {/* طلب عرض النظام */}
      <section id="demo" className="lp-section lp-sand">
        <div className="lp-wrap lp-demo rv">
          <div className="lp-demo-side">
            <img src="/storely-logo.png" alt=""/>
            <h3>{t('demoSideTitle')}</h3>
            <p>{t('demoSideSub')}</p>
            <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer" className="lp-btn lp-btn-wa">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d={WA_ICON}/></svg>{t('ctaContact')}
            </a>
          </div>
          <form onSubmit={submitDemoRequest} className="lp-demo-form">
            <h2>{t('demoTitle')}</h2>
            <p>{t('demoSub')}</p>
            {submitMsg && <div className={`lp-msg ${submitMsg.ok?'ok':'err'}`}>{submitMsg.text}</div>}
            <div className="lp-fields">
              <label>{t('demoFirstName')}<input required value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/></label>
              <label>{t('demoLastName')}<input required value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/></label>
              <label className="full">{t('demoPhone')}<input required type="tel" dir="ltr" placeholder="05xxxxxxxx" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></label>
              <label className="full">{t('demoEmail')}<input required type="email" dir="ltr" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></label>
              <label>{t('demoBusiness')}<input required value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))}/></label>
              <label>{t('demoBranches')}
                <select value={form.branchCount} onChange={e=>setForm(f=>({...f,branchCount:e.target.value}))}>
                  <option value="">{t('demoPleaseSelect')}</option>
                  {(lang==='ar'?BRANCH_OPTIONS:BRANCH_OPTIONS_EN).map((o,oi)=><option key={o} value={BRANCH_OPTIONS[oi]}>{o}</option>)}
                </select>
              </label>
            </div>
            <label className="lp-agree">
              <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
              <span>{t('demoAgree')} <a href="/terms" target="_blank">{t('demoTerms')}</a> {t('demoAnd')}<a href="/privacy" target="_blank">{t('demoPrivacy')}</a></span>
            </label>
            <button type="submit" disabled={submitting} className="lp-btn lp-btn-dark lp-btn-lg" style={{width:'100%'}}>{submitting?t('demoSending'):t('demoSubmit')}</button>
          </form>
        </div>
      </section>
    </>
  )
}
