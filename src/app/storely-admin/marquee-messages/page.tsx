'use client'
import { useState, useEffect } from 'react'
import { confirmDialog } from '@/components/ConfirmDialog'

const C = { bg:'#0f172a', card:'#1e293b', border:'#334155', text:'#f1f5f9', text2:'#94a3b8', text3:'#64748b', green:'#22c55e', red:'#ef4444', blue:'#3b82f6' }

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

  if (!authChecked) return <div style={{background:C.bg,minHeight:'100vh'}}/>

  return (
    <div style={{background:C.bg, minHeight:'100vh', padding:32, fontFamily:'system-ui', direction:'rtl'}}>
      <div style={{maxWidth:800, margin:'0 auto'}}>
        <h1 style={{color:C.text, fontSize:24, fontWeight:800, marginBottom:8}}>رسائل الشريط المتحرك بالصفحة التسويقية</h1>
        <p style={{color:C.text3, fontSize:13, marginBottom:28}}>تظهر هذي الرسائل بالشريط الأخضر المتحرك أعلى الصفحة الرئيسية لموقع Storely، وتتناوب فيما بينها</p>

        <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:24}}>
          <h2 style={{color:C.text, fontSize:15, fontWeight:700, marginBottom:6}}>إضافة رسالة أو أكثر</h2>
          <p style={{color:C.text3, fontSize:12, marginBottom:14}}>اكتب كل رسالة بسطر لحالها — تُضاف كلها دفعة وحدة</p>
          {msg && <div style={{color:msg.startsWith('✅')?C.green:C.red, fontSize:13, marginBottom:12}}>{msg}</div>}
          <textarea placeholder={'رسالة 1\nرسالة 2\nرسالة 3...'} value={text} onChange={e=>setText(e.target.value)} rows={4}
            style={{width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, marginBottom:14, boxSizing:'border-box' as const, fontFamily:'inherit', resize:'vertical' as const}}/>
          <button onClick={addMessages} disabled={saving}
            style={{background:C.green, color:'white', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, fontWeight:700, cursor:'pointer'}}>
            {saving?'⏳ جاري الحفظ...':'إضافة'}
          </button>
        </div>

        <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20}}>
          <h2 style={{color:C.text, fontSize:15, fontWeight:700, marginBottom:14}}>الرسائل الحالية ({messages.length})</h2>
          {loading ? <div style={{color:C.text3}}>جاري التحميل...</div> :
            messages.length === 0 ? <div style={{color:C.text3, fontSize:13}}>لا توجد رسائل مضافة بعد</div> :
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {messages.map((m:any) => (
                <div key={m.id} style={{padding:'10px 12px', background:C.bg, borderRadius:8, opacity:m.is_active?1:.5}}>
                  {editingId===m.id ? (
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <input value={editText} onChange={e=>setEditText(e.target.value)} autoFocus
                        style={{flex:1, padding:'8px 10px', borderRadius:6, border:`1px solid ${C.blue}`, background:C.card, color:C.text, fontSize:14}}/>
                      <button onClick={()=>saveEdit(m.id)} disabled={savingEdit}
                        style={{background:C.green, color:'white', border:'none', borderRadius:6, padding:'6px 12px', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' as const}}>
                        {savingEdit?'...':'حفظ'}
                      </button>
                      <button onClick={cancelEdit}
                        style={{background:'transparent', color:C.text3, border:`1px solid ${C.border}`, borderRadius:6, padding:'6px 12px', fontSize:12, cursor:'pointer'}}>
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <span style={{color:C.text, fontSize:14, fontWeight:600, flex:1}}>{m.message}</span>
                      <button onClick={()=>startEdit(m)}
                        style={{background:'transparent', color:C.blue, border:`1px solid ${C.blue}`, borderRadius:6, padding:'6px 12px', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' as const}}>
                        ✏️ تعديل
                      </button>
                      <button onClick={()=>toggleActive(m.id, m.is_active)}
                        style={{background:'transparent', color:m.is_active?C.green:C.text3, border:`1px solid ${m.is_active?C.green:C.text3}`, borderRadius:6, padding:'6px 12px', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' as const}}>
                        {m.is_active?'✅ مفعّلة':'⏸ موقفة'}
                      </button>
                      <button onClick={()=>deleteMessage(m.id)}
                        style={{background:'transparent', color:C.red, border:`1px solid ${C.red}`, borderRadius:6, padding:'6px 12px', fontSize:12, cursor:'pointer'}}>
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  )
}
