'use client'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyFormField, StorelyPageHeader } from '@/components/ui'
import { storelyTokens } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { getOrgId } from '@/lib/session'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'
import { cache } from '@/lib/cache'

const PERMS = [
  { key:'inventory', label:'المخزون' },
  { key:'dispense', label:'الصرف' },
  { key:'purchases', label:'المشتريات' },
  { key:'reports', label:'التقارير' },
  { key:'profitability', label:'الربحية' },
  { key:'suppliers', label:'الموردين' },
  { key:'staff', label:'الموظفون' },
]

const managerStyles = `
  .branch-managers-page { max-width: 1100px; min-width: 0; margin: 0 auto; color: ${storelyTokens.color.text}; font-family: ${storelyTokens.typography.family}; line-height: ${storelyTokens.typography.lineHeight}; }
  .branch-managers-page h1 { font-size: ${storelyTokens.typography.title}px; line-height: 1.5; }
  .branch-managers-page .manager-section { background: ${storelyTokens.color.surface}; border-radius: ${storelyTokens.radius.card}; margin-bottom: ${storelyTokens.spacing[6]}px; }
  .branch-managers-page .manager-section h2 { font-size: ${storelyTokens.typography.section}px; line-height: 1.7; }
  .branch-managers-page .manager-form { padding: ${storelyTokens.spacing[6]}px; }
  .branch-managers-page .manager-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${storelyTokens.spacing[5]}px; margin-bottom: ${storelyTokens.spacing[6]}px; }
  .branch-managers-page .manager-control { width: 100%; min-width: 0; min-height: 40px; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[3]}px; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; background: ${storelyTokens.color.surface}; color: ${storelyTokens.color.text}; font: inherit; font-size: ${storelyTokens.typography.body}px; }
  .branch-managers-page .manager-control:focus-visible { outline: none; border-color: ${storelyTokens.color.navy}; box-shadow: ${storelyTokens.shadow.focus}; }
  .branch-managers-page .manager-permissions { display: flex; flex-wrap: wrap; gap: ${storelyTokens.spacing[2]}px; }
  .branch-managers-page .manager-checkbox { display: flex; align-items: center; gap: ${storelyTokens.spacing[2]}px; padding: ${storelyTokens.spacing[2]}px ${storelyTokens.spacing[3]}px; min-height: 40px; border: 1px solid ${storelyTokens.color.border}; border-radius: ${storelyTokens.radius.control}; background: ${storelyTokens.color.surface}; cursor: pointer; font-size: ${storelyTokens.typography.body}px; }
  .branch-managers-page .manager-checkbox:has(input:checked) { border-color: ${storelyTokens.color.navy}; }
  .branch-managers-page .manager-checkbox input { width: 16px; height: 16px; accent-color: ${storelyTokens.color.navy}; }
  .branch-managers-page .manager-form-actions { display: flex; margin-top: ${storelyTokens.spacing[6]}px; padding-top: ${storelyTokens.spacing[5]}px; border-top: 1px solid ${storelyTokens.color.border}; }
  .branch-managers-page .manager-record { padding: ${storelyTokens.spacing[6]}px; border-bottom: 1px solid ${storelyTokens.color.border}; }
  .branch-managers-page .manager-record:last-child { border-bottom: 0; }
  .branch-managers-page .manager-record-header { display: flex; align-items: flex-start; justify-content: space-between; gap: ${storelyTokens.spacing[4]}px; margin-bottom: ${storelyTokens.spacing[4]}px; }
  .branch-managers-page .manager-identity { min-width: 0; overflow-wrap: anywhere; }
  .branch-managers-page .manager-name { font-size: ${storelyTokens.typography.body}px; font-weight: 600; }
  .branch-managers-page .manager-branch { display: flex; align-items: baseline; gap: ${storelyTokens.spacing[2]}px; margin-top: ${storelyTokens.spacing[1]}px; color: ${storelyTokens.color.textMuted}; font-size: ${storelyTokens.typography.body}px; }
  .branch-managers-page .manager-placeholder { padding: ${storelyTokens.spacing[8]}px ${storelyTokens.spacing[6]}px; color: ${storelyTokens.color.textMuted}; font-size: ${storelyTokens.typography.body}px; }
  @media (max-width: 640px) { .branch-managers-page .manager-fields { grid-template-columns: minmax(0, 1fr); gap: ${storelyTokens.spacing[4]}px; } .branch-managers-page .manager-form, .branch-managers-page .manager-record { padding: ${storelyTokens.spacing[4]}px; } .branch-managers-page .manager-form-actions > button { width: 100%; } }
`

