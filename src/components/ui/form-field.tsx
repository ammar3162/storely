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
    <div className={cn('storely-field', className)} data-error={!!error}>
      <label htmlFor={htmlFor} className="storely-field-label">
        {label}
        {required ? <span className="storely-field-required">*</span> : null}
      </label>
      <div className={cn('storely-field-control', controlClassName)}>{children}</div>
      {description ? (
        <div className="storely-field-description" data-error={!!error}>
          {description}
        </div>
      ) : null}
    </div>
  )
}
