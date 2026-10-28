// رسائل Supabase Auth تطلع بالإنجليزي — نحوّلها لعربي واضح للعميل
export function signupErrorAr(message: string): string {
  const m = (message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) return 'هذا البريد الإلكتروني مسجّل مسبقاً — سجّل الدخول أو استعد كلمة المرور'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'وصلنا حد التسجيل المؤقت — جرّب بعد شوي، أو سجّل بحساب Google'
  if (m.includes('invalid') && m.includes('email')) return 'البريد الإلكتروني غير صحيح — تأكد من كتابته'
  if (m.includes('password') && (m.includes('short') || m.includes('at least') || m.includes('weak'))) return 'كلمة المرور ضعيفة — خلها 8 أحرف أو أكثر'
  if (m.includes('signup') && m.includes('disabled')) return 'التسجيل متوقف مؤقتاً — تواصل معنا'
  if (m.includes('network') || m.includes('fetch')) return 'تعذّر الاتصال — تأكد من الإنترنت وحاول مرة ثانية'
  return 'تعذّر إنشاء الحساب — حاول مرة ثانية'
}
