'use client'
// محرر أصناف المنيو: نموذج واحد للإضافة والتعديل (ضغطة على الصنف تفتحه)، مفتاح متوفر/نفدت،
// وقائمة خيارات (تمييز، إخفاء، ترتيب، حذف)، وبحث وفلتر بالقسم، وإضافة من الوصفات (المخزون خامات — ما ينعرض للزبون)
import { useEffect, useMemo, useState } from 'react'
import NumberInput from '@/components/NumberInput'
import { Ellipsis, Eye, EyeOff, ImagePlus, ListPlus, Search, Pencil, Trash2, ArrowUp, ArrowDown, Star, X, Check, Plus, UtensilsCrossed } from 'lucide-react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { toast } from '@/components/toast'
import { createClient } from '@/lib/supabase/client'
import { colors, font, card, btnPrimary, inp } from '@/lib/ds'

type Item = { id: string; name: string; category: string | null; price: number | null; description: string | null; image_url: string | null; is_featured: boolean; is_available?: boolean; is_hidden?: boolean; branch_id: string | null; sort_order?: number }
type Branch = { id: string; name: string }

const DEFAULT_CAT = 'منتجات خارجية'
const catOf = (it: Item) => it.category || DEFAULT_CAT
const EMPTY = { name: '', category: '', price: '' as string | number, description: '', image_url: '', is_featured: false }

