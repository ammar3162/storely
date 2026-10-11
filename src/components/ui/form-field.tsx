import type { ReactNode } from 'react'
import { cn } from './utils'

type FormFieldProps = {
  label: ReactNode
  children: ReactNode
  htmlFor?: string
  required?: boolean
  error?: ReactNode
  helperText?: ReactNode
  className?: string
  controlClassName?: string
}

export function StorelyFormField({
  label,
  children,
  htmlFor,
  required = false,
  error,
  helperText,
  className,
  controlClassName,
}: FormFieldProps) {
  const description = error ?? helperText

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-semibold text-[#43525B]">
        {label}
        {required ? <span className="mr-1 text-[#B91C1C]">*</span> : null}
      </label>
      <div className={cn('min-w-0', controlClassName)}>{children}</div>
      {description ? (
        <div className={cn('mt-1.5 text-xs leading-5', error ? 'text-[#B91C1C]' : 'text-[#66737C]')}>
          {description}
        </div>
      ) : null}
    </div>
  )
}
