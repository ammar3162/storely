'use client'
import { Lock, Trash2 } from 'lucide-react'
import { StorelyPageHeader } from '@/components/ui/page-header'
import { StorelyButton } from '@/components/ui/button'
import InfoHint from '@/components/InfoHint'
import { netProfitHelp } from '@/lib/infoHints'
import { StorelyCard } from '@/components/ui/card'
import { StorelyFormField } from '@/components/ui/form-field'
import { storelyTokens as T } from '@/components/ui/design-tokens'
import { useState, useEffect } from 'react'
import { getMe, getOrgId } from '@/lib/session'
import { currencySymbol } from '@/lib/currencySymbol'
import { toast } from '@/components/toast'
import { cache } from '@/lib/cache'
import { confirmDialog } from '@/components/ConfirmDialog'
import { changePctVisible } from '@/lib/aiPhrases'
import PageSkeleton from '@/components/PageSkeleton'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import NumberInput from '@/components/NumberInput'

const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

function prevMonthOf(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo-1-1, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null
  return Math.round(((curr - prev) / Math.abs(prev)) * 100)
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return `${ARABIC_MONTHS[mo-1]} ${y}`
}

const PF_STYLES = `
  .pf-page{max-width:1200px;min-width:0;margin:0 auto;padding:${T.spacing[6]}px;direction:rtl;font-family:${T.typography.family};font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};color:${T.color.text};background:${T.color.background};border-radius:${T.radius.panel}}
  .pf-page *{box-sizing:border-box}
  .pf-page>header{margin-bottom:${T.spacing[6]}px}
  .pf-page>header h1{font-size:${T.typography.title}px;line-height:1.6}
  .pf-page>header p{font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .pf-page .ui-workspace{padding:${T.spacing[6]}px;margin-bottom:${T.spacing[6]}px;min-width:0;border:1px solid ${T.color.border};border-radius:${T.radius.card};background:${T.color.surface};overflow:visible}
  .pf-page .ui-section-title{font-size:${T.typography.section}px;font-weight:600;color:${T.color.text};margin-bottom:${T.spacing[3]}px;line-height:${T.typography.lineHeight};overflow-wrap:anywhere}
  .pf-page .ui-supporting{font-size:${T.typography.supporting}px;color:${T.color.textMuted};line-height:1.8}
  .pf-page .ui-strong{font-size:${T.typography.body}px;font-weight:600;line-height:${T.typography.lineHeight}}
  .pf-page .ui-value{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.6;overflow-wrap:anywhere}
  .pf-page .ui-between{display:flex;align-items:center;justify-content:space-between;gap:${T.spacing[3]}px;flex-wrap:wrap;min-width:0}
  .pf-page .ui-inline{display:flex;align-items:center;gap:${T.spacing[2]}px;flex-wrap:wrap;min-width:0}
  .pf-page .ui-stack{display:flex;flex-direction:column;gap:${T.spacing[3]}px;min-width:0}
  .pf-page .ui-total{display:flex;justify-content:space-between;align-items:baseline;gap:${T.spacing[3]}px;padding-top:${T.spacing[4]}px;margin-top:${T.spacing[4]}px;border-top:1px solid ${T.color.border};font-size:${T.typography.section}px;font-weight:600}
  .pf-page .ui-button{display:inline-flex;align-items:center;justify-content:center;gap:${T.spacing[2]}px;min-height:40px;height:auto;max-width:100%;padding:${T.spacing[2]}px ${T.spacing[4]}px;background:${T.color.surface};border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};color:${T.color.navy};font-size:${T.typography.body}px;font-weight:600;line-height:1.6;font-family:inherit;text-decoration:none;white-space:normal;cursor:pointer;box-shadow:none}
  .pf-page .ui-button:hover:not(:disabled){background:${T.color.infoBg};border-color:${T.color.infoBorder}}
  .pf-page .ui-button:disabled{opacity:.5;cursor:not-allowed}
  .pf-page .ui-primary{background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .pf-page .ui-primary:hover:not(:disabled){background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .pf-page .ui-danger{background:${T.color.surface};border-color:${T.color.dangerBorder};color:${T.color.danger}}
  .pf-page .ui-danger:hover:not(:disabled){background:${T.color.dangerBg};border-color:${T.color.dangerBorder}}
  .pf-page .ui-control{width:100%;height:44px;min-width:0;padding:${T.spacing[2]}px ${T.spacing[3]}px;border:1px solid ${T.color.infoBorder};border-radius:${T.radius.control};background:${T.color.surface};color:${T.color.text};font-family:inherit;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight}}
  .pf-page .ui-control::placeholder{color:${T.color.textSubtle};opacity:1}
  .pf-page .ui-control:focus-visible,.pf-page button:focus-visible{outline:2px solid ${T.color.navy};outline-offset:2px;box-shadow:${T.shadow.focus}}
  .pf-page input[type=number],.pf-page input[type=month]{direction:ltr;font-variant-numeric:tabular-nums}
  .pf-page input[type=number]{text-align:start}
  .pf-page .ui-label{display:flex;align-items:center;gap:${T.spacing[2]}px;font-size:${T.typography.body}px;line-height:${T.typography.lineHeight};margin-bottom:${T.spacing[3]}px;cursor:pointer}
  .pf-page .ui-checkbox{width:16px;height:16px;flex-shrink:0;accent-color:${T.color.navy}}
  .pf-page .ui-empty{padding:${T.spacing[8]}px ${T.spacing[6]}px;text-align:center;background:${T.color.surface};border:1px solid ${T.color.border};border-radius:${T.radius.card}}
  .pf-page .ui-loading{padding:${T.spacing[8]}px;text-align:center}
  .pf-page.ui-access{text-align:center;padding:${T.spacing[8]}px ${T.spacing[6]}px;background:${T.color.surface};border:1px solid ${T.color.border};max-width:680px}
  .pf-page .ui-large-icon{font-size:24px;margin-bottom:${T.spacing[4]}px}
  @media(max-width:640px){.pf-page{padding:${T.spacing[4]}px}.pf-page .ui-workspace{padding:${T.spacing[5]}px}.pf-page .ui-between{align-items:flex-start}}
  @media(prefers-reduced-motion:reduce){.pf-page *{animation:none!important;transition:none!important}}

  .pf-page .pf-scroll{display:flex;align-items:flex-end;flex-wrap:wrap;gap:${T.spacing[3]}px;margin-bottom:${T.spacing[6]}px;overflow:visible}
  .pf-page .pf-month{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:${T.spacing[1]}px;min-width:130px;padding:${T.spacing[3]}px ${T.spacing[4]}px;text-align:start}
  .pf-page .pf-month[data-active=true],.pf-page .pf-month[data-active=true]:hover{background:${T.color.navy};border-color:${T.color.navy};color:${T.color.surface}}
  .pf-page .pf-month>.ui-supporting{font-size:${T.typography.supporting}px}
  .pf-page .pf-month>.ui-supporting:nth-child(2){font-size:${T.typography.body}px;font-weight:600}
  .pf-page .pf-net{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:${T.spacing[4]}px;margin-bottom:${T.spacing[5]}px}
  .pf-net-value{font-size:28px;line-height:1.5;font-weight:600;font-variant-numeric:tabular-nums;margin-top:${T.spacing[2]}px;overflow-wrap:anywhere}
  .pf-page .pf-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;margin-bottom:${T.spacing[6]}px;border:1px solid ${T.color.border};border-radius:${T.radius.card};background:${T.color.surface};overflow:hidden}
  .pf-summary-cell{padding:${T.spacing[4]}px;border-inline-start:1px solid ${T.color.border};min-width:0}
  .pf-summary-cell:first-child{border-inline-start:0}
  .pf-summary-cell>.ui-value{font-size:${T.typography.section}px;margin-block:${T.spacing[1]}px}
  .pf-summary-cell>.ui-supporting{overflow-wrap:anywhere}
  .pf-expenses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${T.spacing[5]}px;margin-bottom:${T.spacing[5]}px;align-items:start}
  .pf-expenses>.ui-workspace{margin-bottom:0}
  .pf-page .ui-workspace>.ui-supporting{margin-bottom:${T.spacing[4]}px}
  .pf-entry{display:grid;grid-template-columns:minmax(0,1fr) 100px 44px;align-items:center;gap:${T.spacing[2]}px;margin-bottom:${T.spacing[4]}px}
  .pf-entry>.ui-button{height:44px;padding:0}
  .pf-page .ui-stack>.ui-between{min-height:48px;padding:${T.spacing[3]}px 0;border-bottom:1px solid ${T.color.border}}
  .pf-page .ui-stack>.ui-between:last-child{border-bottom:0}
  .pf-page .ui-stack .ui-danger{width:36px;height:36px;min-height:36px;padding:0}
  .pf-page .ui-workspace>.ui-inline{margin-bottom:${T.spacing[4]}px}
  @keyframes pfLoadingSpin{to{transform:rotate(360deg)}}
  .pf-page .ui-spinner{animation:pfLoadingSpin .8s linear infinite;width:32px;height:32px;margin:auto;border:3px solid ${T.color.border};border-top-color:${T.color.navy};border-radius:50%}
  @media(max-width:800px){.pf-expenses{grid-template-columns:minmax(0,1fr)}}
  @media(max-width:640px){.pf-page .pf-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.pf-summary-cell{border-bottom:1px solid ${T.color.border}}.pf-entry{grid-template-columns:minmax(0,1fr) 44px}.pf-entry>.ui-control:first-child{grid-column:1/-1}.pf-page .pf-month{min-width:0;flex:1 1 120px}}
`

