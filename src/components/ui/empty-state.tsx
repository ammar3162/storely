import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from './utils'

type EmptyStateProps = {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function StorelyEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-40 flex-col items-center justify-center rounded-[6px] border border-dashed border-[#E7E1D8] bg-white px-5 py-8 text-center',
        className,
      )}
    >
      <div className="mb-3 inline-flex size-8 items-center justify-center rounded-[5px] border border-[#E7E1D8] bg-[#F8EEDF]/45 text-[#66737C]">
        {icon ?? <Inbox size={16} />}
      </div>
      <div className="text-sm font-semibold leading-6 text-[#203640]">{title}</div>
      {description ? <p className="mt-1.5 max-w-md text-[13px] leading-6 text-[#66737C]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
