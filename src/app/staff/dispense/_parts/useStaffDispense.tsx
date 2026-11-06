'use client'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { useStaffLang } from '@/lib/staffLang'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStaffOrg } from '@/lib/session'
import { OTHER_CATEGORY } from './categories'
import { T } from './strings'
import type { StaffSession } from './types'

/** حالة صفحة الموظف ودوالها — منقولة كما هي من page.tsx */
export function useStaffDispense() {
  const searchParams = useSearchParams()
  const forcedTab = searchParams.get('tab') as 'dispense'|'inventory'|'purchases'|'reports'|null
  const [session, setSession] = useState<StaffSession|null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [subscriptionExpired, setSubscriptionExpired] = useState(false)
  const [reauthPin, setReauthPin] = useState('')
  const [reauthError, setReauthError] = useState('')
  const [reauthLoading, setReauthLoading] = useState(false)
  const [tab, setTab] = useState<'dispense'|'inventory'|'purchases'|'reports'>('dispense')
  const [products, setProducts] = useState<any[]>([])
  const [translations, setTranslations] = useState<Record<string,Record<string,string>>>({})
  const { lang, setLang } = useStaffLang()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orgLogo, setOrgLogo] = useState<string|null>(null)
  const [bizType, setBizType] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string|null>(null)
  const [mostUsed, setMostUsed] = useState<any[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [dispenseQty, setDispenseQty] = useState('')
  const [wasteMode, setWasteMode] = useState(false)
  const [wasteReason, setWasteReason] = useState('')
  const [wasteNote, setWasteNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:'success'|'error'}|null>(null)
  // inventory
  const [invSearch, setInvSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<any|null>(null)
  const [editQty, setEditQty] = useState('')
  const [savingQty, setSavingQty] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({name:'',qty:'',unit:'قطعة',category:''})
  const [savingProduct, setSavingProduct] = useState(false)
  const [invCategory, setInvCategory] = useState<string|null>(null)

  const router = useRouter()

  // Permissions polling
  // تحديث فوري: لما تتغير البيانات من أي جهاز، الصفحة تعيد جلبها
  useLiveRefresh(session?.org_id, ['products','stock_movements','staff_members'], ()=>{ if(session){ refreshProductsQuietly(session); loadStats(session) } })
  useEffect(()=>{
    async function checkPermissions() {
      const saved = localStorage.getItem('staff_session')
      if(!saved) return
      const s = JSON.parse(saved)
      try {
        const permToken = localStorage.getItem('staff_token')
        const res = await fetch('/api/staff-permissions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${permToken}`},body:JSON.stringify({})})
        if(res.status===403){
          // انتهى اشتراك المنشأة — قفل كامل للصفحة، إعادة إدخال PIN ما بتحل شي هنا
          setSubscriptionExpired(true)
          return
        }
        if(res.status===401){
          // انتهت الجلسة — نطلب PIN فقط بدل تسجيل خروج كامل
          setNeedsReauth(true)
          return
        }
        if(res.ok){
          const data = await res.json()
          if(data.deleted){
            localStorage.removeItem('staff_session')
            router.push('/staff')
            return
          }
          if(data.permissions){
            const updated = {...s,permissions:data.permissions}
            localStorage.setItem('staff_session',JSON.stringify(updated))
            setSession(prev=>prev?{...prev,permissions:data.permissions}:prev)
          }
        }
      } catch {}
    }
    checkPermissions()
    const interval = setInterval(checkPermissions, 5000)
    return ()=>clearInterval(interval)
  },[])

  useEffect(()=>{
    const productsInterval = setInterval(()=>{
      const saved = localStorage.getItem('staff_session')
      if(!saved) return
      const s = JSON.parse(saved) as StaffSession
      refreshProductsQuietly(s)
    }, 90000)   // احتياط — المخزون يتحدث فوراً عبر useLiveRefresh
    return ()=>clearInterval(productsInterval)
  },[])

  useEffect(()=>{
    const saved = localStorage.getItem('staff_session')
    if(!saved){router.push('/staff');return}
    const s = JSON.parse(saved) as StaffSession
    const p = s.permissions
    setSession(s)
    if(forcedTab && p && (p as any)[forcedTab]){
      setTab(forcedTab)
    } else if(p && !p.dispense){
      if(p.inventory) setTab('inventory')
      else if(p.purchases) setTab('purchases')
      else if(p.reports) setTab('reports')
    }
    loadProducts(s)
    loadStats(s)
    getStaffOrg().then(org=>{ if(org?.logo_url) setOrgLogo(org.logo_url); setBizType(org?.business_type??null) })
  },[])

  useEffect(()=>{
    if(session && products.length > 0 && lang !== 'ar') fetchTranslation(session, lang)
  },[session, products, lang])

  async function loadStats(s: StaffSession) {
    try {
      const statsToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-dispense-stats',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${statsToken}`},body:JSON.stringify({branch_id:s.branch_id})})
      const d = await res.json()
      setMostUsed(d.mostUsed||[])
      setTodayCount(d.todayCount||0)
    } catch {}
  }

  async function loadProducts(s: StaffSession) {
    setLoading(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-products',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({branchId:s.branch_id})})
      const data = await res.json()
      setProducts(data.products || [])
    } catch { setProducts([]) }
    setLoading(false)
  }

  async function refreshProductsQuietly(s: StaffSession) {
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-products',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({branchId:s.branch_id})})
      const data = await res.json()
      setProducts(data.products || [])
    } catch {}
  }

  async function fetchTranslation(s: StaffSession, targetLang: string) {
    setTranslating(true)
    try {
      const transToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/translate-products',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${transToken}`},body:JSON.stringify({branchId:s.branch_id,targetLang})})
      const data = await res.json()
      setTranslations(prev=>({...prev,[targetLang]:data.translations||{}}))
    } catch {}
    setTranslating(false)
  }

  function showMsg(msg: string, type: 'success'|'error' = 'success') {
    setToast({msg,type})
    setTimeout(()=>setToast(null), 2500)
  }

  function tx(text: string) {
    if(lang === 'ar') return text
    return translations[lang]?.[text?.trim()] || text
  }

  async function handleDispense() {
    if(!session||!selected||!dispenseQty||Number(dispenseQty)<=0){showMsg(T('error',lang),'error');return}
    if(Number(dispenseQty)>selected.qty){showMsg(T('tooMuch',lang),'error');return}
    setSubmitting(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-dispense',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({productId:selected.id,qty:Number(dispenseQty),staffName:session.name})})
      if(!res.ok){
        // انتهاء الجلسة ← نطلب PIN؛ غير كذا نعرض سبب الخطأ الفعلي بدل رسالة عامة
        if(res.status===401){ setNeedsReauth(true); setSubmitting(false); return }
        const err = await res.json().catch(()=>({}))
        showMsg(err.error || `${T('error',lang)} (${res.status})`,'error');setSubmitting(false);return
      }
      fetch('/api/notify-staff-dispense',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({staff_name:session.name,product_name:selected.name,qty:Number(dispenseQty),unit:selected.unit})}).catch(()=>{})
      fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({org_id:session.org_id,product_id:selected.id,new_qty:selected.qty-Number(dispenseQty),reorder_point:(selected.supplier_reorder_point ?? selected.reorder_point)})}).catch(()=>{})
      showMsg(T('success',lang))
      setSelected(null); setDispenseQty('')
      loadProducts(session)
    } catch (e:any) { showMsg(`${T('error',lang)} — ${e?.message||T('netError',lang)}`,'error') }
    setSubmitting(false)
  }

  const WASTE_REASONS = ['تالف','منتهي الصلاحية','كسر','سرقة/فقدان','خطأ تحضير','أخرى']

  async function handleWaste() {
    if(!session||!selected||!dispenseQty||Number(dispenseQty)<=0||!wasteReason){showMsg(T('error',lang),'error');return}
    if(Number(dispenseQty)>selected.qty){showMsg(T('tooMuch',lang),'error');return}
    setSubmitting(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-waste',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({productId:selected.id,qty:Number(dispenseQty),staffName:session.name,wasteReason,note:wasteNote})})
      if(!res.ok){
        // انتهاء الجلسة ← نطلب PIN؛ غير كذا نعرض سبب الخطأ الفعلي بدل رسالة عامة
        if(res.status===401){ setNeedsReauth(true); setSubmitting(false); return }
        const err = await res.json().catch(()=>({}))
        showMsg(err.error || `${T('error',lang)} (${res.status})`,'error');setSubmitting(false);return
      }
      fetch('/api/notify-waste',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({staff_name:session.name,product_name:selected.name,qty:Number(dispenseQty),unit:selected.unit,waste_reason:wasteReason})}).catch(()=>{})
      fetch('/api/notify-low-stock-instant',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({org_id:session.org_id,product_id:selected.id,new_qty:selected.qty-Number(dispenseQty),reorder_point:(selected.supplier_reorder_point ?? selected.reorder_point)})}).catch(()=>{})
      showMsg(T('wasteSaved',lang))
      setSelected(null); setDispenseQty(''); setWasteMode(false); setWasteReason(''); setWasteNote('')
      loadProducts(session)
    } catch (e:any) { showMsg(`${T('error',lang)} — ${e?.message||T('netError',lang)}`,'error') }
    setSubmitting(false)
  }

  async function updateQty() {
    if(!editingProduct||!editQty||!session) return
    setSavingQty(true)
    try {
      const staffToken = localStorage.getItem('staff_token')
      const res = await fetch('/api/staff-edit-inventory',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${staffToken}`},body:JSON.stringify({productId:editingProduct.id,newQty:Number(editQty),staffName:session.name})})
      const j = await res.json()
      if(!res.ok||!j.success){ showMsg(j.error||T('error',lang),'error'); setSavingQty(false); return }
      setEditingProduct(null)
      loadProducts(session)
    } catch (e:any) { showMsg(`${T('error',lang)} — ${e?.message||T('netError',lang)}`,'error') }
    setSavingQty(false)
  }

  async function addProduct() {
    if(!newProduct.name.trim()||!newProduct.qty||!session||savingProduct) return
    setSavingProduct(true)
    try {
      const res = await fetch('/api/staff-add-product',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('staff_token')}`},
        body:JSON.stringify({name:newProduct.name.trim(),qty:Number(newProduct.qty),unit:newProduct.unit,category:newProduct.category.trim()||null})})
      const j = await res.json().catch(()=>({}))
      if(!res.ok || !j.success){ showMsg(j.error || T('addFailed',lang),'error'); setSavingProduct(false); return }
      showMsg(T(j.created ? 'added' : 'qtyAdded',lang,{name:newProduct.name.trim()}),'success')
      setNewProduct({name:'',qty:'',unit:'قطعة',category:''})
      setShowAddProduct(false)
      loadProducts(session)
    } catch { showMsg(T('netRetry',lang),'error') }
    setSavingProduct(false)
  }

  function logout() { localStorage.removeItem('staff_session'); localStorage.removeItem('staff_token'); router.push('/staff') }

  async function submitReauth() {
    if(!session || !reauthPin || reauthLoading) return
    setReauthLoading(true); setReauthError('')
    try {
      const res = await fetch('/api/staff-reauth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staff_id:session.id,pin:reauthPin})})
      const data = await res.json()
      if(!res.ok){
        setReauthError(data.error||T('wrongPin',lang))
        setReauthPin('')
        setReauthLoading(false)
        return
      }
      localStorage.setItem('staff_token',data.token)
      localStorage.setItem('staff_session',JSON.stringify(data.staff))
      setSession(data.staff)
      setNeedsReauth(false); setReauthPin(''); setReauthError(''); setReauthLoading(false)
    } catch {
      setReauthError(T('errorRetry',lang))
      setReauthLoading(false)
    }
  }

  const categoriesMap: Record<string,number> = {}
  products.forEach(p=>{ const c=p.category?.trim()||OTHER_CATEGORY; categoriesMap[c]=(categoriesMap[c]||0)+1 })
  const categories = Object.keys(categoriesMap).sort((a,b)=>{ if(a===OTHER_CATEGORY)return 1; if(b===OTHER_CATEGORY)return -1; return categoriesMap[b]-categoriesMap[a] })
  const searchResults = search.trim() ? products.filter(p=>p.name?.includes(search)||tx(p.name).toLowerCase().includes(search.toLowerCase())) : []
  const categoryProducts = activeCategory ? products.filter(p=>(p.category?.trim()||OTHER_CATEGORY)===activeCategory) : []
  const filteredInventory = products.filter(p=>!invSearch||p.name?.includes(invSearch)||tx(p.name).toLowerCase().includes(invSearch.toLowerCase()))
  const invCategoriesMap: Record<string,number> = {}
  products.forEach(p=>{ const c=p.category?.trim()||OTHER_CATEGORY; invCategoriesMap[c]=(invCategoriesMap[c]||0)+1 })
  const invCategories = Object.keys(invCategoriesMap).sort((a,b)=>{ if(a===OTHER_CATEGORY)return 1; if(b===OTHER_CATEGORY)return -1; return invCategoriesMap[b]-invCategoriesMap[a] })

  return { lang, setLang, session, setSession, needsReauth, setNeedsReauth, subscriptionExpired, setSubscriptionExpired, reauthPin, setReauthPin, reauthError, setReauthError, reauthLoading, setReauthLoading, tab, setTab, products, setProducts, translations, setTranslations, showLangMenu, setShowLangMenu, translating, setTranslating, loading, setLoading, orgLogo, setOrgLogo, bizType, setBizType, search, setSearch, activeCategory, setActiveCategory, mostUsed, setMostUsed, todayCount, setTodayCount, selected, setSelected, dispenseQty, setDispenseQty, wasteMode, setWasteMode, wasteReason, setWasteReason, wasteNote, setWasteNote, submitting, setSubmitting, toast, setToast, invSearch, setInvSearch, editingProduct, setEditingProduct, editQty, setEditQty, savingQty, setSavingQty, showAddProduct, setShowAddProduct, newProduct, setNewProduct, savingProduct, setSavingProduct, invCategory, setInvCategory, searchParams, forcedTab, router, WASTE_REASONS, categoriesMap, categories, searchResults, categoryProducts, filteredInventory, invCategoriesMap, invCategories, loadStats, loadProducts, refreshProductsQuietly, fetchTranslation, showMsg, tx, handleDispense, handleWaste, updateQty, addProduct, logout, submitReauth }
}

export type StaffDispense = ReturnType<typeof useStaffDispense>
/** قيم تنحسب في الصفحة بعد التأكد من وجود الجلسة */
export type PageVals = { session: StaffSession; isRTL: boolean; tabs: { key: string; label: string; icon: React.ReactNode; show?: boolean }[] }
