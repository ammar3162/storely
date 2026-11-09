import type { ReactNode } from 'react'
import { cn } from './utils'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  className?: string
}

export function StorelyPageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('storely-page-header', className)}>
      <div className="storely-page-heading">
        {eyebrow ? (
          <div className="storely-eyebrow">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="storely-page-title">{title}</h1>
        {description ? (
          <p className="storely-page-description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="storely-actions">{actions}</div> : null}
    </header>
  )
}
