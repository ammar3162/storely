'use client'
import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, Minus, Info } from 'lucide-react'
import InfoHint from '@/components/InfoHint'
import { foodCostHelp } from '@/lib/infoHints'
import { api } from '@/lib/api-client'
import { StorelyCard, StorelyStatusBadge } from '@/components/ui'
import type { FoodCostResult } from '@/lib/foodCost'

// «تكلفة المواد» في الصفحة الرئيسية: كم ريال مواد خرجت من المخزون مقابل كل 100 ريال مبيعات
export default function FoodCostCard({ curr }: { curr: string }) {
  const [d, setD] = useState<FoodCostResult | null>(null)
  useEffect(() => {
    const org_id = sessionStorage.getItem('s_org_id'), branch_id = sessionStorage.getItem('s_branch_id')
    if (!org_id) return
    api.get('/api/food-cost', { org_id, branch_id }).then((r: any) => { if (r?.success) setD(r) }).catch(() => {})
  }, [])
  if (!d) return null

  const money = (v: number) => Math.round(v).toLocaleString('en-US') + ' ' + curr
  const pct = d.week.pct, prev = d.prev.pct, target = d.target
  const fmtDay = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' })
  const over = pct !== null && target !== null && pct > target
  const diff = pct !== null && prev !== null ? Math.round((pct - prev) * 10) / 10 : null

  return (
    <StorelyCard
      title="تكلفة المواد من المبيعات"
      description={`آخر 7 أيام (${fmtDay(d.from)} – ${fmtDay(d.to)})`}
      actions={
        <div className="flex items-center gap-2">
          {pct !== null && target !== null ? <StorelyStatusBadge status={over ? 'warning' : 'success'}>{over ? 'أعلى من الهدف' : 'ضمن الهدف'}</StorelyStatusBadge> : null}
          <InfoHint title="تكلفة المواد من المبيعات" label="ما هذه النسبة؟" {...foodCostHelp(target, curr)} />
        </div>
      }
    >
      {pct === null ? (
        <div className="flex items-start gap-3 px-4 py-4 text-[13.5px] leading-6 text-[#4b5565] sm:px-[18px]">
          <Info size={18} className="mt-0.5 shrink-0 text-[#66737C]" />
          <span>تظهر النسبة بعد تسجيل 3 إقفالات كاشير على الأقل خلال الأسبوع، مع تسجيل الصرف أو الجرد. سجّلت {d.week.closingDays} من 3 هذا الأسبوع.</span>
        </div>
      ) : (
        <>
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6 sm:px-[18px]">
            <div>
              <div className="text-[34px] font-bold leading-10 tabular-nums text-[#203640]"><span dir="ltr">{pct}%</span></div>
              {diff !== null ? (
                <div className={(diff > 0 ? 'text-[#B45309]' : diff < 0 ? 'text-[#047857]' : 'text-[#66737C]') + ' mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold'}>
                  {diff > 0 ? <TrendingUp size={14} /> : diff < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                  <span>{diff === 0 ? 'مثل الأسبوع الماضي' : `${Math.abs(diff)} نقطة ${diff > 0 ? 'أعلى' : 'أقل'} من الأسبوع الماضي (${prev}%)`}</span>
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] leading-6 text-[#203640]">من كل 100 {curr} مبيعات، خرج من المخزون مواد بقيمة <b className="tabular-nums">{Math.round(pct)} {curr}</b>.</p>
              <div className="relative mt-3 h-2.5 rounded-full bg-[#EEF2F4]" dir="ltr">
                <div className={(over ? 'bg-[#B45309]' : 'bg-[#203640]') + ' h-full rounded-full'} style={{ width: `${Math.min(pct, 100)}%` }} />
                {target !== null ? <div className="absolute -top-1 h-[18px] w-0.5 rounded bg-[#66737C]" style={{ left: `${target}%` }} title={`الهدف ${target}%`} /> : null}
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[12px] text-[#66737C]">
                <span>المبيعات {money(d.week.sales)} · المواد {money(d.week.cost)}</span>
                {target !== null ? <span>الهدف المعتاد لنشاطك {target}% أو أقل</span> : null}
              </div>
            </div>
          </div>
          {d.items.length ? (
            <div className="border-t border-[var(--storely-border)]">
              <div className="px-4 pt-3 text-[13px] font-semibold text-[#203640] sm:px-[18px]">أكثر المواد تكلفة هذا الأسبوع</div>
              <div className="divide-y divide-[#E6ECEF]">
                {d.items.map(it => {
                  const ch = it.prevCost > 0 ? Math.round(((it.cost - it.prevCost) / it.prevCost) * 100) : null
                  return (
                    <div key={it.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] sm:px-[18px]">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#203640]">{it.name}</div>
                        <div className="text-[12px] tabular-nums text-[#66737C]">{it.qty.toLocaleString('en-US')} {it.unit}</div>
                      </div>
                      <div className="shrink-0 text-end">
                        <div className="font-semibold tabular-nums text-[#203640]">{money(it.cost)}</div>
                        {ch !== null && Math.abs(ch) >= 10 ? <div className={(ch > 0 ? 'text-[#B45309]' : 'text-[#047857]') + ' text-[12px] font-semibold tabular-nums'}><span dir="ltr">{ch > 0 ? '+' : '−'}{Math.abs(ch)}%</span></div> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
          {d.missingCost > 0 ? <div className="border-t border-[var(--storely-border)] px-4 py-2.5 text-[12px] leading-5 text-[#66737C] sm:px-[18px]">{d.missingCost === 1 ? 'صنف واحد انصرف' : `${d.missingCost} أصناف انصرفت`} بدون تكلفة معروفة لأنه لا توجد له فاتورة شراء، فلم يُحسب في النسبة.</div> : null}
        </>
      )}
    </StorelyCard>
  )
}
