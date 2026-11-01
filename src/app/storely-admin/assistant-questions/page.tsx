'use client'
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { A, Badge, Btn, Card, Loading, PageHeader, adminFetch, fmtDate, inputStyle } from '../_admin/kit'

// سجل أسئلة المساعد الذكي: وش يسأل العملاء — يبيّن وش يهمهم ووين الصفحات مو واضحة
const SECTION_AR: Record<string, string> = {
  subscription: 'الاشتراك', purchases: 'المشتريات', supplier_prices: 'أسعار الموردين', dispense: 'الصرف', inventory: 'المخزون', vat: 'الضريبة',
  cashier_closings: 'الكاشير', attendance: 'الحضور', off_topic: 'سؤال خارجي (ما انرد عليه)', greeting: 'تحية',
}
// كلمات تبيّن نوع السؤال — للإحصائية فوق
const TOPICS: [string, RegExp][] = [
  ['الاشتراك والباقات', /اشتراك|باق|فاتور|ينتهي|ترقي|إضاف|اضاف|سعر/],
  ['كيف أستخدم', /كيف|وين|طريقة|أضيف|اضيف|أسوي|اسوي/],
  ['المخزون والطلب', /مخزون|صنف|أصناف|اصناف|ينفد|يخلص|طلب|مورد/],
  ['الموظفين والحضور', /موظف|حضور|تأخر|غاب|دوام|شفت|راتب/],
  ['المبيعات والأرباح', /مبيع|كاشير|ربح|مصروف|دخل/],
]

export default function AssistantQuestionsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  async function load(search = q) {
    setLoading(true)
    const j = await adminFetch(`/api/admin/assistant-questions${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`)
    setRows(j.questions || [])
    setLoading(false)
  }
  useEffect(() => { load('') }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const topics = useMemo(() => TOPICS.map(([label, re]) => ({ label, n: rows.filter(r => re.test(r.question)).length })).filter(t => t.n).sort((a, b) => b.n - a.n), [rows])
  const orgs = useMemo(() => new Set(rows.map(r => r.org_id)).size, [rows])

  return (
    <>
      <PageHeader title="أسئلة المساعد الذكي" subtitle="وش يسأل العملاء المساعد — آخر 200 سؤال" actions={<Btn small onClick={() => load()}><RefreshCw size={14} /> تحديث</Btn>} />
      <Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="ابحث في الأسئلة..." style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
          <Btn kind="primary" onClick={() => load()}>بحث</Btn>
        </div>
        {!loading && rows.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, fontSize: 12.5, color: A.text2 }}>
            <span>{rows.length} سؤال من {orgs} منشأة ·</span>
            {topics.map(t => <Badge key={t.label} tone="neutral">{t.label}: {t.n}</Badge>)}
          </div>
        )}
      </Card>
      <div style={{ marginTop: 14 }}>
        {loading ? <Loading /> : rows.length === 0 ? (
          <Card><div style={{ fontSize: 13, color: A.text3 }}>ما فيه أسئلة للحين</div></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(r => (
              <Card key={r.id}>
                <button onClick={() => setOpen(open === r.id ? null : r.id)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: A.text }}>{r.question}</div>
                    <span style={{ fontSize: 11.5, color: A.text3, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, fontSize: 12, color: A.text3 }}>
                    <span>{r.organizations?.name || '—'}</span>
                    <span>· {r.role === 'manager' ? 'مدير فرع' : 'المالك'}</span>
                    {(r.sections || []).length > 0 && <span>· استخدم: {(r.sections || []).map((s: string) => SECTION_AR[s] || s).join('، ')}</span>}
                  </div>
                </button>
                {open === r.id && r.reply && (
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: A.primarySoft, fontSize: 13, color: A.text2, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{r.reply}</div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
