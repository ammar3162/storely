/**
 * توليد فاتورة PDF احترافية مفصّلة (يدعم العربي صح) باستخدام متصفح Chrome
 * مصغّر يعمل بالخلفية على السيرفر — يرسم الفاتورة بالضبط زي ما تظهر
 * بمتصفح حقيقي، ثم يحوّلها لملف PDF.
 */
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import type { QuoteDetails } from '@/lib/offerQuote'

// تنظيف أي نص قبل حقنه بالـHTML — يمنع ثغرات XSS من بيانات يدخلها العملاء
// (اسم المنشأة وقت التسجيل) قبل ما تُعرض بمتصفح Chromium الحقيقي على السيرفر
function escapeHtml(value: any): string {
  const str = String(value ?? '')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface InvoiceItem { label: string; amount: number }

interface InvoiceData {
  invoiceNumber: number | string
  date: string
  orgName: string
  items: InvoiceItem[]
  /** due = عرض سعر مستحق الدفع (قبل التفعيل) — الافتراضي مدفوعة */
  status?: 'paid' | 'due'
  /** عرض السعر: آخر يوم يسري فيه */
  validUntil?: string
  /** تفاصيل العرض الخاص (الباقة، الفروع، المدة، الخصم) — يطلع بدلها جدول البنود العادي لو ما فيه */
  quote?: QuoteDetails | null
}

// مبلغ بفواصل الآلاف، ويُكتب من اليسار (عشان علامة السالب تطلع قبل الرقم داخل صفحة عربية)
const money = (n: number) => `<span dir="ltr">${n < 0 ? '−' : ''}${Math.abs(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س</span>`

/** قسم العرض الخاص: بيانات العميل والاشتراك، تفصيل الفاتورة، الحساب، والشروط */
function quoteSection(q: QuoteDetails, orgName: string, due: boolean, validUntil?: string): string {
  const cell = (label: string, value: string, sub = '') =>
    `<div class="cell"><div class="info-label">${label}</div><div class="cell-value">${value}</div>${sub ? `<div class="cell-sub">${sub}</div>` : ''}</div>`
  const names = q.branchNames.length ? escapeHtml(q.branchNames.join('، ')) : ''
  const lines = q.billLines.length && q.billTotal > 0 ? `
  <div class="sec-title">${escapeHtml(q.billTitle)}</div>
  <table>
    <thead><tr><th>البند</th><th>${q.cycle === 'yearly' ? 'المبلغ السنوي' : 'المبلغ الشهري'}</th></tr></thead>
    <tbody>
      ${q.billLines.map(l => `<tr><td>${escapeHtml(l.label)}</td><td>${money(l.amount)}</td></tr>`).join('')}
      <tr class="sum-row"><td>${q.cycle === 'yearly' ? 'المجموع السنوي' : 'المجموع الشهري'}</td><td>${money(q.billTotal)}</td></tr>
      ${q.cycle === 'yearly' ? `<tr class="sum-row"><td>المقابل الشهري</td><td>${money(q.monthly)}</td></tr>` : ''}
    </tbody>
  </table>` : ''
  // السعر العادي للمدة يطلع لما يكون العرض بنفسه أو أقل منه، والخصم لما يكون أقل
  const listRow = q.list > 0 && q.amount <= q.list
    ? `<div class="t-row"><span>السعر العادي لمدة ${escapeHtml(q.monthsLabel)} (${q.monthly.toLocaleString('en-US')} ر.س شهرياً)</span>${money(q.list)}</div>` : ''
  const discRow = q.discount > 0 ? `<div class="t-row t-disc"><span>خصم العرض (${q.discountPct}%)</span>${money(-q.discount)}</div>` : ''
  const terms = [
    'السعر خاص بهذه المدة، ويتجدد الاشتراك بعدها بالسعر العادي أو بعرض جديد.',
    'يشمل الاشتراك الباقة والإضافات المذكورة حتى نهاية المدة.',
    q.startsLater ? 'تبدأ المدة بعد نهاية اشتراكك الحالي، فلا تخسر أيامك المتبقية.' : '',
    due ? `العرض صالح حتى ${escapeHtml(validUntil || '')}، ويُفعَّل الاشتراك فور استلام الدفعة.` : 'تم استلام الدفعة، والاشتراك مفعّل حتى نهاية المدة.',
    q.note ? `ملاحظة: ${escapeHtml(q.note)}` : '',
  ].filter(Boolean)
  return `
  <div class="grid">
    ${cell('المنشأة', escapeHtml(orgName))}
    ${cell('صاحب المنشأة', escapeHtml(q.ownerName || '—'))}
    ${cell('الباقة', escapeHtml(q.planLabel))}
    ${cell('عدد الفروع', String(q.branches), names)}
    ${cell(q.kind === 'renewal' ? 'مدة التجديد' : 'مدة الاشتراك', escapeHtml(q.monthsLabel))}
    ${cell('فترة الاشتراك', `${escapeHtml(q.start)} إلى ${escapeHtml(q.end)}`)}
  </div>
  ${lines}
  <div class="totals">
    ${listRow}${discRow}
    <div class="t-row t-grand"><span>${due ? 'المبلغ المستحق' : 'المبلغ المدفوع'}</span>${money(q.amount)}</div>
  </div>
  <div class="terms">
    <div class="sec-title">${due ? 'شروط العرض' : 'ملاحظات'}</div>
    <ul>${terms.map(t => `<li>${t}</li>`).join('')}</ul>
  </div>`
}

export function buildInvoiceHtml(data: InvoiceData): string {
  const total = data.items.reduce((s, it) => s + Number(it.amount || 0), 0)
  const rows = data.items.map(it => `<tr><td>${escapeHtml(it.label)}</td><td>${money(Number(it.amount) || 0)}</td></tr>`).join('')
  const due = data.status === 'due'

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'IBM Plex Sans Arabic', system-ui, sans-serif; direction:rtl; padding:48px; color:#1A2B33; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; background:#203640; color:#fff; border-radius:16px; border-bottom:4px solid #A3917F; padding:24px 28px; margin-bottom:28px; }
  .brand-row { display:flex; align-items:center; gap:12px; }
  .brand-logo { width:48px; height:48px; border-radius:12px; background:#fff; }
  .brand { font-size:26px; font-weight:800; color:#fff; }
  .brand-sub { font-size:11px; color:#D9C7AE; margin-top:2px; }
  .brand-legal { font-size:10px; color:rgba(255,255,255,.6); margin-top:10px; }
  .meta { text-align:left; }
  .meta-title { font-size:20px; font-weight:800; color:#fff; margin-bottom:6px; }
  .meta-row { font-size:12px; color:rgba(255,255,255,.75); margin-top:2px; }
  .meta-row b { color:#fff; }
  .info-box { background:#FAF9F6; border:1px solid #E6E2DB; border-radius:12px; padding:16px 20px; margin-bottom:28px; }
  .info-label { font-size:11px; color:#7A6650; font-weight:700; margin-bottom:4px; }
  .info-value { font-size:16px; font-weight:700; color:#1A2B33; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  th { background:#203640; color:white; font-size:12px; font-weight:700; padding:12px 16px; text-align:right; }
  th:last-child, td:last-child { text-align:left; }
  td { padding:14px 16px; font-size:13px; border-bottom:1px solid #E6E2DB; color:#33444C; }
  .total-row td { font-size:17px; font-weight:800; color:#203640; background:#F5F3EF; border-top:2px solid #A3917F; border-bottom:none; padding-top:16px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:24px; }
  .cell { background:#FAF9F6; border:1px solid #E6E2DB; border-radius:12px; padding:12px 16px; }
  .cell-value { font-size:15px; font-weight:700; color:#1A2B33; }
  .cell-sub { font-size:11px; color:#5C6B72; margin-top:4px; line-height:1.6; }
  .sec-title { font-size:13px; font-weight:800; color:#203640; margin:0 0 10px; }
  .sum-row td { font-weight:700; color:#203640; background:#F5F3EF; }
  .totals { border:1px solid #E6E2DB; border-radius:12px; padding:6px 18px; margin-bottom:24px; }
  .t-row { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:10px 0; font-size:13px; color:#33444C; border-bottom:1px solid #E6E2DB; }
  .t-row:last-child { border-bottom:none; }
  .t-disc { color:#203640; font-weight:700; }
  .t-grand { font-size:18px; font-weight:800; color:#203640; padding:14px 0; }
  .terms ul { padding-inline-start:18px; }
  .terms li { font-size:12px; color:#33444C; line-height:1.9; }
  .footer { margin-top:40px; text-align:center; padding-top:24px; border-top:1px solid #E6E2DB; }
  /* عرض السعر المفصّل: مسافات أضيق عشان يطلع بصفحة A4 وحدة */
  body.q { padding:32px 40px; }
  body.q .header { margin-bottom:20px; padding:20px 24px; }
  body.q .grid { gap:8px; margin-bottom:18px; }
  body.q .cell { padding:9px 14px; }
  body.q th, body.q td { padding:9px 14px; }
  body.q table { margin-bottom:18px; }
  body.q .t-row { padding:7px 0; }
  body.q .t-grand { padding:10px 0; }
  body.q .totals { margin-bottom:18px; }
  body.q .terms li { line-height:1.65; }
  body.q .footer { margin-top:20px; padding-top:14px; }
  .footer-thanks { font-size:14px; font-weight:700; color:#203640; margin-bottom:6px; }
  .footer-note { font-size:11px; color:#94A0A6; }
</style>
</head>
<body class="${data.quote ? 'q' : ''}">
  <div class="header">
    <div>
      <div class="brand-row"><img class="brand-logo" src="https://www.storely.dev/icon-192.png" alt="" /><div><div class="brand">Storely</div>
      <div class="brand-sub">نحوّل تعقيد التشغيل إلى تحكّم كامل</div></div></div>
      <div class="brand-legal">مؤسسة باسم علي خلوي لتقنية المعلومات — س.ت 7055023522</div>
    </div>
    <div class="meta">
      <div class="meta-title">${due ? (data.quote?.kind === 'renewal' ? 'عرض تجديد' : 'عرض سعر') : 'فاتورة اشتراك'}</div>
      <div class="meta-row">${due ? 'رقم العرض' : 'رقم الفاتورة'}: <b>#${escapeHtml(data.invoiceNumber)}</b></div>
      <div class="meta-row">التاريخ: <b>${escapeHtml(data.date)}</b></div>
      ${due && data.validUntil ? `<div class="meta-row">صالح حتى: <b>${escapeHtml(data.validUntil)}</b></div>` : ''}
    </div>
  </div>

  ${data.quote ? quoteSection(data.quote, data.orgName, due, data.validUntil) : `
  <div class="info-box">
    <div class="info-label">المنشأة</div>
    <div class="info-value">${escapeHtml(data.orgName)}</div>
  </div>

  <table>
    <thead>
      <tr><th>الوصف</th><th>المبلغ</th></tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row"><td>الإجمالي</td><td>${money(total)}</td></tr>
    </tbody>
  </table>`}

  <div class="footer">
    ${data.quote ? '' : `<div class="footer-thanks">${due ? 'المبلغ مستحق الدفع، ويُفعَّل الاشتراك فور استلام الدفعة' : 'تم استلام الدفعة بنجاح، وشكراً لاشتراكك معنا'}</div>`}
    <div class="footer-note">المبالغ غير خاضعة لضريبة القيمة المضافة · storely.dev</div>
    <div class="footer-note" style="margin-top:4px">مؤسسة باسم علي خلوي لتقنية المعلومات · س.ت 7055023522</div>
  </div>
</body>
</html>`
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.setContent(buildInvoiceHtml(data), { waitUntil: 'load' })
    await page.evaluateHandle('document.fonts.ready') // نتأكد إن الخط العربي تحمّل كامل قبل الطباعة
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
