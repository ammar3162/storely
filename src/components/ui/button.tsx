import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './utils'

type StorelyButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost'
type StorelyButtonSize = 'sm' | 'md' | 'lg'

type StorelyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: StorelyButtonVariant
  size?: StorelyButtonSize
  icon?: ReactNode
}

const variantClasses: Record<StorelyButtonVariant, string> = {
  primary:
    'border-[#203640] bg-[#203640] text-white hover:border-[#16262D] hover:bg-[#16262D] active:bg-[#101E24]',
  secondary:
    'border-[#D7CDC2] bg-white text-[#203640] hover:border-[#C8BAAB] hover:bg-[#F8EEDF]/55',
  tertiary:
    'border-transparent bg-[#F3F5F6] text-[#203640] hover:bg-[#E9EEF1]',
  danger:
    'border-[#FECACA] bg-white text-[#B91C1C] hover:border-[#FCA5A5] hover:bg-[#FEF2F2]',
  ghost:
    'border-transparent bg-transparent text-[#66737C] hover:bg-[#F8EEDF]/55 hover:text-[#203640]',
}

const sizeClasses: Record<StorelyButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
}

export function StorelyButton({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: StorelyButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#203640]/18 focus-visible:ring-offset-1',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon ? <span className="inline-flex size-[18px] items-center justify-center [&>svg]:size-4">{icon}</span> : null}
      {children}
    </button>
  )
}
