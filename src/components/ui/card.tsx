import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './utils'

type StorelyCardProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function StorelyCard({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: StorelyCardProps) {
  const hasHeader = title || description || actions

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[6px] border border-[#E7E1D8] bg-white',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4 border-b border-[#E7E1D8] px-4 py-3.5">
          <div className="min-w-0">
            {title ? <h2 className="m-0 text-base font-semibold leading-6 text-[#203640]">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-[13px] leading-5 text-[#66737C]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
