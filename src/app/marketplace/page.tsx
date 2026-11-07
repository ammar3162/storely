'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { Gift, Globe, Handshake, MapPin, MessageCircle, Package, Search, Star, Store, Truck } from 'lucide-react'
import { StorelyButton, StorelyCard, StorelyEmptyState, StorelyPageHeader, StorelyStatusBadge } from '@/components/ui'

// حماية أمنية: يمنع عرض روابط خبيثة (javascript:, data:, إلخ) كرابط قابل للنقر
function isSafeUrl(url?: string | null): boolean {
  if (!url) return false
  return /^https?:\/\//i.test(url.trim())
}

const BUSINESS_TYPES = [
  {v:'الكل',icon:'🌟'},
  {v:'مطاعم',icon:'🍔'},{v:'كوفي',icon:'☕'},{v:'مخابز',icon:'🥖'},
  {v:'بقالة',icon:'🛒'},{v:'صيدليات',icon:'💊'},{v:'مستودعات',icon:'🏭'},
  {v:'متاجر إلكترونية',icon:'🛍️'},
]

export default function MarketplacePage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('الكل')
  const [search, setSearch] = useState('')
  const [orgType, setOrgType] = useState<string|null>(null)
  const [newSuppliers, setNewSuppliers] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [ratings, setRatings] = useState<Record<string,{avg:number;count:number}>>({})

  useEffect(()=>{
    loadSuppliers()
    // جيب نوع نشاط المنشأة من sessionStorage
    const orgBiz = sessionStorage.getItem('s_business_type')
    if(orgBiz) setFilter(orgBiz)
  },[])

  async function loadSuppliers() {
    setLoading(true)
    const j = await api.get('/api/marketplace', { view: 'list' })
    setSuppliers(j.suppliers || [])
    setNewSuppliers(j.new_suppliers || [])
    if (j.ratings && Object.keys(j.ratings).length) setRatings(j.ratings)
    setLoading(false)
  }

  const filtered = suppliers.filter(s=>{
    const matchType = filter==='الكل' || s.business_type?.includes(filter)
    const matchSearch = !search || s.company_name?.includes(search) || s.description?.includes(search)
    return matchType && matchSearch
  })

  const filteredNewSuppliers = newSuppliers.filter((s:any)=>
    !search || s.business_name?.includes(search) || s.items.some((it:any)=>it.name?.includes(search))
  )

  function getWhatsAppLink(s: any) {
    const phone = (s.whatsapp||s.phone||'').replace(/^0/,'966').replace(/[^0-9]/g,'')
    const msg = encodeURIComponent(`مرحباً، أنا عميل Storely وأود الاستفادة من عرضكم الخاص 🎁`)
    return `https://wa.me/${phone}?text=${msg}`
  }

  // الصفحة مقفلة مؤقتاً لين يتجمع موردون معتمدون فعليون
  const COMING_SOON = false
  if (COMING_SOON) return (
    <div className="min-h-screen bg-[var(--storely-background)] text-[var(--storely-navy)]" dir="rtl">
      <div className="!mx-auto max-w-6xl !p-4 sm:!p-8">
        <StorelyButton onClick={()=>window.location.href='/dashboard'}>← رجوع</StorelyButton>
        <StorelyCard className="!mx-auto !mt-8 max-w-2xl !p-6 text-center sm:!p-8">
          <Handshake size={28} className="!mx-auto !mb-5" />
          <h1 className="!mb-4 text-2xl font-semibold">قريباً — موردونا المعتمدون</h1>
          <div className="text-sm leading-8 text-[var(--storely-muted)]">
            نشتغل حالياً على جمع أفضل الموردين المعتمدين ليكونوا في خدمتك بعروض وأولوية توصيل حصرية.<br/>
            تابعنا قريباً — الميزة راح تكون متاحة بأقرب وقت.
          </div>
        </StorelyCard>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--storely-background)] text-[var(--storely-navy)]" dir="rtl">
      <div className="!mx-auto max-w-6xl !space-y-6 !px-4 !py-6 sm:!p-8">
        <StorelyPageHeader title="الموردون المعتمدون" description="موردون معتمدون من Storely مع عروض وأولوية توصيل حصرية"
          actions={<StorelyButton onClick={()=>window.location.href='/dashboard'}>← رجوع</StorelyButton>} />
        <StorelyCard className="!overflow-visible">
          <div className="storely-toolbar">
            <div className="storely-search">
              <Search size={16} className="storely-search-icon" aria-hidden="true" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن مورد..." className="storely-input" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 !p-5 sm:!p-6">
            {BUSINESS_TYPES.map(t=>(
              <StorelyButton key={t.v} onClick={()=>setFilter(t.v)} variant={filter===t.v?'primary':'secondary'} size="sm">
                {t.v}
              </StorelyButton>
            ))}
          </div>
        </StorelyCard>
        {loading ? (
          <div className="storely-loading">جاري التحميل...</div>
        ) : filtered.length===0 && newSuppliers.length===0 ? (
          <StorelyEmptyState title="لا يوجد موردون في هذا المجال" description="جرّب تصفية مختلفة أو تواصل معنا لإضافة موردين" />
        ) : filtered.length===0 ? null : (
          <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(s=>(
              <StorelyCard key={s.id} className="flex flex-col">
                <div className="flex flex-wrap items-center gap-4 border-b border-[var(--storely-border)] !p-5 sm:!p-6">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.company_name} className="size-12 shrink-0 rounded-[var(--radius-sm)] border border-[var(--storely-border)] object-cover" />
                  ) : (
                    <Store size={24} className="shrink-0 text-[var(--storely-muted)]" />
                  )}
                  <div className="min-w-0 flex-1 basis-32">
                    <div className="break-words text-base font-semibold leading-7">{s.company_name}</div>
                    <div className="!mt-2 flex flex-wrap gap-2">
                      {s.business_type?.slice(0,2).map((t:string)=>(
                        <span key={t} className="text-xs leading-6 text-[var(--storely-muted)]">{t}</span>
                      ))}
                    </div>
                  </div>
                  <StorelyStatusBadge status="success">✓ معتمد</StorelyStatusBadge>
                </div>
                <div className="flex flex-1 flex-col gap-4 !p-5 sm:!p-6">
                  {s.offer && (
                    <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--storely-border)] !p-4">
                      <Gift size={16} className="!mt-1 shrink-0" />
                      <div className="min-w-0">
                        <div className="!mb-2 text-sm font-semibold">عرض حصري لعملاء Storely</div>
                        <div className="break-words text-sm leading-7 text-[var(--storely-muted)]">{s.offer}</div>
                      </div>
                    </div>
                  )}
                  {s.description && (
                    <p className="break-words text-sm leading-7 text-[var(--storely-muted)]">{s.description}</p>
                  )}
                  <div className="storely-actions !mt-auto">
                    <a href={getWhatsAppLink(s)} target="_blank" rel="noopener noreferrer" className="storely-button flex-1" data-variant="primary">
                      <MessageCircle size={16} className="shrink-0" /> تواصل للحصول على العرض
                    </a>
                    {isSafeUrl(s.website) && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="storely-button !w-10 !px-0" data-variant="secondary" aria-label={s.website}>
                        <Globe size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </StorelyCard>
            ))}
          </div>
        )}
        {filteredNewSuppliers.length > 0 && (
          <section className="!space-y-4" style={{marginTop: filtered.length>0 ? 32 : 0}}>
            <h2 className="text-lg font-semibold">موردون جدد على Storely</h2>
            <div className="grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredNewSuppliers.map((s:any)=>{
                const isOpen = expandedId===s.id
                const phone = (s.phone||'').replace(/^0/,'966').replace(/[^0-9]/g,'')
                const waMsg = encodeURIComponent(`مرحباً، أنا عميل Storely وأود الاستفسار عن أصنافكم 🙌`)
                const rating = ratings[s.id]
                const firstItemImg = s.items.find((it:any)=>it.image_url)?.image_url
                return (
                  <StorelyCard key={s.id} className="flex flex-col">
                    <div>
                      {firstItemImg ? (
                        <img src={firstItemImg} alt="" className="h-40 w-full object-cover" />
                      ) : null}
                      <div className="!space-y-4 border-b border-[var(--storely-border)] !p-5 sm:!p-6">
                        <div className="flex items-start gap-3">
                          <Truck size={20} className="!mt-1 shrink-0 text-[var(--storely-muted)]" />
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-base font-semibold leading-7">{s.business_name}</div>
                            {s.location && <div className="!mt-2 flex items-start gap-2 text-sm leading-6 text-[var(--storely-muted)]"><MapPin size={14} className="!mt-1 shrink-0" />{s.location}</div>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--storely-muted)]">
                          <span>{s.items.length} صنف</span>
                          {rating && (
                            <span className="inline-flex items-center gap-2 font-semibold tabular-nums">
                              <Star size={14} /> {rating.avg.toFixed(1)} ({rating.count})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-4 !p-5 sm:!p-6">
                      <a href={`/marketplace/${s.id}`} className="storely-button w-full" data-variant="secondary">
                        زيارة صفحة المورد ←
                      </a>
                      {isOpen && (
                        <div className="flex flex-col divide-y divide-[var(--storely-border)]">
                          {s.items.map((it:any)=>(
                            <div key={it.id} className="flex flex-wrap items-center gap-3 !py-4">
                              {it.image_url ? (
                                <img src={it.image_url} alt="" className="size-10 rounded-[var(--radius-sm)] object-cover" />
                              ) : (
                                <Package size={20} className="text-[var(--storely-muted)]" />
                              )}
                              <div className="min-w-0 flex-1 basis-24">
                                <div className="break-words text-sm font-semibold">{it.name}</div>
                                <div className="!mt-1 text-xs text-[var(--storely-muted)]">{it.unit}</div>
                              </div>
                              <div className="text-sm font-semibold tabular-nums">{it.price} ر.س</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {phone && (
                        <a href={`https://wa.me/${phone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="storely-button !mt-auto" data-variant="primary">
                          <MessageCircle size={16} /> تواصل مع المورد
                        </a>
                      )}
                    </div>
                  </StorelyCard>
                )
              })}
            </div>
          </section>
        )}
        <StorelyCard className="!p-6 sm:!p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0 flex-1 basis-64">
              <h2 className="!mb-2 text-xl font-semibold">هل أنت مورد؟</h2>
              <div className="text-sm leading-7 text-[var(--storely-muted)]">انضم لشبكة موردينا المعتمدين واستفد من قاعدة عملائنا</div>
            </div>
            <a href="/suppliers-join" className="storely-button" data-variant="primary">تقدم الآن ←</a>
          </div>
        </StorelyCard>
      </div>
    </div>
  )
}
