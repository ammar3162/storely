/**
 * توليد فاتورة PDF احترافية مفصّلة (يدعم العربي صح) باستخدام متصفح Chrome
 * مصغّر يعمل بالخلفية على السيرفر — يرسم الفاتورة بالضبط زي ما تظهر
 * بمتصفح حقيقي، ثم يحوّلها لملف PDF.
 */
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

interface InvoiceItem { label: string; amount: number }

interface InvoiceData {
  invoiceNumber: number | string
  date: string
  orgName: string
  items: InvoiceItem[]
}

function buildInvoiceHtml(data: InvoiceData): string {
  const total = data.items.reduce((s, it) => s + Number(it.amount || 0), 0)
  const rows = data.items.map(it => `<tr><td>${it.label}</td><td>${it.amount} ر.س</td></tr>`).join('')

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'IBM Plex Sans Arabic', system-ui, sans-serif; direction:rtl; padding:48px; color:#0f172a; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #15803d; padding-bottom:24px; margin-bottom:32px; }
  .brand { font-size:28px; font-weight:900; color:#15803d; letter-spacing:-0.5px; }
  .brand-sub { font-size:11px; color:#94a3b8; margin-top:4px; }
  .meta { text-align:left; }
  .meta-title { font-size:20px; font-weight:800; color:#0f172a; margin-bottom:6px; }
  .meta-row { font-size:12px; color:#64748b; margin-top:2px; }
  .meta-row b { color:#0f172a; }
  .info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 20px; margin-bottom:28px; }
  .info-label { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
  .info-value { font-size:15px; font-weight:700; color:#0f172a; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  th { background:#15803d; color:white; font-size:12px; font-weight:700; padding:12px 16px; text-align:right; }
  th:last-child, td:last-child { text-align:left; }
  td { padding:14px 16px; font-size:13px; border-bottom:1px solid #e2e8f0; color:#334155; }
  .total-row td { font-size:16px; font-weight:900; color:#15803d; border-top:2px solid #15803d; border-bottom:none; padding-top:16px; }
  .footer { margin-top:40px; text-align:center; padding-top:24px; border-top:1px solid #e2e8f0; }
  .footer-thanks { font-size:14px; font-weight:700; color:#15803d; margin-bottom:6px; }
  .footer-note { font-size:11px; color:#94a3b8; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Storely</div>
      <div class="brand-sub">نظام إدارة المخزون الاحترافي</div>
    </div>
    <div class="meta">
      <div class="meta-title">فاتورة اشتراك</div>
      <div class="meta-row">رقم الفاتورة: <b>#${data.invoiceNumber}</b></div>
      <div class="meta-row">التاريخ: <b>${data.date}</b></div>
    </div>
  </div>

  <div class="info-box">
    <div class="info-label">المنشأة</div>
    <div class="info-value">${data.orgName}</div>
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
    <div class="footer-thanks">✅ تم استلام الدفعة بنجاح — شكراً لاشتراكك معنا 🌿</div>
    <div class="footer-note">هذه الفاتورة غير خاضعة لضريبة القيمة المضافة · storely.dev</div>
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
