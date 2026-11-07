'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { api } from '@/lib/api-client'
import { BarChart3, MessageCircle, Package, ShoppingCart, Upload, Users } from 'lucide-react'
import { StorelyButton } from '@/components/ui/button'

const FEATURES = [
  { icon:<Package size={18}/>, title:'المخزون',      desc:'أضف منتجاتك وحدد الحد الأدنى — سنبلّغك قبل أن ينفد أي صنف', page:'/inventory' },
  { icon:<Upload size={18}/>, title:'الصرف',        desc:'سجّل الصرف اليومي بضغطة واحدة — سريع ومرتب بالفئات', page:'/dispense' },
  { icon:<ShoppingCart size={18}/>, title:'المشتريات',    desc:'سجّل فواتير الشراء مع احتساب ضريبة 15% تلقائياً', page:'/purchases' },
  { icon:<BarChart3 size={18}/>, title:'التقارير',     desc:'تقارير الصرف والمشتريات والجرد — صدّر بـ CSV بضغطة', page:'/reports' },
  { icon:<Users size={18}/>, title:'الموظفون',     desc:'أضف موظفين يصرفون برمز PIN فقط — بدون وصول لبياناتك', page:'/staff-management' },
  { icon:<MessageCircle size={18}/>, title:'تنبيهات واتساب', desc:'يصلك إشعار فوري على واتساب عند نقص أي صنف', page:'/settings' },
]

interface Announcement {
  id:string; version:string; title:string; description:string
  type:'modal'|'banner'; page:string|null; icon:string; color:string
  target_orgs?: string[]|null
}

export default function FeatureAnnouncement() {
  const [show, setShow]                   = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentBanner, setCurrentBanner] = useState<Announcement|null>(null)
  const [orgName, setOrgName]             = useState('')
  const [loaded, setLoaded]               = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(()=>{ init() },[])

  useEffect(()=>{
    if(announcements.length>0 && loaded) {
      const banners=announcements.filter(a=>a.type==='banner')
      if(banners.length>0) setCurrentBanner(banners[0])
    }
  },[announcements,loaded])

  // auto-dismiss بعد 7 ثواني
  useEffect(()=>{
    if(!currentBanner) return
    const t = setTimeout(()=>markSeen(currentBanner.version), 7000)
    return ()=>clearTimeout(t)
  },[currentBanner])

  async function init() {
    const j=await api.get('/api/announcements'); if(!j.success) return
    setLoaded(true)
    if(j.org_name) setOrgName(j.org_name)
    if(!j.seen_welcome && pathname==='/dashboard'){
      setShow(true); return
    }
    // الفلترة حسب المنشأة المستهدفة والإعلانات المشاهدة تصير على الخادم
    setAnnouncements(j.announcements||[])
  }

  function dismiss() {
    setShow(false)
    if(!loaded) return
    api.post('/api/announcements',{welcome:true})
  }

  async function markSeen(version:string) {
    setCurrentBanner(null)
    setAnnouncements(prev=>prev.filter(a=>a.version!==version))
    if(!loaded) return
    await api.post('/api/announcements',{version})
  }

  return (
    <>
      {show && (
        <div className="storely-overlay">
          <div className="storely-dialog storely-tour">
            <h2 className="storely-dialog-title">أهلاً{orgName?` بـ ${orgName}`:''}!</h2>
            <p className="storely-dialog-message">إليك نظرة سريعة على أهم ما يقدمه Storely — كل شي تحتاجه لإدارة مخزونك باحترافية</p>
            <div className="storely-tour-grid">
              {FEATURES.map((f,i)=>(
                <button key={i} className="storely-feature" onClick={()=>{ dismiss(); router.push(f.page) }}>
                  <div className="storely-actions mb-2">{f.icon}<span className="storely-feature-title">{f.title}</span></div>
                  <div className="storely-feature-description">{f.desc}</div>
                </button>
              ))}
            </div>
            <div className="storely-dialog-actions">
              <StorelyButton onClick={()=>{ dismiss(); router.push('/dashboard') }} variant="primary">ابدأ الاستخدام ←</StorelyButton>
              <StorelyButton onClick={dismiss} variant="ghost">تخطي</StorelyButton>
            </div>
          </div>
        </div>
      )}
      {currentBanner && (
        <div className="storely-announcement">
          <div className="storely-actions min-w-0 flex-1">
            <span className="shrink-0">{currentBanner.icon}</span>
            <div className="min-w-0 flex-1 break-words">
              <div className="storely-feature-title">{currentBanner.title}</div>
              <div className="storely-feature-description">{currentBanner.description}</div>
            </div>
          </div>
          <div className="storely-actions">
            {currentBanner.page&&(
              <StorelyButton onClick={()=>{ markSeen(currentBanner.version); router.push(currentBanner.page!) }}>جربها</StorelyButton>
            )}
            <StorelyButton onClick={()=>markSeen(currentBanner.version)} variant="ghost" className="!w-10 !px-0">×</StorelyButton>
          </div>
        </div>
      )}
    </>
  )
}
