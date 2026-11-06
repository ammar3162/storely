'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { currencySymbol } from '@/lib/currencySymbol'
import { api } from '@/lib/api-client'
import { getMe, refreshMe } from '@/lib/session'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { toast } from '@/components/toast'
import { confirmDialog } from '@/components/ConfirmDialog'

/** حالة صفحة أدوات الذكاء ودوالها — منقولة كما هي من page.tsx */
export function useAiTools() {
  const [insights, setInsights] = useState<any>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  async function runSmartInsights() {
    setInsightsLoading(true); setInsightsError(''); setInsights(null)
    try {
      const orgId = sessionStorage.getItem('s_org_id')
      const branchId = sessionStorage.getItem('s_branch_id')
      const res = await fetch('/api/smart-insights', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ org_id: orgId, branch_id: branchId }) })
      const data = await res.json()
      if (data.success) setInsights(data.insights)
      else setInsightsError(data.error || 'حدث خطأ غير متوقع')
    } catch (e) {
      setInsightsError('تعذّر الاتصال بالخادم')
    }
    setInsightsLoading(false)
  }

  const [weeklyReport, setWeeklyReport] = useState<any>(null)
  const [wasteReport, setWasteReport] = useState<any[]>([])
  const [wasteLoading, setWasteLoading] = useState(false)
  const [realWasteReport, setRealWasteReport] = useState<any>(null)
  const [recipeReconReport, setRecipeReconReport] = useState<any>(null)
  const [reconLoading, setReconLoading] = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [recipesList, setRecipesList] = useState<any[]>([])
  const [showRecipesList, setShowRecipesList] = useState(false)
  const [editingRecipeId, setEditingRecipeId] = useState<string|null>(null)
  const [deletingRecipeId, setDeletingRecipeId] = useState<string|null>(null)
  const [reconFrom, setReconFrom] = useState('')
  const [reconMethod, setReconMethod] = useState<'count'|'dispense'>('count')
  const [reconTo, setReconTo] = useState('')

  async function loadRecipesList() {
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    const j=await api.get('/api/recipes',{org_id:orgId})
    setRecipesList(j.recipes||[])
  }

  async function deleteRecipe(id:string) {
    if(!(await confirmDialog({ title: 'حذف الوصفة', message: 'حذف هذي الوصفة؟ هذا الإجراء لا يمكن التراجع عنه.' }))) return
    setDeletingRecipeId(id)
    const r=await api.del('/api/recipes',{org_id:sessionStorage.getItem('s_org_id'),id})
    setDeletingRecipeId(null)
    if(!r.success){toast('فشل حذف الوصفة — حاول مرة أخرى','error');return}
    toast('✅ تم حذف الوصفة')
    setRecipesList(prev=>prev.filter(r=>r.id!==id))
  }

  async function openEditRecipe(id:string) {
    const orgId=sessionStorage.getItem('s_org_id')
    if(!orgId) return
    const bid=sessionStorage.getItem('s_branch_id')
    const j=await api.get('/api/products',{org_id:orgId,branch_id:bid,full:1})
    setRawMaterials(j.products||[])
    setEditingRecipeId(id)
    setShowRecipeModal(true)
  }
  const [realWasteLoading, setRealWasteLoading] = useState(false)
  const [seasonality, setSeasonality] = useState<any>(null)
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [branchComp, setBranchComp] = useState<any[]>([])
  const [branchLoading, setBranchLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const router = useRouter()
  const [curr, setCurr] = useState('⃁')
  const [isOwner, setIsOwner] = useState(false)   // مقارنة الفروع للمالك فقط
  useEffect(()=>{
    getMe().then(me=>{ if(me?.org?.currency) setCurr(currencySymbol(me.org.currency)); setIsOwner(me?.role==='owner') })
  },[])

  const [visible] = useState(true)
  const [plan, setPlan] = useState(() => typeof window!=='undefined' ? (sessionStorage.getItem('s_plan')||'basic') : 'basic')
  // صلاحية أدوات الذكاء من السيرفر (/api/me → features.ai: الباقة أو إضافة فعّالة ما انتهت).
  // null = لسه ما وصل الرد — ما نعرض القفل ولا الأدوات لين نعرف (كان يطلع القفل لحظة وبعدين ينفتح)
  const [hasAiAddon, setHasAiAddon] = useState<boolean|null>(null)
  const applyAccess = (me: Awaited<ReturnType<typeof getMe>>) => {
    if (me?.org?.plan) setPlan(me.org.plan)
    setHasAiAddon(!!me?.org?.features?.ai)
  }
  useEffect(() => { getMe().then(applyAccess).catch(() => setHasAiAddon(false)) }, [])
  // تفعيل/انتهاء إضافة أو تغيير الباقة والصفحة مفتوحة → يفتح/يقفل بدون تحديث
  useLiveRefresh(typeof window !== 'undefined' ? sessionStorage.getItem('s_org_id') : null, ['org_addon_subscriptions', 'plan_requests'],
    () => { refreshMe().then(applyAccess).catch(() => {}) })
  const aiKnown = hasAiAddon !== null

  return { insights, setInsights, insightsLoading, setInsightsLoading, insightsError, setInsightsError, weeklyReport, setWeeklyReport, wasteReport, setWasteReport, wasteLoading, setWasteLoading, realWasteReport, setRealWasteReport, recipeReconReport, setRecipeReconReport, reconLoading, setReconLoading, showRecipeModal, setShowRecipeModal, rawMaterials, setRawMaterials, recipesList, setRecipesList, showRecipesList, setShowRecipesList, editingRecipeId, setEditingRecipeId, deletingRecipeId, setDeletingRecipeId, reconFrom, setReconFrom, reconMethod, setReconMethod, reconTo, setReconTo, realWasteLoading, setRealWasteLoading, seasonality, setSeasonality, seasonLoading, setSeasonLoading, branchComp, setBranchComp, branchLoading, setBranchLoading, reportLoading, setReportLoading, curr, setCurr, isOwner, setIsOwner, visible, plan, setPlan, hasAiAddon, setHasAiAddon, router, applyAccess, aiKnown, runSmartInsights, loadRecipesList, deleteRecipe, openEditRecipe }
}

export type AiToolsPage = ReturnType<typeof useAiTools>
