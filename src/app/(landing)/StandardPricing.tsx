'use client'
// صفحة الأسعار (الباقات الجديدة 2026-11) على النمط المعتاد للشركات:
// شهري/سنوي + عدد الفروع ← 3 باقات «كل اللي في السابقة، بالإضافة إلى» ← المشمول ← الإضافات ← جدول المقارنة ← المؤسسات.
// الأسعار من مصدر واحد (lib/planPricing) — نفس أرقام التسجيل والفاتورة.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Minus, Plus, ChevronDown, Wallet, UserCheck, Sparkles, Users, Store, ArrowLeft, Sun, MessageCircle, TrendingUp, GitCompare, Calculator, UserCog, Languages, Truck, Bell, FileDown, Percent, type LucideIcon } from 'lucide-react'
import type { Billing } from './landing-data'
import { CUSTOM_MODULES, CUSTOM_MODULE_ORDER, NEW_ADDON_PRICES, NEW_PLANS, PLAN_CAPS, PLAN_PRICING, YEARLY_FACTOR, customModuleAmount, customMonthly, planPriceFor, signupAddonsMonthly, type NewPlanKey, alaCarteMonthly, yearlyOf } from '@/lib/planPricing'

type PlanKey = NewPlanKey
const price = (k: PlanKey) => PLAN_PRICING[k].monthly
const extra = (k: PlanKey) => PLAN_CAPS[k].branchPrice
const PLANS: { key: PlanKey; name: string; desc: string; price: number; extra: number; popular?: boolean; intro?: string; features: string[] }[] = [
  { key: 'essential', name: PLAN_PRICING.essential.label, desc: 'لضبط المخزون والمشتريات والموردين', price: price('essential'), extra: extra('essential'),
    features: ['إدارة المخزون', 'الصرف والهدر', 'الجرد بالباركود', 'الوصفات', 'تنبيهات النقص', 'الطلب التلقائي من الموردين', 'المشتريات والفواتير', 'قراءة الفواتير بالذكاء الاصطناعي', 'إقرار ضريبة القيمة المضافة'] },
  { key: 'ops', name: PLAN_PRICING.ops.label, desc: 'للمطاعم والكوفيهات اللي تقفل كاشير كل يوم', price: price('ops'), extra: extra('ops'), popular: true,
    features: ['إقفال الكاشير اليومي', 'متابعة العجز والزيادة', 'صور الإيصالات', 'تطبيقات التوصيل', 'الخصم من الراتب'] },
  { key: 'full', name: PLAN_PRICING.full.label, desc: 'كل شي، ومعه الموظفين والرواتب والذكاء', price: price('full'), extra: extra('full'),
    features: ['الحضور والانصراف', 'الورديات والإجازات', 'مسير الرواتب', 'السلف والخصومات', 'أدوات الذكاء الاصطناعي'] },
]
const ADDONS: { icon: typeof Wallet; name: string; price: number; unit: string; note: string }[] = [
  { icon: Wallet, name: 'إقفال الكاشير', price: CUSTOM_MODULES.cashier_closing.first, unit: `⃁ للفرع الأول، و${CUSTOM_MODULES.cashier_closing.extra} لكل فرع بعده`, note: 'للأساسية' },
  { icon: UserCheck, name: 'الحضور والرواتب', price: CUSTOM_MODULES.hr_full.first, unit: `⃁ للفرع الأول، و${CUSTOM_MODULES.hr_full.extra} لكل فرع بعده`, note: 'للأساسية والتشغيل' },
  { icon: Sparkles, name: 'أدوات الذكاء الاصطناعي', price: NEW_ADDON_PRICES.ai_tools.monthly, unit: '⃁ / شهرياً', note: 'للأساسية والتشغيل' },
  { icon: Users, name: 'موظف إضافي', price: NEW_ADDON_PRICES.extra_staff.monthly, unit: '⃁ / شهرياً', note: `فوق ${PLAN_CAPS.essential.staff} موظفين لكل فرع` },
]
// الكاملة أوفر من الأساسية + كل الإضافات (لفرع واحد)
const MOD_NAME: Record<string, string> = {
  mod_inventory: 'المخزون والموردين', mod_purchases: 'المشتريات والفواتير', cashier_closing: 'إقفال الكاشير',
  hr_full: 'الحضور والرواتب', ai_tools: 'أدوات الذكاء الاصطناعي',
}
type Cell = boolean | 'addon' | string
// كل المميزات: [المجموعة، المميزات، حالتها في (الأساسية، التشغيل، الكاملة)]
const ALL: [string, string[], [Cell, Cell, Cell]][] = [
  ['المخزون والموردين', ['الصرف من جوال الموظف', 'الهدر بأسبابه', 'الجرد والجرد بالباركود', 'الوصفات وتحويل الوحدات', 'تنبيه النقص الفوري',
    'طلب التوريد تلقائياً على الواتساب', 'نقل المخزون بين الفروع', 'بوابة المورد والموردين المعتمدين', 'الاستيراد والتصدير بملف Excel'], [true, true, true]],
  ['المشتريات والفواتير', ['الوكيل الذكي يقرأ الفاتورة من صورتها', 'مطابقة الأصناف مع المخزون تلقائياً', 'مستحقات الموردين ومواعيد الاستحقاق', 'مقارنة أسعار الموردين',
    'الفواتير الضريبية والتحقق من رمز QR', 'إقرار ضريبة القيمة المضافة', 'تنبيه الفواتير المكررة', 'رسالة شكر للمورد على الواتساب'], [true, true, true]],
  ['إقفال الكاشير', ['إقفال يومي من جوال الكاشير', 'صور إيصالات الشبكة والمبيعات', 'العجز والزيادة لكل كاشير', 'قرار الخصم من الراتب',
    'تطبيقات التوصيل في الإقفال', 'تعديل الإقفال بكلمة مرور المالك', 'سجل لكل تعديل'], ['addon', true, true]],
  ['الحضور والرواتب', ['الحضور والانصراف بالموقع', 'الورديات وجدول كل يوم', 'الإجازات والطلبات', 'التأخير والخصم التلقائي',
    'الساعات الإضافية', 'السلف والخصومات', 'مسير الرواتب الشهري', 'مهام الموظفين'], ['addon', 'addon', true]],
  ['أدوات الذكاء الاصطناعي', ['اقتراح كميات الشراء', 'توقع نفاد الأصناف', 'كشف الهدر غير الطبيعي', 'المخزون الراكد', 'أيام وأوقات الذروة',
    'مطابقة الوصفات مع الاستهلاك', 'تقرير أسبوعي على الواتساب'], ['addon', 'addon', true]],
  ['مشمول مع كل الباقات', ['6 موظفين لكل فرع بحسابات وصلاحيات', 'حتى 15 مورد لكل فرع', 'التقرير الصباحي على الواتساب', 'المساعد الذكي',
    'تقارير الربحية الشهرية', 'مقارنة الفروع', 'بوابة المحاسب', 'مدير لكل فرع', 'تطبيق الموظفين بسبع لغات', 'إشعارات فورية بكل حركة',
    'تصدير التقارير PDF وExcel', 'تنبيه حد التسجيل في الضريبة'], [true, true, true]],
]
const INCLUDED: [LucideIcon, string][] = [
  [Sun, 'التقرير الصباحي على الواتساب'], [MessageCircle, 'المساعد الذكي'], [TrendingUp, 'تقارير الربحية'], [GitCompare, 'مقارنة الفروع'],
  [Calculator, 'بوابة المحاسب'], [UserCog, 'مدير لكل فرع وصلاحيات'], [Languages, 'تطبيق الموظفين بسبع لغات'], [Truck, 'حتى 15 مورد لكل فرع'],
  [Bell, 'إشعارات فورية'], [FileDown, 'تصدير PDF وExcel'], [Percent, 'تنبيه حد الضريبة'], [Store, 'تعدد الفروع'],
]
// القائمة في البطاقة: كل مميزات الباقة (اللي قبلها + الجديدة عليها علامة)
const cumulative = (i: number) => PLANS.slice(0, i + 1).flatMap((p, j) => p.features.map(f => ({ f, isNew: j === i && i > 0 })))

