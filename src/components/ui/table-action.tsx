import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from './utils'

type TableActionKind = 'view' | 'edit' | 'delete' | 'more'

type TableActionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  action: TableActionKind
  children?: ReactNode
  showLabel?: boolean
}

const actionMeta: Record<TableActionKind, { label: string; icon: ReactNode; className: string }> = {
  view: {
    label: 'عرض',
    icon: <Eye size={16} />,
    className: 'text-[#66737C] hover:bg-[#F8EEDF]/45 hover:text-[#203640]',
  },
  edit: {
    label: 'تعديل',
    icon: <Pencil size={16} />,
    className: 'text-[#66737C] hover:bg-[#F8EEDF]/45 hover:text-[#203640]',
  },
  delete: {
    label: 'حذف',
    icon: <Trash2 size={16} />,
    className: 'text-[#B91C1C] hover:bg-[#FEF2F2]',
  },
  more: {
    label: 'المزيد',
    icon: <MoreHorizontal size={16} />,
    className: 'text-[#66737C] hover:bg-[#F8EEDF]/45 hover:text-[#203640]',
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
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-[5px] border border-transparent px-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        meta.className,
        !showLabel && 'w-8 px-0',
        className,
      )}
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
  return <div className={cn('inline-flex items-center gap-1', className)}>{children}</div>
}
