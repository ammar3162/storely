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
  fileName: string
}

/**
 * يولّد PDF احترافي بدعم كامل للعربي — يبني تصميم HTML منسّق، يلتقطه
 * كصورة حقيقية (بكسل بكسل) عبر html2canvas، ثم يدمجها داخل ملف PDF.
 * هذا يضمن ظهور النص العربي صحيحاً دائماً (بعكس محرك jsPDF النصي
 * الداخلي الذي لا يدعم الخطوط العربية).
 */
export async function exportReportPdf(opts: PdfExportOptions) {
  const { title, subtitle, orgName, columns, rows, summaryStats, fileName } = opts

  // طبقة تغطية بيضاء كاملة (تظهر كـ"شاشة تحميل" أثناء التصدير)
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
  container.style.padding = '32px'
  container.style.fontFamily = "'IBM Plex Sans Arabic', system-ui, sans-serif"
  container.style.direction = 'rtl'
  overlay.appendChild(container)

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

  const tableHeaderHtml = columns.map(c => `<th style="padding:10px 12px;background:#0f172a;color:white;font-size:11px;font-weight:700;text-align:${c.align || 'right'}">${c.header}</th>`).join('')
  const tableRowsHtml = rows.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? 'white' : '#f8fafc'}">
      ${columns.map(c => `<td style="padding:9px 12px;font-size:11px;color:#1e293b;border-bottom:1px solid #f1f5f9;text-align:${c.align || 'right'}">${r[c.key] ?? '—'}</td>`).join('')}
    </tr>
  `).join('')

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #16a34a">
      <div>
        <div style="font-size:20px;font-weight:800;color:#0f172a">${orgName}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">${title}${subtitle ? ' — ' + subtitle : ''}</div>
      </div>
      <div style="font-size:11px;color:#94a3b8">
        تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
    ${summaryHtml}
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>${tableHeaderHtml}</tr></thead>
      <tbody>${tableRowsHtml}</tbody>
    </table>
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;line-height:1.8">
      <div>تم إنشاء هذا التقرير تلقائياً عبر نظام Storely</div>
      <div style="margin-top:2px">© ${new Date().getFullYear()} Storely — جميع الحقوق محفوظة</div>
    </div>
  `

  try {
    // انتظار قصير لضمان اكتمال تحميل الخط قبل الالتقاط
    await new Promise(r => setTimeout(r, 150))

    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = 210
    const pageHeight = 297
    const imgWidth = pageWidth - 20 // هوامش 10مم كل جانب
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 10

    pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
    heightLeft -= (pageHeight - 20)

    // لو المحتوى أطول من صفحة وحدة، نكمل بصفحات إضافية
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - 20)
    }

    pdf.save(fileName)
  } finally {
    document.body.removeChild(overlay)
  }
}