export default function MenuItemsEditor({ orgId, mode, branchId, canManageOrg, branches, items, setItems, recipes, reload }: {
  orgId: string
  mode: 'org' | 'branch'
  branchId: string | null
  canManageOrg: boolean
  branches: Branch[]
  items: Item[]
  setItems: (fn: (prev: Item[]) => Item[]) => void
  recipes: { id: string; name: string; sell_price: number | null }[]
  reload: () => void
}) {
  const sb = createClient()
  const current = branches.find(b => b.id === branchId)
  const multiBranch = mode === 'branch' && canManageOrg && branches.length > 1
  const canEdit = (it: Item) => mode === 'org' || !!it.branch_id || canManageOrg

  // ─── النموذج ───
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [newCat, setNewCat] = useState(false)
  const [targets, setTargets] = useState<string[]>([])    // الفروع اللي يظهر فيها الصنف الجديد
  const [editAll, setEditAll] = useState(false)            // تعديل: الصنف لكل الفروع؟
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const scrollToForm = () => setTimeout(() => document.getElementById('mie-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)

  // ─── القائمة ───
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ cat: string; value: string } | null>(null)

  // ─── من الوصفات ───
  const [showImport, setShowImport] = useState(false)
  const [importCat, setImportCat] = useState('')
  const [importNewCat, setImportNewCat] = useState(false)
  const [importSel, setImportSel] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!menuFor) return
    const close = () => setMenuFor(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuFor])

  const cats = useMemo(() => {
    const out: string[] = []
    for (const it of items) if (!out.includes(catOf(it))) out.push(catOf(it))
    return out
  }, [items])

  const shown = items.filter(it => (catFilter === 'all' || catOf(it) === catFilter) && (!q.trim() || it.name.toLowerCase().includes(q.trim().toLowerCase())))
  const grouped = cats.map(c => ({ cat: c, list: shown.filter(it => catOf(it) === c) })).filter(g => g.list.length)

  function openNew() {
    setEditingId(null); setForm({ ...EMPTY, category: catFilter !== 'all' ? catFilter : (cats[0] || '') }); setNewCat(!cats.length)
    setTargets(branchId ? [branchId] : []); setFormOpen(true)
    scrollToForm()
  }

  function startEdit(it: Item) {
    if (!canEdit(it)) { toast('هذا الصنف لكل الفروع — يعدّله مالك المنشأة', 'warning'); return }
    setEditingId(it.id)
    setForm({ name: it.name, category: catOf(it), price: it.price ?? '', description: it.description ?? '', image_url: it.image_url ?? '', is_featured: !!it.is_featured })
    setNewCat(false); setEditAll(!it.branch_id); setFormOpen(true)
    scrollToForm()
  }

  function closeForm() { setFormOpen(false); setEditingId(null); setForm({ ...EMPTY }); setNewCat(false) }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${orgId}/item-${Date.now()}.${ext}`
      const { error } = await sb.storage.from('shop-product-images').upload(path, file, { upsert: true })
      if (error) { toast('فشل رفع الصورة', 'error'); return }
      const { data: { publicUrl } } = sb.storage.from('shop-product-images').getPublicUrl(path)
      setForm(p => ({ ...p, image_url: publicUrl }))
    } catch { toast('فشل رفع الصورة', 'error') } finally { setUploading(false) }
  }

  async function save() {
    if (!form.name.trim()) { toast('اكتب اسم الصنف', 'warning'); return }
    if (!String(form.category).trim()) { toast('اختر القسم أو اكتب قسم جديد', 'warning'); return }
    if (!editingId && multiBranch && !targets.length) { toast('اختر فرع واحد على الأقل', 'warning'); return }
    setSaving(true)
    const body: any = { org_id: orgId, ...form, branch_id: branchId }
    if (editingId) {
      body.item_id = editingId
      if (mode === 'branch' && canManageOrg) body.scope = editAll ? 'all' : 'branch'
    } else if (mode === 'branch') {
      body.scope = 'branch'
      if (multiBranch) body.branch_ids = targets
    }
    const res = await fetch('/api/shop-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    setSaving(false)
    if (!j.success) { toast(j.error || 'فشل الحفظ', 'error'); return }
    toast(editingId ? 'تم حفظ التعديل' : j.count > 1 ? `تمت إضافة الصنف في ${j.count} فروع` : 'تمت إضافة الصنف')
    closeForm(); reload()
  }

  async function toggle(it: Item, field: 'is_available' | 'is_hidden' | 'is_featured') {
    const cur = field === 'is_available' ? it.is_available !== false : !!(it as any)[field]
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, [field]: !cur } : x))
    const res = await fetch('/api/shop-items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, item_id: it.id, field, value: !cur }) })
    const j = await res.json().catch(() => ({}))
    if (!j.success) { setItems(prev => prev.map(x => x.id === it.id ? { ...x, [field]: cur } : x)); toast(j.error || 'فشل التحديث', 'error'); return }
    toast(field === 'is_available' ? (cur ? 'صار الصنف: نفدت' : 'صار الصنف: متوفر')
      : field === 'is_hidden' ? (cur ? 'الصنف ظاهر بالمنيو' : 'تم إخفاء الصنف من المنيو')
      : (cur ? 'تمت إزالة التمييز' : 'تم تمييز الصنف'))
  }

  async function remove(it: Item) {
    if (!(await confirmDialog({ title: 'حذف الصنف', message: `حذف "${it.name}" من المنيو${!it.branch_id && mode === 'branch' ? ' في كل الفروع' : ''}؟ تقدر بدال الحذف تخفيه مؤقتاً.` }))) return
    const before = items
    setItems(prev => prev.filter(x => x.id !== it.id))
    const res = await fetch('/api/shop-items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, item_id: it.id }) })
    const j = await res.json().catch(() => ({}))
    if (!j.success) { setItems(() => before); toast(j.error || 'فشل الحذف', 'error'); return }
    if (editingId === it.id) closeForm()
    toast('تم حذف الصنف')
  }

  async function move(it: Item, dir: -1 | 1) {
    const sib = items.filter(x => catOf(x) === catOf(it))
    const i = sib.findIndex(x => x.id === it.id), j = i + dir
    if (i < 0 || j < 0 || j >= sib.length) return
    const re = [...sib]; [re[i], re[j]] = [re[j], re[i]]
    setItems(prev => { const others = prev.filter(x => catOf(x) !== catOf(it)); return [...others, ...re] })
    await fetch('/api/shop-reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, items: re.filter(canEdit).map(x => ({ id: x.id, type: 'shop_item' })) }) })
  }

  async function renameCat() {
    if (!renaming) return
    const to = renaming.value.trim()
    if (!to || to === renaming.cat) { setRenaming(null); return }
    const res = await fetch('/api/shop-items', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, old_category: renaming.cat, new_category: to, branch_id: branchId }) })
    const j = await res.json().catch(() => ({}))
    setRenaming(null)
    if (!j.success) { toast(j.error || 'فشل تغيير الاسم', 'error'); return }
    if (catFilter === renaming.cat) setCatFilter(to)
    toast('تم تغيير اسم القسم'); reload()
  }

  async function importItems() {
    const recipe_ids = recipes.filter(r => importSel['r:' + r.id]).map(r => r.id)
    if (!importCat.trim()) { toast('اختر القسم أو اكتب قسم جديد', 'warning'); return }
    if (!recipe_ids.length) { toast('اختر وصفة وحدة على الأقل', 'warning'); return }
    setImporting(true)
    const res = await fetch('/api/shop-items/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, branch_id: branchId, scope: mode === 'branch' ? 'branch' : undefined, category: importCat, recipe_ids }) })
    const j = await res.json().catch(() => ({}))
    setImporting(false)
    if (!j.success) { toast(j.error || 'فشل الإضافة', 'error'); return }
    toast(j.added ? `تمت إضافة ${j.added} صنف${j.skipped ? ` (${j.skipped} موجود من قبل)` : ''}` : 'الأصناف المختارة موجودة بالمنيو من قبل', j.added ? 'success' : 'warning')
    setImportSel({}); setShowImport(false); reload()
  }

  const chip = (on: boolean): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 11px', borderRadius: 99, cursor: 'pointer', border: `1.5px solid ${on ? colors.primary : colors.border2}`, background: on ? colors.primaryLight : 'white', color: on ? colors.primary : colors.text2, fontWeight: 700, fontFamily: font.family })
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: colors.text3, display: 'block', marginBottom: 5 }
  const selCount = Object.values(importSel).filter(Boolean).length
  const iconBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: 'none', background: 'none', color: colors.text3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }

  // ─── النموذج (إضافة / تعديل) ───
  const formCard = (
    <div id="mie-form" style={{ ...card, padding: 18, border: `1.5px solid ${editingId ? colors.infoBorder : colors.primaryBorder}`, scrollMarginTop: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>{editingId ? 'تعديل الصنف' : 'صنف جديد'}</div>
        <button onClick={closeForm} style={iconBtn} aria-label="إغلاق"><X size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <label style={{ width: 84, height: 84, flexShrink: 0, borderRadius: 12, background: colors.bg, border: `1.5px dashed ${colors.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', position: 'relative' as const }}>
          {form.image_url ? <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, fontSize: 10.5, color: colors.text4 }}><ImagePlus size={20} strokeWidth={1.6} />{uploading ? 'جاري الرفع...' : 'صورة'}</span>}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
        </label>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 8, minWidth: 0 }}>
          <input placeholder="اسم الصنف *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ ...inp(), width: '100%' }} />
          <NumberInput placeholder="السعر (⃁)" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} style={{ ...inp(), width: '100%' }} />
        </div>
      </div>
      {form.image_url && <button onClick={() => setForm(p => ({ ...p, image_url: '' }))} style={{ border: 'none', background: 'none', color: colors.danger, fontSize: 11, cursor: 'pointer', padding: 0, marginBottom: 10, fontFamily: font.family }}>إزالة الصورة</button>}

      <label style={label}>القسم *</label>
      {!newCat && cats.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12 }}>
          {cats.map(c => <button key={c} type="button" onClick={() => setForm(p => ({ ...p, category: c }))} style={chip(form.category === c)}>{c}</button>)}
          <button type="button" onClick={() => { setNewCat(true); setForm(p => ({ ...p, category: '' })) }} style={{ ...chip(false), borderStyle: 'dashed' }}>+ قسم جديد</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <input autoFocus placeholder="اسم القسم (مثال: مشروبات حارة)" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ ...inp(), flex: 1 }} />
          {cats.length > 0 && <button type="button" onClick={() => { setNewCat(false); setForm(p => ({ ...p, category: cats[0] })) }} style={{ ...chip(false) }}>إلغاء</button>}
        </div>
      )}

      <textarea placeholder="وصف قصير (اختياري)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inp(), width: '100%', resize: 'vertical' as const, marginBottom: 10 }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: colors.text2 }}>
        <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
        تمييز كـ«الأكثر مبيعاً»
      </label>

      {!editingId && multiBranch && (
        <div style={{ background: colors.bg, borderRadius: 10, padding: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.text3, marginBottom: 8 }}>يظهر الصنف في:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {branches.map(b => {
              const on = targets.includes(b.id)
              return <button key={b.id} type="button" onClick={() => setTargets(t => on ? t.filter(x => x !== b.id) : [...t, b.id])} style={chip(on)}>{on && <Check size={13} strokeWidth={2.5} />}{b.name}</button>
            })}
          </div>
          {targets.length === branches.length && <div style={{ fontSize: 10, color: colors.text4, marginTop: 6 }}>كل الفروع: صنف واحد يتعدّل مرة وحدة ويظهر بكل الفروع</div>}
        </div>
      )}
      {editingId && mode === 'branch' && canManageOrg && branches.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button type="button" onClick={() => setEditAll(false)} style={{ ...chip(!editAll), flex: 1, justifyContent: 'center' }}>لـ{current?.name || 'هذا الفرع'} بس</button>
          <button type="button" onClick={() => setEditAll(true)} style={{ ...chip(editAll), flex: 1, justifyContent: 'center' }}>لكل الفروع</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving || uploading} style={{ ...btnPrimary, flex: 1 }}>{saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة الصنف'}</button>
        {editingId && (() => { const it = items.find(x => x.id === editingId); return it ? <button onClick={() => remove(it)} style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${colors.dangerBorder}`, background: colors.dangerLight, color: colors.danger, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}>حذف</button> : null })()}
      </div>
    </div>
  )

  // ─── من الوصفات ───
  const importCard = showImport && (
    <div style={{ ...card, padding: 16, border: `1.5px solid ${colors.primaryBorder}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>إضافة من الوصفات</div>
        <button onClick={() => setShowImport(false)} style={iconBtn} aria-label="إغلاق"><X size={16} /></button>
      </div>
      <div style={{ fontSize: 11, color: colors.text4, marginBottom: 12, lineHeight: 1.7 }}>اختر الوصفات وتنضاف{mode === 'branch' ? ` لـ${current?.name || 'هذا الفرع'}` : ''} مباشرة، والوصفات تجي بسعر البيع</div>
      <label style={label}>القسم *</label>
      {!importNewCat && cats.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12 }}>
          {cats.map(c => <button key={c} type="button" onClick={() => setImportCat(c)} style={chip(importCat === c)}>{c}</button>)}
          <button type="button" onClick={() => { setImportNewCat(true); setImportCat('') }} style={{ ...chip(false), borderStyle: 'dashed' }}>+ قسم جديد</button>
        </div>
      ) : (
        <input placeholder="اسم القسم" value={importCat} onChange={e => setImportCat(e.target.value)} style={{ ...inp(), width: '100%', marginBottom: 12 }} />
      )}
      <div style={{ maxHeight: 280, overflowY: 'auto' as const, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 6 }}>
        {recipes.map(r => (
          <label key={'r' + r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!importSel['r:' + r.id]} onChange={e => setImportSel(p => ({ ...p, ['r:' + r.id]: e.target.checked }))} />
            <span style={{ flex: 1 }}>{r.name}</span>
            {Number(r.sell_price) > 0 && <span style={{ color: colors.text3, fontSize: 12 }}>{r.sell_price} ⃁</span>}
          </label>
        ))}
      </div>
      <button onClick={importItems} disabled={importing || !selCount} style={{ ...btnPrimary, width: '100%', marginTop: 10, opacity: selCount ? 1 : .5 }}>{importing ? 'جاري الإضافة...' : `أضف المختار (${selCount})`}</button>
    </div>
  )

  return (
    <div style={{ ...card, padding: 18 }}>
      <style>{`
        .mie-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 16px; align-items: start; }
        @media (min-width: 1024px) { .mie-grid.has-side { grid-template-columns: minmax(320px, 380px) minmax(0,1fr); } .mie-side { position: sticky; top: 76px; } }
        .mie-row:hover { background: ${colors.bg}; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: font.base, fontWeight: 800, color: colors.text }}>أصناف المنيو{mode === 'branch' && current ? ` — ${current.name}` : ''}</div>
          <div style={{ fontSize: 11, color: colors.text4, marginTop: 2 }}>اضغط على الصنف لتعديله، والمفتاح يخلّيه متوفر أو نفدت</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {recipes.length > 0 && (
            <button onClick={() => { setShowImport(v => !v); setFormOpen(false) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1px solid ${colors.border2}`, background: 'white', color: colors.text2, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}><ListPlus size={16} />من الوصفات</button>
          )}
          <button onClick={() => { setShowImport(false); openNew() }} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}><Plus size={16} strokeWidth={2.4} />صنف جديد</button>
        </div>
      </div>

      <div className={`mie-grid${formOpen || showImport ? ' has-side' : ''}`} style={{ marginTop: 14 }}>
        {(formOpen || showImport) && <div className="mie-side">{formOpen ? formCard : importCard}</div>}

        <div style={{ minWidth: 0 }}>
          {items.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ position: 'relative' as const, flex: 1, minWidth: 0 }}>
                <Search size={15} style={{ position: 'absolute' as const, right: 11, top: '50%', transform: 'translateY(-50%)', color: colors.text4, pointerEvents: 'none' }} />
                <input placeholder="بحث في الأصناف" value={q} onChange={e => setQ(e.target.value)} style={{ ...inp(), width: '100%', paddingRight: 34 }} />
              </div>
              {cats.length > 1 && (
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inp(), width: 'auto', maxWidth: 160 }}>
                  <option value="all">كل الأقسام</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '36px 12px', color: colors.text3, fontSize: 13, border: `1.5px dashed ${colors.border2}`, borderRadius: 12 }}>
              ما فيه أصناف بالمنيو للحين. أضف أول صنف أو اختر من الوصفات
            </div>
          ) : grouped.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 24, color: colors.text4, fontSize: 12 }}>ما فيه صنف بهذا الاسم</div>
          ) : grouped.map(({ cat, list }) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', borderBottom: `1px solid ${colors.border}`, marginBottom: 4 }}>
                {renaming?.cat === cat ? (
                  <input autoFocus value={renaming.value} onChange={e => setRenaming({ cat, value: e.target.value })} onBlur={renameCat} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null) }} style={{ ...inp(), fontWeight: 800, fontSize: 13, padding: '4px 8px', width: 200 }} />
                ) : (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>{cat}</span>
                    <button onClick={() => setRenaming({ cat, value: cat })} title="تغيير اسم القسم" aria-label="تغيير اسم القسم" style={{ ...iconBtn, width: 24, height: 24 }}><Pencil size={13} /></button>
                  </>
                )}
                <span style={{ fontSize: 11, color: colors.text4, marginInlineStart: 'auto' }}>{list.length} صنف</span>
              </div>

              {list.map(it => {
                const available = it.is_available !== false
                const editable = canEdit(it)
                const sib = items.filter(x => catOf(x) === cat), pos = sib.findIndex(x => x.id === it.id)
                return (
                  <div key={it.id} className="mie-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 10, background: editingId === it.id ? colors.infoLight : undefined, opacity: it.is_hidden ? .55 : 1 }}>
                    <button onClick={() => startEdit(it)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, border: 'none', background: 'none', padding: 0, cursor: editable ? 'pointer' : 'default', textAlign: 'right' as const, fontFamily: font.family }}>
                      <span style={{ width: 46, height: 46, borderRadius: 10, background: colors.bg, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: available ? undefined : 'grayscale(1)' }}>
                        {it.image_url ? <img src={it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UtensilsCrossed size={17} strokeWidth={1.5} color={colors.text5} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' as const }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: colors.text, textDecoration: available ? undefined : 'line-through' }}>{it.name}</span>
                          {it.is_featured && <span style={{ fontSize: 9, fontWeight: 800, color: colors.warning, background: colors.warningLight, border: `1px solid ${colors.warningBorder}`, borderRadius: 99, padding: '1px 7px' }}>مميز</span>}
                          {it.is_hidden && <span style={{ fontSize: 9, fontWeight: 800, color: colors.text2, background: colors.bg, border: `1px solid ${colors.border2}`, borderRadius: 99, padding: '1px 7px' }}>مخفي</span>}
                          {mode === 'branch' && !it.branch_id && branches.length > 1 && <span style={{ fontSize: 9, fontWeight: 800, color: colors.info, background: colors.infoLight, border: `1px solid ${colors.infoBorder}`, borderRadius: 99, padding: '1px 7px' }}>كل الفروع</span>}
                        </span>
                        {it.description && <span style={{ display: 'block', fontSize: 11, color: colors.text4, marginTop: 2, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.description}</span>}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: colors.primary, whiteSpace: 'nowrap' as const }}>{it.price != null ? `${it.price} ⃁` : ''}</span>
                    </button>

                    {editable && (
                      <button onClick={() => toggle(it, 'is_available')} role="switch" aria-checked={available} title={available ? 'متوفر — اضغط إذا نفد' : 'نفد — اضغط إذا توفر'}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: 2, fontFamily: font.family, flexShrink: 0 }}>
                        <span style={{ width: 34, height: 20, borderRadius: 99, background: available ? colors.primary : colors.border2, position: 'relative' as const, transition: 'background .15s' }}>
                          <span style={{ position: 'absolute' as const, top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'right .15s', right: available ? 2 : 16 }} />
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: available ? colors.primary : colors.text3, width: 34 }}>{available ? 'متوفر' : 'نفدت'}</span>
                      </button>
                    )}

                    {editable && (
                      <div style={{ position: 'relative' as const, flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setMenuFor(menuFor === it.id ? null : it.id) }} aria-label="خيارات" style={{ ...iconBtn, border: `1px solid ${colors.border}`, background: 'white' }}><Ellipsis size={16} /></button>
                        {menuFor === it.id && (
                          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute' as const, top: 34, left: 0, zIndex: 30, background: 'white', border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: '0 10px 30px rgba(16,24,40,.12)', padding: 6, minWidth: 170 }}>
                            {([
                              [Pencil, 'تعديل', () => startEdit(it)],
                              [Star, it.is_featured ? 'إلغاء التمييز' : 'تمييز الصنف', () => toggle(it, 'is_featured')],
                              [it.is_hidden ? Eye : EyeOff, it.is_hidden ? 'إظهار بالمنيو' : 'إخفاء من المنيو', () => toggle(it, 'is_hidden')],
                              [ArrowUp, 'تحريك لفوق', () => move(it, -1), pos <= 0],
                              [ArrowDown, 'تحريك لتحت', () => move(it, 1), pos >= sib.length - 1],
                              [Trash2, 'حذف', () => remove(it), false, true],
                            ] as [typeof Pencil, string, () => void, boolean?, boolean?][]).map(([Icon, l, fn, disabled, danger]) => (
                              <button key={l} disabled={!!disabled} onClick={() => { setMenuFor(null); fn() }}
                                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'right' as const, border: 'none', background: 'none', padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: font.family, cursor: disabled ? 'default' : 'pointer', color: disabled ? colors.text5 : danger ? colors.danger : colors.text2 }}><Icon size={15} strokeWidth={1.8} />{l}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
