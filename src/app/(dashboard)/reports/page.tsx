'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'
import { colors, radius, shadow, font, card, btnPrimary, btnSecondary, inp, tag, pageTitle, pageSub } from '@/lib/ds'

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768

function ReportCard({ title, subtitle, icon, color, bg, border, stats, onClick }: any) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100%', textAlign: 'right', border: 'none', cursor: 'pointer', fontFamily: font.family, padding: 0, background: 'transparent' }}>
      <div style={{ background: hov ? bg : colors.surface, borderRadius: radius.xl, border: `2px solid ${hov ? color : colors.border2}`, boxShadow: hov ? `0 8px 32px ${color}22` : shadow.sm, padding: '20px 18px 16px', transition: 'all .25s cubic-bezier(.4,0,.2,1)', transform: hov ? 'translateY(-3px)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', fontWeight: 900, color: colors.text, letterSpacing: '-0.3px', marginBottom: 4, lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 'clamp(0.75rem, 2.8vw, 0.88rem)', color: colors.text3, lineHeight: 1.4 }}>{subtitle}</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: radius.lg, background: bg, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 6, background: colors.bg, borderRadius: radius.md, padding: '12px 10px', marginBottom: 14 }}>
          {stats.map((s: any, i: number) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1rem, 3.5vw, 1.2rem)', fontWeight: 900, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: 'clamp(0.6rem, 2.2vw, 0.72rem)', color: colors.text4, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'clamp(0.78rem, 2.8vw, 0.88rem)', fontWeight: 700, color: hov ? color : colors.text3 }}>اضغط لعرض التفاصيل</span>
          <div style={{ width: 32, height: 32, borderRadius: radius.md, background: hov ? color : colors.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={15} height={15} fill="none" stroke={hov ? 'white' : colors.text3} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
        </div>
      </div>
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...btnSecondary, marginBottom: 18, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 'clamp(0.8rem, 3vw, 0.9rem)' }}>
      <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      العودة للتقارير
    </button>
  )
}

function MobileDispenseCard({ m }: { m: any }) {
  return (
    <div style={{ background: '#fafbfc', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 'clamp(0.9rem, 3.2vw, 1rem)', fontWeight: 700, color: colors.text, lineHeight: 1.3, flex: 1, minWidth: 0 }}>{(m.products as any)?.name || '—'}</div>
        <div style={{ fontSize: 'clamp(0.7rem, 2.6vw, 0.8rem)', color: colors.text4, whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'left' }}>
          {new Date(m.created_at).toLocaleDateString('ar-SA')}
          <div style={{ fontSize: 'clamp(0.6rem, 2.2vw, 0.68rem)', marginTop: 2 }}>{new Date(m.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: colors.dangerLight, border: `1px solid ${colors.dangerBorder}`, borderRadius: 8, fontSize: 'clamp(0.8rem, 3vw, 0.88rem)', fontWeight: 700, color: colors.danger }}>{'\u25BC'} {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span>
        <span style={{ fontSize: 'clamp(0.75rem, 2.8vw, 0.85rem)', color: colors.text4, flex: 1, minWidth: 120 }}>{m.note || '\u2014'}</span>
      </div>
    </div>
  )
}

function MobilePurchaseCard({ p }: { p: any }) {
  const cs = p.category === '\u0645\u062E\u0632\u0648\u0646' ? { bg: colors.primaryLight, text: colors.primary, border: colors.primaryBorder } : p.category === '\u0635\u064A\u0627\u0646\u0629' ? { bg: colors.warningLight, text: colors.warning, border: colors.warningBorder } : { bg: colors.bg, text: colors.text3, border: colors.border2 }
  return (
    <div style={{ background: '#fafbfc', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 'clamp(0.65rem, 2.4vw, 0.75rem)', fontWeight: 700, background: cs.bg, color: cs.text, marginBottom: 6 }}>{p.category || '\u0623\u062E\u0631\u0649'}</span>
          <div style={{ fontSize: 'clamp(0.88rem, 3.2vw, 1rem)', fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>{p.name || '\u2014'}</div>
        </div>
        <div style={{ fontSize: 'clamp(0.7rem, 2.6vw, 0.8rem)', color: colors.text4, whiteSpace: 'nowrap', flexShrink: 0 }}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</div>
      </div>
      {[
        { lbl: '\u0628\u062F\u0648\u0646 \u0636\u0631\u064A\u0628\u0629', val: Number(p.amount || 0).toFixed(2), clr: colors.text2, bold: false },
        { lbl: '\u0627\u0644\u0636\u0631\u064A\u0628\u0629 15%', val: Number(p.vat_amount || 0).toFixed(2), clr: colors.warning, bold: true },
        { lbl: '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A', val: Number(p.total_amount || 0).toFixed(2), clr: colors.primary, bold: true }
      ].map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? `1px dashed ${colors.border}` : 'none', marginTop: i === 0 ? 8 : 0 }}>
          <span style={{ fontSize: 'clamp(0.7rem, 2.6vw, 0.8rem)', color: row.bold ? row.clr : colors.text4, fontWeight: row.bold ? 800 : 600 }}>{row.lbl}</span>
          <span style={{ fontSize: row.bold ? 'clamp(0.95rem, 3.5vw, 1.1rem)' : 'clamp(0.85rem, 3.2vw, 0.95rem)', fontWeight: row.bold ? 900 : 800, color: row.clr }}>{row.val} \u0631.\u0633</span>
        </div>
      ))}
      {p.supplier && <div style={{ fontSize: 'clamp(0.72rem, 2.7vw, 0.82rem)', color: colors.text3, marginTop: 8 }}>{'\uD83C\uDFEF'} {p.supplier}</div>}
    </div>
  )
}

