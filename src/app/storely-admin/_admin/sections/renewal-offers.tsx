'use client'
// عروض التجديد والمتابعة (أعلى «طلبات التجديد»): اشتراكات تنتهي خلال 14 يوم بعرض مقترح، وعروض مرسلة ما انْدفعت من 3 أيام
import { useEffect, useState } from 'react'
import { MessageCircle, Send, BellRing } from 'lucide-react'
import NumberInput from '@/components/NumberInput'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Badge, Btn, Card, Table, adminFetch, daysLeft, fmtDate, inputStyle, td } from '../kit'
import { sendOffer, activateOffer, offerStart } from '../offerFlow'
import { suggestRenewal, offerMonthsLabel, offerState, RENEWAL_WINDOW_DAYS, FOLLOWUP_AFTER_DAYS } from '@/lib/offerQuote'

const waLink = (phone: string | null, text: string) => phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : null
const MONTHS = [3, 6, 12]

export default function RenewalOffers({ onMsg }: { onMsg: (m: { t: string; bad?: boolean }) => void }) {
  const [data, setData] = useState<{ followups: any[]; upcoming: any[] } | null>(null)
  const [form, setForm] = useState<Record<string, { months: number; price: string }>>({})
  const [busy, setBusy] = useState('')
  const load = () => adminFetch('/api/admin/offers').then(j => { if (j.success) setData({ followups: j.followups || [], upcoming: j.upcoming || [] }) })
  useEffect(() => { load() }, [])
  const refresh = () => { load(); window.dispatchEvent(new Event('admin-counts-refresh')) }
  if (!data) return null

  async function send(u: any) {
    const f = form[u.org_id] || { months: u.suggestion.months, price: '' }
    const s = suggestRenewal(u.monthly_bill, f.months)
    const amount = Number(f.price) || s.amount
    if (!(amount > 0)) { onMsg({ t: 'اكتب سعر العرض', bad: true }); return }
    if (!u.phone) { onMsg({ t: 'لا يوجد جوال لهذا العميل', bad: true }); return }
    const ok = await confirmDialog({ title: `عرض تجديد لـ ${u.org_name}`, type: 'success', confirmText: 'إرسال العرض',
      message: `تجديد ${offerMonthsLabel(f.months)} بـ ${amount} ر.س${amount < s.list ? ` (بدلاً من ${s.list} ر.س)` : ''}.\n\nيُرسل عرض سعر مستحق الدفع، صالحاً 7 أيام، عبر واتساب إلى ${u.phone} وإلى إيميل المالك. الاشتراك لا يتغيّر حتى يدفع وتفعّله.` })
    if (!ok) return
    setBusy('s' + u.org_id)
    const j = await sendOffer({ orgId: u.org_id, orgName: u.org_name, phone: u.phone, months: f.months, amount, list: s.list, kind: 'renewal', from: offerStart({ type: u.sub_type, ends: u.ends_at }) })
    setBusy('')
    onMsg(j.success ? { t: `أُرسل عرض التجديد إلى ${u.org_name} (#${j.invoiceNumber})` } : { t: j.error || 'تعذّر الإرسال', bad: true })
    if (j.success) load()
  }

  async function pay(f: any) {
    if (!f.owner_id) { onMsg({ t: 'تعذّر إيجاد حساب المالك', bad: true }); return }
    const ok = await confirmDialog({ title: `${f.org_name} دفع؟`, type: 'success', confirmText: 'تفعيل وإرسال الفاتورة',
      message: `تفعيل مدفوع لمدة ${offerMonthsLabel(f.months)} بـ ${Number(f.amount)} ر.س، تبدأ ${f.sub_type === 'paid' && f.ends_at && new Date(f.ends_at).getTime() > Date.now() ? `بعد نهاية اشتراكه الحالي (${fmtDate(f.ends_at)})` : 'من اليوم'}، وتتجدد الإضافات المفعّلة معه، ثم تُرسل فاتورة مدفوعة.` })
    if (!ok) return
    setBusy('p' + f.id)
    const r = await activateOffer({ userId: f.owner_id, orgId: f.org_id, orgName: f.org_name, phone: f.phone || undefined, months: f.months, amount: Number(f.amount), note: f.note || '', kind: f.kind, offerId: f.id, from: offerStart({ type: f.sub_type, ends: f.ends_at }) })
    setBusy('')
    onMsg(r.ok ? { t: r.invoiceNumber ? `فُعّل ${f.org_name} وأُرسلت الفاتورة #${r.invoiceNumber}` : `فُعّل ${f.org_name}${r.invoiceError ? `، لكن ${r.invoiceError}` : ''}`, bad: !!r.invoiceError } : { t: r.error, bad: true })
    refresh()
  }

  async function cancel(f: any) {
    if (!(await confirmDialog({ title: `إلغاء عرض ${f.org_name}؟`, message: 'يختفي من المتابعة ويبقى في سجل العروض بملف العميل.', type: 'warning' }))) return
    const j = await adminFetch('/api/admin/offers', { method: 'POST', body: { id: f.id, action: 'cancel' } })
    if (!j.success) onMsg({ t: j.error || 'تعذّر الإلغاء', bad: true })
    refresh()
  }

  return (
    <>
      {data.followups.length > 0 && (
        <Card title={`عروض تحتاج متابعة (${data.followups.length})`} subtitle={`أُرسلت قبل ${FOLLOWUP_AFTER_DAYS} أيام أو أكثر ولم تُدفع بعد`} pad={0}>
          <Table head={['المنشأة', 'العرض', 'أُرسل', 'تواصل', '']} minWidth={820}>
            {data.followups.map(f => {
              const expired = offerState(f) === 'expired'
              const link = waLink(f.phone, `مرحباً، نتواصل معك من Storely بخصوص عرض ${offerMonthsLabel(f.months)} بـ ${Number(f.amount)} ريال لاشتراك ${f.org_name}. هل تحتاج أي مساعدة في الدفع؟`)
              return (
                <tr key={f.id}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{f.org_name}</div><div style={{ fontSize:13, color: A.text3 }}>{f.owner_name || '—'}</div></td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{f.kind === 'renewal' ? 'تجديد' : 'عرض'} {offerMonthsLabel(f.months)} · {Number(f.amount)} ⃁</div>
                    <div style={{ marginTop: 4 }}>{expired ? <Badge tone="neutral">انتهت صلاحيته {fmtDate(f.valid_until)}</Badge> : <span style={{ fontSize:13, color: A.text3 }}>صالح حتى {fmtDate(f.valid_until)}</span>}</div>
                  </td>
                  <td style={td}>{fmtDate(f.created_at)}</td>
                  <td style={td}>{link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: A.primary, fontWeight: 600, textDecoration: 'none' }}><MessageCircle size={15} /><span dir="ltr">{f.phone}</span></a> : '—'}</td>
                  <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <Btn small kind="primary" loading={busy === 'p' + f.id} disabled={!!busy} onClick={() => pay(f)}>دفع: تفعيل</Btn>
                      <Btn small disabled={!!busy} onClick={() => cancel(f)}>إلغاء</Btn>
                    </span>
                  </td>
                </tr>
              )
            })}
          </Table>
        </Card>
      )}

      <Card title={`تنتهي خلال ${RENEWAL_WINDOW_DAYS} يوماً (${data.upcoming.length})`} subtitle="عرض تجديد مقترح: 6 أشهر بخصم 10% من فاتورته الحالية — عدّل المدة أو السعر ثم أرسل" pad={0}>
        {!data.upcoming.length ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20, fontSize:15, color: A.text3 }}><BellRing size={16} /> لا توجد اشتراكات تنتهي خلال {RENEWAL_WINDOW_DAYS} يوماً</div>
        ) : (
          <Table head={['المنشأة', 'ينتهي', 'الفاتورة الشهرية', 'العرض', '']} minWidth={900}>
            {data.upcoming.map(u => {
              const f = form[u.org_id] || { months: u.suggestion.months, price: '' }
              const s = suggestRenewal(u.monthly_bill, f.months)
              const dl = daysLeft(u.ends_at)
              return (
                <tr key={u.org_id}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{u.org_name}</div><div style={{ fontSize:13, color: A.text3 }}>{u.owner_name || '—'} · {u.sub_type === 'trial' ? 'تجربة' : 'مدفوع'}</div></td>
                  <td style={td}>{fmtDate(u.ends_at)}<div style={{ fontSize:13, color: dl !== null && dl <= 3 ? A.danger : A.text3 }}>بعد {dl} {dl === 1 ? 'يوم' : 'أيام'}</div></td>
                  <td style={td}>{u.monthly_bill ? `${u.monthly_bill} ⃁` : '—'}</td>
                  <td style={td}>
                    {u.offer_open ? <Badge tone="warning">عرض مرسل بانتظار الدفع</Badge> : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select value={f.months} onChange={e => setForm(p => ({ ...p, [u.org_id]: { months: Number(e.target.value), price: '' } }))} style={{ ...inputStyle, width: 92, padding: '6px 8px' }}>
                          {MONTHS.map(m => <option key={m} value={m}>{offerMonthsLabel(m)}</option>)}
                        </select>
                        <NumberInput min={0} value={f.price} placeholder="السعر" aria-label="سعر العرض"
                          onChange={e => setForm(p => ({ ...p, [u.org_id]: { ...f, price: String(e.target.value ?? '') } }))}
                          style={{ ...inputStyle, width: 86, padding: '6px 8px', textAlign: 'center' }} />
                        <span style={{ fontSize:13, color: A.text3, whiteSpace: 'nowrap' }}>{f.price ? `من ${s.list}` : `مقترح ${s.amount} (من ${s.list})`}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'left' }}>
                    {!u.offer_open && <Btn small kind="primary" loading={busy === 's' + u.org_id} disabled={!!busy || !u.phone || !(Number(f.price) || s.amount)} onClick={() => send(u)}><Send size={13} /> إرسال</Btn>}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
    </>
  )
}
