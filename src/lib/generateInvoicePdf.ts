/**
 * توليد فاتورة PDF احترافية مفصّلة (يدعم العربي صح) باستخدام متصفح Chrome
 * مصغّر يعمل بالخلفية على السيرفر — يرسم الفاتورة بالضبط زي ما تظهر
 * بمتصفح حقيقي، ثم يحوّلها لملف PDF.
 */
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

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
}

export function buildInvoiceHtml(data: InvoiceData): string {
  const total = data.items.reduce((s, it) => s + Number(it.amount || 0), 0)
  const rows = data.items.map(it => `<tr><td>${escapeHtml(it.label)}</td><td>${escapeHtml(it.amount)} ر.س</td></tr>`).join('')

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
  .footer { margin-top:40px; text-align:center; padding-top:24px; border-top:1px solid #E6E2DB; }
  .footer-thanks { font-size:14px; font-weight:700; color:#203640; margin-bottom:6px; }
  .footer-note { font-size:11px; color:#94A0A6; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-row"><img class="brand-logo" src="https://www.storely.dev/icon-192.png" alt="" /><div><div class="brand">Storely</div>
      <div class="brand-sub">نحوّل تعقيد التشغيل إلى تحكّم كامل</div></div></div>
      <div class="brand-legal">مؤسسة باسم علي خلوي لتقنية المعلومات — س.ت 7055023522</div>
    </div>
    <div class="meta">
      <div class="meta-title">فاتورة اشتراك</div>
      <div class="meta-row">رقم الفاتورة: <b>#${escapeHtml(data.invoiceNumber)}</b></div>
      <div class="meta-row">التاريخ: <b>${escapeHtml(data.date)}</b></div>
    </div>
  </div>

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
      <tr class="total-row"><td>الإجمالي</td><td>${total} ر.س</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-thanks">تم استلام الدفعة بنجاح — شكراً لاشتراكك معنا</div>
    <div class="footer-note">هذه الفاتورة غير خاضعة لضريبة القيمة المضافة · storely.dev</div>
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
