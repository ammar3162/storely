// هيكل صفحة وقت التحميل (بدل دائرة الانتظار): عنوان + أربع بطاقات أرقام + قائمة — نفس شكل أغلب صفحات لوحة التحكم
// النبض يتوقف لو المستخدم مفعّل «تقليل الحركة»
export default function PageSkeleton() {
  return (
    <div className="pg-sk" aria-busy="true" aria-label="جاري التحميل">
      <style>{`
        .pg-sk{direction:rtl;display:flex;flex-direction:column;gap:14px;padding:4px 0}
        .pg-sk i{display:block;background:#E6E8EC;border-radius:10px;animation:pgsk 1.4s ease-in-out infinite}
        .pg-sk-head{display:flex;justify-content:space-between;align-items:center}
        .pg-sk-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        @media(max-width:640px){.pg-sk-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @keyframes pgsk{0%,100%{opacity:1}50%{opacity:.45}}
        @media(prefers-reduced-motion:reduce){.pg-sk i{animation:none}}
        [data-theme="dark"] .pg-sk i{background:#1F2937}
      `}</style>
      <div className="pg-sk-head"><i style={{ height: 26, width: 140 }} /><i style={{ height: 36, width: 96 }} /></div>
      <div className="pg-sk-kpis">{[0, 1, 2, 3].map(k => <i key={k} style={{ height: 84 }} />)}</div>
      {[0, 1, 2, 3, 4].map(k => <i key={k} style={{ height: 58 }} />)}
    </div>
  )
}

// هيكل قائمة داخل قسم (بدل «جاري التحميل...» أو دائرة الانتظار)
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="pg-sk" aria-busy="true" aria-label="جاري التحميل" style={{ padding: 12 }}>
      <style>{`.pg-sk{direction:rtl;display:flex;flex-direction:column;gap:10px}.pg-sk i{display:block;background:#E6E8EC;border-radius:10px;animation:pgsk 1.4s ease-in-out infinite}@keyframes pgsk{0%,100%{opacity:1}50%{opacity:.45}}@media(prefers-reduced-motion:reduce){.pg-sk i{animation:none}}[data-theme="dark"] .pg-sk i{background:#1F2937}`}</style>
      {Array.from({ length: rows }, (_, k) => <i key={k} style={{ height: 52 }} />)}
    </div>
  )
}
