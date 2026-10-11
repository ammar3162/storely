'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'
import { isInApp } from '@/lib/inApp'
import { Billing, BRANCH_OPTIONS, BRANCH_OPTIONS_EN, PLAN_BRANCHES, PLANS } from './landing-data'
import styles from './LandingPageClient.module.css'

type Lang = 'ar' | 'en'

const copy = {
  ar: {
    navProduct: 'المنتج',
    navPricing: 'الأسعار',
    navDemo: 'عرض النظام',
    login: 'دخول',
    start: 'ابدأ التجربة',
    eyebrow: 'منصة تشغيل للأعمال التي تعتمد على المخزون',
    title: 'Storely',
    subtitle: 'إدارة المخزون والمشتريات والفروع والموظفين من مكان واحد، بواجهة هادئة وواضحة لفريقك اليومي.',
    primaryCta: 'ابدأ تجربة مجانية',
    secondaryCta: 'اطلب عرض النظام',
    previewTitle: 'مركز التشغيل اليومي',
    previewSubtitle: 'نظرة مركزة على ما يحتاجه الفريق لاتخاذ قرار سريع.',
    inventory: 'المخزون',
    purchases: 'المشتريات',
    staff: 'الفريق',
    branches: 'الفروع',
    lowStock: 'منتجات تحتاج إعادة طلب',
    supplierOrder: 'طلب مورد قيد المتابعة',
    shiftReady: 'جاهزية الوردية',
    branchSync: 'تزامن الفروع',
    review: 'مراجعة',
    today: 'اليوم',
    stable: 'مستقر',
    synced: 'محدّث',
    valueTitle: 'مصمم للعمل التشغيلي، لا للاستعراض.',
    valueText: 'Storely يجمع العمليات المتكررة في مسارات واضحة: إدخال مشتريات، متابعة كميات، صلاحيات موظفين، وتنبيهات عند الحاجة فقط.',
    pillars: [
      ['مخزون قابل للمتابعة', 'حركات مخزون واضحة بدل تعديل الكميات يدويًا.'],
      ['مشتريات وموردون', 'سجل واحد للطلبات والتكاليف وحالة الموردين.'],
      ['فروع وموظفون', 'صلاحيات منظمة ومتابعة تشغيلية حسب الفرع.'],
      ['تنبيهات عملية', 'إشعارات قليلة ومفيدة عند انخفاض المخزون أو وجود إجراء مطلوب.'],
    ],
    plansTitle: 'باقات واضحة حسب حجم التشغيل',
    monthly: 'شهري',
    yearly: 'سنوي',
    save: 'وفر',
    sar: 'ر.س',
    perMonth: 'شهريًا',
    perYear: 'سنويًا',
    included: 'مشمول',
    choosePlan: 'اختر الباقة',
    demoTitle: 'اطلب عرض Storely',
    demoText: 'اترك بياناتك وسنتواصل معك لمراجعة احتياج المنشأة وطريقة البدء.',
    firstName: 'الاسم',
    lastName: 'اسم العائلة',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    business: 'اسم المنشأة',
    branchesCount: 'عدد الفروع',
    select: 'اختر',
    agree: 'أوافق على',
    terms: 'الشروط',
    and: 'و',
    privacy: 'سياسة الخصوصية',
    sending: 'جاري الإرسال',
    submit: 'إرسال الطلب',
    success: 'تم إرسال الطلب بنجاح. سنتواصل معك قريبًا.',
    mustAgree: 'يجب الموافقة على الشروط وسياسة الخصوصية أولًا.',
    submitError: 'تعذر إرسال الطلب. حاول مرة أخرى.',
    connectionError: 'تعذر الاتصال. حاول مرة أخرى.',
    footerText: 'منصة أعمال موجهة للمخزون والتشغيل اليومي.',
    legal: 'قانوني',
    contact: 'تواصل',
    rights: 'جميع الحقوق محفوظة لدى Storely',
    whatsapp: 'واتساب',
  },
  en: {
    navProduct: 'Product',
    navPricing: 'Pricing',
    navDemo: 'Demo',
    login: 'Log in',
    start: 'Start trial',
    eyebrow: 'Operations platform for inventory-led businesses',
    title: 'Storely',
    subtitle: 'Manage inventory, purchasing, branches, and staff from one calm workspace built for daily operations.',
    primaryCta: 'Start free trial',
    secondaryCta: 'Book a demo',
    previewTitle: 'Daily operations center',
    previewSubtitle: 'A focused view for the decisions your team needs to make today.',
    inventory: 'Inventory',
    purchases: 'Purchasing',
    staff: 'Team',
    branches: 'Branches',
    lowStock: 'Products need reordering',
    supplierOrder: 'Supplier order in progress',
    shiftReady: 'Shift readiness',
    branchSync: 'Branch sync',
    review: 'Review',
    today: 'Today',
    stable: 'Stable',
    synced: 'Synced',
    valueTitle: 'Designed for operations, not presentation.',
    valueText: 'Storely organizes repeated work into clear flows: purchasing, stock movement, staff permissions, and alerts only when action is needed.',
    pillars: [
      ['Trackable inventory', 'Stock changes flow through clear movement history.'],
      ['Purchases and suppliers', 'One record for orders, costs, and supplier status.'],
      ['Branches and staff', 'Organized permissions and branch-level operations.'],
      ['Practical alerts', 'Fewer, more useful alerts when action is required.'],
    ],
    plansTitle: 'Plans that match your operating size',
    monthly: 'Monthly',
    yearly: 'Yearly',
    save: 'Save',
    sar: 'SAR',
    perMonth: '/mo',
    perYear: '/yr',
    included: 'included',
    choosePlan: 'Choose plan',
    demoTitle: 'Book a Storely demo',
    demoText: 'Share your details and we will review your operation needs and setup path.',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    email: 'Email',
    business: 'Business name',
    branchesCount: 'Branches',
    select: 'Select',
    agree: 'I agree to the',
    terms: 'Terms',
    and: 'and',
    privacy: 'Privacy Policy',
    sending: 'Sending',
    submit: 'Send request',
    success: 'Request sent successfully. We will contact you soon.',
    mustAgree: 'Please agree to the terms and privacy policy first.',
    submitError: 'Could not send the request. Please try again.',
    connectionError: 'Connection failed. Please try again.',
    footerText: 'Business software for inventory and daily operations.',
    legal: 'Legal',
    contact: 'Contact',
    rights: 'All rights reserved to Storely',
    whatsapp: 'WhatsApp',
  },
} as const

