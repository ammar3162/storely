'use client'
// صفحة الأسعار (الباقات الجديدة 2026-11) على النمط المعتاد للشركات:
// شهري/سنوي + عدد الفروع ← 3 باقات «كل اللي في السابقة، بالإضافة إلى» ← المشمول ← الإضافات ← جدول المقارنة ← المؤسسات.
// الأسعار من مصدر واحد (lib/planPricing) — نفس أرقام التسجيل والفاتورة.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Minus, Plus, Wallet, UserCheck, Sparkles, Users, Store, ArrowLeft, Sun, MessageCircle, TrendingUp, GitCompare, Calculator, UserCog, Languages, Truck, Bell, FileDown, Percent, type LucideIcon } from 'lucide-react'
import type { Billing } from './landing-data'
import { NEW_ADDON_PRICES, PLAN_CAPS, PLAN_PRICING, YEARLY_FACTOR, type NewPlanKey } from '@/lib/planPricing'

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
  { icon: Wallet, name: 'إقفال الكاشير', price: NEW_ADDON_PRICES.cashier_closing.monthly, unit: '⃁ / فرع', note: 'للأساسية' },
  { icon: UserCheck, name: 'الحضور والرواتب', price: NEW_ADDON_PRICES.hr_full.monthly, unit: '⃁ / فرع', note: 'للأساسية والتشغيل' },
  { icon: Sparkles, name: 'أدوات الذكاء الاصطناعي', price: NEW_ADDON_PRICES.ai_tools.monthly, unit: '⃁ / شهرياً', note: 'للأساسية والتشغيل' },
  { icon: Users, name: 'موظف إضافي', price: NEW_ADDON_PRICES.extra_staff.monthly, unit: '⃁ / شهرياً', note: `فوق ${PLAN_CAPS.essential.staff} موظفين لكل فرع` },
]
// الكاملة أوفر من الأساسية + كل الإضافات (لفرع واحد)
const FULL_SAVES = price('essential') + NEW_ADDON_PRICES.cashier_closing.monthly + NEW_ADDON_PRICES.hr_full.monthly + NEW_ADDON_PRICES.ai_tools.monthly - price('full')
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
const COMPARE: { group: string; rows: [string, Cell, Cell, Cell][] }[] = ALL.map(([group, items, st]) => ({ group, rows: items.map(i => [i, ...st] as [string, Cell, Cell, Cell]) }))
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
  const branchWord = branches === 2 ? 'فرعين' : `${branches} فروع`
  const yearly = billing === 'yearly'
  const shown = (m: number) => (yearly ? Math.round(m * YEARLY_FACTOR) : m)
  const cell = (c: Cell) => (c === true ? <Check size={18} className="st-yes" /> : c === false ? <Minus size={16} className="st-no" /> : c === 'addon' ? <span className="st-addon">إضافة</span> : <b>{c}</b>)

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
          <div key={p.key} id={`plan-${p.key}`} className={`st-card${p.popular ? ' pop' : ''}`}>
            {p.popular && <div className="st-badge">الأكثر اختياراً</div>}
            {p.key === 'full' && <div className="st-save">وفّر {shown(FULL_SAVES)} ⃁ مقارنة بالإضافات</div>}
            <h3>{p.name}</h3>
            <p className="st-desc">{p.desc}</p>
            <div className="st-price"><strong>{shown(p.price)}</strong><span>⃁ / شهرياً<br />لكل فرع</span></div>
            <p className="st-sub">{yearly ? `تُدفع سنوياً · ` : ''}الفرع الإضافي {shown(p.extra)} ⃁ · يشمل {PLAN_CAPS[p.key].staff} موظفين لكل فرع</p>
            {branches > 1 && <p className="st-total">المجموع لـ {branchWord}: <b>{shown(p.price + p.extra * (branches - 1))} ⃁</b> شهرياً</p>}
            <button type="button" className={`st-cta${p.popular ? ' dark' : ''}`} onClick={() => router.push(`/login?mode=register&plan=${p.key}&branches=${branches}&billing=${billing}`)}>ابدأ تجربتك المجانية</button>
            <div className="st-list">
              <ul>{cumulative(PLANS.indexOf(p)).map(({ f, isNew }) => <li key={f} className={isNew ? 'new' : ''}><Check size={16} />{f}{isNew && <em>جديد</em>}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
      <p className="st-trial">جرّب أي باقة مجاناً 14 يوم بكل المميزات</p>

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
        <div className="st-table-wrap">
          <table className="st-table">
            <thead><tr><th></th>{PLANS.map(p => <th key={p.key} className={p.popular ? 'pop' : ''}>{p.name}<small>{shown(p.price)} ⃁ / فرع</small></th>)}</tr></thead>
            {COMPARE.map(g => (
              <tbody key={g.group}>
                <tr className="grp"><td colSpan={4}>{g.group}</td></tr>
                {g.rows.map(([label, ...cells]) => <tr key={label}><td>{label}</td>{cells.map((c, i) => <td key={i} className={PLANS[i].popular ? 'pop' : ''}>{cell(c)}</td>)}</tr>)}
              </tbody>
            ))}
          </table>
        </div>
      </section>


      <div className="st-ent">
        <span className="st-ent-ic"><Store size={22} /></span>
        <div><b>المؤسسات</b><span>أكثر من 10 فروع؟ سعر خاص، ومدير حساب مخصص، وتجهيز كامل.</span></div>
        <a href="#demo">تواصل معنا <ArrowLeft size={16} /></a>
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
.st-table-wrap{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:20px;margin-top:8px}
.st-table{width:100%;border-collapse:collapse;min-width:620px;font-size:14px}
.st-table th{padding:16px 10px;font-size:16px;font-weight:800;text-align:center;border-bottom:1px solid var(--line)}
.st-table th small{display:block;font-size:12.5px;font-weight:600;color:var(--ink2);margin-top:2px}
.st-table th:first-child,.st-table td:first-child{text-align:right;padding-inline-start:18px;width:44%}
.st-table td{padding:12px 10px;text-align:center;border-bottom:1px solid var(--line)}
.st-table .pop{background:#f0faf8}
.st-table tr.grp td{background:#f6f7f6;font-weight:800;font-size:13px;color:var(--ink2);text-align:right;padding:9px 18px}
.st-yes{color:var(--teal2)}
.st-no{color:#c4ccca}
.st-addon{font-size:12px;font-weight:700;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:2px 10px}
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
