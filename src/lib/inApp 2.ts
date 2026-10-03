/**
 * هل الصفحة مفتوحة داخل تطبيق Google Play (TWA)؟
 * سكربت في src/app/layout.tsx يعلّم الجلسة أول ما يفتح التطبيق (referrer = android-app://storely.dev)
 * ويضيف data-in-app على <html> — فالعناصر اللي عليها class="hide-in-app" تختفي بـ CSS بدون وميض.
 * نخفي داخل التطبيق كل ما يخص الشراء والاشتراك (سياسة الدفع في Google Play) — العميل يشترك من الموقع.
 */
export const IN_APP_KEY = 's_in_app'

export const IN_APP_SCRIPT = `try{var s=sessionStorage;if(document.referrer.indexOf('android-app://storely.dev')===0||/[?&]source=twa(&|$)/.test(location.search))s.setItem('${IN_APP_KEY}','1');if(s.getItem('${IN_APP_KEY}')==='1')document.documentElement.setAttribute('data-in-app','1')}catch(e){}`

export function isInApp(): boolean {
  if (typeof window === 'undefined') return false
  try { return sessionStorage.getItem(IN_APP_KEY) === '1' } catch { return false }
}
