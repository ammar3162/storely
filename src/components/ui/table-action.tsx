import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from './utils'

type TableActionKind = 'view' | 'edit' | 'delete' | 'more'

type TableActionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  action: TableActionKind
  children?: ReactNode
  showLabel?: boolean
}

const actionMeta: Record<TableActionKind, { label: string; icon: ReactNode }> = {
  view: {
    label: 'عرض',
    icon: <Eye size={16} />,
  },
  edit: {
    label: 'تعديل',
    icon: <Pencil size={16} />,
  },
  delete: {
    label: 'حذف',
    icon: <Trash2 size={16} />,
  },
  more: {
    label: 'المزيد',
    icon: <MoreHorizontal size={16} />,
  },
}

export function StorelyTableAction({
  action,
  children,
  showLabel = false,
  className,
  type = 'button',
  'aria-label': ariaLabel,
  title,
  ...props
}: TableActionProps) {
  const meta = actionMeta[action]
  const label = children ?? meta.label

  return (
    <button
      type={type}
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : meta.label)}
      title={title ?? (typeof label === 'string' ? label : meta.label)}
      className={cn('storely-table-action', className)}
      data-action={action}
      data-icon-only={!showLabel}
      {...props}
    >
      <span className="inline-flex size-4 items-center justify-center">{meta.icon}</span>
      {showLabel ? <span>{label}</span> : null}
    </button>
  )
}

type TableActionGroupProps = {
  children: ReactNode
  className?: string
}

export function StorelyTableActionGroup({ children, className }: TableActionGroupProps) {
  return <div className={cn('storely-table-actions', className)}>{children}</div>
}
