'use client'
// تقرير التحويلات بين الفروع: لكل فرع كم أرسل وكم استلم، أكثر الأصناف تحويلاً، والسجل الكامل (من مسار النقل نفسه)
import { useState, useEffect } from 'react'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { FileText, Inbox, Loader2, ArrowLeftRight } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { colors, font, card, btnPrimary, btnSecondary, inp } from '@/lib/ds'
import { ListSkeleton } from '@/components/PageSkeleton'
import { pdfOrgInfo, getRange, formatRange, BackBtn, PeriodBadge } from './shared'
import type { FilterPeriod } from './shared'

type Row = { id: string; qty_change: number; note: string | null; created_at: string; branch_id: string; by: string | null; products: { name: string; unit: string | null } }
type Branch = { id: string; name: string }

const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const destOf = (note: string | null) => (note || '').replace('نقل إلى فرع ', '').trim() || '—'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', day: 'numeric', month: 'short' })
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ar-SA-u-ca-gregory', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit' })

export default function TransferDetail({ period, from, to, onBack, filterBar }: { period: FilterPeriod; from: string; to: string; onBack: () => void; filterBar?: React.ReactNode }) {
  const [rows, setRows] = useState<Row[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)
  useLiveRefresh(typeof window !== 'undefined' ? sessionStorage.getItem('s_org_id') : null, ['stock_movements'], () => load())
  useEffect(() => { load() }, [period, from, to])

  async function load() {
    setLoading(true)
    const orgId = await getOrgId()
    if (!orgId) { setLoading(false); return }
    const { start, end } = getRange(period, from, to)
    const j = await api.get<{ transfers: Row[]; branches: Branch[] }>('/api/branch-transfer', { org_id: orgId, from: day(start), to: day(end) })
    setRows(j.transfers || []); setBranches(j.branches || []); setLoading(false)
  }

  const nameOf = (id: string) => branches.find(b => b.id === id)?.name || '—'
  const filtered = rows.filter(r => {
    if (branchFilter && r.branch_id !== branchFilter && destOf(r.note) !== nameOf(branchFilter)) return false
    if (!search) return true
    return r.products?.name?.includes(search) || nameOf(r.branch_id).includes(search) || destOf(r.note).includes(search) || (r.by || '').includes(search)
  })

  // لكل فرع: عدد التحويلات المرسلة والمستلمة
  const perBranch = branches.map(b => ({
    name: b.name,
    sent: filtered.filter(r => r.branch_id === b.id).length,
    received: filtered.filter(r => destOf(r.note) === b.name).length,
  })).filter(b => b.sent || b.received)
  // أكثر الأصناف تحويلاً (الكمية لكل وحدة)
  const itemMap: Record<string, { qty: number; unit: string; times: number }> = {}
  filtered.forEach(r => {
    const k = r.products?.name || '—'
    itemMap[k] = itemMap[k] || { qty: 0, unit: r.products?.unit || '', times: 0 }
    itemMap[k].qty += Math.abs(r.qty_change); itemMap[k].times++
  })
  const topItems = Object.entries(itemMap).sort((a, b) => b[1].times - a[1].times || b[1].qty - a[1].qty).slice(0, 5)
  const maxTimes = Math.max(1, ...topItems.map(([, v]) => v.times))

  function exportCSV() {
    const csv = '﻿' + [['التاريخ', 'الوقت', 'الصنف', 'الكمية', 'الوحدة', 'من فرع', 'إلى فرع', 'بواسطة'],
      ...filtered.map(r => [new Date(r.created_at).toLocaleDateString('en-GB'), fmtTime(r.created_at), r.products?.name || '', Math.abs(r.qty_change), r.products?.unit || '', nameOf(r.branch_id), destOf(r.note), r.by || '—'])]
      .map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n')
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })), download: 'تقرير_التحويلات.csv' }).click()
  }
  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const { org } = await pdfOrgInfo()
      const { exportReportPdf } = await import('@/lib/pdfExport')
      await exportReportPdf({
        title: 'تقرير التحويلات بين الفروع',
        subtitle: formatRange(period, from, to),
        orgName: (org as any)?.name || 'Storely',
        logoUrl: '/storely-logo.png',
        columns: [
          { header: 'التاريخ', key: 'date' },
          { header: 'الصنف', key: 'product' },
          { header: 'الكمية', key: 'qty', align: 'left' },
          { header: 'من فرع', key: 'from' },
          { header: 'إلى فرع', key: 'to' },
          { header: 'بواسطة', key: 'by' },
        ],
        rows: filtered.map(r => ({
          date: `${fmtDate(r.created_at)} ${fmtTime(r.created_at)}`,
          product: r.products?.name || '—',
          qty: Math.abs(r.qty_change) + ' ' + (r.products?.unit || ''),
          from: nameOf(r.branch_id), to: destOf(r.note), by: r.by || '—',
        })),
        summaryStats: [
          { label: 'عدد التحويلات', value: String(filtered.length), color: colors.primary },
          { label: 'أصناف مختلفة', value: String(Object.keys(itemMap).length), color: colors.info },
          { label: 'فروع شاركت', value: String(perBranch.length), color: colors.text },
        ],
        fileName: `تقرير-التحويلات-${new Date().toISOString().slice(0, 10)}.pdf`,
      })
    } catch { alert('تعذر تصدير التقرير') }
    setExportingPdf(false)
  }

  return (
    <div>
      <BackBtn onClick={onBack} />
      {filterBar}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8 }}>
        <PeriodBadge period={period} from={from} to={to} />
        <button onClick={handleExportPdf} disabled={exportingPdf || filtered.length === 0}
          style={{ ...btnSecondary, padding: '8px 16px', fontSize: font.xs, opacity: exportingPdf || filtered.length === 0 ? 0.6 : 1, cursor: exportingPdf || filtered.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {exportingPdf ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Loader2 size={14} strokeWidth={2.25} className="spin-icon" /> جاري التصدير...</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FileText size={14} strokeWidth={2.25} /> تصدير PDF</span>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '12px 0 16px' }}>
        {[
          { label: 'عدد التحويلات', value: filtered.length },
          { label: 'أصناف مختلفة', value: Object.keys(itemMap).length },
          { label: 'فروع شاركت', value: perBranch.length },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: '14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.text }}>{s.value}</div>
            <div style={{ fontSize: font.xs, color: colors.text3, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {perBranch.length > 0 && (
        <div style={{ ...card, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: font.base, fontWeight: 800, color: colors.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeftRight size={16} strokeWidth={2.25} /> حركة كل فرع</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {perBranch.map(b => (
              <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span style={{ flex: 1, fontSize: font.sm, fontWeight: 700, color: colors.text }}>{b.name}</span>
                <span style={{ fontSize: font.sm, color: colors.text2 }}>أرسل <b style={{ color: colors.text }}>{b.sent}</b></span>
                <span style={{ fontSize: font.sm, color: colors.text2 }}>استلم <b style={{ color: colors.text }}>{b.received}</b></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topItems.length > 0 && (
        <div style={{ ...card, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: font.base, fontWeight: 800, color: colors.text, marginBottom: 12 }}>أكثر الأصناف تحويلاً</div>
          {topItems.map(([name, v], i) => (
            <div key={name} style={{ marginBottom: i < topItems.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                <span style={{ fontSize: font.sm, fontWeight: 700, color: colors.text }}>{i + 1}. {name}</span>
                <span style={{ fontSize: font.sm, color: colors.text2, whiteSpace: 'nowrap' }}>{v.times} {v.times === 1 ? 'تحويل' : 'تحويلات'} · {v.qty} {v.unit}</span>
              </div>
              <div style={{ height: 5, background: colors.border, borderRadius: 99 }}>
                <div style={{ height: '100%', width: Math.round(v.times / maxTimes * 100) + '%', background: colors.primary, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالصنف أو الفرع أو الموظف..." style={{ ...inp(), flex: 1, minWidth: 160 }} />
          {branches.length > 1 && (
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ ...inp(), width: 'auto' }} aria-label="الفرع">
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button onClick={exportCSV} disabled={filtered.length === 0} style={{ ...btnPrimary, padding: '9px 14px', fontSize: font.xs, display: 'flex', alignItems: 'center', gap: 6, opacity: filtered.length ? 1 : 0.6 }}>
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            تصدير Excel
          </button>
        </div>
        {loading ? <ListSkeleton /> : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center', color: colors.text4 }}><Inbox size={40} strokeWidth={1.5} /></div>
            <div style={{ fontSize: font.base, fontWeight: 700, color: colors.text2 }}>لا توجد تحويلات في هذه الفترة</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="m-cards" style={{ width: '100%', borderCollapse: 'collapse' as const, minWidth: 520 }}>
              <thead>
                <tr style={{ background: colors.bg, borderBottom: `1.5px solid ${colors.border}` }}>
                  {['التاريخ', 'الصنف', 'الكمية', 'من فرع', 'إلى فرع', 'بواسطة'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'start' as const, fontSize: font.xs, fontWeight: 700, color: colors.text3, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td data-label="التاريخ" style={{ padding: '10px 12px', fontSize: font.sm, color: colors.text2, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)} · {fmtTime(r.created_at)}</td>
                    <td data-label="الصنف" style={{ padding: '10px 12px', fontSize: font.sm, fontWeight: 700, color: colors.text }}>{r.products?.name || '—'}</td>
                    <td data-label="الكمية" style={{ padding: '10px 12px', fontSize: font.sm, color: colors.text, whiteSpace: 'nowrap' }}>{Math.abs(r.qty_change)} {r.products?.unit || ''}</td>
                    <td data-label="من فرع" style={{ padding: '10px 12px', fontSize: font.sm, color: colors.text }}>{nameOf(r.branch_id)}</td>
                    <td data-label="إلى فرع" style={{ padding: '10px 12px', fontSize: font.sm, color: colors.text }}>{destOf(r.note)}</td>
                    <td data-label="بواسطة" style={{ padding: '10px 12px', fontSize: font.sm, color: colors.text2 }}>{r.by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