export default function BranchManagersPage() {
  const [orgId, setOrgId] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [branchId, setBranchId] = useState('')
  const [perms, setPerms] = useState<Record<string,boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ init() },[])

  async function init() {
    const oid = await getOrgId()
    if(!oid) return
    setOrgId(oid)
    const bj = await api.get('/api/branches', { org_id: oid })
    setBranches(bj.branches||[])
    const cachedManagers = cache.get('branch-managers:'+oid)
    if (cachedManagers) setManagers(cachedManagers)
    await loadManagers(oid)
  }

  async function loadManagers(oid:string) {
    if (!cache.get('branch-managers:'+oid)) setLoading(true)
    try {
      const res = await fetch(`/api/branch-managers?org_id=${oid}`)
      const j = await res.json()
      if(!res.ok || j.error){
        toast(j.error||'تعذر تحميل قائمة المديرين','error')
        setManagers([])
      } else {
        setManagers(j.managers||[])
        cache.set('branch-managers:'+oid, j.managers||[])
      }
    } catch {
      toast('خطأ بالاتصال — حاول تحدّث الصفحة','error')
      setManagers([])
    }
    setLoading(false)
  }

  async function addManager() {
    if(!name.trim()||!email.trim()||!password.trim()||!branchId){ toast('عبّي كل الحقول المطلوبة','warning'); return }
    setSaving(true)
    const res = await fetch('/api/branch-managers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      org_id:orgId, full_name:name.trim(), email:email.trim(), password, branch_id:branchId, permissions:perms,
    })})
    const j = await res.json()
    setSaving(false)
    if(j.success){
      toast('✅ تم إضافة مدير الفرع')
      setName(''); setEmail(''); setPassword(''); setBranchId(''); setPerms({})
      loadManagers(orgId)
    } else toast(j.error||'خطأ','error')
  }

  async function togglePerm(managerId:string, key:string, current:any) {
    const updated = { ...(current||{}), [key]: !current?.[key] }
    await fetch('/api/branch-managers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:managerId,org_id:orgId,permissions:updated})})
    loadManagers(orgId)
  }

  async function deleteManager(id:string) {
    if(!(await confirmDialog({ title: 'حذف مدير الفرع', message: 'حذف حساب مدير الفرع هذا نهائياً؟ لن يقدر يدخل النظام بعدها.' }))) return
    const res = await fetch(`/api/branch-managers?id=${id}&org_id=${orgId}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('🗑️ تم الحذف'); loadManagers(orgId) }
    else toast(j.error||'خطأ','error')
  }

  return (
    <div className="branch-managers-page" dir="rtl">
      <style>{managerStyles}</style>
      <StorelyPageHeader
        title="مديرو الفروع"
        description="أضف حساب مدير لكل فرع، وحدد بالضبط أي الصفحات يقدر يشوفها — يدخل بإيميله وكلمة مروره الخاصة، ويشوف فرعه بس"
      />
      <StorelyCard className="manager-section" title="إضافة مدير فرع جديد">
        <div className="manager-form">
          <div className="manager-fields">
            <StorelyFormField label="اسم المدير" htmlFor="manager-name">
              <input id="manager-name" value={name} onChange={e=>setName(e.target.value)} className="manager-control" placeholder="مثال: أحمد محمد"/>
            </StorelyFormField>
            <StorelyFormField label="الفرع" htmlFor="manager-branch">
              <select id="manager-branch" value={branchId} onChange={e=>setBranchId(e.target.value)} className="manager-control">
                <option value="">اختر الفرع</option>
                {branches.map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            </StorelyFormField>
            <StorelyFormField label="الإيميل" htmlFor="manager-email">
              <input id="manager-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="manager-control" dir="ltr" placeholder="manager@example.com"/>
            </StorelyFormField>
            <StorelyFormField label="كلمة المرور" htmlFor="manager-password">
              <input id="manager-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="manager-control" placeholder="6 أحرف على الأقل"/>
            </StorelyFormField>
          </div>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-3 text-sm font-semibold">الصفحات المسموح له يشوفها</legend>
            <div className="manager-permissions">
              {PERMS.map(p=>(
                <label key={p.key} className="manager-checkbox">
                  <input type="checkbox" checked={!!perms[p.key]} onChange={()=>setPerms(prev=>({...prev,[p.key]:!prev[p.key]}))}/>
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="manager-form-actions">
            <StorelyButton onClick={addManager} disabled={saving} variant="primary" size="lg" icon={!saving && <Plus size={16} />}>
              {saving?'جاري الإضافة...':'إضافة مدير الفرع'}
            </StorelyButton>
          </div>
        </div>
      </StorelyCard>
      <StorelyCard className="manager-section" title={`مديرو الفروع الحاليون (${managers.length})`}>
        {loading ? <div className="manager-placeholder" aria-busy="true">جاري التحميل...</div> :
          managers.length===0 ? <div className="manager-placeholder text-center">ما فيه مديرو فروع مضافين بعد</div> :
          <div>
            {managers.map((m:any)=>(
              <div key={m.id} className="manager-record">
                <div className="manager-record-header">
                  <div className="manager-identity">
                    <div className="manager-name">{m.full_name}</div>
                    <div className="manager-branch"><Building2 size={16} className="shrink-0 self-center" aria-hidden="true" /><span>{(m.branches as any)?.name||'—'}</span></div>
                  </div>
                  <StorelyButton onClick={()=>deleteManager(m.id)} variant="danger" size="sm" icon={<Trash2 size={16} />}>حذف</StorelyButton>
                </div>
                <div className="manager-permissions">
                  {PERMS.map(p=>(
                    <StorelyButton key={p.key} onClick={()=>togglePerm(m.id,p.key,m.permissions)}
                      variant={m.permissions?.[p.key]?'primary':'secondary'} aria-pressed={!!m.permissions?.[p.key]}>
                      {p.label}
                    </StorelyButton>
                  ))}
                </div>
              </div>
            ))}
          </div>
        }
      </StorelyCard>
    </div>
  )
}
