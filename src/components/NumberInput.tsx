'use client'
import { useRef } from 'react'
import { cleanNumberText } from '@/lib/digits'

// حقل رقم موحّد لكل الصفحات (بدل type="number"):
// - فاضي إذا القيمة صفر/ما فيه شي (ما يطلع 0 جاهز)
// - الأرقام العربية ١٢٣ تتحول 123 وأنت تكتب، والفاصلة العربية ٫ تصير نقطة
// - بدون أسهم ولا تغيّر القيمة بعجلة الماوس، وكيبورد أرقام على الجوال
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & { value?: string | number | null }

export default function NumberInput({ value, onChange, step, min, placeholder, inputMode, defaultValue, ...rest }: Props) {
  const controlled = value !== undefined
  const typed = useRef<string | null>(null)   // آخر نص كتبه المستخدم (عشان «0.» و«0.5» تنكتب طبيعي)
  const integer = String(step) === '1'
  const negative = min !== undefined && Number(min) < 0
  const v = value == null ? '' : String(value)
  const display = typed.current !== null && (typed.current === v || (v !== '' && typed.current !== '' && Number(typed.current) === Number(v)) || (typed.current === '' && (v === '' || Number(v) === 0)))
    ? typed.current
    : v === '' || Number(v) === 0 ? '' : v
  return (
    <input {...rest} type="text" dir={rest.dir ?? 'ltr'} inputMode={inputMode ?? (integer ? 'numeric' : 'decimal')} autoComplete={rest.autoComplete ?? 'off'}
      placeholder={placeholder && /^[0-9.,\s]+$/.test(String(placeholder)) ? undefined : placeholder}
      {...(controlled ? { value: display } : { defaultValue: defaultValue == null || Number(defaultValue) === 0 ? '' : String(defaultValue) })}
      onChange={e => {
        const clean = cleanNumberText(e.target.value, { decimal: !integer, negative })
        typed.current = clean
        e.target.value = clean   // المعالج الأصلي يقرأ e.target.value — يوصله الرقم النظيف
        onChange?.(e)
      }} />
  )
}
