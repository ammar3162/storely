'use client'
import { useEffect, useState } from 'react'
import { Pencil, Trash2, Eye, EyeOff, Plus } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { A, Badge, Btn, Card, Empty, Field, Loading, Notice, PageHeader, adminFetch, inputStyle } from '../_admin/kit'

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
    if (lines.length === 0) { setMsg({ ok: false, t: 'اكتب رسالة وحدة على الأقل' }); return }
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
    if (!(await confirmDialog({ title: 'حذف الرسالة', message: 'حذف هذي الرسالة من الشريط؟' }))) return
    await adminFetch('/api/admin/marquee-messages', { method: 'DELETE', body: { id } })
    load()
  }

  const activeCount = messages.filter(m => m.is_active).length

  return (
    <>
      <PageHeader title="الشريط الإخباري" subtitle="رسائل الشريط المتحرك أعلى الصفحة الرئيسية لموقع ستورلي — تتناوب فيما بينها" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
        <Card title="إضافة رسالة أو أكثر" subtitle="كل رسالة بسطر لحالها — تنضاف كلها دفعة وحدة">
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
          {loading ? <Loading /> : messages.length === 0 ? <Empty title="لا توجد رسائل مضافة بعد" /> : messages.map((m: any) => (
            <div key={m.id} style={{ padding: '12px 20px', borderBottom: `1px solid ${A.border}` }}>
              {editingId === m.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input value={editText} onChange={e => setEditText(e.target.value)} autoFocus style={{ ...inputStyle, flex: 1, minWidth: 200, fontSize: 14 }} />
                  <Btn small kind="primary" onClick={() => saveEdit(m.id)} loading={savingEdit}>حفظ</Btn>
                  <Btn small kind="ghost" onClick={() => setEditingId(null)}>إلغاء</Btn>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 200, fontSize: 14, fontWeight: 600, color: m.is_active ? A.text : A.text3 }}>{m.message}</span>
                  <Badge tone={m.is_active ? 'primary' : 'neutral'}>{m.is_active ? 'مفعّلة' : 'موقفة'}</Badge>
                  <Btn small onClick={() => { setEditingId(m.id); setEditText(m.message) }}><Pencil size={13} /> تعديل</Btn>
                  <Btn small onClick={() => toggleActive(m.id, m.is_active)}>{m.is_active ? <><EyeOff size={13} /> إيقاف</> : <><Eye size={13} /> تفعيل</>}</Btn>
                  <Btn small kind="danger" onClick={() => deleteMessage(m.id)}><Trash2 size={13} /> حذف</Btn>
                </div>
              )}
            </div>
          ))}
        </Card>

        {messages.length > 0 && activeCount === 0 && <Notice tone="warning">ولا رسالة مفعّلة — الشريط ما بيظهر بالصفحة الرئيسية.</Notice>}
      </div>
    </>
  )
}
