import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './utils'

type StorelyCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
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
        'storely-card',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div className="storely-card-header">
          <div className="storely-card-heading">
            {title ? <h2 className="storely-card-title">{title}</h2> : null}
            {description ? (
              <p className="storely-card-description">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="storely-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
