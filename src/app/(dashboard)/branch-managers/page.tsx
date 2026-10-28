'use client'
import PageIcon from '@/components/PageIcon'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { colors, font, card, btnPrimary, btnSecondary, inp, pageTitle, pageSub } from '@/lib/ds'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { cache } from '@/lib/cache'
import { MANAGER_PERMS } from '@/lib/managerPerms'
import { Eye, EyeOff, Pencil, Trash2, Store, ShieldCheck } from 'lucide-react'

const GROUPS = Array.from(new Set(MANAGER_PERMS.map(p => p.group)))
const ALL_OFF = Object.fromEntries(MANAGER_PERMS.map(p => [p.key, false])) as Record<string, boolean>
const countOn = (p: Record<string, boolean> | null | undefined) => MANAGER_PERMS.filter(x => p?.[x.key]).length

// شبكة الصلاحيات مقسّمة مجموعات — مع «الكل» لكل مجموعة
function PermGrid({ value, onChange }: { value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) {
  const set = (k: string, on: boolean) => onChange({ ...value, [k]: on })
  const allOn = MANAGER_PERMS.every(p => value[p.key])
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: colors.text3 }}>الرئيسية والإشعارات متاحة دايماً. الإعدادات والفروع والإضافات للمالك فقط.</span>
        <button type="button" onClick={() => onChange(Object.fromEntries(MANAGER_PERMS.map(p => [p.key, !allOn])))}
          style={{ background: 'none', border: 'none', color: colors.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          {allOn ? 'إلغاء الكل' : 'تحديد الكل'}
        </button>
      </div>
      {GROUPS.map(g => {
        const items = MANAGER_PERMS.filter(p => p.group === g)
        const gOn = items.every(p => value[p.key])
        return (
          <div key={g}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: colors.text2 }}>{g}</span>
              <button type="button" onClick={() => onChange({ ...value, ...Object.fromEntries(items.map(p => [p.key, !gOn])) })}
                style={{ background: 'none', border: 'none', color: colors.text3, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{gOn ? 'إلغاء' : 'الكل'}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 8 }}>
              {items.map(p => {
                const on = !!value[p.key]
                return (
                  <label key={p.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: on ? colors.primaryLight : '#fff', border: `1.5px solid ${on ? colors.primaryBorder : colors.border}` }}>
                    <input type="checkbox" checked={on} onChange={e => set(p.key, e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: colors.primary }} />
                    <span>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: on ? colors.primary : colors.text }}>{p.label}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: colors.text4, lineHeight: 1.5 }}>{p.hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function BranchManagersPage() {
  const [orgId, setOrgId] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [branchId, setBranchId] = useState('')
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...ALL_OFF, inventory: true, dispense: true, purchases: true, reports: true })
  const [saving, setSaving] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Record<string, boolean>>(ALL_OFF)
  const [editBranch, setEditBranch] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const oid = await getOrgId()
    if (!oid) return
    setOrgId(oid)
    const bj = await api.get('/api/branches', { org_id: oid })
    setBranches(bj.branches || [])
    const cached = cache.get('branch-managers:' + oid)
    if (cached) { setManagers(cached); setLoading(false) }
    await loadManagers(oid)
  }

  useLiveRefresh(orgId || null, ['branches'], () => { init() })

  async function loadManagers(oid: string) {
    const j = await api.get('/api/branch-managers', { org_id: oid })
    if (!j.success) { toast(j.error || 'تعذر تحميل قائمة المديرين', 'error'); setLoading(false); return }
    setManagers(j.managers || [])
    cache.set('branch-managers:' + oid, j.managers || [])
    setLoading(false)
  }

  async function addManager() {
    if (!name.trim() || !email.trim() || !password || !branchId) { toast('عبّ الاسم والفرع والإيميل وكلمة المرور', 'warning'); return }
    if (password.length < 6) { toast('كلمة المرور ٦ أحرف على الأقل', 'warning'); return }
    if (!countOn(perms)) { toast('اختر صفحة وحدة على الأقل يشوفها المدير', 'warning'); return }
    setSaving(true)
    const j = await api.post('/api/branch-managers', { org_id: orgId, full_name: name.trim(), email: email.trim(), password, branch_id: branchId, permissions: perms })
    setSaving(false)
    if (!j.success) { toast(j.error || 'تعذر إضافة المدير', 'error'); return }
    toast('✅ تم إضافة مدير الفرع — يدخل بإيميله وكلمة المرور')
    setName(''); setEmail(''); setPassword(''); setBranchId('')
    loadManagers(orgId)
  }

  function startEdit(m: any) {
    setEditId(m.id); setEditBranch(m.branch_id || '')
    setEditPerms({ ...ALL_OFF, ...Object.fromEntries(MANAGER_PERMS.map(p => [p.key, m.permissions?.[p.key] === true])) })
  }

  async function saveEdit(m: any) {
    setEditSaving(true)
    const j = await api.patch('/api/branch-managers', { id: m.id, org_id: orgId, permissions: editPerms, ...(editBranch && editBranch !== m.branch_id ? { branch_id: editBranch } : {}) })
    setEditSaving(false)
    if (!j.success) { toast(j.error || 'تعذر الحفظ', 'error'); return }
    toast('✅ انحفظت صلاحيات ' + m.full_name)
    setEditId(null)
    loadManagers(orgId)
  }

  async function deleteManager(m: any) {
    if (!(await confirmDialog({ title: 'حذف مدير الفرع', message: `حذف حساب ${m.full_name} نهائياً؟ ما يقدر يدخل النظام بعدها.` }))) return
    const j = await api.del('/api/branch-managers', { id: m.id, org_id: orgId })
    if (!j.success) { toast(j.error || 'تعذر الحذف', 'error'); return }
    toast('🗑️ تم حذف ' + m.full_name)
    loadManagers(orgId)
  }

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 5 }

  return (
    <div style={{ fontFamily: font.family, direction: 'rtl' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...pageTitle }}><PageIcon />مديرو الفروع</h1>
        <p style={{ ...pageSub }}>كل مدير يدخل بإيميله وكلمة مروره، ويشوف فرعه بس — والصفحات اللي تحددها له فقط</p>
      </div>

      <section style={{ ...card, padding: '20px 22px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>مدير فرع جديد</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
          <div><label style={lbl}>اسم المدير</label><input value={name} onChange={e => setName(e.target.value)} style={inp()} placeholder="مثال: أحمد محمد" /></div>
          <div><label style={lbl}>الفرع</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} style={inp()}>
              <option value="">اختر الفرع</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>الإيميل (يدخل فيه)</label><input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} style={inp()} placeholder="manager@example.com" autoComplete="off" /></div>
          <div><label style={lbl}>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp(), paddingLeft: 40 }} placeholder="٦ أحرف على الأقل" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'إخفاء' : 'إظهار'} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.text4 }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: colors.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={16} /> وش يشوف؟ <span style={{ fontWeight: 600, color: colors.text4 }}>({countOn(perms)} من {MANAGER_PERMS.length})</span></div>
        <PermGrid value={perms} onChange={setPerms} />
        <button onClick={addManager} disabled={saving} style={{ ...btnPrimary, padding: '12px 22px', marginTop: 16 }}>{saving ? 'جاري الإضافة…' : 'أضف مدير الفرع'}</button>
      </section>

      <section style={{ ...card, padding: '20px 22px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>المديرون الحاليون <span style={{ color: colors.text4, fontWeight: 600 }}>({managers.length})</span></h2>
        {loading ? <div style={{ color: colors.text4, fontSize: 13 }}>جاري التحميل…</div>
          : managers.length === 0 ? <div style={{ color: colors.text4, fontSize: 13.5, textAlign: 'center', padding: 24 }}>ما فيه مديرو فروع — أضف أول مدير من فوق</div>
          : <div style={{ display: 'grid', gap: 12 }}>
            {managers.map((m: any) => {
              const editing = editId === m.id
              const on = MANAGER_PERMS.filter(p => m.permissions?.[p.key])
              return (
                <article key={m.id} style={{ border: `1px solid ${editing ? colors.primaryBorder : colors.border}`, borderRadius: 12, padding: 14, background: editing ? '#fff' : colors.bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>{m.full_name}</div>
                      <div style={{ fontSize: 12.5, color: colors.text3, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}><Store size={13} /> {(m.branches as any)?.name || '—'} · يشوف {on.length} من {MANAGER_PERMS.length} صفحات</div>
                    </div>
                    {!editing && <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(m)} style={{ ...btnSecondary, padding: '7px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Pencil size={14} /> تعديل</button>
                      <button onClick={() => deleteManager(m)} aria-label="حذف" style={{ background: '#fff', border: `1px solid ${colors.dangerBorder}`, color: colors.danger, borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'inline-flex' }}><Trash2 size={15} /></button>
                    </div>}
                  </div>
                  {!editing ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {on.length ? on.map(p => <span key={p.key} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: colors.primaryLight, color: colors.primary, border: `1px solid ${colors.primaryBorder}` }}>{p.label}</span>)
                        : <span style={{ fontSize: 12.5, color: colors.warning }}>ما عنده صلاحيات — يشوف الرئيسية والإشعارات بس</span>}
                    </div>
                  ) : (
                    <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
                      <div style={{ maxWidth: 320 }}><label style={lbl}>الفرع</label>
                        <select value={editBranch} onChange={e => setEditBranch(e.target.value)} style={inp()}>
                          {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <PermGrid value={editPerms} onChange={setEditPerms} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEdit(m)} disabled={editSaving} style={{ ...btnPrimary, padding: '10px 20px' }}>{editSaving ? 'جاري الحفظ…' : 'حفظ التعديلات'}</button>
                        <button onClick={() => setEditId(null)} style={{ ...btnSecondary, padding: '10px 18px' }}>إلغاء</button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>}
      </section>
    </div>
  )
}
