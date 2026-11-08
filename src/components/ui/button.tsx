import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './utils'

type StorelyButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost'
type StorelyButtonSize = 'sm' | 'md' | 'lg'

type StorelyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: StorelyButtonVariant
  size?: StorelyButtonSize
  icon?: ReactNode
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
      className={cn('storely-button', className)}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {icon ? <span className="storely-button-icon">{icon}</span> : null}
      {children}
    </button>
  )
}
