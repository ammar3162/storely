// أي زر بقوائم التنقل يتلوّن (الشريط السفلي، «المزيد»، القائمة الجانبية) — بدون React عشان نختبره.
// الزر اللي انضغط يتلوّن لحظة الضغط، قبل ما توصل الصفحة الجديدة (كان يبان إن الضغطة ما انحسبت فيضغط مرة ثانية)

/** ضغطة تنقل: رايح لـ href وهو في from */
export type NavTarget = { href: string; from: string } | null

/** الصفحة اللي رايح لها الحين، وتنتهي لحالها أول ما يتغير المسار (وصلت الصفحة) */
export function goingTo(nav: NavTarget, pathname: string): string | null {
  return nav && nav.from === pathname ? nav.href : null
}

/** الزر متلوّن؟ — الصفحة اللي رايح لها، وإلا الصفحة الحالية. الرئيسية بالمسار بالضبط، والباقي يشمل صفحاته الفرعية */
export function isNavActive(href: string, pathname: string, going: string | null): boolean {
  const p = going ?? pathname
  return p === href || (href !== '/dashboard' && p.startsWith(href))
}
