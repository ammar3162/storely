import type { HTMLAttributes, ReactNode } from 'react'
import type { StorelyStatus } from './design-tokens'
import { cn } from './utils'

const statusClasses: Record<StorelyStatus, string> = {
  success: 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]',
  warning: 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]',
  danger: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]',
  info: 'border-[#CBD4DC] bg-[#F3F5F6] text-[#4F6678]',
}

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  status: StorelyStatus
  children: ReactNode
}

export function StorelyStatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-[5px] border px-2 text-xs font-semibold leading-none',
        statusClasses[status],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
