'use client'
import { useState, useEffect } from 'react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { Check, Pause, Pencil } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'

export default function MarqueeMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  function key() { return sessionStorage.getItem('storely_admin_pass') || '' }

  useEffect(() => {
    fetch('/api/admin/whoami', { headers: { 'x-admin-key': key() } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (!data.authenticated) { window.location.href = '/storely-admin'; return }
        setAuthChecked(true)
        load()
      })
      .catch(() => { window.location.href = '/storely-admin' })
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/marquee-messages', { headers: { 'x-admin-key': key() } })
    const data = await res.json()
    setMessages(data.messages || [])
    setLoading(false)
  }

  async function addMessages() {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setMsg('اكتب رسالة وحدة على الأقل'); return }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/admin/marquee-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
        body: JSON.stringify({ messages: lines })
      })
      const data = await res.json()
      if (data.success) { setText(''); setMsg(`✅ تمت إضافة ${data.count} رسالة`); load() }
      else setMsg(data.error || 'خطأ')
    } catch { setMsg('خطأ بالاتصال') }
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/admin/marquee-messages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
      body: JSON.stringify({ id, is_active: !current })
    })
    load()
  }

  function startEdit(m: any) {
    setEditingId(m.id)
    setEditText(m.message)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return
    setSavingEdit(true)
    await fetch('/api/admin/marquee-messages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
      body: JSON.stringify({ id, message: editText.trim() })
    })
    setSavingEdit(false)
    setEditingId(null)
    load()
  }

  async function deleteMessage(id: string) {
    if (!(await confirmDialog({ title: 'حذف الرسالة', message: 'حذف هذي الرسالة من الشريط؟' }))) return
    await fetch('/api/admin/marquee-messages', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
      body: JSON.stringify({ id })
    })
    load()
  }

  if (!authChecked) return null

  return (
    <div className="marquee-messages-page" dir="rtl">
      <style>{marqueeStyles}</style>
      <StorelyPageHeader title="رسائل الشريط المتحرك بالصفحة التسويقية" description="تظهر هذي الرسائل بالشريط الأخضر المتحرك أعلى الصفحة الرئيسية لموقع Storely، وتتناوب فيما بينها" />
      <StorelyCard className="marquee-panel" title="إضافة رسالة أو أكثر" description="اكتب كل رسالة بسطر لحالها — تُضاف كلها دفعة وحدة">
        <div className="marquee-form">
          {msg && <div className="marquee-feedback" style={{color:msg.startsWith('✅')?storelyTokens.color.success:storelyTokens.color.danger}}>{msg}</div>}
          <textarea placeholder={'رسالة 1\nرسالة 2\nرسالة 3...'} value={text} onChange={e=>setText(e.target.value)} rows={4} className="marquee-control"/>
          <div><StorelyButton onClick={addMessages} disabled={saving} variant="primary">{saving?'جاري الحفظ...':'إضافة'}</StorelyButton></div>
        </div>
      </StorelyCard>
      <StorelyCard className="marquee-panel" title={`الرسائل الحالية (${messages.length})`}>
        {loading ? <div className="marquee-placeholder">جاري التحميل...</div> :
          messages.length === 0 ? <div className="marquee-placeholder">لا توجد رسائل مضافة بعد</div> :
          <div>
            {messages.map((m:any) => (
              <div key={m.id} className="marquee-record" data-active={!!m.is_active}>
                {editingId===m.id ? (
                  <div className="marquee-edit">
                    <input value={editText} onChange={e=>setEditText(e.target.value)} autoFocus className="marquee-control"/>
                    <div className="marquee-actions">
                      <StorelyButton onClick={()=>saveEdit(m.id)} disabled={savingEdit} variant="primary">{savingEdit?'...':'حفظ'}</StorelyButton>
                      <StorelyButton onClick={cancelEdit}>إلغاء</StorelyButton>
                    </div>
                  </div>
                ) : (
                  <div className="marquee-record-content">
                    <span className="marquee-message">{m.message}</span>
                    <div className="marquee-actions">
                      <StorelyButton onClick={()=>startEdit(m)} icon={<Pencil size={16} />}>تعديل</StorelyButton>
                      <StorelyButton onClick={()=>toggleActive(m.id, m.is_active)} icon={m.is_active?<Check size={16}/>:<Pause size={16}/>} aria-pressed={!!m.is_active}>
                        {m.is_active?'مفعّلة':'موقفة'}
                      </StorelyButton>
                      <StorelyButton onClick={()=>deleteMessage(m.id)} variant="danger">حذف</StorelyButton>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        }
      </StorelyCard>
    </div>
  )
}

const marqueeStyles = `
  .marquee-messages-page { max-width: 1000px; min-width: 0; margin: 0 auto; font-family: ${storelyTokens.typography.family}; color: ${storelyTokens.color.text}; font-size: ${storelyTokens.typography.body}px; line-height: ${storelyTokens.typography.lineHeight}; }
  .marquee-messages-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .marquee-messages-page h2 { font-size: ${storelyTokens.typography.section}px; }
  .marquee-messages-page .marquee-panel { border-radius: ${storelyTokens.radius.card}; margin-bottom: ${storelyTokens.spacing[6]}px; }
  .marquee-messages-page .marquee-form { display: flex; flex-direction: column; gap: ${storelyTokens.spacing[4]}px; padding: ${storelyTokens.spacing[6]}px; }
  .marquee-messages-page .marquee-control { min-width: 0; width: 100%; min-height: 40px; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[3]}px; background: ${storelyTokens.color.surface}; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; color: ${storelyTokens.color.text}; font: inherit; }
  .marquee-messages-page textarea { resize: vertical; }
  .adm-root .marquee-messages-page .marquee-control:focus { outline: none; border-color: ${storelyTokens.color.navy} !important; box-shadow: ${storelyTokens.shadow.focus} !important; }
  .marquee-messages-page .marquee-feedback { overflow-wrap: anywhere; }
  .marquee-messages-page .marquee-record { padding: ${storelyTokens.spacing[5]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .marquee-messages-page .marquee-record:last-child { border-bottom: 0; }
  .marquee-messages-page .marquee-record[data-active=false] { background: ${storelyTokens.color.background}; }
  .marquee-messages-page .marquee-record-content { display: flex; align-items: flex-start; flex-wrap: wrap; gap: ${storelyTokens.spacing[4]}px; }
  .marquee-messages-page .marquee-message { flex: 1 1 280px; min-width: 0; overflow-wrap: anywhere; font-weight: 500; }
  .marquee-messages-page .marquee-actions { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[2]}px; }
  .marquee-messages-page .marquee-edit { display: flex; align-items: center; flex-wrap: wrap; gap: ${storelyTokens.spacing[3]}px; }
  .marquee-messages-page .marquee-edit > input { flex: 1 1 280px; }
  .marquee-messages-page .marquee-placeholder { padding: ${storelyTokens.spacing[8]}px ${storelyTokens.spacing[5]}px; color: ${storelyTokens.color.textMuted}; }
  @media (max-width: 640px) { .marquee-messages-page .marquee-form, .marquee-messages-page .marquee-record { padding: ${storelyTokens.spacing[4]}px; } .marquee-messages-page .marquee-actions { width: 100%; } }
`
