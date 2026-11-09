'use client'
// صفحة الأسعار (2026-11-08، قرار المالك): ما فيه باقات ثابتة — العميل يختار المزايا اللي يحتاجها،
// و3 اختيارات جاهزة تعلّم المزايا عنه بضغطة. كل ميزة بسعرها لكل فرع (الذكاء للمنشأة مرة وحدة).
// الأسعار من مصدر واحد (lib/planPricing) — نفس أرقام التسجيل والفاتورة.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Minus, Plus, Store, ArrowLeft, Sun, MessageCircle, TrendingUp, GitCompare, Calculator, UserCog, Languages, Truck, Bell, FileDown, Percent, Package, Receipt, Wallet, UserCheck, Sparkles, type LucideIcon } from 'lucide-react'
import type { Billing } from './landing-data'
import { CUSTOM_MODULES, CUSTOM_MODULE_ORDER, BRANCH_DISCOUNT, BRANCH_DISCOUNT_FROM, branchDiscountSaving, NEW_ADDON_PRICES, PLAN_CAPS, YEARLY_FACTOR, customMonthly, yearlyOf } from '@/lib/planPricing'
import { FEATURE_PRESETS } from '@/lib/featurePresets'

const FEATURES: Record<string, { name: string; icon: LucideIcon; desc: string; items: string[] }> = {
  mod_inventory: { name: 'المخزون والموردين', icon: Package, desc: 'الصرف والهدر والجرد وتنبيه النقص',
    items: ['الصرف من جوال الموظف', 'الهدر بأسبابه', 'الجرد بالباركود', 'الوصفات وتحويل الوحدات', 'تنبيه النقص الفوري', 'طلب التوريد على الواتساب', 'نقل المخزون بين الفروع'] },
  mod_purchases: { name: 'المشتريات والفواتير', icon: Receipt, desc: 'تصوير الفاتورة وقراءتها ومستحقات الموردين',
    items: ['قراءة الفاتورة من صورتها', 'مطابقة الأصناف مع المخزون', 'مستحقات الموردين', 'مقارنة أسعار الموردين', 'الفواتير الضريبية ورمز QR', 'إقرار ضريبة القيمة المضافة'] },
  cashier_closing: { name: 'إقفال الكاشير', icon: Wallet, desc: 'إقفال يومي من الجوال والعجز باسم الكاشير',
    items: ['إقفال يومي من جوال الكاشير', 'صور إيصالات الشبكة والمبيعات', 'العجز والزيادة لكل كاشير', 'تطبيقات التوصيل', 'قرار الخصم من الراتب', 'سجل لكل تعديل'] },
  hr_full: { name: 'الحضور والرواتب', icon: UserCheck, desc: 'الحضور بالموقع والورديات ومسير الرواتب',
    items: ['الحضور والانصراف بالموقع', 'الورديات وجدول كل يوم', 'الإجازات والاستئذان', 'التأخير والخصم التلقائي', 'الساعات الإضافية', 'السلف ومسير الرواتب'] },
  ai_tools: { name: 'أدوات الذكاء الاصطناعي', icon: Sparkles, desc: 'اقتراح الشراء وكشف الهدر وتوقع النفاد',
    items: ['اقتراح كميات الشراء', 'توقع نفاد الأصناف', 'كشف الهدر غير الطبيعي', 'المخزون الراكد', 'أوقات الذروة', 'تقرير أسبوعي على الواتساب'] },
}
const PRESETS = FEATURE_PRESETS.map(p => ({ key: p.key, name: p.ar, desc: p.descAr, mods: p.mods, popular: p.popular }))
const INCLUDED: [LucideIcon, string][] = [
  [Sun, 'التقرير الصباحي على الواتساب'], [MessageCircle, 'المساعد الذكي'], [TrendingUp, 'تقارير الربحية'], [GitCompare, 'مقارنة الفروع'],
  [Calculator, 'بوابة المحاسب'], [UserCog, 'مدير لكل فرع وصلاحيات'], [Languages, 'تطبيق الموظفين بسبع لغات'], [Truck, `حتى ${PLAN_CAPS.custom.suppliers} مورد لكل فرع`],
  [Bell, 'إشعارات فورية'], [FileDown, 'تصدير PDF وExcel'], [Percent, 'تنبيه حد الضريبة'], [Store, 'تعدد الفروع'],
]

