'use client'
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, MessageCircleQuestion, ChevronDown, Building2 } from 'lucide-react'
import { A, Avatar, Badge, Btn, Card, Empty, Loading, PageHeader, Row, SearchBox, Stack, Toolbar, adminFetch, fmtDate } from '../kit'

// سجل أسئلة المساعد الذكي: وش يسأل العملاء — يبيّن وش يهمهم ووين الصفحات مو واضحة
const SECTION_AR: Record<string, string> = {
  subscription: 'الاشتراك', purchases: 'المشتريات', supplier_prices: 'أسعار الموردين', dispense: 'الصرف', inventory: 'المخزون', vat: 'الضريبة',
  cashier_closings: 'الكاشير', attendance: 'الحضور', off_topic: 'سؤال خارج النطاق (لم يُجب عنه)', greeting: 'تحية',
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
      <PageHeader title="أسئلة المساعد الذكي" subtitle="ما يسأله العملاء للمساعد الذكي (آخر 200 سؤال)، لمعرفة اهتماماتهم والصفحات التي تحتاج إلى توضيح"
        actions={<Btn onClick={() => load()} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />
      <Stack>
      {!loading && rows.length > 0 && (
        <Card title="أكثر المواضيع" subtitle={`${rows.length} سؤال من ${orgs} منشأة`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topics.map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 150, flexShrink: 0, fontSize: 13.5, color: A.text }}>{t.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 99, background: A.muted, overflow: 'hidden' }}><div style={{ width: `${(t.n / rows.length) * 100}%`, height: '100%', background: A.primary, borderRadius: 99 }} /></div>
                <span style={{ width: 32, textAlign: 'left', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{t.n}</span>
              </div>
            ))}
            {topics.length === 0 && <div style={{ fontSize: 13, color: A.text3 }}>لا تتطابق الأسئلة الحالية مع أي موضوع محدد</div>}
          </div>
        </Card>
      )}
      <Card pad={0}>
        <Toolbar>
          <SearchBox value={q} onChange={setQ} onSubmit={() => load()} placeholder="ابحث في الأسئلة ثم اضغط Enter" />
          <Btn kind="primary" onClick={() => load()}>بحث</Btn>
        </Toolbar>
        {loading ? <Loading /> : rows.length === 0 ? (
          <Empty icon={MessageCircleQuestion} title={q.trim() ? 'لا توجد أسئلة مطابقة' : 'لا توجد أسئلة بعد'} />
        ) : rows.map(r => (
          <div key={r.id} className="adm-list-row" style={{ borderBottom: `1px solid ${A.border}` }}>
            <Row onClick={() => setOpen(open === r.id ? null : r.id)} style={{ alignItems: 'flex-start', borderBottom: 'none' }}>
              <Avatar name={r.organizations?.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: A.text, lineHeight: 1.7 }}>{r.question}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 12.5, color: A.text3, alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={12} />{r.organizations?.name || '—'}</span>
                  <span>· {r.role === 'manager' ? 'مدير فرع' : 'المالك'}</span>
                  <span>· {fmtDate(r.created_at)}</span>
                  {(r.sections || []).map((s: string) => <Badge key={s} tone="neutral">{SECTION_AR[s] || s}</Badge>)}
                </div>
              </div>
              {r.reply && <ChevronDown size={16} color={A.text3} style={{ transform: open === r.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s', marginTop: 4, flexShrink: 0 }} />}
            </Row>
            {open === r.id && r.reply && (
              <div style={{ margin: '0 20px 16px', marginInlineStart: 66, padding: '12px 14px', borderRadius: 12, background: A.primarySoft, fontSize: 13.5, color: A.text, whiteSpace: 'pre-wrap', lineHeight: 1.9 }}>{r.reply}</div>
            )}
          </div>
        ))}
      </Card>
      </Stack>
    </>
  )
}