const previewRows = [
  { icon: Package, label: 'inventory', text: 'lowStock', status: 'review' },
  { icon: ShoppingCart, label: 'purchases', text: 'supplierOrder', status: 'today' },
  { icon: Users, label: 'staff', text: 'shiftReady', status: 'stable' },
  { icon: Building2, label: 'branches', text: 'branchSync', status: 'synced' },
] as const

function removeDecorativeEmoji(value: string) {
  return value.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim()
}

export default function LandingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<Billing>('monthly')
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', businessName: '', branchCount: '' })
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [partners, setPartners] = useState<Array<{ id: string; name: string; logo_url: string }>>([])
  const [marqueeMsgs, setMarqueeMsgs] = useState<string[]>([])
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'ar'
    try {
      const saved = window.localStorage.getItem('storely_lang')
      return saved === 'ar' || saved === 'en' ? saved : 'ar'
    } catch {
      return 'ar'
    }
  })

  const c = copy[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  function setLang(nextLang: Lang) {
    setLangState(nextLang)
    try {
      localStorage.setItem('storely_lang', nextLang)
    } catch {}
  }

  useEffect(() => {
    if (isInApp()) router.replace('/login')
  }, [router])

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace('/dashboard')
      })
    })
  }, [router])

  useEffect(() => {
    fetch('/api/partners')
      .then((response) => response.json())
      .then((data) => setPartners(data.partners || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/marquee-messages')
      .then((response) => response.json())
      .then((data) => {
        const messages = (data.messages || [])
          .map((message: { message: string }) => removeDecorativeEmoji(message.message))
          .filter(Boolean)
        if (messages.length > 0) setMarqueeMsgs(messages)
      })
      .catch(() => {})
  }, [])

  async function submitDemoRequest(event: React.FormEvent) {
    event.preventDefault()
    if (!agreed) {
      setSubmitMsg({ ok: false, text: c.mustAgree })
      return
    }
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (data.success) {
        setSubmitMsg({ ok: true, text: c.success })
        setForm({ firstName: '', lastName: '', phone: '', email: '', businessName: '', branchCount: '' })
        setAgreed(false)
      } else {
        setSubmitMsg({ ok: false, text: data.error || c.submitError })
      }
    } catch {
      setSubmitMsg({ ok: false, text: c.connectionError })
    }
    setSubmitting(false)
  }

  return (
    <main className={styles.page} dir={dir}>
      {marqueeMsgs.length > 0 && (
        <div className={styles.announcement}>
          <div className={styles.announcementInner}>
            {marqueeMsgs.map((message) => (
              <span key={message}>{message}</span>
            ))}
          </div>
        </div>
      )}

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Storely">
          <Image src="/storely-logo.png" alt="" className={styles.logo} width={32} height={32} priority />
          <span>Storely</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary">
          <a href="#product">{c.navProduct}</a>
          <a href="#pricing">{c.navPricing}</a>
          <a href="#demo">{c.navDemo}</a>
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.langButton} type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button className={styles.ghostButton} type="button" onClick={() => router.push('/login')}>
            {c.login}
          </button>
          <button className={styles.primaryButton} type="button" onClick={() => router.push('/login?mode=register')}>
            {c.start}
          </button>
        </div>

        <button className={styles.menuButton} type="button" aria-label="Menu" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {menuOpen && (
        <div className={styles.mobileNav}>
          <a href="#product" onClick={() => setMenuOpen(false)}>{c.navProduct}</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>{c.navPricing}</a>
          <a href="#demo" onClick={() => setMenuOpen(false)}>{c.navDemo}</a>
          <button type="button" onClick={() => router.push('/login')}>{c.login}</button>
        </div>
      )}

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className={styles.subtitle}>{c.subtitle}</p>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} type="button" onClick={() => router.push('/login?mode=register')}>
              {c.primaryCta}
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <a className={styles.secondaryButton} href="#demo">{c.secondaryCta}</a>
          </div>
        </div>

        <div className={styles.productPreview} aria-label={c.previewTitle}>
          <div className={styles.previewHeader}>
            <div>
              <h2>{c.previewTitle}</h2>
              <p>{c.previewSubtitle}</p>
            </div>
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <div className={styles.previewRows}>
            {previewRows.map((row) => {
              const Icon = row.icon
              return (
                <div className={styles.previewRow} key={row.label}>
                  <Icon size={18} aria-hidden="true" />
                  <div>
                    <span>{c[row.label]}</span>
                    <p>{c[row.text]}</p>
                  </div>
                  <strong>{c[row.status]}</strong>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {partners.length > 0 && (
        <section className={styles.partners} aria-label="Partners">
          {partners.map((partner) => (
            // eslint-disable-next-line @next/next/no-img-element -- Partner logos are remote CMS assets without a fixed Next image host.
            <img key={partner.id} src={partner.logo_url} alt={partner.name} />
          ))}
        </section>
      )}

      <section id="product" className={styles.valueSection}>
        <div className={styles.sectionIntro}>
          <Bell size={20} aria-hidden="true" />
          <h2>{c.valueTitle}</h2>
          <p>{c.valueText}</p>
        </div>
        <div className={styles.pillars}>
          {c.pillars.map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.sectionHeading}>
          <h2>{c.plansTitle}</h2>
          <div className={styles.billingToggle}>
            <button type="button" data-active={billing === 'monthly'} onClick={() => setBilling('monthly')}>
              {c.monthly}
            </button>
            <button type="button" data-active={billing === 'yearly'} onClick={() => setBilling('yearly')}>
              {c.yearly}
            </button>
          </div>
        </div>

        <div className={styles.planGrid}>
          {PLANS.map((plan, index) => {
            const planName = lang === 'ar' ? plan.name : plan.nameEn
            const limits = lang === 'ar' ? plan.limits : plan.limitsEn
            const features = lang === 'ar' ? plan.features : plan.featuresEn
            return (
              <article className={styles.plan} key={planName} data-featured={plan.popular}>
                <div className={styles.planHeader}>
                  <h3>{planName}</h3>
                  {plan.popular && <span>{c.included}</span>}
                </div>
                <div className={styles.price}>
                  <strong>{billing === 'yearly' ? plan.yearlyPrice : plan.price}</strong>
                  <span>{c.sar} {billing === 'yearly' ? c.perYear : c.perMonth}</span>
                </div>
                <ul className={styles.limitList}>
                  {limits.map((limit, limitIndex) => (
                    <li key={`${planName}-${limit}-${limitIndex}`}>{limit}</li>
                  ))}
                </ul>
                <ul className={styles.featureList}>
                  {features.slice(0, 5).map((feature) => (
                    <li key={feature}>
                      <Check size={15} aria-hidden="true" />
                      <span>{removeDecorativeEmoji(feature)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={plan.popular ? styles.primaryButton : styles.secondaryButton}
                  type="button"
                  onClick={() => router.push(`/login?mode=register&branches=${PLAN_BRANCHES[index]}&billing=${billing}`)}
                >
                  {c.choosePlan}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section id="demo" className={styles.demoSection}>
        <div className={styles.demoIntro}>
          <h2>{c.demoTitle}</h2>
          <p>{c.demoText}</p>
        </div>

        <form className={styles.demoForm} onSubmit={submitDemoRequest}>
          {submitMsg && (
            <div className={submitMsg.ok ? styles.successMessage : styles.errorMessage}>
              {submitMsg.text}
            </div>
          )}

          <div className={styles.formGrid}>
            <label>
              <span>{c.firstName}</span>
              <input required value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
            </label>
            <label>
              <span>{c.lastName}</span>
              <input required value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} />
            </label>
            <label>
              <span>{c.phone}</span>
              <input required type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </label>
            <label>
              <span>{c.email}</span>
              <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label>
              <span>{c.business}</span>
              <input required value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} />
            </label>
            <label>
              <span>{c.branchesCount}</span>
              <select value={form.branchCount} onChange={(event) => setForm((current) => ({ ...current, branchCount: event.target.value }))}>
                <option value="">{c.select}</option>
                {(lang === 'ar' ? BRANCH_OPTIONS : BRANCH_OPTIONS_EN).map((option, index) => (
                  <option key={option} value={BRANCH_OPTIONS[index]}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.checkbox}>
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>
              {c.agree} <a href="/terms" target="_blank">{c.terms}</a> {c.and} <a href="/privacy" target="_blank">{c.privacy}</a>
            </span>
          </label>

          <button className={styles.primaryButton} type="submit" disabled={submitting}>
            {submitting ? c.sending : c.submit}
          </button>
        </form>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>Storely</strong>
          <p>{c.footerText}</p>
        </div>
        <nav>
          <a href="/privacy">{c.privacy}</a>
          <a href="/terms">{c.terms}</a>
          <a href="/security">{c.legal}</a>
          <a href="https://wa.me/966594351667" target="_blank" rel="noreferrer">{c.whatsapp}</a>
        </nav>
        <span>{c.rights} {new Date().getFullYear()}</span>
      </footer>
    </main>
  )
}