export default function FeaturePricing({ billing, onBilling }: { billing: Billing; onBilling: (b: Billing) => void }) {
  const router = useRouter()
  const [branches, setBranches] = useState(1)
  const [mods, setMods] = useState<string[]>(PRESETS[1].mods)
  const yearly = billing === 'yearly'
  const total = (list: string[]) => customMonthly(Object.fromEntries(list.map(s => [s, CUSTOM_MODULES[s].perBranch ? branches : 1])), branches, PLAN_CAPS.custom.staff * branches)
  const shown = (m: number) => (yearly ? Math.round(m * YEARLY_FACTOR) : m)
  const picked: string[] = CUSTOM_MODULE_ORDER.filter(s => mods.includes(s))
  const monthly = picked.length ? total(picked) : 0
  const same = (a: string[]) => a.length === picked.length && a.every(s => picked.includes(s))
  const branchWord = branches === 1 ? 'فرع واحد' : branches === 2 ? 'فرعين' : `${branches} فروع`
  const toggle = (s: string) => setMods(v => v.includes(s) ? v.filter(x => x !== s) : [...v, s])

  return (
    <div className="fp">
      <div className="fp-top">
        <div className="fp-toggle" role="group" aria-label="طريقة الدفع">
          <button type="button" className={!yearly ? 'on' : ''} onClick={() => onBilling('monthly')}>شهري</button>
          <button type="button" className={yearly ? 'on' : ''} onClick={() => onBilling('yearly')}>سنوي <em>وفّر 20%</em></button>
        </div>
        <div className="fp-br">
          <span>عدد الفروع</span>
          <button type="button" onClick={() => setBranches(b => Math.max(1, b - 1))} disabled={branches <= 1} aria-label="نقص"><Minus size={15} /></button>
          <b>{branches}</b>
          <button type="button" onClick={() => setBranches(b => Math.min(10, b + 1))} disabled={branches >= 10} aria-label="زيادة"><Plus size={15} /></button>
        </div>
      </div>
      <div className="fp-disc">من الفرع {BRANCH_DISCOUNT_FROM === 3 ? 'الثالث' : BRANCH_DISCOUNT_FROM}، كل فرع بخصم {Math.round(BRANCH_DISCOUNT * 100)}%</div>

      {/* اختيارات جاهزة */}
      <div className="fp-label">ابدأ باختيار جاهز، ويظهر السعر أدناه حسب اختيارك</div>
      <div className="fp-presets">
        {PRESETS.map(p => (
          <button key={p.key} type="button" className={`fp-preset${same(p.mods) ? ' on' : ''}`} onClick={() => setMods(p.mods)} aria-pressed={same(p.mods)}>
            {p.popular && <span className="fp-pop">الأكثر اختياراً</span>}
            <b>{p.name}</b>
            <small>{p.desc}</small>
          </button>
        ))}
      </div>

      {/* المزايا */}
      <div className="fp-label">أو اختر المزايا بنفسك</div>
      <div className="fp-grid">
        {CUSTOM_MODULE_ORDER.map(slug => {
          const f = FEATURES[slug], m = CUSTOM_MODULES[slug], on = mods.includes(slug)
          return (
            <button key={slug} type="button" className={`fp-feat${on ? ' on' : ''}`} onClick={() => toggle(slug)} aria-pressed={on}>
              <span className="fp-check">{on && <Check size={14} strokeWidth={3} />}</span>
              <span className="fp-ic"><f.icon size={18} strokeWidth={1.75} /></span>
              <b>{f.name}</b>
              <span className="fp-price">{shown(m.first)} ⃁ <i>{m.perBranch ? 'لكل فرع' : 'للمنشأة كلها'}</i></span>
              <small>{f.desc}</small>
              <ul>{f.items.map(x => <li key={x}>{x}</li>)}</ul>
            </button>
          )
        })}
      </div>

      {/* المجموع */}
      <div className="fp-total">
        <div className="fp-total-in">
          <span>المجموع{branches > 1 ? ` لـ ${branchWord}` : ''}</span>
          <strong>{picked.length ? `${shown(monthly).toLocaleString('en-US')} ⃁` : '—'}<i>{picked.length ? ' / شهرياً' : ''}</i></strong>
          {picked.length > 0 && branchDiscountSaving(picked, branches) > 0 && <em className="fp-save">وفّرت {shown(branchDiscountSaving(picked, branches)).toLocaleString('en-US')} ⃁ بخصم الفروع</em>}
          <small>{!picked.length ? 'اختر ميزة واحدة على الأقل'
            : yearly ? `تدفع ${yearlyOf(monthly).toLocaleString('en-US')} ⃁ مرة واحدة في السنة` : `يشمل ${PLAN_CAPS.custom.staff * branches} موظفين (${PLAN_CAPS.custom.staff} لكل فرع)، والموظف الإضافي ${NEW_ADDON_PRICES.extra_staff.monthly} ⃁ شهرياً`}</small>
        </div>
        <button type="button" className="fp-cta" disabled={!picked.length}
          onClick={() => router.push(`/login?mode=register&plan=custom&modules=${picked.join(',')}&branches=${branches}&billing=${billing}`)}>
          ابدأ تجربتك المجانية <ArrowLeft size={18} />
        </button>
      </div>
      <p className="fp-note">جرّب جميع المزايا مجاناً لمدة 14 يوماً. تدفع مجموع المزايا التي تختارها فقط، ومن الفرع الثالث يحصل كل فرع على خصم 20%، ويمكنك إضافة أي ميزة أو إزالتها من داخل النظام في أي وقت.</p>

      <section className="fp-sec">
        <h3>مشمول مع أي اختيار</h3>
        <div className="fp-inc">{INCLUDED.map(([Icon, l]) => <span key={l}><Icon size={17} strokeWidth={1.75} />{l}</span>)}</div>
      </section>

      <div className="fp-ent">
        <span className="fp-ent-ic"><Store size={22} /></span>
        <div><b>المؤسسات</b><span>أكثر من 10 فروع؟ سعر خاص، ومدير حساب مخصص، وتجهيز كامل.</span></div>
        <Link href="/#demo">تواصل معنا <ArrowLeft size={16} /></Link>
      </div>

      <style>{`
.fp{display:flex;flex-direction:column;gap:14px;max-width:1080px;margin:0 auto;color:var(--ink)}
.fp-top{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.fp-toggle{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:10px;padding:4px}
.fp-toggle button{border:0;background:none;border-radius:8px;padding:10px 22px;font:600 15px 'IBM Plex Sans Arabic',sans-serif;color:var(--ink2);cursor:pointer}
.fp-toggle button.on{background:var(--ink);color:#fff}
.fp-toggle em{font-style:normal;font-size:12px;color:var(--teal2);margin-inline-start:6px}
.fp-toggle button.on em{color:var(--mint)}
.fp-br{display:inline-flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:4px 6px 4px 16px;font-size:15px;font-weight:600}
.fp-br button{width:36px;height:36px;border-radius:8px;border:0;background:#F3F5F6;cursor:pointer;display:grid;place-items:center;color:var(--ink)}
.fp-br button:disabled{opacity:.4;cursor:default}
.fp-br b{min-width:20px;text-align:center;font-size:17px}
.fp-disc{text-align:center;font-size:14px;font-weight:600;color:var(--teal2);margin-top:-4px}
.fp-save{font-style:normal;font-size:13px;font-weight:600;color:var(--mint)}
.fp-label{font-size:14px;font-weight:600;color:var(--ink2);margin:10px 4px 0}
.fp-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.fp-preset{position:relative;text-align:right;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:18px;cursor:pointer;font-family:inherit;color:var(--ink);display:flex;flex-direction:column;gap:4px;transition:border-color .15s,background-color .15s}
.fp-preset.on{border-color:var(--teal2);background:#F3F5F6}
.fp-preset b{font-size:17px}
.fp-preset small{font-size:13px;color:var(--ink2)}
.fp-preset-price{margin-top:8px;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
.fp-preset-price i{font-style:normal;font-size:13px;font-weight:400;color:var(--ink2)}
.fp-pop{position:absolute;top:-11px;inset-inline-start:16px;background:var(--teal2);color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px}
.fp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.fp-feat{position:relative;text-align:right;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:18px 16px;cursor:pointer;font-family:inherit;color:var(--ink);display:flex;flex-direction:column;gap:6px;transition:border-color .15s,background-color .15s}
.fp-feat.on{border-color:var(--teal2);background:#F3F5F6}
.fp-check{position:absolute;top:14px;left:14px;width:22px;height:22px;border-radius:6px;border:1.5px solid #c9cdd3;display:grid;place-items:center;color:#fff;background:#fff}
.fp-feat.on .fp-check{background:var(--teal2);border-color:var(--teal2)}
.fp-ic{width:36px;height:36px;border-radius:10px;background:#F3F5F6;color:var(--ink2);display:grid;place-items:center}
.fp-feat.on .fp-ic{background:#fff;color:var(--teal2)}
.fp-feat b{font-size:16px;margin-top:4px}
.fp-price{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.fp-price i{font-style:normal;font-size:12.5px;font-weight:400;color:var(--ink2)}
.fp-feat small{font-size:13px;color:var(--ink2);line-height:1.5}
.fp-feat ul{list-style:none;margin:6px 0 0;padding:8px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:4px}
.fp-feat li{font-size:12.5px;color:var(--ink2);position:relative;padding-inline-start:12px}
.fp-feat li::before{content:"";position:absolute;inset-inline-start:0;top:.65em;width:4px;height:4px;border-radius:2px;background:#CBD4DC}
.fp-total{position:sticky;bottom:12px;z-index:5;display:flex;align-items:center;gap:16px;justify-content:space-between;background:var(--ink);color:#fff;border-radius:14px;padding:16px 18px 16px 16px;margin-top:6px;box-shadow:0 12px 32px -12px rgba(0,0,0,.35)}
.fp-total-in{display:flex;flex-direction:column;gap:2px;min-width:0}
.fp-total-in span{font-size:13px;opacity:.8}
.fp-total-in strong{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}
.fp-total-in strong i{font-style:normal;font-size:14px;font-weight:400;opacity:.8}
.fp-total-in small{font-size:12.5px;opacity:.8}
.fp-cta{flex-shrink:0;height:52px;padding:0 22px;border:0;border-radius:10px;background:#fff;color:var(--ink);font:700 16px 'IBM Plex Sans Arabic',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.fp-cta:disabled{opacity:.5;cursor:default}
.fp-note{text-align:center;font-size:13.5px;color:var(--ink2);margin:4px 0 0}
.fp-sec{margin-top:18px}
.fp-sec h3{text-align:center;font-size:20px;font-weight:700;margin:0 0 12px}
.fp-inc{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.fp-inc span{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 14px;font-size:14px;color:var(--ink)}
.fp-inc svg{color:var(--teal2)}
.fp-ent{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-top:10px}
.fp-ent-ic{width:44px;height:44px;border-radius:12px;background:#F3F5F6;display:grid;place-items:center;color:var(--ink2);flex-shrink:0}
.fp-ent div{flex:1;display:flex;flex-direction:column}
.fp-ent b{font-size:16px}
.fp-ent div span{font-size:14px;color:var(--ink2)}
.fp-ent a{color:var(--teal2);font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
@media(max-width:560px){.fp-feat{padding:14px}.fp-feat ul{display:grid;grid-template-columns:1fr 1fr;column-gap:12px;row-gap:3px}.fp-feat li{font-size:12px}}
@media(max-width:820px){.fp-presets{grid-template-columns:1fr}.fp-total{flex-direction:column;align-items:stretch}.fp-cta{justify-content:center}.fp-ent{flex-wrap:wrap}}
`}</style>
    </div>
  )
}