export default function ProfitabilityPage() {
  const [month, setMonth] = useState(currentMonth())
  const [orgId, setOrgId] = useState('')
  const [curr, setCurr] = useState('⃁')
  // المنشأة غير المسجلة بالضريبة ما تاخذ ضريبة من العميل — ما نعرض لها ضريبة تقديرية
  const [showVat, setShowVat] = useState(true)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [data, setData] = useState<any>(null)
  const [prevData, setPrevData] = useState<any>(null)
  const [closing, setClosing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [closedMonths, setClosedMonths] = useState<any[]>([])

  const [newTplName, setNewTplName] = useState('')
  const [newTplAmount, setNewTplAmount] = useState('')
  const [savingTpl, setSavingTpl] = useState(false)

  const [newVarName, setNewVarName] = useState('')
  const [newVarAmount, setNewVarAmount] = useState('')
  const [savingVar, setSavingVar] = useState(false)

  const [hasDelivery, setHasDelivery] = useState(false)
  const [newDeliveryPlatform, setNewDeliveryPlatform] = useState('')
  const [newDeliveryAmount, setNewDeliveryAmount] = useState('')
  const [savingDelivery, setSavingDelivery] = useState(false)

  // تحديث فوري: لما تتغير بيانات المنشأة من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null, ['purchases','cashier_closings','fixed_expenses','monthly_fixed_expenses','delivery_income'], ()=>loadAll())
  useEffect(()=>{ init() },[])
  useEffect(()=>{ if(orgId) { loadAll(); loadClosedMonths() } },[orgId, month])

  async function init() {
    const oid = await getOrgId()
    if(!oid) return
    setOrgId(oid)
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)); setShowVat(me?.org?.vat_registered!==false) })
  }

  async function loadClosedMonths() {
    const bid = sessionStorage.getItem('s_branch_id')
    const res = await fetch(`/api/profitability/closed-months?org_id=${orgId}${bid?`&branch_id=${bid}`:''}`)
    const j = await res.json()
    if(j.success) setClosedMonths(j.months||[])
  }

  async function loadAll() {
    const bid = sessionStorage.getItem('s_branch_id')
    const cacheKey = `profitability:${orgId}:${month}:${bid||''}`
    const cached = cache.get(cacheKey)
    if(cached){ setData(cached); setLocked(false); setLoading(false) }
    else setLoading(true)

    const url = `/api/profitability?org_id=${orgId}&month=${month}${bid?`&branch_id=${bid}`:''}`
    const res = await fetch(url)
    const json = await res.json()
    if(json.error === 'upgrade_required'){ setLocked(true); setData(null); setLoading(false); return }
    setLocked(false)
    if(json.success){ setData(json); cache.set(cacheKey, json); setHasDelivery((json.deliveryIncomeList||[]).length > 0) }
    else if(!cached) { toast(json.error||'تعذر تحميل البيانات','error'); setData(null) }
    setLoading(false)

    const pm = prevMonthOf(month)
    fetch(`/api/profitability?org_id=${orgId}&month=${pm}${bid?`&branch_id=${bid}`:''}`)
      .then(r=>r.json()).then(pj=>{ if(pj.success) setPrevData(pj); else setPrevData(null) })
      .catch(()=>setPrevData(null))
  }

  async function closeMonth() {
    if(!(await confirmDialog({ title: 'إقفال الشهر', message: `تأكيد إقفال شهر ${monthLabel(month)}؟\n\nبعد الإقفال لن تتمكن من إضافة مصروفات لهذا الشهر أو حذفها، وستبقى أرقامه ثابتة حتى لو تغيّرت بيانات المشتريات لاحقاً.`, type: 'warning' }))) return
    setClosing(true)
    const res = await fetch('/api/profitability', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ org_id: orgId, branch_id: sessionStorage.getItem('s_branch_id'), month })
    })
    const j = await res.json()
    setClosing(false)
    if(j.success){ toast('تم إقفال الشهر بنجاح'); cache.invalidate('profitability:'); loadAll(); loadClosedMonths() }
    else toast(j.error||'خطأ','error')
  }

  async function exportPdf() {
    if(!data) return
    setExporting(true)
    try {
      const rows = [
        {name:`المبيعات (${data.closingsCount} إقفال كاشير)`, type:'إيرادات', amount: Math.round(data.totalIn).toLocaleString('en-US')+' '+curr},
        ...(data.deliveryIncomeList||[]).map((e:any)=>({name:`دخل توصيل — ${e.platform}`, type:'إيرادات', amount: Number(e.amount).toFixed(0)+' '+curr})),
        ...(showVat?[{name:'الضريبة على المبيعات (تقديري)', type:'إيرادات', amount: Math.round(vatAmount).toLocaleString('en-US')+' '+curr}]:[]),
        {name:'مشتريات المخزون', type:'مشتريات', amount: Math.round(data.inventoryPurchases).toLocaleString('en-US')+' '+curr},
        {name:'مشتريات أخرى', type:'مشتريات', amount: Math.round(data.otherPurchases).toLocaleString('en-US')+' '+curr},
        ...fixedList.map((e:any)=>({name:e.name, type:'مصروف ثابت', amount: Number(e.amount).toFixed(0)+' '+curr})),
        ...variableList.map((e:any)=>({name:e.name, type:'مصروف متغيّر', amount: Number(e.amount).toFixed(0)+' '+curr})),
      ]
      await (await import('@/lib/pdfExport')).exportReportPdf({
        title: 'تقرير الربحية الشهرية',
        subtitle: `${monthLabel(month)}${data.closed?' — مقفل '+new Date(data.closedAt).toLocaleDateString('ar-SA-u-ca-gregory',{numberingSystem:'latn',day:'numeric',month:'long',year:'numeric'}):''}`,
        orgName: '',
        columns: [
          {header:'البند', key:'name', align:'right'},
          {header:'التصنيف', key:'type', align:'center'},
          {header:'المبلغ', key:'amount', align:'left'},
        ],
        rows,
        summaryStats: [
          {label:'المبيعات', value: Math.round(data.totalIn).toLocaleString('en-US')+' '+curr},
          {label:'إجمالي المشتريات', value: Math.round(data.totalPurchases).toLocaleString('en-US')+' '+curr},
          {label:'إجمالي المصروفات', value: Math.round(fixedTotal+variableTotal).toLocaleString('en-US')+' '+curr},
          ...(showVat?[{label:'الضريبة (تقديري)', value: Math.round(vatAmount).toLocaleString('en-US')+' '+curr}]:[]),
          {label:'صافي الربح', value: Math.round(data.netProfit).toLocaleString('en-US')+' '+curr, color: data.netProfit>=0?'#203640':'#dc2626'},
        ],
        totalsRow: {name:'الصافي', type:'', amount: Math.round(data.netProfit).toLocaleString('en-US')+' '+curr},
        fileName: `الربحية_${month}.pdf`,
      })
    } finally { setExporting(false) }
  }

  function exportCsv() {
    if(!data) return
    const rows: string[][] = [
      ['البند','التصنيف','المبلغ'],
      [`المبيعات (${data.closingsCount} إقفال كاشير)`,'إيرادات', Math.round(data.totalIn).toString()],
      ...(data.deliveryIncomeList||[]).map((e:any)=>[`دخل توصيل — ${e.platform}`,'إيرادات', Number(e.amount).toFixed(0)]),
      ...(showVat?[['الضريبة على المبيعات (تقديري)','إيرادات', Math.round(vatAmount).toString()]]:[]),
      ['مشتريات المخزون','مشتريات', Math.round(data.inventoryPurchases).toString()],
      ['مشتريات أخرى','مشتريات', Math.round(data.otherPurchases).toString()],
      ...fixedList.map((e:any)=>[e.name,'مصروف ثابت', Number(e.amount).toFixed(0)]),
      ...variableList.map((e:any)=>[e.name,'مصروف متغيّر', Number(e.amount).toFixed(0)]),
      ['صافي الربح','—', Math.round(data.netProfit).toString()],
    ]
    const csv = '\ufeff' + rows.map(r=>r.map((c:string)=>'"'+c+'"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}))
    Object.assign(document.createElement('a'),{href:url,download:`الربحية_${month}.csv`}).click()
    URL.revokeObjectURL(url)
  }

  async function addTemplate() {
    if(!newTplName.trim()||!newTplAmount) return
    setSavingTpl(true)
    const res = await fetch('/api/fixed-expenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),name:newTplName.trim(),amount:Number(newTplAmount),month:`${month}-01`})})
    const j = await res.json()
    setSavingTpl(false)
    if(j.success){ setNewTplName(''); setNewTplAmount(''); toast('تمت الإضافة'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function deleteTemplate(fixedExpenseId:string) {
    if(!(await confirmDialog({ title: 'حذف المصروف الثابت', message: 'حذف هذا المصروف الثابت نهائياً؟ (لن يتكرر بالشهور القادمة)' }))) return
    const res = await fetch(`/api/fixed-expenses?id=${fixedExpenseId}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('تم الحذف'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function addVariable() {
    if(!newVarName.trim()||!newVarAmount) return
    setSavingVar(true)
    const res = await fetch('/api/monthly-fixed-expenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),month:`${month}-01`,name:newVarName.trim(),amount:Number(newVarAmount)})})
    const j = await res.json()
    setSavingVar(false)
    if(j.success){ setNewVarName(''); setNewVarAmount(''); toast('تمت الإضافة'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function deleteVariable(id:string) {
    if(!(await confirmDialog({ title: 'حذف المصروف', message: 'حذف هذا المصروف؟' }))) return
    const res = await fetch(`/api/monthly-fixed-expenses?id=${id}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('تم الحذف'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function addDeliveryIncome(platform?: string) {
    const p = (platform || newDeliveryPlatform).trim()
    if(!p || !newDeliveryAmount) return
    setSavingDelivery(true)
    const res = await fetch('/api/delivery-income',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org_id:orgId,branch_id:sessionStorage.getItem('s_branch_id'),month:`${month}-01`,platform:p,amount:Number(newDeliveryAmount)})})
    const j = await res.json()
    setSavingDelivery(false)
    if(j.success){ setNewDeliveryPlatform(''); setNewDeliveryAmount(''); toast('تمت الإضافة'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  async function deleteDeliveryIncome(id:string) {
    if(!(await confirmDialog({ title: 'حذف دخل التوصيل', message: 'حذف هذا السجل؟' }))) return
    const res = await fetch(`/api/delivery-income?id=${id}`,{method:'DELETE'})
    const j = await res.json()
    if(j.success){ toast('تم الحذف'); cache.invalidate('profitability:'); loadAll() }
    else toast(j.error||'خطأ','error')
  }

  if(locked) return (
    <div className="pf-page ui-access">
      <style>{PF_STYLES}</style>
      <div className="ui-large-icon"><Lock size={32}/></div>
      <div className="ui-section-title" style={{color:T.color.text}}>ميزة الربحية متاحة بباقة أعلى أو بإضافتها من صفحة الإضافات</div>
      <div className="hide-in-app ui-supporting" style={{color:T.color.textMuted}}>رقِّ باقتك لمتابعة مبيعاتك ومصروفاتك وأرباحك الشهرية</div>
    </div>
  )

  const fixedList = (data?.fixedExpensesList||[]).filter((e:any)=>e.fixed_expense_id)
  const variableList = (data?.fixedExpensesList||[]).filter((e:any)=>!e.fixed_expense_id)
  const fixedTotal = fixedList.reduce((s:number,e:any)=>s+Number(e.amount||0),0)
  const variableTotal = variableList.reduce((s:number,e:any)=>s+Number(e.amount||0),0)
  const vatAmount = data ? data.totalIn - (data.totalIn/1.15) : 0
  const totalExpenses = fixedTotal + variableTotal
  const netColor = data && data.netProfit>=0 ? '#203640' : '#dc2626'

  return (
    <div className="pf-page">
      <style>{PF_STYLES}</style>

      <StorelyPageHeader title="الربحية الشهرية" description={<>المبيعات، المشتريات، والمصروفات — تتحدّث تلقائياً</>}/>

      {/* شريط الأشهر المقفلة */}
      <div className="pf-scroll ui-inline">
        {closedMonths.map((cm:any)=>{
          const cmMonth = cm.month.slice(0,7)
          const active = cmMonth === month
          const positive = cm.net_profit >= 0
          return (
            <StorelyButton className="ui-button pf-month" data-active={active} key={cm.month} onClick={()=>setMonth(cmMonth)}>
              <div className="ui-supporting" style={{color:active?'rgba(255,255,255,.55)':T.color.textMuted}}>{monthLabel(cmMonth)}</div>
              <div className="ui-supporting" style={{color:active?'white':(positive?T.color.navy:T.color.danger)}}>
                {Math.round(cm.net_profit).toLocaleString('en-US')} {curr}
              </div>
              <div className="ui-supporting" style={{color:active?'rgba(255,255,255,.45)':T.color.textMuted}}>مقفل</div>
            </StorelyButton>
          )
        })}
        <StorelyFormField label={<>اختر شهر آخر</>} htmlFor="profitability-month">

          <input id="profitability-month" className="ui-control" type="month" value={month} onChange={e=>setMonth(e.target.value)} />
        </StorelyFormField>
      </div>

      {loading ? (
        <PageSkeleton/>
      ) : data && (
        <>
        {/* بطاقة صافي الربح الرئيسية */}
        <StorelyCard className="ui-workspace pf-net">
          <div>
            <div className="ui-inline">
              <span className="ui-supporting" style={{color:T.color.textMuted,display:'inline-flex',alignItems:'center',gap:2}}>صافي الربح — {monthLabel(month)}<InfoHint title="صافي الربح" {...netProfitHelp} /></span>
              {data.closed ? (
                <span className="ui-strong" style={{color:T.color.danger}}>
                  مقفل {new Date(data.closedAt).toLocaleDateString('ar-SA-u-ca-gregory', {numberingSystem:'latn',day:'numeric',month:'long'})}
                </span>
              ) : (
                <StorelyButton className="ui-button" onClick={closeMonth} disabled={closing}>
                  {closing?'جاري الإقفال...':'إقفال الشهر'}
                </StorelyButton>
              )}
            </div>
            <div className="pf-net-value" style={{color:netColor}}>
              {Math.round(data.netProfit).toLocaleString('en-US')} {curr}
            </div>
          </div>
          <div className="ui-inline">
            <StorelyButton className="ui-button" onClick={exportPdf} disabled={exporting}>
              PDF
            </StorelyButton>
            <StorelyButton className="ui-button" onClick={exportCsv}>
              CSV
            </StorelyButton>
          </div>
        </StorelyCard>

        {/* صف المقاييس */}
        <div className="pf-summary">
          {[
            {label:'المبيعات',value:data.totalIn,prev:prevData?.totalIn},
            ...(hasDelivery?[{label:'دخل التوصيل',value:data.deliveryIncomeTotal||0,prev:prevData?.deliveryIncomeTotal}]:[]),
            {label:'المشتريات',value:data.totalPurchases,prev:prevData?.totalPurchases},
            {label:'إجمالي المصروفات',value:totalExpenses,prev:prevData?(prevData.fixedExpensesTotal):undefined},
            {label:'تكلفة الرواتب',value:data.salaryExpenseTotal||0,prev:prevData?.salaryExpenseTotal},
            ...(showVat?[{label:'الضريبة (تقديري)',value:vatAmount,prev:prevData?(prevData.totalIn-(prevData.totalIn/1.15)):undefined}]:[]),
          ].map((s,i)=>{
            // النسبة تنعرض بس لو المقارنة منطقية (مثلاً ▲1281% لما الشهر السابق شبه فاضي تضلل)
            const change = (prevData && s.prev!==undefined && changePctVisible(s.value, s.prev)) ? pctChange(s.value, s.prev) : null
            return (
              <div className="pf-summary-cell" key={i}>
                <div className="ui-supporting" style={{color:T.color.textMuted}}>{s.label}</div>
                <div className="ui-value" style={{color:T.color.text}}>{Math.round(s.value).toLocaleString('en-US')} {curr}</div>
                {change!==null && (
                  <div className="ui-supporting" style={{color:change>=0?T.color.navy:T.color.danger}}>
                    {change>=0?'▲':'▼'} {Math.abs(change)}% عن {monthLabel(prevMonthOf(month))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* المصروفات */}
        <div className="pf-expenses">
          <StorelyCard className="ui-workspace">
            <div className="ui-section-title" style={{color:T.color.text}}>المصروفات الثابتة</div>
            <div className="ui-supporting" style={{color:T.color.textMuted}}>رواتب، إيجار... تتكرر تلقائياً كل شهر</div>
            {!data.closed && (
            <div className="pf-entry">
              <input className="ui-control" value={newTplName} onChange={e=>setNewTplName(e.target.value)} placeholder="اسم المصروف" />
              <NumberInput className="ui-control" value={newTplAmount} onChange={e=>setNewTplAmount(e.target.value)} placeholder="المبلغ" />
              <StorelyButton className="ui-button ui-primary" variant="primary" onClick={addTemplate} disabled={savingTpl}>{savingTpl?'...':'+'}</StorelyButton>
            </div>
            )}
            {fixedList.length===0 ? (
              <div className="ui-supporting" style={{color:T.color.textMuted}}>لا توجد مصروفات ثابتة مسجّلة</div>
            ) : (
              <div className="ui-stack">
                {fixedList.map((e:any)=>(
                  <div className="ui-between" key={e.id}>
                    <span className="ui-strong" style={{color:T.color.text}}>{e.name}</span>
                    <div className="ui-inline">
                      <span className="ui-strong" style={{color:T.color.text}}>{Number(e.amount).toFixed(0)} {curr}</span>
                      {!data.closed && <StorelyButton className="ui-button ui-danger" variant="danger" onClick={()=>deleteTemplate(e.fixed_expense_id)} aria-label="حذف"><Trash2 size={14}/></StorelyButton>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </StorelyCard>

          <StorelyCard className="ui-workspace">
            <div className="ui-section-title" style={{color:T.color.text}}>مصروفات متغيّرة</div>
            <div className="ui-supporting" style={{color:T.color.textMuted}}>كهرباء، صيانة... تُدخل يدوياً لكل شهر على حدة</div>
            {!data.closed && (
            <div className="pf-entry">
              <input className="ui-control" value={newVarName} onChange={e=>setNewVarName(e.target.value)} placeholder="اسم المصروف" />
              <NumberInput className="ui-control" value={newVarAmount} onChange={e=>setNewVarAmount(e.target.value)} placeholder="المبلغ" />
              <StorelyButton className="ui-button ui-primary" variant="primary" onClick={addVariable} disabled={savingVar}>{savingVar?'...':'+'}</StorelyButton>
            </div>
            )}
            {variableList.length===0 ? (
              <div className="ui-supporting" style={{color:T.color.textMuted}}>لا توجد مصروفات متغيرة هذا الشهر</div>
            ) : (
              <div className="ui-stack">
                {variableList.map((e:any)=>(
                  <div className="ui-between" key={e.id}>
                    <span className="ui-strong" style={{color:T.color.text}}>{e.name}</span>
                    <div className="ui-inline">
                      <span className="ui-strong" style={{color:T.color.text}}>{Number(e.amount).toFixed(0)} {curr}</span>
                      {!data.closed && <StorelyButton className="ui-button ui-danger" variant="danger" onClick={()=>deleteVariable(e.id)} aria-label="حذف"><Trash2 size={14}/></StorelyButton>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </StorelyCard>
        </div>

        {/* مصادر دخل خارجية (تطبيقات توصيل) */}
        <StorelyCard className="ui-workspace">
          <label className="ui-label">
            <input className="ui-checkbox" type="checkbox" checked={hasDelivery} onChange={e=>setHasDelivery(e.target.checked)} />
            <span className="ui-strong" style={{color:T.color.text}}>عندك دخل خارجي من تطبيقات توصيل؟ (هنقرستيشن، جاهز...)</span>
          </label>

          {hasDelivery && (
            <>
              {!data.closed && (
              <div className="pf-entry">
                <input className="ui-control" value={newDeliveryPlatform} onChange={e=>setNewDeliveryPlatform(e.target.value)} placeholder="اسم التطبيق" />
                <NumberInput className="ui-control" value={newDeliveryAmount} onChange={e=>setNewDeliveryAmount(e.target.value)} placeholder="المبلغ" />
                <StorelyButton className="ui-button ui-primary" variant="primary" onClick={()=>addDeliveryIncome()} disabled={savingDelivery}>{savingDelivery?'...':'+'}</StorelyButton>
              </div>
              )}
              {!data.closed && (
              <div className="ui-inline">
                <StorelyButton className="ui-button" onClick={()=>setNewDeliveryPlatform('هنقرستيشن')}>هنقرستيشن</StorelyButton>
                <StorelyButton className="ui-button" onClick={()=>setNewDeliveryPlatform('جاهز')}>جاهز</StorelyButton>
              </div>
              )}
              {(data.deliveryIncomeList||[]).length===0 ? (
                <div className="ui-supporting" style={{color:T.color.textMuted}}>لا يوجد دخل توصيل مسجّل هذا الشهر</div>
              ) : (
                <div className="ui-stack">
                  {(data.deliveryIncomeList||[]).map((e:any)=>(
                    <div className="ui-between" key={e.id}>
                      <span className="ui-strong" style={{color:T.color.text}}>{e.platform}</span>
                      <div className="ui-inline">
                        <span className="ui-strong" style={{color:T.color.navy}}>{Number(e.amount).toFixed(0)} {curr}</span>
                        {!data.closed && <StorelyButton className="ui-button ui-danger" variant="danger" onClick={()=>deleteDeliveryIncome(e.id)} aria-label="حذف"><Trash2 size={14}/></StorelyButton>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </StorelyCard>
        </>
      )}
    </div>
  )
}
