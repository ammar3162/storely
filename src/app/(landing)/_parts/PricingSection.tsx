'use client'
import { Check, Minus } from 'lucide-react'
import { PLAN_BRANCHES, PLANS, COMPARE } from '../landing-data'
import type { LandingState } from './useLanding'

export default function PricingSection({ m }: { m: LandingState }) {
  const { billing, setBilling, lang, router, t } = m
  return (
    <>
      {/* الأسعار */}
      <section id="pricing" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head rv">
            <span className="lp-tag">{t('pricingTag')}</span>
            <h2 className="lp-h2">{t('pricingTitle')}</h2>
            <p className="lp-plans-trial">{lang==='ar'?'جرّب كل المميزات مجاناً لمدة 14 يوم، وبعدها اختر الباقة اللي تناسبك':'Try every feature free for 14 days, then pick the plan that fits you'}</p>
            <div className="lp-toggle">
              <button className={billing==='monthly'?'on':''} onClick={()=>setBilling('monthly')}>{t('billMonthly')}</button>
              <button className={billing==='yearly'?'on':''} onClick={()=>setBilling('yearly')}>{t('billYearly')} <span>{t('billSave')}</span></button>
            </div>
          </div>
          <div className="lp-plans">
            {PLANS.map((p:any,i)=>(
              <div key={i} className={`lp-plan rv${p.popular?' pop':''}`}>
                {p.popular && <div className="lp-plan-badge">{t('mostPopular')}</div>}
                <div className="lp-plan-name">{lang==='ar'?p.name:p.nameEn}</div>
                <div className="lp-plan-who">{lang==='ar'?p.who:p.whoEn}</div>
                {p.custom
                  ? <div className="lp-plan-price"><strong style={{fontSize:30}}>{lang==='ar'?'سعر مخصص':'Custom'}</strong></div>
                  : <>
                      <div className="lp-plan-price"><strong>{billing==='yearly'?Math.round(Number(p.yearlyPrice)/12):p.price}</strong><span>{lang==='ar'?'⃁':'SAR'} {t('perMonth')}</span></div>
                      {billing==='yearly' && <div className="lp-plan-yearly">{lang==='ar'?`تُدفع سنوياً: ${p.yearlyPrice} ⃁ بدل ${Number(p.price)*12}`:`Billed yearly: ${p.yearlyPrice} SAR instead of ${Number(p.price)*12}`}</div>}
                    </>}
                <div className="lp-plan-limits">{(lang==='ar'?p.limits:p.limitsEn).join(' · ')}</div>
                {p.extra && <div className="lp-plan-extra">{lang==='ar'?p.extra:p.extraEn}</div>}
                {p.custom
                  ? <a href="#demo" className="lp-btn lp-btn-lg lp-btn-line" style={{width:'100%'}}>{lang==='ar'?'تواصل معنا':'Contact us'}</a>
                  : <button onClick={()=>router.push(`/login?mode=register&branches=${PLAN_BRANCHES[i]}&billing=${billing}`)} className={`lp-btn lp-btn-lg ${p.popular?'lp-btn-dark':'lp-btn-line'}`} style={{width:'100%'}}>{t('startNow')}</button>}
                <ul>
                  {(lang==='ar'?p.features:p.featuresEn).map((f:string,j:number)=><li key={j}><Check size={15}/>{f}</li>)}
                </ul>
                {p.addons && (
                  <div className="lp-plan-note">
                    <div style={{fontWeight:700,marginBottom:6}}>{lang==='ar'?'أضف اللي تحتاجه — إضافات تبدأ من 29 ⃁:':'Add what you need — add-ons from 29 SAR:'}</div>
                    {(lang==='ar'?p.addons:p.addonsEn).map(([n]:string[],j:number)=>(
                      <div key={j} style={{padding:'3px 0'}}>{n}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="lp-plans-foot">{lang==='ar'?'تقدر تطلب فروع وموظفين وموردين إضافيين من داخل النظام في أي وقت. الموظفين والموردين لكل المنشأة، توزعهم على فروعك مثل ما تبي.':'Request extra branches, staff and suppliers anytime from inside the app. Staff and suppliers are shared across your branches.'}</p>
          <div className="lp-compare rv">
            <h3>{lang==='ar'?'قارن الباقات':'Compare plans'}</h3>
            <div className="lp-compare-scroll">
              <table>
                <thead><tr><th></th>{PLANS.map((p:any,i)=><th key={i} className={p.popular?'pop':''}>{lang==='ar'?p.name:p.nameEn}</th>)}</tr></thead>
                {COMPARE.map((g,gi)=>(
                  <tbody key={gi}>
                    <tr className="grp"><td colSpan={5}>{g.group}</td></tr>
                    {g.rows.map(([label,...cells],ri)=>(
                      <tr key={ri}><td>{label}</td>{cells.map((c,ci)=>(
                        <td key={ci} className={PLANS[ci]?.popular?'pop':''}>
                          {c===true?<Check size={17} className="yes"/>:c===false?<Minus size={15} className="no"/>:c==='addon'?<span className="addon">{lang==='ar'?'إضافة':'Add-on'}</span>:<b>{c}</b>}
                        </td>))}</tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
