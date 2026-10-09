'use client'
import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Eye, Wallet } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import NumberInput from '@/components/NumberInput'
import { A, Badge, Btn, Card, Empty, Loading, PageHeader, Stat, adminFetch, fmtDate, inputStyle } from '../_admin/kit'

const sar = (n: number) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`

// المناديب: مين جاب مين، وكم يستاهل كل واحد، وتسجيل الصرف
export default function AgentsPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [pay, setPay] = useState<{ id: string; amount: string; method: 'cash' | 'transfer'; note: string } | null>(null)
  const [iban, setIban] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  async function load() { setLoading(true); const j = await adminFetch('/api/admin/agents'); setList(j.agents || []); setLoading(false) }
  useEffect(() => { load() }, [])

  async function act(body: any) { setBusy(body.agent_id + body.action); setErr(''); const j = await adminFetch('/api/admin/agents', { method: 'POST', body }); setBusy(''); if (!j.success) setErr(j.error || 'تعذر'); return j }
  async function reveal(a: any) { const j = await act({ agent_id: a.id, action: 'reveal_iban' }); if (j.success) setIban(m => ({ ...m, [a.id]: j.iban || '—' })) }
  async function toggle(a: any) {
    const to = a.status === 'active' ? 'suspended' : 'active'
    if (to === 'suspended' && !(await confirmDialog({ title: 'إيقاف المندوب', message: `إيقاف ${a.name}؟ رابطه يوقف وما ينحسب له عملاء جدد.`, type: 'warning' }))) return
    const j = await act({ agent_id: a.id, action: 'status', status: to }); if (j.success) load()
  }
  async function submitPay() {
    if (!pay) return
    const a = list.find(x => x.id === pay.id)
    if (!(await confirmDialog({ title: 'تسجيل صرف', message: `صرفت ${sar(Number(pay.amount))} لـ${a?.name} ${pay.method === 'transfer' ? 'بتحويل' : 'كاش'}؟ يوصله إشعار.` }))) return
    const j = await act({ agent_id: pay.id, action: 'payout', amount: Number(pay.amount), method: pay.method, note: pay.note })
    if (j.success) { setPay(null); load() }
  }

  const tot = (k: string) => list.reduce((s, a) => s + Number(a[k] || 0), 0)
  return (
    <>
      <PageHeader title="المناديب" subtitle="كل مندوب: كم منشأة جاب، وكم يستاهل، وكم انصرف له"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="المناديب" value={list.length} />
        <Stat label="منشآت سجّلت عن طريقهم" value={tot('signups')} />
        <Stat label="اشتركت ودفعت" value={tot('paidCustomers')} tone="primary" />
        <Stat label="مستحق للصرف" value={sar(tot('balance'))} tone={tot('balance') > 0 ? 'warning' : 'default'} />
      </div>
      {err && <div style={{ color: A.danger, fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {loading ? <Loading /> : !list.length ? <Card><Empty title="ما فيه مناديب للحين" hint="صفحة التسجيل: storely.dev/agents" /></Card> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(a => (
            <Card key={a.id} pad={18}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{a.name}</div>
                    <Badge tone="primary">{a.code}</Badge>
                    {a.status !== 'active' && <Badge tone="danger">موقوف</Badge>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: A.text2, marginTop: 8 }}>
                    <span dir="ltr">+{a.phone}</span><span dir="ltr">{a.email}</span>
                    <span>{a.payout_method === 'transfer' ? <>تحويل · <span dir="ltr">{iban[a.id] || `••••${a.iban_last4 || ''}`}</span></> : 'كاش'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: A.text3, marginTop: 8 }}>
                    <span>سجّل {fmtDate(a.created_at)}</span><span>{a.signups} سجّلت</span><span>{a.paidCustomers} اشتركت</span><span>المكتسب {sar(a.earned)}</span><span>المصروف {sar(a.paid)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' as const, minWidth: 120 }}>
                  <div style={{ fontSize: 12, color: A.text3 }}>الرصيد</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: a.balance > 0 ? A.warning : A.text }}>{sar(a.balance)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={`https://wa.me/${a.phone}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><Btn small><MessageCircle size={14} /> واتساب</Btn></a>
                  {a.payout_method === 'transfer' && !iban[a.id] && <Btn small loading={busy === a.id + 'reveal_iban'} onClick={() => reveal(a)}><Eye size={14} /> الآيبان</Btn>}
                  {a.balance > 0 && <Btn small kind="primary" onClick={() => setPay({ id: a.id, amount: String(a.balance), method: a.payout_method === 'transfer' ? 'transfer' : 'cash', note: '' })}><Wallet size={14} /> تسجيل صرف</Btn>}
                  <Btn small kind="ghost" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'إخفاء' : 'السجل'}</Btn>
                  <Btn small kind={a.status === 'active' ? 'danger' : 'secondary'} loading={busy === a.id + 'status'} onClick={() => toggle(a)}>{a.status === 'active' ? 'إيقاف' : 'تفعيل'}</Btn>
                </div>
              </div>
              {pay?.id === a.id && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${A.border}` }}>
                  <NumberInput value={pay!.amount} onChange={e => { const v = e.target.value; setPay(p => p && { ...p, amount: v }) }} placeholder="المبلغ" style={{ ...inputStyle, width: 130 }} />
                  <select value={pay!.method} onChange={e => { const v = e.target.value as any; setPay(p => p && { ...p, method: v }) }} style={{ ...inputStyle, width: 120 }}><option value="cash">كاش</option><option value="transfer">تحويل</option></select>
                  <input value={pay!.note} onChange={e => { const v = e.target.value; setPay(p => p && { ...p, note: v }) }} placeholder="ملاحظة (رقم الحوالة مثلاً)" maxLength={200} style={{ ...inputStyle, flex: '1 1 200px' }} />
                  <Btn kind="primary" loading={busy === a.id + 'payout'} onClick={submitPay}>تم الصرف</Btn>
                  <Btn kind="ghost" onClick={() => setPay(null)}>إلغاء</Btn>
                </div>
              )}
              {open === a.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${A.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>المكافآت</div>
                    {a.commissions.length ? a.commissions.map((c: any, i: number) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed ${A.border}`, color: c.status === 'cancelled' ? A.text3 : A.text }}><span>{c.org} · {fmtDate(c.created_at)}</span><b>{sar(c.amount)}</b></div>) : <div style={{ color: A.text3 }}>ما فيه</div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>الصرف</div>
                    {a.payouts.length ? a.payouts.map((p: any, i: number) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed ${A.border}` }}><span>{fmtDate(p.created_at)} · {p.method === 'transfer' ? 'تحويل' : 'كاش'}{p.note ? ` · ${p.note}` : ''}</span><b>{sar(p.amount)}</b></div>) : <div style={{ color: A.text3 }}>ما فيه</div>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
