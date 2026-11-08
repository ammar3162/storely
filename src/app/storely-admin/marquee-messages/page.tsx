'use client'
import { useEffect, useState } from 'react'
import { Pencil, Trash2, Eye, EyeOff, Plus, Megaphone } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Badge, Btn, Card, Empty, Field, Loading, Notice, PageHeader, Row, adminFetch, inputStyle } from '../_admin/kit'

export default function MarqueeMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  async function load() {
    setLoading(true)
    const d = await adminFetch('/api/admin/marquee-messages')
    setMessages(d.messages || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addMessages() {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setMsg({ ok: false, t: 'اكتب رسالة واحدة على الأقل' }); return }
    setSaving(true); setMsg(null)
    const d = await adminFetch('/api/admin/marquee-messages', { method: 'POST', body: { messages: lines } })
    if (d.success) { setText(''); setMsg({ ok: true, t: `تمت إضافة ${d.count} رسالة` }); load() }
    else setMsg({ ok: false, t: d.error || 'تعذّرت الإضافة' })
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m))
    const d = await adminFetch('/api/admin/marquee-messages', { method: 'PATCH', body: { id, is_active: !current } })
    if (!d.ok) load()
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return
    setSavingEdit(true)
    await adminFetch('/api/admin/marquee-messages', { method: 'PATCH', body: { id, message: editText.trim() } })
    setSavingEdit(false); setEditingId(null)
    load()
  }

  async function deleteMessage(id: string) {
    if (!(await confirmDialog({ title: 'حذف الرسالة', message: 'حذف هذه الرسالة من الشريط؟' }))) return
    await adminFetch('/api/admin/marquee-messages', { method: 'DELETE', body: { id } })
    load()
  }

  const activeCount = messages.filter(m => m.is_active).length
  const active = messages.filter(m => m.is_active)

  return (
    <>
      <PageHeader title="الشريط الإخباري" subtitle="رسائل الشريط المتحرك أعلى الصفحة الرئيسية لموقع Storely، وتتناوب فيما بينها" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
        <Card title="معاينة الشريط" subtitle="كما يظهر للزوار الآن">
          <div style={{ borderRadius: 12, background: '#0b3b3a', color: 'white', padding: '9px 16px', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', gap: 28, fontSize: 13.5, fontWeight: 500 }}>
            {active.length ? active.map(m => <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><span style={{ width: 5, height: 5, borderRadius: 99, background: '#5eead4' }} />{m.message}</span>)
              : <span style={{ opacity: .6 }}>لا توجد رسائل مفعّلة، ولن يظهر الشريط في الموقع</span>}
          </div>
        </Card>

        <Card title="إضافة رسالة أو أكثر" subtitle="اكتب كل رسالة في سطر مستقل، وستُضاف جميعها دفعة واحدة">
          <Field label="الرسائل">
            <textarea placeholder={'رسالة 1\nرسالة 2\nرسالة 3'} value={text} onChange={e => setText(e.target.value)} rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontSize: 14 }} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Btn kind="primary" onClick={addMessages} loading={saving}><Plus size={14} /> إضافة</Btn>
            {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? A.primary : A.danger }}>{msg.t}</span>}
          </div>
        </Card>

        <Card title="الرسائل الحالية" subtitle={`${messages.length} رسالة · ${activeCount} مفعّلة`} pad={0}>
          {loading ? <Loading /> : messages.length === 0 ? <Empty icon={Megaphone} title="لا توجد رسائل مضافة بعد" /> : messages.map((m: any) => (
            <Row key={m.id} style={{ display: 'block' }}>
              {editingId === m.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input value={editText} onChange={e => setEditText(e.target.value)} autoFocus style={{ ...inputStyle, flex: 1, minWidth: 200, fontSize: 14 }} />
                  <Btn small kind="primary" onClick={() => saveEdit(m.id)} loading={savingEdit}>حفظ</Btn>
                  <Btn small kind="ghost" onClick={() => setEditingId(null)}>إلغاء</Btn>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 200, fontSize: 14, fontWeight: 500, color: m.is_active ? A.text : A.text3 }}>{m.message}</span>
                  <Badge tone={m.is_active ? 'primary' : 'neutral'}>{m.is_active ? 'مفعّلة' : 'موقوفة'}</Badge>
                  <Btn small kind="ghost" onClick={() => { setEditingId(m.id); setEditText(m.message) }} title="تعديل"><Pencil size={14} /></Btn>
                  <Btn small kind="ghost" onClick={() => toggleActive(m.id, m.is_active)} title={m.is_active ? 'إيقاف' : 'تفعيل'}>{m.is_active ? <EyeOff size={14} /> : <Eye size={14} />}</Btn>
                  <Btn small kind="ghost" onClick={() => deleteMessage(m.id)} title="حذف"><Trash2 size={14} /></Btn>
                </div>
              )}
            </Row>
          ))}
        </Card>

        {messages.length > 0 && activeCount === 0 && <Notice tone="warning">لا توجد رسالة مفعّلة، ولن يظهر الشريط في الصفحة الرئيسية.</Notice>}
      </div>
    </>
  )
}
