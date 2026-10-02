import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// تنظيف أي نص قبل حقنه بالـHTML — يمنع ثغرات XSS من بيانات المستخدمين
// (أسماء موظفين، أسباب، ملاحظات) اللي تنعرض بالتقرير
function escapeHtml(value: any): string {
  const str = String(value ?? '—')
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface PdfTableColumn {
  header: string
  key: string
  align?: 'right' | 'left' | 'center'
}

interface PdfExportOptions {
  title: string
  subtitle?: string
  orgName: string
  logoUrl?: string | null
  columns: PdfTableColumn[]
  rows: Record<string, any>[]
  summaryStats?: { label: string; value: string; color?: string }[]
  totalsRow?: Record<string, any>
  fileName: string
}

/**
 * يولّد PDF احترافي بدعم كامل للعربي — يبني تصميم HTML منسّق، يلتقطه
 * كصورة حقيقية (بكسل بكسل) عبر html2canvas، ثم يدمجها داخل ملف PDF.
 * هذا يضمن ظهور النص العربي صحيحاً دائماً (بعكس محرك jsPDF النصي
 * الداخلي الذي لا يدعم الخطوط العربية).
 *
 * مهم: نقسّم الصفوف نفسها لمجموعات (صفحة = مجموعة)، ونلتقط كل مجموعة
 * كصورة صغيرة مستقلة على حدة — بدل التقاط الجدول كامل كصورة وحدة طويلة
 * (اللي كانت تنقطع بمنتصفها لو عدد الصفوف كبير، بسبب حد أقصى لحجم الصورة
 * اللي يقدر المتصفح يرسمها). هذا يضمن عدم فقدان أي بيانات مهما كان
 * حجم التقرير، وظهور صف "الإجمالي" دائماً بآخر صفحة.
 */
export async function exportReportPdf(opts: PdfExportOptions) {
  const { title, subtitle, orgName, logoUrl, columns, rows, summaryStats, totalsRow, fileName } = opts

  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'white'
  overlay.style.zIndex = '99998'
  overlay.style.overflow = 'auto'
  overlay.style.display = 'flex'
  overlay.style.justifyContent = 'center'
  overlay.style.alignItems = 'flex-start'   // ارتفاع الصفحة = ارتفاع المحتوى، مو ارتفاع الشاشة (يمنع القص بالجوال)
  overlay.style.padding = '20px'
  document.body.appendChild(overlay)

  const container = document.createElement('div')
  container.style.width = '780px'
  container.style.minWidth = '780px'   // بالجوال الشاشة أضيق — بدونها ينضغط التقرير ويطلع مقصوص/صغير
  container.style.flexShrink = '0'
  container.style.background = 'white'
  container.style.fontFamily = "'IBM Plex Sans Arabic', system-ui, sans-serif"
  container.style.direction = 'rtl'
  overlay.appendChild(container)

  const headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #029FA2">
      <div style="display:flex;align-items:center;gap:10px">
        ${logoUrl ? `<img src="${logoUrl}" style="width:36px;height:36px;border-radius:8px;object-fit:cover" crossorigin="anonymous" />` : ''}
        <div>
          <div style="font-size:20px;font-weight:800;color:#0f172a">${escapeHtml(orgName)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">${escapeHtml(title)}${subtitle ? ' — ' + escapeHtml(subtitle) : ''}</div>
        </div>
      </div>
      <div style="font-size:11px;color:#94a3b8">
        تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA', {numberingSystem:'latn', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  `

  const summaryHtml = summaryStats?.length
    ? `<div style="display:flex;gap:12px;margin-bottom:20px">
        ${summaryStats.map(s => `
          <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:${s.color || '#0f172a'}">${escapeHtml(s.value)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px">${escapeHtml(s.label)}</div>
          </div>
        `).join('')}
      </div>`
    : ''

  // نستخدم صفوف div بدل <table> — html2canvas كثيراً ما يفشل بالتقاط
  // خلفيات وحدود عناصر الجداول (th/td) بشكل صحيح مع border-collapse
  const colWidth = (100 / columns.length).toFixed(4)
  const colDivsHeader = columns.map(c =>
    `<div style="flex:1 1 ${colWidth}%;padding:10px 12px;font-size:11px;font-weight:700;text-align:${c.align || 'right'};box-sizing:border-box">${c.header}</div>`
  ).join('')

  function rowDivs(r: Record<string, any>, extra: string) {
    return columns.map(c =>
      `<div style="flex:1 1 ${colWidth}%;min-width:0;padding:9px 12px;font-size:11px;box-sizing:border-box;text-align:${c.align || 'right'};overflow-wrap:anywhere;${extra}">${escapeHtml(r[c.key])}</div>`
    ).join('')
  }

  function rowsTableHtml(rowsChunk: Record<string, any>[], includeTotals: boolean) {
    const bodyHtml = rowsChunk.map((r, i) => `
      <div data-pdf-row style="display:flex;background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};border-bottom:1px solid #e2e8f0">
        ${rowDivs(r, 'color:#1e293b')}
      </div>
    `).join('')
    const totalsHtml = includeTotals && totalsRow
      ? `<div data-pdf-totals style="display:flex;background:#f0fdfa;border-top:2px solid #029FA2">
          ${rowDivs(totalsRow, 'color:#029FA2;font-weight:800')}
        </div>`
      : ''
    return `
      <div style="width:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
        <div data-pdf-thead style="display:flex;background:#0f172a;color:white">${colDivsHeader}</div>
        ${bodyHtml}${totalsHtml}
      </div>
    `
  }

  const footerHtml = `
    <div data-pdf-footer style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;line-height:1.8">
      <div>تم إنشاء هذا التقرير تلقائياً عبر نظام Storely</div>
      <div style="margin-top:2px">© ${new Date().getFullYear()} Storely — جميع الحقوق محفوظة</div>
    </div>
  `

  // تقسيم الصفوف لصفحات حسب الطول الفعلي لكل صف — الصف اللي فيه نص طويل (سبب، ملاحظة) ياخذ
  // أكثر من سطر، فالعدد الثابت للصفوف كان ممكن يطلّع الصفحة أطول من A4 وينقطع آخرها.
  // نرسم كل شي مرة وحدة، نقيس، ثم نوزّع.
  const PAGE_PX = Math.floor((277 / 190) * 780)   // ارتفاع A4 المتاح (277 مم) بنفس مقياس عرض 190 مم = 780px
  const PAD = 64                                   // padding:32px فوق وتحت
  container.innerHTML = `<div style="padding:32px"><div data-pdf-top>${headerHtml + summaryHtml}</div>${rowsTableHtml(rows, true)}${footerHtml}</div>`
  await new Promise(r => setTimeout(r, 60))
  const h = (el: Element | null) => (el ? (el as HTMLElement).getBoundingClientRect().height : 0)
  const topH = h(container.querySelector('[data-pdf-top]'))
  const theadH = h(container.querySelector('[data-pdf-thead]')) + 2
  const totalsH = h(container.querySelector('[data-pdf-totals]'))
  const footerH = h(container.querySelector('[data-pdf-footer]')) + 24
  const rowHs = Array.from(container.querySelectorAll('[data-pdf-row]')).map(h)

  type PageChunk = { rowsChunk: Record<string, any>[]; includeHeader: boolean; includeTotals: boolean; isLast: boolean }
  const pages: PageChunk[] = []
  const tailH = totalsH + footerH
  let idx = 0
  let first = true
  while (true) {
    const avail = PAGE_PX - PAD - theadH - (first ? topH : 0)
    let used = 0, end = idx
    while (end < rows.length && (end === idx || used + rowHs[end] <= avail)) { used += rowHs[end]; end++ }
    const isLast = end >= rows.length
    if (isLast && used + tailH > avail && end - idx > 1) {
      // الإجمالي والتذييل ما يدخلون — ننقل آخر صفوف للصفحة الجاية عشان الإجمالي يجي معها
      while (end - idx > 1 && used + tailH > avail) { end--; used -= rowHs[end] }
      pages.push({ rowsChunk: rows.slice(idx, end), includeHeader: first, includeTotals: false, isLast: false })
    } else {
      pages.push({ rowsChunk: rows.slice(idx, end), includeHeader: first, includeTotals: isLast, isLast })
      if (isLast) break
    }
    idx = end
    first = false
  }

  try {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = 210
    const marginX = 10
    const imgWidth = pageWidth - marginX * 2

    for (let p = 0; p < pages.length; p++) {
      const { rowsChunk, includeHeader, includeTotals, isLast } = pages[p]
      container.innerHTML = `
        <div style="padding:32px">
          ${includeHeader ? headerHtml + summaryHtml : ''}
          ${rowsTableHtml(rowsChunk, includeTotals)}
          ${isLast ? footerHtml : ''}
        </div>
      `
      // انتظار قصير لضمان اكتمال تحميل الخط قبل الالتقاط
      await new Promise(r => setTimeout(r, 120))
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      let w = imgWidth
      let imgHeight = (canvas.height * imgWidth) / canvas.width
      // احتياط: لو صف واحد أطول من صفحة كاملة نصغّر الصورة بدل ما تنقطع
      if (imgHeight > 277) { w = imgWidth * (277 / imgHeight); imgHeight = 277 }

      if (p > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', marginX + (imgWidth - w) / 2, 10, w, imgHeight)
    }

    pdf.save(fileName)
  } finally {
    document.body.removeChild(overlay)
  }
}
