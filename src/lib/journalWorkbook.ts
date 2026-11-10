// ملف إكسل للقيود: ورقة «القيود» (سطر لكل حساب في القيد) + ورقة «دليل الحسابات» المستخدم
import { ACCOUNT_KEYS, ACCOUNT_LABELS, type AccountMap, type JournalLine } from '@/lib/journalExport'

const loadExcel = async () => (await import('exceljs')).default

export async function buildJournalWorkbook(lines: JournalLine[], o: { title: string; map: AccountMap }) {
  const Excel = await loadExcel()
  const wb = new Excel.Workbook()
  wb.creator = 'Storely'
  const ws = wb.addWorksheet('القيود', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  ws.columns = [
    { header: 'رقم القيد', key: 'entry', width: 10 }, { header: 'التاريخ', key: 'date', width: 12 }, { header: 'رقم الحساب', key: 'code', width: 12 },
    { header: 'اسم الحساب', key: 'name', width: 32 }, { header: 'البيان', key: 'memo', width: 46 }, { header: 'مدين', key: 'debit', width: 14 },
    { header: 'دائن', key: 'credit', width: 14 }, { header: 'المرجع', key: 'ref', width: 22 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } }
  for (const l of lines) ws.addRow({ entry: l.entry, date: l.date, code: l.account.code, name: l.account.name, memo: l.memo, debit: l.debit || null, credit: l.credit || null, ref: l.ref })
  const d = lines.reduce((s, l) => s + l.debit, 0), c = lines.reduce((s, l) => s + l.credit, 0)
  const t = ws.addRow({ memo: 'الإجمالي', debit: Math.round(d * 100) / 100, credit: Math.round(c * 100) / 100 })
  t.font = { bold: true }
  for (const k of ['debit', 'credit']) ws.getColumn(k).numFmt = '#,##0.00'

  const ms = wb.addWorksheet('دليل الحسابات', { views: [{ rightToLeft: true }] })
  ms.columns = [{ header: 'البند في ستورلي', key: 'label', width: 34 }, { header: 'رقم الحساب', key: 'code', width: 14 }, { header: 'اسم الحساب', key: 'name', width: 34 }]
  ms.getRow(1).font = { bold: true }
  for (const k of ACCOUNT_KEYS) ms.addRow({ label: ACCOUNT_LABELS[k], code: o.map[k].code, name: o.map[k].name })
  ms.addRow({})
  ms.addRow({ label: o.title })
  return Buffer.from(await wb.xlsx.writeBuffer())
}
