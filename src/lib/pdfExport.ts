import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
  overlay.style.padding = '20px'
  document.body.appendChild(overlay)

  const container = document.createElement('div')
  container.style.width = '780px'
  container.style.background = 'white'
  container.style.fontFamily = "'IBM Plex Sans Arabic', system-ui, sans-serif"
  container.style.direction = 'rtl'
  overlay.appendChild(container)

  const headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #029FA2">
      <div style="display:flex;align-items:center;gap:10px">
        ${logoUrl ? `<img src="${logoUrl}" style="width:36px;height:36px;border-radius:8px;object-fit:cover" crossorigin="anonymous" />` : ''}
        <div>
          <div style="font-size:20px;font-weight:800;color:#0f172a">${orgName}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">${title}${subtitle ? ' — ' + subtitle : ''}</div>
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
            <div style="font-size:20px;font-weight:800;color:${s.color || '#0f172a'}">${s.value}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px">${s.label}</div>
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
      `<div style="flex:1 1 ${colWidth}%;padding:9px 12px;font-size:11px;box-sizing:border-box;text-align:${c.align || 'right'};${extra}">${r[c.key] ?? '—'}</div>`
    ).join('')
  }

  function rowsTableHtml(rowsChunk: Record<string, any>[], includeTotals: boolean) {
    const bodyHtml = rowsChunk.map((r, i) => `
      <div style="display:flex;background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};border-bottom:1px solid #e2e8f0">
        ${rowDivs(r, 'color:#1e293b')}
      </div>
    `).join('')
    const totalsHtml = includeTotals && totalsRow
      ? `<div style="display:flex;background:#f0fdfa;border-top:2px solid #029FA2">
          ${rowDivs(totalsRow, 'color:#029FA2;font-weight:800')}
        </div>`
      : ''
    return `
      <div style="width:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
        <div style="display:flex;background:#0f172a;color:white">${colDivsHeader}</div>
        ${bodyHtml}${totalsHtml}
      </div>
    `
  }

  const footerHtml = `
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;line-height:1.8">
      <div>تم إنشاء هذا التقرير تلقائياً عبر نظام Storely</div>
      <div style="margin-top:2px">© ${new Date().getFullYear()} Storely — جميع الحقوق محفوظة</div>
    </div>
  `

  // تقسيم الصفوف لمجموعات (صفحة = مجموعة صغيرة، آخر صفحة فيها الإجمالي دائماً)
  const ROWS_PER_PAGE_FIRST = 9
  const ROWS_PER_PAGE_OTHER = 12
  type PageChunk = { rowsChunk: Record<string, any>[]; includeHeader: boolean; includeTotals: boolean; isLast: boolean }
  const pages: PageChunk[] = []
  if (rows.length === 0) {
    pages.push({ rowsChunk: [], includeHeader: true, includeTotals: true, isLast: true })
  } else {
    let idx = 0
    let first = true
    while (idx < rows.length) {
      const perPage = first ? ROWS_PER_PAGE_FIRST : ROWS_PER_PAGE_OTHER
      const chunk = rows.slice(idx, idx + perPage)
      idx += perPage
      const isLast = idx >= rows.length
      pages.push({ rowsChunk: chunk, includeHeader: first, includeTotals: isLast, isLast })
      first = false
    }
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
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      if (p > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', marginX, 10, imgWidth, imgHeight)
    }

    pdf.save(fileName)
  } finally {
    document.body.removeChild(overlay)
  }
}
