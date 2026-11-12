'use client'
import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Eye, Wallet, Users, UserPlus, BadgeCheck, Banknote, ChevronDown } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import NumberInput from '@/components/NumberInput'
import { A, Avatar, Badge, Btn, Card, Empty, LinkBtn, Loading, Notice, PageHeader, Stack, Stat, StatGrid, adminFetch, fmtDate, inputStyle } from '../_admin/kit'

const sar = (n: number) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ⃁`

// السفراء: مين جاب مين، وكم يستاهل كل واحد، وتسجيل الصرف
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

  async function act(body: any) { setBusy(body.agent_id + body.action); setErr(''); const j = await adminFetch('/api/admin/agents', { method: 'POST', body }); setBusy(''); if (!j.success) setErr(j.error || 'تعذّر تنفيذ الإجراء'); return j }
  async function reveal(a: any) { const j = await act({ agent_id: a.id, action: 'reveal_iban' }); if (j.success) setIban(m => ({ ...m, [a.id]: j.iban || '—' })) }
  async function toggle(a: any) {
    const to = a.status === 'active' ? 'suspended' : 'active'
    if (to === 'suspended' && !(await confirmDialog({ title: 'إيقاف السفير', message: `إيقاف ${a.name}؟ سيتوقف رابطه ولن يُحتسب له عملاء جدد.`, type: 'warning' }))) return
    const j = await act({ agent_id: a.id, action: 'status', status: to }); if (j.success) load()
  }
  async function submitPay() {
    if (!pay) return
    const a = list.find(x => x.id === pay.id)
    if (!(await confirmDialog({ title: 'تسجيل صرف', message: `تأكيد صرف ${sar(Number(pay.amount))} إلى ${a?.name} ${pay.method === 'transfer' ? 'بتحويل بنكي' : 'نقداً'}؟ سيصله إشعار بذلك.`, type: 'success' }))) return
    const j = await act({ agent_id: pay.id, action: 'payout', amount: Number(pay.amount), method: pay.method, note: pay.note })
    if (j.success) { setPay(null); load() }
  }

  const tot = (k: string) => list.reduce((s, a) => s + Number(a[k] || 0), 0)
  return (
    <>
      <PageHeader title="السفراء" subtitle="عدد المنشآت التي جلبها كل سفير، ومكافآته المستحقة، وما صُرف له"
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />
      <Stack>
      <StatGrid>
        <Stat icon={Users} label="السفراء" value={list.length} />
        <Stat icon={UserPlus} label="منشآت سجّلت عن طريقهم" value={tot('signups')} />
        <Stat icon={BadgeCheck} label="اشتركت ودفعت" value={tot('paidCustomers')} tone="primary" />
        <Stat icon={Banknote} label="المستحق للصرف" value={sar(tot('balance'))} tone={tot('balance') > 0 ? 'warning' : 'default'} />
      </StatGrid>
      {err && <Notice tone="danger">{err}</Notice>}
      {loading ? <Loading /> : !list.length ? <Card><Empty icon={Users} title="لا يوجد سفراء بعد" hint="صفحة التسجيل: storely.dev/agents" /></Card> : (
        <Stack gap={12}>
          {list.map(a => (
            <Card key={a.id}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Avatar name={a.name} size={44} />
                <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</div>
                    <Badge tone="primary">{a.code}</Badge>
                    {a.status !== 'active' && <Badge tone="danger">موقوف</Badge>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: A.text2, marginTop: 8 }}>
                    <span dir="ltr">+{a.phone}</span><span dir="ltr">{a.email}</span>
                    <span>{a.payout_method === 'transfer' ? <>تحويل بنكي · <span dir="ltr">{iban[a.id] || `••••${a.iban_last4 || ''}`}</span></> : 'نقداً'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <Mini label="سجّل في" value={fmtDate(a.created_at)} />
                    <Mini label="سجّلت" value={a.signups} />
                    <Mini label="اشتركت" value={a.paidCustomers} />
                    <Mini label="المكتسب" value={sar(a.earned)} />
                    <Mini label="المصروف" value={sar(a.paid)} />
                  </div>
                </div>
                <div style={{ minWidth: 130, padding: '10px 14px', borderRadius: 12, background: a.balance > 0 ? A.warningSoft : A.muted, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 12, color: A.text2 }}>الرصيد المستحق</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: a.balance > 0 ? A.warning : A.text, fontVariantNumeric: 'tabular-nums' }}>{sar(a.balance)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${A.border}` }}>
                {a.balance > 0 && <Btn small kind="primary" onClick={() => setPay({ id: a.id, amount: String(a.balance), method: a.payout_method === 'transfer' ? 'transfer' : 'cash', note: '' })}><Wallet size={14} /> تسجيل صرف</Btn>}
                <LinkBtn small href={`https://wa.me/${a.phone}`}><MessageCircle size={14} /> واتساب</LinkBtn>
                {a.payout_method === 'transfer' && !iban[a.id] && <Btn small loading={busy === a.id + 'reveal_iban'} onClick={() => reveal(a)}><Eye size={14} /> عرض الآيبان</Btn>}
                <Btn small onClick={() => setOpen(open === a.id ? null : a.id)}><ChevronDown size={14} style={{ transform: open === a.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /> {open === a.id ? 'إخفاء السجل' : 'السجل'}</Btn>
                <span style={{ flex: 1 }} />
                <Btn small kind={a.status === 'active' ? 'danger' : 'secondary'} loading={busy === a.id + 'status'} onClick={() => toggle(a)}>{a.status === 'active' ? 'إيقاف السفير' : 'تفعيل السفير'}</Btn>
              </div>
              {pay?.id === a.id && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${A.border}` }}>
                  <NumberInput value={pay!.amount} onChange={e => { const v = e.target.value; setPay(p => p && { ...p, amount: v }) }} placeholder="المبلغ" style={{ ...inputStyle, width: 130 }} />
                  <select value={pay!.method} onChange={e => { const v = e.target.value as any; setPay(p => p && { ...p, method: v }) }} style={{ ...inputStyle, width: 120 }}><option value="cash">نقداً</option><option value="transfer">تحويل بنكي</option></select>
                  <input value={pay!.note} onChange={e => { const v = e.target.value; setPay(p => p && { ...p, note: v }) }} placeholder="ملاحظة (مثل رقم الحوالة)" maxLength={200} style={{ ...inputStyle, flex: '1 1 200px' }} />
                  <Btn kind="primary" loading={busy === a.id + 'payout'} onClick={submitPay}>تأكيد الصرف</Btn>
                  <Btn kind="ghost" onClick={() => setPay(null)}>إلغاء</Btn>
                </div>
              )}
              {open === a.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${A.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>المكافآت</div>
                    {a.commissions.length ? a.commissions.map((c: any, i: number) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed ${A.border}`, color: c.status === 'cancelled' ? A.text3 : A.text }}><span>{c.org} · {fmtDate(c.created_at)}</span><b style={{ fontWeight: 600 }}>{sar(c.amount)}</b></div>) : <div style={{ color: A.text3 }}>لا توجد مكافآت</div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>الصرف</div>
                    {a.payouts.length ? a.payouts.map((p: any, i: number) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px dashed ${A.border}` }}><span>{fmtDate(p.created_at)} · {p.method === 'transfer' ? 'تحويل بنكي' : 'نقداً'}{p.note ? ` · ${p.note}` : ''}</span><b style={{ fontWeight: 600 }}>{sar(p.amount)}</b></div>) : <div style={{ color: A.text3 }}>لم يُصرف شيء بعد</div>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </Stack>
      )}
      </Stack>
    </>
  )
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: '6px 10px', borderRadius: 9, background: A.muted, fontSize: 12.5 }}>
      <span style={{ color: A.text3 }}>{label} </span><span style={{ color: A.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
