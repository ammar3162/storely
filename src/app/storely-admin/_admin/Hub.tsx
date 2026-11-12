'use client'
// صفحة تجمع أكثر من قسم في تبويبات (?tab=) — كل تبويب بصلاحيته، والتبويب المختار ينحفظ في الرابط
import { Suspense, type ComponentType } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { A, HubContext, PageHeader, useAdmin, type AdminCounts } from './kit'

export type HubTab = { key: string; label: string; perm?: string | string[]; Comp: ComponentType; count?: keyof AdminCounts | (keyof AdminCounts)[] }

function HubInner({ title, subtitle, tabs }: { title: string; subtitle: string; tabs: HubTab[] }) {
  const { can, counts } = useAdmin()
  const router = useRouter(), pathname = usePathname(), params = useSearchParams()
  const allowed = tabs.filter(t => can(t.perm))
  if (!allowed.length) return null
  const cur = allowed.find(t => t.key === params.get('tab')) || allowed[0]
  const n = (t: HubTab) => !t.count || !counts ? 0 : (Array.isArray(t.count) ? t.count : [t.count]).reduce((s, k) => s + (counts[k] || 0), 0)
  const Comp = cur.Comp
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {allowed.length > 1 && (
        <div role="tablist" className="adm-hubtabs">
          {allowed.map(t => {
            const on = t === cur, c = n(t)
            return (
              <button key={t.key} role="tab" aria-selected={on} type="button" className={`adm-hubtab${on ? ' on' : ''}`}
                onClick={() => router.replace(`${pathname}?tab=${t.key}`, { scroll: false })}>
                {t.label}
                {c > 0 && <span className="adm-hubtab-n">{c}</span>}
              </button>
            )
          })}
        </div>
      )}
      <HubContext.Provider value={true}><Comp key={cur.key} /></HubContext.Provider>
    </>
  )
}

export default function Hub(props: { title: string; subtitle: string; tabs: HubTab[] }) {
  return <Suspense fallback={null}><HubInner {...props} /></Suspense>
}

export const HUB_CSS = `
  .adm-hubtabs{display:flex;gap:4px;border-bottom:1px solid ${A.border};margin:-8px 0 24px;overflow-x:auto;scrollbar-width:none}
  .adm-hubtabs::-webkit-scrollbar{display:none}
  .adm-hubtab{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 14px;border:none;background:none;font-family:inherit;font-size:14px;font-weight:500;color:${A.text2};cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
  .adm-hubtab:hover{color:${A.text}}
  .adm-hubtab.on{color:${A.primary};font-weight:600;border-bottom-color:${A.primary}}
  .adm-hubtab-n{min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:${A.danger};color:#fff;font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
`