function DispenseDetail({ onBack }: { onBack: () => void }) {
  const [movements, setMovements] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [mobile, setMobile] = useState(false)
  const sb = createClient()
  
  useEffect(() => {
    setMobile(isMobile())
    const h = () => setMobile(isMobile())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  
  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [movements, search, dateFrom, dateTo])
  useVisibilityRefresh(load, 20 * 60 * 1000)

  async function load() {
    setLoading(true)
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) { setLoading(false); return }
    const { data } = await sb.from('stock_movements').select('*,products!inner(name,unit,org_id)').eq('type', 'out').eq('products.org_id', orgId).order('created_at', { ascending: false })
    setMovements(data || []); setLoading(false)
  }

  function applyFilter() {
    let r = [...movements]
    if (search) r = r.filter((m: any) => (m.products as any)?.name?.includes(search) || m.note?.includes(search))
    if (dateFrom) r = r.filter((m: any) => new Date(m.created_at) >= new Date(dateFrom))
    if (dateTo) r = r.filter((m: any) => new Date(m.created_at) <= new Date(dateTo + 'T23:59:59'))
    setFiltered(r)
  }

  function exportCSV() {
    const hdr = ['\u0627\u0644\u062A\u0627\u0631\u064A\u062E','\u0627\u0644\u0645\u0646\u062A\u062C','\u0627\u0644\u0643\u0645\u064A\u0629','\u0627\u0644\u0648\u062D\u062F\u0629','\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629']
    const rows = filtered.map((m: any) => [new Date(m.created_at).toLocaleDateString('ar-SA'), (m.products as any)?.name || '', Math.abs(m.qty_change), (m.products as any)?.unit || '', m.note || ''])
    const csv = '\ufeff' + [hdr, ...rows].map((r: string[]) => r.map(c => '"' + c + '"').join(',')).join('\n')
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })), download: '\u062A\u0642\u0631\u064A\u0631_\u0627\u0644\u0635\u0631\u0641.csv' }).click()
  }

  const totalQty = filtered.reduce((s: number, m: any) => s + Math.abs(m.qty_change), 0)
  const productMap: Record<string, number> = {}
  filtered.forEach((m: any) => { const n = (m.products as any)?.name || '\u2014'; productMap[n] = (productMap[n] || 0) + Math.abs(m.qty_change) })
  const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const barColors = [colors.danger, colors.info, '#8b5cf6', colors.warning, '#06b6d4']
  const hasFilter = !!(search || dateFrom || dateTo)

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h1 style={{ ...pageTitle, fontSize: 'clamp(1.3rem, 5vw, 1.6rem)', marginBottom: 16 }}>\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0635\u0631\u0641</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {[{ l: '\u0643\u0645\u064A\u0627\u062A \u0645\u0635\u0631\u0648\u0641\u0629', v: totalQty, c: colors.danger, bg: colors.dangerLight, b: colors.dangerBorder }, { l: '\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0635\u0631\u0641', v: filtered.length, c: colors.info, bg: colors.infoLight, b: colors.infoBorder }, { l: '\u0623\u0635\u0646\u0627\u0641 \u0645\u062E\u062A\u0644\u0641\u0629', v: Object.keys(productMap).length, c: '#8b5cf6', bg: '#f5f3ff', b: '#ddd6fe' }].map((s, i) => (
          <div key={i} style={{ ...card, padding: '14px 12px', textAlign: 'center', borderColor: s.b, background: s.bg }}>
            <div style={{ fontSize: 'clamp(1.1rem, 4.5vw, 1.5rem)', fontWeight: 900, color: s.c, letterSpacing: '-1px', lineHeight: 1.2 }}>{s.v}</div>
            <div style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)', color: colors.text3, marginTop: 5, fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {topProducts.length > 0 && (
        <div style={{ ...card, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 'clamp(0.85rem, 3.2vw, 1rem)', fontWeight: 700, color: colors.text, marginBottom: 14 }}>{'\uD83C\uDFC6'} \u0627\u0644\u0623\u0643\u062B\u0631 \u0635\u0631\u0641\u0627\u064B</div>
          {topProducts.map(([name, qty], i) => {
            const pct = Math.round((Number(qty) / Number(topProducts[0][1])) * 100)
            return (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < topProducts.length - 1 ? 12 : 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: radius.sm, background: barColors[i] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 11, fontWeight: 800, color: barColors[i] }}>{i + 1}</span></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontSize: 'clamp(0.82rem, 3vw, 0.92rem)', fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span><span style={{ fontSize: 'clamp(0.82rem, 3vw, 0.92rem)', fontWeight: 800, color: barColors[i], marginRight: 8 }}>{qty}</span></div>
                <div style={{ height: 6, background: colors.border, borderRadius: 99 }}><div style={{ height: '100%', width: pct + '%', background: barColors[i], borderRadius: 99 }} /></div>
              </div>
            </div>)
          })}
        </div>
      )}

      <div style={{ ...card, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="\u0627\u0628\u062D\u062B \u0639\u0646 \u0645\u0646\u062A\u062C \u0623\u0648 \u0645\u0644\u0627\u062D\u0638\u0629..." style={{ ...inp(), flex: '1 1 160px', minWidth: 0, fontSize: 'clamp(0.82rem, 3vw, 0.9rem)', padding: '10px 14px' }} />
          <button onClick={() => setShowFilter(!showFilter)} style={{ ...btnSecondary, padding: '10px 14px', fontSize: 'clamp(0.7rem, 2.6vw, 0.82rem)', background: showFilter ? colors.primaryLight : colors.surface, borderColor: showFilter ? colors.primaryBorder : colors.border2, color: showFilter ? colors.primary : colors.text3, whiteSpace: 'nowrap' }}>{'\uD83D\uDCC5'} \u062A\u0627\u0631\u064A\u062E</button>
          <button onClick={exportCSV} style={{ ...btnPrimary, padding: '10px 16px', fontSize: 'clamp(0.7rem, 2.6vw, 0.82rem)', whiteSpace: 'nowrap' }}>{'\uD83D\uDCE5'} \u062A\u0635\u062F\u064A\u0631</button>
          {hasFilter && <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setShowFilter(false) }} style={{ ...btnSecondary, padding: '10px 12px', fontSize: 'clamp(0.7rem, 2.6vw, 0.82rem)', color: colors.danger, borderColor: colors.dangerBorder }}>{'\u2715'}</button>}
        </div>
        {showFilter && (<div style={{ padding: '14px 12px', borderBottom: `1px solid ${colors.border}`, background: colors.bg, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 'clamp(0.68rem, 2.5vw, 0.78rem)', fontWeight: 700, color: colors.text4, display: 'block', marginBottom: 5 }}>\u0645\u0646 \u062A\u0627\u0631\u064A\u062E</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp(), width: '100%', padding: '9px 10px', fontSize: 'clamp(0.8rem, 3vw, 0.88rem)' }} /></div>
          <div><label style={{ fontSize: 'clamp(0.68rem, 2.5vw, 0.78rem)', fontWeight: 700, color: colors.text4, display: 'block', marginBottom: 5 }}>\u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp(), width: '100%', padding: '9px 10px', fontSize: 'clamp(0.8rem, 3vw, 0.88rem)' }} /></div>
        </div>)}
      </div>

      <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
        {loading ? (<div style={{ padding: 50, textAlign: 'center' }}><div style={{ width: 32, height: 32, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 14px' }} /><div style={{ fontSize: 'clamp(0.85rem, 3.2vw, 0.95rem)', color: colors.text4 }}>\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...</div></div>) :
          filtered.length === 0 ? (<div style={{ padding: 50, textAlign: 'center' }}><div style={{ fontSize: 42, marginBottom: 12 }}>{'\uD83D\uDCEC'}</div><div style={{ fontSize: 'clamp(0.95rem, 3.5vw, 1.1rem)', fontWeight: 600, color: colors.text2 }}>\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C</div></div>) : (
            mobile ? (
              <div style={{ padding: 8 }}>{filtered.map((m: any) => <MobileDispenseCard key={m.id} m={m} />)}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                  <thead><tr style={{ background: colors.bg, borderBottom: `2px solid ${colors.border}` }}>{['\u0627\u0644\u062A\u0627\u0631\u064A\u062E','\u0627\u0644\u0645\u0646\u062A\u062C','\u0627\u0644\u0643\u0645\u064A\u0629','\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0629'].map((h, i) => (<th key={i} style={{ padding: '10px 14px', color: colors.text4, fontSize: 'clamp(0.68rem, 2.5vw, 0.78rem)', fontWeight: 700, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>))}</tr></thead>
                  <tbody>{filtered.map((m: any, i: number) => (<tr key={m.id} style={{ borderBottom: `1px solid ${colors.border}`, background: i % 2 === 0 ? colors.surface : colors.bg }}>
                    <td style={{ padding: '11px 14px', fontSize: 'clamp(0.78rem, 2.9vw, 0.88rem)', color: colors.text3, whiteSpace: 'nowrap' }}>{new Date(m.created_at).toLocaleDateString('ar-SA')}<div style={{ fontSize: 10, color: colors.text4 }}>{new Date(m.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div></td>
                    <td style={{ padding: '11px 14px', fontSize: 'clamp(0.82rem, 3vw, 0.92rem)', fontWeight: 700, color: colors.text }}>{(m.products as any)?.name}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ ...tag(colors.danger, colors.dangerLight, colors.dangerBorder), fontSize: 'clamp(0.78rem, 2.9vw, 0.88rem)', padding: '4px 10px' }}>{'\u25BC'} {Math.abs(m.qty_change)} {(m.products as any)?.unit}</span></td>
                    <td style={{ padding: '11px 14px', fontSize: 'clamp(0.75rem, 2.8vw, 0.85rem)', color: colors.text4 }}>{m.note || '\u2014'}</td>
                  </tr>))}</tbody>
                </table>
              </div>
            )
          )}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 16px', background: colors.primaryLight, borderTop: `2px solid ${colors.primaryBorder}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', fontWeight: 700, color: colors.primary }}>{filtered.length} \u0639\u0645\u0644\u064A\u0629</span>
            <span style={{ fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', fontWeight: 800, color: colors.primary }}>{totalQty} \u0648\u062D\u062F\u0629 \u0645\u0635\u0631\u0648\u0641\u0629</span>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
    </div>
  )
}

function PurchaseDetail({ onBack }: { onBack: () => void }) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [mobile, setMobile] = useState(false)
  const sb = createClient()
  
  useEffect(() => {
    setMobile(isMobile())
    const h = () => setMobile(isMobile())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  
  useEffect(() => { load() }, [])
  useEffect(() => { applyFilter() }, [purchases, search, filterCat, dateFrom, dateTo])

  async function load() {
    setLoading(true)
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) { setLoading(false); return }
    const { data } = await sb.from('purchases').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    setPurchases(data || []); setLoading(false)
  }

  function applyFilter() {
    let r = [...purchases]
    if (search) r = r.filter((p: any) => p.name?.includes(search) || p.supplier?.includes(search))
    if (filterCat) r = r.filter((p: any) => p.category === filterCat)
    if (dateFrom) r = r.filter((p: any) => new Date(p.created_at) >= new Date(dateFrom))
    if (dateTo) r = r.filter((p: any) => new Date(p.created_at) <= new Date(dateTo + 'T23:59:59'))
    setFiltered(r)
  }

  function exportCSV() {
    const hdr = ['\u0627\u0644\u062A\u0627\u0631\u064A\u062E','\u0627\u0644\u0635\u0646\u0641','\u0627\u0644\u0646\u0648\u0639','\u0628\u062F\u0648\u0646 \u0636\u0631\u064A\u0628\u0629','\u0627\u0644\u0636\u0631\u064A\u0628\u0629','\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A','\u0627\u0644\u0645\u0648\u0631\u062F']
    const rows = filtered.map((p: any) => [new Date(p.created_at).toLocaleDateString('ar-SA'), p.name || '', p.category || '', Number(p.amount || 0).toFixed(2), Number(p.vat_amount || 0).toFixed(2), Number(p.total_amount || 0).toFixed(2), p.supplier || ''])
    const csv = '\ufeff' + [hdr, ...rows].map((r: string[]) => r.map(c => '"' + c + '"').join(',')).join('\n')
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })), download: '\u062A\u0642\u0631\u064A\u0631_\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A.csv' }).click()
  }

  const totalAmount = filtered.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const totalVat = filtered.reduce((s: number, p: any) => s + Number(p.vat_amount || 0), 0)
  const totalWithVat = filtered.reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0)
  const hasFilter = !!(search || filterCat || dateFrom || dateTo)

  function catTag(c: string) {
    if (c === '\u0645\u062E\u0632\u0648\u0646') return tag(colors.primary, colors.primaryLight, colors.primaryBorder)
    if (c === '\u0635\u064A\u0627\u0646\u0629') return tag(colors.warning, colors.warningLight, colors.warningBorder)
    return tag(colors.text3, colors.bg, colors.border2)
  }

  return (
    <div>
      <BackBtn onClick={onBack} />
      <h1 style={{ ...pageTitle, fontSize: 'clamp(1.3rem, 5vw, 1.6rem)', marginBottom: 16 }}>\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {[{ l: '\u0628\u062F\u0648\u0646 \u0636\u0631\u064A\u0628\u0629', v: totalAmount.toFixed(2) + ' \u0631.\u0633', c: colors.text2, bg: colors.bg, b: colors.border2 }, { l: '\u0636\u0631\u064A\u0628\u0629 15%', v: totalVat.toFixed(2) + ' \u0631.\u0633', c: colors.warning, bg: colors.warningLight, b: colors.warningBorder }, { l: '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0634\u0627\u0645\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u0629', v: totalWithVat.toFixed(2) + ' \u0631.\u0633', c: colors.primary, bg: colors.primaryLight, b: colors.primaryBorder }, { l: '\u0639\u062F\u062F \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631', v: filtered.length, c: colors.info, bg: colors.infoLight, b: colors.infoBorder }].map((s, i) => (
          <div key={i} style={{ ...card, padding: '14px 12px', textAlign: 'center', borderColor: s.b, background: s.bg }}>
            <div style={{ fontSize: 'clamp(1rem, 4vw, 1.3rem)', fontWeight: 900, color: s.c, letterSpacing: '-0.5px', lineHeight: 1.2 }}>{s.v}</div>
            <div style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)', color: colors.text3, marginTop: 5, fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="\u0627\u0628\u062D\u062B \u0628\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641 \u0623\u0648 \u0627\u0644\u0645\u0648\u0631\u062F..." style={{ ...inp(), flex: '1 1 150px', minWidth: 0, fontSize: 'clamp(0.82rem, 3vw, 0.9rem)', padding: '10px 14px' }} />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inp(), width: 'auto', minWidth: 110, padding: '10px 12px', fontSize: 'clamp(0.8rem, 3vw, 0.88rem)' }}><option value="">\u0643\u0644 \u0627\u0644\u0623\u0646\u0648\u0627\u0639</option><option value="\u0645\u062E\u0632\u0648\u0646">\u0645\u062E\u0632\u0648\u0646</option><option value="\u0635\u064A\u0627\u0646\u0629">\u0635\u064A\u0627\u0646\u0629</option><option value="\u0623\u062E\u0631\u0649">\u0623\u062E\u0631\u0649</option></select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp(), width: 'auto', minWidth: 130, padding: '10px 10px', fontSize: 'clamp(0.78rem, 2.9vw, 0.86rem)' }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp(), width: 'auto', minWidth: 130, padding: '10px 10px', fontSize: 'clamp(0.78rem, 2.9vw, 0.86rem)' }} />
          <button onClick={exportCSV} style={{ ...btnPrimary, padding: '10px 16px', fontSize: 'clamp(0.7rem, 2.6vw, 0.82rem)', whiteSpace: 'nowrap' }}>{'\uD83D\uDCE5'} \u062A\u0635\u062F\u064A\u0631</button>
          {hasFilter && <button onClick={() => { setSearch(''); setFilterCat(''); setDateFrom(''); setDateTo('') }} style={{ ...btnSecondary, padding: '10px 12px', fontSize: 'clamp(0.7rem, 2.6vw, 0.82rem)', color: colors.danger, borderColor: colors.dangerBorder }}>{'\u2715'}</button>}
        </div>
      </div>

      <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
        {loading ? (<div style={{ padding: 50, textAlign: 'center' }}><div style={{ width: 32, height: 32, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 14px' }} /></div>) :
          filtered.length === 0 ? (<div style={{ padding: 50, textAlign: 'center' }}><div style={{ fontSize: 42, marginBottom: 12 }}>{'\uD83D\uDCDD'}</div><div style={{ fontSize: 'clamp(0.95rem, 3.5vw, 1.1rem)', fontWeight: 600, color: colors.text2 }}>\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C</div></div>) : (
            mobile ? (
              <div style={{ padding: 8 }}>{filtered.map((p: any) => <MobilePurchaseCard key={p.id} p={p} />)}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead><tr style={{ background: colors.bg, borderBottom: `2px solid ${colors.border}` }}>{['\u0627\u0644\u062A\u0627\u0631\u064A\u062E','\u0627\u0644\u0635\u0646\u0641','\u0627\u0644\u0646\u0648\u0639','\u0628\u062F\u0648\u0646 \u0636\u0631\u064A\u0628\u0629','\u0636\u0631\u064A\u0628\u0629 15%','\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A','\u0627\u0644\u0645\u0648\u0631\u062F','\u0641\u0627\u062A\u0648\u0631\u0629'].map((h, i) => (<th key={i} style={{ padding: '10px 12px', color: colors.text4, fontSize: 'clamp(0.65rem, 2.4vw, 0.76rem)', fontWeight: 700, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>))}</tr></thead>
                  <tbody>{filtered.map((p: any, i: number) => (<tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}`, background: i % 2 === 0 ? colors.surface : colors.bg }}>
                    <td style={{ padding: '11px 12px', fontSize: 'clamp(0.75rem, 2.8vw, 0.85rem)', color: colors.text3, whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td>
                    <td style={{ padding: '11px 12px', fontSize: 'clamp(0.82rem, 3vw, 0.92rem)', fontWeight: 700, color: colors.text }}>{p.name}</td>
                    <td style={{ padding: '11px 12px' }}><span style={catTag(p.category)}>{p.category}</span></td>
                    <td style={{ padding: '11px 12px', fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', color: colors.text2 }}>{Number(p.amount || 0).toFixed(2)} \u0631.\u0633</td>
                    <td style={{ padding: '11px 12px', fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', color: colors.warning, fontWeight: 600 }}>{Number(p.vat_amount || 0).toFixed(2)} \u0631.\u0633</td>
                    <td style={{ padding: '11px 12px', fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', fontWeight: 700, color: colors.primary }}>{Number(p.total_amount || 0).toFixed(2)} \u0631.\u0633</td>
                    <td style={{ padding: '11px 12px', fontSize: 'clamp(0.72rem, 2.7vw, 0.82rem)', color: colors.text4 }}>{p.supplier || '\u2014'}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'center' }}>{p.invoice_image ? <a href={p.invoice_image} target="_blank" rel="noreferrer" style={{ color: colors.info, fontSize: 'clamp(0.7rem, 2.6vw, 0.8rem)', fontWeight: 600, textDecoration: 'none' }}>{'\uD83D\uDCC7'} \u0639\u0631\u0636</a> : <span style={{ color: colors.text5 }}>\u2014</span>}</td>
                  </tr>))}</tbody>
                  <tfoot><tr style={{ background: colors.primaryLight, borderTop: `2px solid ${colors.primaryBorder}` }}>
                    <td colSpan={3} style={{ padding: '12px 12px', fontWeight: 800, fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', color: colors.text }}>\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A ({filtered.length} \u0641\u0627\u062A\u0648\u0631\u0629)</td>
                    <td style={{ padding: '12px 12px', fontWeight: 700, fontSize: 'clamp(0.8rem, 3vw, 0.9rem)' }}>{totalAmount.toFixed(2)} \u0631.\u0633</td>
                    <td style={{ padding: '12px 12px', fontWeight: 700, fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', color: colors.warning }}>{totalVat.toFixed(2)} \u0631.\u0633</td>
                    <td colSpan={3} style={{ padding: '12px 12px', fontWeight: 900, fontSize: 'clamp(0.9rem, 3.4vw, 1.05rem)', color: colors.primary }}>{totalWithVat.toFixed(2)} \u0631.\u0633</td>
                  </tr></tfoot>
                </table>
              </div>
            )
          )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
    </div>
  )
}

export default function ReportsPage() {
  const [view, setView] = useState<'home' | 'dispense' | 'purchase'>('home')
  const [dispenseStats, setDispenseStats] = useState({ ops: 0, qty: 0, items: 0 })
  const [purchaseStats, setPurchaseStats] = useState({ invoices: 0, total: 0, vat: 0 })
  const sb = createClient()
  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const orgId = sessionStorage.getItem('s_org_id')
    if (!orgId) return
    const [{ data: mv }, { data: pu }] = await Promise.all([
      sb.from('stock_movements').select('qty_change,products!inner(name,org_id)').eq('type', 'out').eq('products.org_id', orgId),
      sb.from('purchases').select('amount,total_amount,vat_amount').eq('org_id', orgId),
    ])
    const items = new Set((mv || []).map((m: any) => m.products?.name)).size
    setDispenseStats({ ops: (mv || []).length, qty: (mv || []).reduce((s: number, m: any) => s + Math.abs(m.qty_change), 0), items })
    setPurchaseStats({ invoices: (pu || []).length, total: (pu || []).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0), vat: (pu || []).reduce((s: number, p: any) => s + Number(p.vat_amount || 0), 0) })
  }

  if (view === 'dispense') return (<div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 1000, margin: '0 auto', padding: '0 12px' }}><DispenseDetail onBack={() => setView('home')} /></div>)
  if (view === 'purchase') return (<div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 1000, margin: '0 auto', padding: '0 12px' }}><PurchaseDetail onBack={() => setView('home')} /></div>)

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl', maxWidth: 680, margin: '0 auto', padding: '0 12px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ ...pageTitle, fontSize: 'clamp(1.5rem, 5.5vw, 2rem)' }}>\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631</h1>
        <p style={{ ...pageSub, fontSize: 'clamp(0.85rem, 3.2vw, 1rem)' }}>\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0630\u064A \u062A\u0631\u064A\u062F \u0639\u0631\u0636\u0647</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ReportCard title="\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0635\u0631\u0641" subtitle="\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0635\u0631\u0641 \u0645\u0646 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0645\u0639 \u062A\u0641\u0627\u0635\u0644 \u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0648\u0627\u0644\u0623\u0633\u0628\u0627\u0628" icon={'\uD83D\uDCE4'} color={colors.danger} bg={colors.dangerLight} border={colors.dangerBorder} stats={[{ label: '\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0635\u0631\u0641', value: dispenseStats.ops, color: colors.danger }, { label: '\u0648\u062D\u062F\u0627\u062A \u0645\u0635\u0631\u0648\u0641\u0629', value: dispenseStats.qty, color: colors.danger }, { label: '\u0623\u0635\u0646\u0627\u0641 \u0645\u062E\u062A\u0644\u0641\u0629', value: dispenseStats.items, color: colors.danger }]} onClick={() => setView('dispense')} />
        <ReportCard title="\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A" subtitle="\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u0639 \u062D\u0633\u0627\u0628 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 15%" icon={'\uD83D\uDCDD'} color={colors.primary} bg={colors.primaryLight} border={colors.primaryBorder} stats={[{ label: '\u0639\u062F\u062F \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631', value: purchaseStats.invoices, color: colors.primary }, { label: '\u0625\u062C\u0645\u0627\u0644\u064A \u0634\u0627\u0645\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u0629', value: purchaseStats.total.toLocaleString('ar-SA', { maximumFractionDigits: 0 }) + ' \u0631.\u0633', color: colors.primary }, { label: '\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629', value: purchaseStats.vat.toLocaleString('ar-SA', { maximumFractionDigits: 0 }) + ' \u0631.\u0633', color: colors.warning }]} onClick={() => setView('purchase')} />
      </div>
    </div>
  )
}
