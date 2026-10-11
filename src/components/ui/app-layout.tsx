'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from './utils'

export type StorelyNavItem = {
  href: string
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
}

export type StorelyNavGroup = {
  label?: ReactNode
  items: StorelyNavItem[]
}

type StorelyAppLayoutProps = {
  brand?: ReactNode
  groups: StorelyNavGroup[]
  topbar?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function StorelyAppLayout({ brand, groups, topbar, footer, children }: StorelyAppLayoutProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-l border-[#1E293B] bg-[#0F172A] text-white">
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        {brand ?? <span className="text-base font-semibold">Storely</span>}
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-4">
            {group.label ? (
              <div className="px-2.5 pb-2 text-xs font-semibold uppercase tracking-[.08em] text-slate-400">
                {group.label}
              </div>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex h-10 items-center gap-2.5 rounded-[6px] px-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-white text-[#0F172A]'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {item.icon ? <span className="inline-flex size-5 items-center justify-center [&>svg]:size-[18px]">{item.icon}</span> : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      {footer ? <div className="border-t border-white/10 p-4">{footer}</div> : null}
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="hidden md:fixed md:inset-y-0 md:right-0 md:z-30 md:block">{sidebar}</div>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 md:mr-64 md:px-7">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-[6px] border border-[#E5E7EB] text-[#0F172A] md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1">{topbar}</div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/45"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 right-0">
            {sidebar}
            <button
              type="button"
              className="absolute left-3 top-3 inline-flex size-8 items-center justify-center rounded-[6px] bg-white/10 text-white"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : null}
      <main className="px-4 py-6 md:mr-64 md:px-8 md:py-7">{children}</main>
    </div>
  )
}
