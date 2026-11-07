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
        'storely-empty',
        className,
      )}
    >
      <div className="storely-empty-icon">
        {icon ?? <Inbox size={16} />}
      </div>
      <div className="storely-empty-title">{title}</div>
      {description ? <p className="storely-empty-description">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