export default function StandardPricing({ billing, onBilling }: { billing: Billing; onBilling: (b: Billing) => void }) {
  const router = useRouter()
  const [branches, setBranches] = useState(1)
  // «ابنِ باقتك»: المزايا المختارة (الموظفين 6 لكل فرع مشمولين)
  const [mods, setMods] = useState<string[]>(['cashier_closing'])
  const [focus, setFocus] = useState<PlanKey | null>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)   // مجموعة المقارنة المفتوحة
  const staff = PLAN_CAPS.custom.staff * branches   // 6 لكل فرع — بدون عداد
  const picked = CUSTOM_MODULE_ORDER.filter(s => mods.includes(s))
  const buildTotal = customMonthly(Object.fromEntries(picked.map(s => [s, CUSTOM_MODULES[s].perBranch ? branches : 1])), branches, staff)
  // باقة جاهزة أرخص فعلاً لنفس الاختيار؟ (بنفس السعر ما نقترحها — نفس المزايا)
  const better = picked.length ? NEW_PLANS
    .map(k => ({ k, total: planPriceFor(k, null, branches).monthly + signupAddonsMonthly(k, picked as unknown as string[], branches) }))
    // التعادل: الباقة الأعلى (فيها مزايا أكثر)
    .filter(x => x.total < buildTotal).sort((a, b) => a.total - b.total || NEW_PLANS.indexOf(b.k) - NEW_PLANS.indexOf(a.k))[0] : undefined
  const goPlan = (k: PlanKey) => {
    setFocus(k)
    document.getElementById(`plan-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => setFocus(null), 2600)
  }
  const branchWord = branches === 2 ? 'فرعين' : `${branches} فروع`
  const yearly = billing === 'yearly'
  const shown = (m: number) => (yearly ? Math.round(m * YEARLY_FACTOR) : m)
  const cell = (c: Cell) => (c === true ? <Check size={17} strokeWidth={2.25} className="st-yes" /> : c === false ? <Minus size={16} className="st-no" /> : c === 'addon' ? <span className="st-addon">إضافة</span> : <b>{c}</b>)

  return (
    <div className="st">
      <div className="st-top">
        <div className="st-toggle" role="group" aria-label="طريقة الدفع">
          <button type="button" className={!yearly ? 'on' : ''} onClick={() => onBilling('monthly')}>شهري</button>
          <button type="button" className={yearly ? 'on' : ''} onClick={() => onBilling('yearly')}>سنوي <em>وفّر 20%</em></button>
        </div>
        <div className="st-br">
          <span>عدد الفروع</span>
          <button type="button" onClick={() => setBranches(b => Math.max(1, b - 1))} disabled={branches <= 1} aria-label="نقص"><Minus size={15} /></button>
          <b>{branches}</b>
          <button type="button" onClick={() => setBranches(b => Math.min(10, b + 1))} disabled={branches >= 10} aria-label="زيادة"><Plus size={15} /></button>
        </div>
      </div>

      <div className="st-cards">
        {PLANS.map(p => (
          <div key={p.key} id={`plan-${p.key}`} className={`st-card${p.popular ? ' pop' : ''}${focus === p.key ? ' focus' : ''}`}>
            {p.popular && <div className="st-badge">الأكثر اختياراً</div>}
            {(() => {
              // خصم الباقة: نفس مزاياها لو اختارها العميل بنفسه بـ «ابنِ باقتك»
              const total = p.price + p.extra * (branches - 1), alone = alaCarteMonthly(p.key as NewPlanKey, branches)
              const pct = alone > total ? Math.round((1 - total / alone) * 100) : 0
              return (<>
                {pct > 0 && <div className="st-save">وفّر {pct}% عن اختيار المزايا بنفسك</div>}
                <h3>{p.name}</h3>
                <p className="st-desc">{p.desc}</p>
                <div className="st-price">
                  {yearly ? <s className="st-was">{p.price}</s> : pct > 0 && branches === 1 && <s className="st-was">{alone}</s>}
                  <strong>{shown(p.price)}</strong><span>⃁ / شهرياً<br />لكل فرع</span>
                </div>
                {yearly && <p className="st-yearly">تدفع <b>{yearlyOf(total).toLocaleString('en-US')} ⃁</b> مرة وحدة بالسنة، وتوفّر {(total * 12 - yearlyOf(total)).toLocaleString('en-US')} ⃁</p>}
                <p className="st-sub">الفرع الإضافي {shown(p.extra)} ⃁ · يشمل {PLAN_CAPS[p.key].staff} موظفين لكل فرع</p>
                {branches > 1 && <p className="st-total">المجموع لـ {branchWord}: {(yearly || pct > 0) && <><s className="st-was sm">{yearly ? total : alone}</s>{' '}</>}<b>{shown(total)} ⃁</b> شهرياً</p>}
              </>)
            })()}
            <button type="button" className={`st-cta${p.popular ? ' dark' : ''}`} onClick={() => router.push(`/login?mode=register&plan=${p.key}&branches=${branches}&billing=${billing}`)}>ابدأ تجربتك المجانية</button>
            <div className="st-list">
              <ul>{cumulative(PLANS.indexOf(p)).map(({ f, isNew }) => <li key={f} className={isNew ? 'new' : ''}><Check size={16} />{f}{isNew && <em>جديد</em>}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
      <p className="st-trial">جرّب أي باقة مجاناً 14 يوم بكل المميزات</p>

      <a className="st-build-link" href="#build">تحتاج ميزة وحدة بس، مثل إقفال الكاشير لحاله؟ ابنِ باقتك بنفسك</a>

      <section className="st-sec st-build" id="build">
        <h3 className="st-h">ابنِ باقتك بنفسك</h3>
        <p className="st-hsub">اختر المزايا اللي تحتاجها بس. كل ميزة بنفس سعرها في الباقات الجاهزة، فنفس المزايا بنفس السعر دايماً. السعر حسب عدد الفروع اللي فوق، وتحدد من داخل النظام أي فرع ياخذ كل ميزة.</p>
        <div className="st-mods">
          {CUSTOM_MODULE_ORDER.map(slug => {
            const m = CUSTOM_MODULES[slug], on = mods.includes(slug)
            return (
              <button key={slug} type="button" className={`st-mod${on ? ' on' : ''}`} onClick={() => setMods(v => on ? v.filter(x => x !== slug) : [...v, slug])} aria-pressed={on}>
                <span className="st-mod-check">{on && <Check size={15} strokeWidth={3} />}</span>
                <b>{MOD_NAME[slug]}</b>
                <small>{m.perBranch ? `${shown(m.first)} ⃁ للفرع الأول، و${shown(m.extra)} ⃁ لكل فرع إضافي` : `${shown(m.first)} ⃁ شهرياً للمنشأة كلها`}</small>
              </button>
            )
          })}
        </div>
        <p className="st-build-staff">يشمل {PLAN_CAPS.custom.staff * branches} موظفين ({PLAN_CAPS.custom.staff} لكل فرع)، وتقدر تزيد من داخل النظام</p>
        {better && (
          <button type="button" className="st-better" onClick={() => goPlan(better.k)}>
            باقة «{PLAN_PRICING[better.k].label}» تعطيك نفس اختيارك بـ {shown(better.total)} ⃁ (توفّر {shown(buildTotal - better.total)} ⃁) — اعرضها
          </button>
        )}
        <div className="st-build-total">
          <div><span>المجموع الشهري{branches > 1 ? ` لـ ${branchWord}` : ''}</span><strong>{picked.length ? `${shown(buildTotal)} ⃁` : '—'}</strong>{yearly && picked.length > 0 && <small>تُدفع سنوياً</small>}</div>
          <button type="button" className="st-cta dark" disabled={!picked.length}
            onClick={() => router.push(`/login?mode=register&plan=custom&modules=${picked.join(',')}&branches=${branches}&billing=${billing}`)}>
            ابدأ تجربتك المجانية
          </button>
        </div>
      </section>

      <section className="st-sec">
        <h3 className="st-h">مشمول مع كل الباقات</h3>
        <div className="st-inc">{INCLUDED.map(([Icon, l]) => <span key={l}><Icon size={17} />{l}</span>)}</div>
      </section>

      <section className="st-sec">
        <h3 className="st-h">الإضافات</h3>
        <p className="st-hsub">اختر الإضافات مع باقتك وقت التسجيل أو بعدين، وحدد من داخل النظام أي فرع ياخذ كل إضافة</p>
        <div className="st-addons">
          {ADDONS.map(a => (
            <div key={a.name} className="st-addon-card">
              <span className="st-addon-ic"><a.icon size={20} /></span>
              <b>{a.name}</b>
              <div className="st-addon-price"><strong>{shown(a.price)}</strong> {a.unit}</div>
              <small>{a.note}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="st-sec">
        <h3 className="st-h">قارن الباقات</h3>
        {/* مقارنة مختصرة: سطر لكل مجموعة، والتفاصيل تنفتح عند الضغط */}
        <div className="st-cmp">
          <div className="st-cmp-row st-cmp-head">
            <span/>
            {PLANS.map(p => <span key={p.key} className={p.popular ? 'pop' : ''}>{p.name}<small>{shown(p.price)} ⃁</small></span>)}
          </div>
          {ALL.map(([group, items, st]) => {
            const open = openGroup === group
            return (
              <div key={group} className={`st-cmp-grp${open ? ' open' : ''}`}>
                <button type="button" className="st-cmp-row" aria-expanded={open} onClick={() => setOpenGroup(open ? null : group)}>
                  <span className="st-cmp-name"><ChevronDown size={16} className="st-cmp-chev" />{group}<em>{items.length} مزايا</em></span>
                  {st.map((c, i) => <span key={i} className={PLANS[i].popular ? 'pop' : ''}>{cell(c)}</span>)}
                </button>
                {open && <ul className="st-cmp-list">{items.map(f => <li key={f}>{f}</li>)}</ul>}
              </div>
            )
          })}
        </div>
      </section>


      <div className="st-ent">
        <span className="st-ent-ic"><Store size={22} /></span>
        <div><b>المؤسسات</b><span>أكثر من 10 فروع؟ سعر خاص، ومدير حساب مخصص، وتجهيز كامل.</span></div>
        <a href="/#demo">تواصل معنا <ArrowLeft size={16} /></a>
      </div>

      <style>{`
.st{display:flex;flex-direction:column;gap:22px;max-width:1140px;margin:0 auto;color:var(--ink)}
.st-toggle{align-self:center;display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px}
.st-toggle button{border:0;background:none;border-radius:999px;padding:10px 22px;font:700 15px 'IBM Plex Sans Arabic',sans-serif;color:var(--ink2);cursor:pointer}
.st-toggle button.on{background:var(--ink);color:#fff}
.st-toggle em{font-style:normal;font-size:12px;color:var(--teal2);margin-inline-start:6px}
.st-toggle button.on em{color:var(--mint)}
.st-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:stretch;margin-top:6px}
@media(max-width:900px){.st-cards{grid-template-columns:1fr}}
.st-card{position:relative;background:#fff;border:1px solid var(--line);border-radius:24px;padding:30px 26px;display:flex;flex-direction:column}
.st-card.pop{border:2px solid var(--teal2);box-shadow:0 24px 50px -28px rgba(15,118,110,.55)}
.st-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--teal2);color:#fff;font-size:13px;font-weight:800;padding:5px 14px;border-radius:999px;white-space:nowrap}
.st-card h3{margin:0;font-size:22px;font-weight:800}
.st-desc{margin:6px 0 0;font-size:14px;color:var(--ink2);min-height:42px;line-height:1.5}
.st-price{display:flex;align-items:center;gap:10px;margin-top:18px}
.st-price strong{font-size:52px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums}
.st-price span{font-size:13px;color:var(--ink2);line-height:1.4}
.st-sub{margin:10px 0 0;font-size:12.5px;color:var(--ink2);min-height:20px}
.st-cta{margin-top:20px;border:1.5px solid var(--ink);background:#fff;color:var(--ink);border-radius:14px;padding:14px;font:800 15px 'IBM Plex Sans Arabic',sans-serif;cursor:pointer}
.st-cta.dark{background:var(--ink);color:#fff}
.st-list{margin-top:22px;padding-top:20px;border-top:1px solid var(--line)}
.st-intro{font-size:13.5px;font-weight:800;margin-bottom:10px}
.st-list ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
.st-list li{display:flex;gap:9px;align-items:flex-start;font-size:14.5px;line-height:1.5}
.st-list li svg{color:var(--teal2);flex-shrink:0;margin-top:3px}
.st-list li.new{font-weight:700}
.st-list li em{font-style:normal;font-size:11px;font-weight:800;color:var(--teal);background:#f0faf8;border:1px solid #b2e3df;border-radius:999px;padding:1px 8px;margin-inline-start:6px}
.st-inc{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
@media(max-width:900px){.st-inc{grid-template-columns:repeat(2,minmax(0,1fr))}}
.st-inc span{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:14px;font-weight:600}
.st-inc svg{color:var(--teal2);flex-shrink:0}
.st-save{position:absolute;top:-14px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:13px;font-weight:800;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:4px 14px}
.st-top{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap}
.st-br{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 6px 4px 16px;font-weight:700;font-size:14.5px}
.st-br span{padding-inline-start:10px}
.st-br button{width:34px;height:34px;border-radius:999px;border:0;background:#f1f5f4;display:grid;place-items:center;cursor:pointer;color:var(--ink)}
.st-br button:disabled{opacity:.35;cursor:default}
.st-br b{min-width:24px;text-align:center;font-size:17px}
.st-total{margin:8px 0 0;font-size:14px;background:#f0faf8;border-radius:10px;padding:8px 12px;color:var(--ink)}
.st-total b{color:var(--teal)}
.st-trial{text-align:center;margin:-6px 0 0;font-size:14px;color:var(--ink2)}
.st-sec{display:flex;flex-direction:column;gap:6px;margin-top:22px}
.st-h{margin:0;text-align:center;font-size:24px;font-weight:800}
.st-hsub{margin:0 0 12px;text-align:center;font-size:14.5px;color:var(--ink2)}
.st-addons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
@media(max-width:900px){.st-addons{grid-template-columns:repeat(2,minmax(0,1fr))}}
.st-addon-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:6px}
.st-addon-ic{width:42px;height:42px;border-radius:12px;background:#f0faf8;color:var(--teal2);display:grid;place-items:center;margin-bottom:4px}
.st-addon-card b{font-size:15.5px}
.st-addon-price{font-size:13px;color:var(--ink2)}
.st-addon-price strong{font-size:22px;color:var(--ink);font-variant-numeric:tabular-nums}
.st-addon-card small{font-size:12.5px;color:var(--ink2)}
.st-cmp{max-width:820px;width:100%;margin:8px auto 0;background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}
.st-cmp-row{display:grid;grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(0,1fr));align-items:center;width:100%;min-height:54px;padding:0 18px;border:0;background:none;font:inherit;color:inherit;text-align:center}
button.st-cmp-row{cursor:pointer;transition:background-color .15s}
@media(hover:hover){button.st-cmp-row:hover{background:#fafafa}}
.st-cmp-row>span:not(.st-cmp-name){display:flex;flex-direction:column;align-items:center;justify-content:center;align-self:stretch}
.st-cmp-row>span.pop{background:#f3faf8}
.st-cmp-head{min-height:60px;border-bottom:1px solid var(--line);font-size:15px;font-weight:600}
.st-cmp-head small{display:block;font-size:12px;font-weight:400;color:var(--ink2);margin-top:1px}
.st-cmp-grp+.st-cmp-grp{border-top:1px solid var(--line)}
.st-cmp-name{display:flex;align-items:center;gap:8px;text-align:right;font-size:15px;font-weight:500}
.st-cmp-name em{font-style:normal;font-size:12px;font-weight:400;color:var(--ink2)}
.st-cmp-chev{color:var(--ink2);flex-shrink:0;transition:transform .2s cubic-bezier(.22,1,.36,1)}
.st-cmp-grp.open .st-cmp-chev{transform:rotate(180deg)}
.st-cmp-list{list-style:none;margin:0;padding:4px 18px 16px 18px;padding-inline-start:42px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 20px;font-size:13.5px;color:var(--ink2)}
.st-cmp-list li{position:relative;padding-inline-start:12px;line-height:1.6}
.st-cmp-list li::before{content:"";position:absolute;inset-inline-start:0;top:.7em;width:4px;height:4px;border-radius:2px;background:#c4ccca}
@media(max-width:640px){.st-cmp-row{grid-template-columns:minmax(0,1.3fr) repeat(3,minmax(0,1fr));padding:0 10px}.st-cmp-name{font-size:14px;gap:6px}.st-cmp-name em{display:none}.st-cmp-head{font-size:13px}.st-cmp-list{grid-template-columns:1fr;padding-inline-start:30px}}
.st-was{color:#98a2b3;font-size:20px;font-weight:600;margin-inline-end:8px;text-decoration-thickness:1.5px;align-self:center}
.st-build-staff{margin:10px 2px 0;font-size:13.5px;color:var(--ink2)}
.st-yearly{margin:6px 0 0;font-size:13.5px;color:var(--ink2)}
.st-yearly b{color:var(--ink)}
.st-was.sm{font-size:14px;font-weight:500;margin-inline-end:6px}
.st-yes{color:var(--teal2)}
.st-no{color:#c4ccca}
.st-addon{font-size:12px;font-weight:500;color:var(--ink2);background:#f4f5f6;border-radius:6px;padding:2px 8px}
.st-card.focus{box-shadow:0 0 0 5px rgba(20,184,166,.35),0 24px 50px -28px rgba(15,118,110,.55);transition:box-shadow .3s}
.st-build-link{align-self:center;text-align:center;color:var(--teal2);font-weight:700;font-size:15px;text-decoration:underline;text-underline-offset:4px}
.st-build{background:#fff;border:1px solid var(--line);border-radius:22px;padding:24px;scroll-margin-top:90px}
.st-mods{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:14px}
.st-mod{position:relative;display:flex;flex-direction:column;gap:4px;text-align:right;border:1.5px solid var(--line);background:#fff;border-radius:14px;padding:14px 14px 14px 42px;cursor:pointer;font-family:inherit;color:var(--ink)}
.st-mod.on{border-color:var(--teal2);background:#f0faf8}
.st-mod b{font-size:15px}.st-mod small{font-size:13px;color:var(--ink2);line-height:1.6}
.st-mod-check{position:absolute;left:14px;top:14px;width:20px;height:20px;border-radius:6px;border:1.5px solid #9ca3af;display:grid;place-items:center;color:#fff}
.st-mod.on .st-mod-check{background:var(--teal2);border-color:var(--teal2)}
.st-build-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;font-weight:700}
.st-build-row small{font-weight:600;color:var(--ink2)}
.st-br-in{padding:4px}
.st-better{margin-top:14px;width:100%;text-align:right;border:1.5px solid var(--teal2);background:#f0faf8;color:var(--teal2);border-radius:12px;padding:12px 14px;font:800 14px 'IBM Plex Sans Arabic',sans-serif;cursor:pointer;line-height:1.7}
.st-build-total{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:16px;border-top:1px solid var(--line);padding-top:16px}
.st-build-total div{display:flex;flex-direction:column}
.st-build-total span{font-size:14px;color:var(--ink2);font-weight:700}
.st-build-total strong{font-size:30px}
.st-build-total small{font-size:12px;color:var(--ink2)}
.st-build-total .st-cta{width:auto;padding-inline:28px}
.st-build-total .st-cta:disabled{opacity:.5;cursor:default}
.st-ent{display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:#0b2f2b;color:#fff;border-radius:22px;padding:22px 24px}
.st-ent-ic{width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.1);display:grid;place-items:center}
.st-ent div{flex:1;min-width:220px;display:flex;flex-direction:column;gap:3px}
.st-ent b{font-size:18px}
.st-ent div span{font-size:14px;opacity:.8}
.st-ent a{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#0b2f2b;font-weight:800;text-decoration:none;border-radius:12px;padding:12px 18px}
`}</style>
    </div>
  )
}
