'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, PlayCircle, Trash2, ExternalLink } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { HELP_PAGES, youtubeId } from '@/lib/helpVideos'
import { A, Badge, Btn, Card, Loading, PageHeader, adminFetch, fmtDate, inputStyle } from '../_admin/kit'

// فيديوهات الشرح: الصق رابط يوتيوب (غير مُدرج) لكل صفحة — يطلع زر «كيف أستخدم الصفحة؟» للعملاء على طول
export default function HelpVideosPage() {
  const [rows, setRows] = useState<Record<string, any>>({})
  const [draft, setDraft] = useState<Record<string, { url: string; title: string }>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ key: string; t: string; bad?: boolean } | null>(null)

  async function load() {
    setLoading(true)
    const j = await adminFetch('/api/admin/help-videos')
    setRows(Object.fromEntries((j.videos || []).map((v: any) => [v.page_key, v])))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save(key: string) {
    const d = draft[key] || { url: '', title: '' }
    if (!youtubeId(d.url)) { setMsg({ key, t: 'الصق رابط فيديو يوتيوب صحيح', bad: true }); return }
    setBusy(key); setMsg(null)
    const j = await adminFetch('/api/admin/help-videos', { method: 'PUT', body: { page_key: key, url: d.url, title: d.title || rows[key]?.title || '' } })
    setBusy('')
    if (!j.success) { setMsg({ key, t: j.error || 'تعذر الحفظ', bad: true }); return }
    setDraft(x => ({ ...x, [key]: { url: '', title: '' } })); setMsg({ key, t: '✅ انحفظ — الزر طلع في الصفحة' }); load()
  }
  async function remove(key: string, label: string) {
    if (!(await confirmDialog({ title: 'شيل الفيديو', message: `شيل فيديو «${label}»؟ الزر يختفي من الصفحة.` }))) return
    setBusy(key); await adminFetch(`/api/admin/help-videos?page_key=${encodeURIComponent(key)}`, { method: 'DELETE' }); setBusy(''); load()
  }

  const count = Object.keys(rows).length
  return (
    <>
      <PageHeader title="فيديوهات الشرح" subtitle={`ارفع الفيديو على يوتيوب «غير مُدرج» والصق رابطه هنا — ${count} من ${HELP_PAGES.length} صفحة لها فيديو`}
        actions={<Btn onClick={load} loading={loading}><RefreshCw size={14} /> تحديث</Btn>} />
      {loading ? <Loading /> : (['المالك', 'الموظف'] as const).map(g => (
        <Card key={g} title={g === 'المالك' ? 'صفحات المالك' : 'صفحات الموظف (برمز PIN)'} style={{ marginBottom: 14 }}>
          {HELP_PAGES.filter(p => p.group === g).map((p, i) => {
            const v = rows[p.key], d = draft[p.key] || { url: '', title: '' }
            return (
              <div key={p.key} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', padding: '14px 0', borderTop: i ? `1px solid ${A.border}` : 'none' }}>
                <div style={{ width: 120, flexShrink: 0 }}>
                  {v ? <a href={`https://www.youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', position: 'relative' }}>
                      <img src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" width={120} height={68} style={{ borderRadius: 8, display: 'block', objectFit: 'cover' }} />
                      <PlayCircle size={22} color="#fff" style={{ position: 'absolute', inset: 0, margin: 'auto' }} /></a>
                    : <div style={{ width: 120, height: 68, borderRadius: 8, background: A.bg, border: `1px dashed ${A.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: A.text3 }}>بدون فيديو</div>}
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 14 }}>{p.label}</b><span dir="ltr" style={{ fontSize: 12, color: A.text3 }}>{p.key}</span>
                    {v && <Badge tone="primary">مفعّل</Badge>}
                  </div>
                  {v && <div style={{ fontSize: 12, color: A.text3, marginTop: 3 }}>{v.title || 'بدون عنوان'} · {fmtDate(v.updated_at)}</div>}
                  {msg?.key === p.key && <div style={{ fontSize: 12.5, marginTop: 4, color: msg.bad ? A.danger : A.primary }}>{msg.t}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: '2 1 360px' }}>
                  <input value={d.url} onChange={e => setDraft(x => ({ ...x, [p.key]: { ...d, url: e.target.value } }))} placeholder={v ? 'رابط جديد لتغيير الفيديو' : 'رابط يوتيوب'} dir="ltr" style={{ ...inputStyle, flex: '2 1 200px' }} />
                  <input value={d.title} onChange={e => setDraft(x => ({ ...x, [p.key]: { ...d, title: e.target.value } }))} placeholder="عنوان (اختياري)" maxLength={80} style={{ ...inputStyle, flex: '1 1 140px' }} />
                  <Btn kind="primary" small loading={busy === p.key} disabled={!d.url.trim()} onClick={() => save(p.key)}>حفظ</Btn>
                  {v && <Btn small kind="ghost" onClick={() => remove(p.key, p.label)}><Trash2 size={14} /></Btn>}
                  {v && <a href={p.key} target="_blank" rel="noopener noreferrer" title="افتح الصفحة" style={{ color: A.text3, display: 'inline-flex' }}><ExternalLink size={15} /></a>}
                </div>
              </div>
            )
          })}
        </Card>
      ))}
    </>
  )
}
