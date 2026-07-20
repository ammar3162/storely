import jsPDF from 'jspdf'

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
 * يولّد PDF احترافي بدعم كامل للعربي — عن طريق تصميم HTML منسّق
 * وتحويله لصورة عالية الجودة داخل ملف PDF (يتجاوز مشكلة عدم دعم
 * jsPDF الافتراضي للخطوط العربية).
 */
export async function exportReportPdf(opts: PdfExportOptions) {
  const { title, subtitle, orgName, logoUrl, columns, rows, summaryStats, fileName } = opts

  // طبقة تغطية بيضاء كاملة (تظهر كـ"شاشة تحميل" أثناء التصدير — عادي وشائع بالأنظمة الاحترافية)
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

  // عنصر HTML الفعلي بتصميم التقرير — داخل حدود الشاشة (مطلوب لالتقاط html2canvas بشكل صحيح)
  const container = document.createElement('div')
  container.style.width = '780px'
  container.style.background = 'white'
  container.style.padding = '32px'
  container.style.fontFamily = "'IBM Plex Sans Arabic', system-ui, sans-serif"
  container.style.direction = 'rtl'

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
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center">
      تم إنشاء هذا التقرير تلقائياً عبر نظام Storely
    </div>
  `

  overlay.appendChild(container)

  const pdf = new jsPDF('p', 'mm', 'a4')
  await new Promise<void>((resolve, reject) => {
    try {
      pdf.html(container, {
        callback: (doc) => {
          doc.save(fileName)
          document.body.removeChild(overlay)
          resolve()
        },
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 780,
        html2canvas: { scale: 0.35 },
      })
    } catch (err) {
      document.body.removeChild(overlay)
      reject(err)
    }
  })
}
