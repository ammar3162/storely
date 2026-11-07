import type { HTMLAttributes, ReactNode } from 'react'
import type { StorelyStatus } from './design-tokens'
import { cn } from './utils'

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  status: StorelyStatus
  children: ReactNode
}

export function StorelyStatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn('storely-badge', className)}
      data-status={status}
      {...props}
    >
      {children}
    </span>
  )
}
