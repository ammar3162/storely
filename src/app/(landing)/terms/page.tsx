'use client'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()
  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',minHeight:'100vh',background:'#f8fafc'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      
      {/* Header */}
      <div style={{background:'#0a1f13',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>router.push('/')}>
          <img src="/storely-logo.png" alt="Storely" style={{width:32,height:32,borderRadius:8,objectFit:'cover'}}/>
          <span style={{fontSize:18,fontWeight:800,color:'white'}}>Storely</span>
        </div>
        <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.1)',color:'white',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          الرئيسية
        </button>
      </div>

      <div style={{maxWidth:800,margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{fontSize:32,fontWeight:900,color:'#0f172a',marginBottom:8}}>الشروط والأحكام</h1>
        <p style={{fontSize:14,color:'#64748b',marginBottom:40}}>آخر تحديث: يونيو 2026</p>

        {[
          {
            title:'1. القبول بالشروط',
            content:'باستخدامك لمنصة Storely، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام المنصة.'
          },
          {
            title:'2. وصف الخدمة',
            content:'Storely منصة سعودية لإدارة المخزون والمشتريات تقدم:\n• تتبع المخزون وإدارة المنتجات\n• تسجيل المشتريات والصرف\n• تقارير وإحصائيات\n• تنبيهات واتساب تلقائية\n• إدارة الموظفين والفروع'
          },
          {
            title:'3. الاشتراك والدفع',
            content:'• الدفع يتم عبر التحويل البنكي\n• يُفعَّل الحساب خلال 24 ساعة من استلام الدفع\n• الباقات: أساسية (99 ر.س/شهر)، متوسطة (199 ر.س/شهر)، متقدمة (349 ر.س/شهر)\n• لا يوجد استرداد للمبالغ بعد التفعيل\n• يمكن إلغاء الاشتراك في أي وقت'
          },
          {
            title:'4. استخدام الحساب',
            content:'أنت مسؤول عن:\n• الحفاظ على سرية بيانات تسجيل الدخول\n• جميع الأنشطة التي تتم من خلال حسابك\n• التأكد من دقة البيانات المدخلة\n• عدم مشاركة حسابك مع منشآت أخرى'
          },
          {
            title:'5. الاستخدام المقبول',
            content:'يُمنع استخدام المنصة لـ:\n• أي نشاط غير قانوني\n• إدخال بيانات مضللة أو كاذبة\n• محاولة اختراق النظام أو التلاعب به\n• إعادة بيع الخدمة لطرف ثالث بدون إذن'
          },
          {
            title:'6. الملكية الفكرية',
            content:'جميع حقوق الملكية الفكرية لمنصة Storely محفوظة. لا يحق لك نسخ أو توزيع أو تعديل أي جزء من المنصة بدون إذن كتابي مسبق.'
          },
          {
            title:'7. البيانات والخصوصية',
            content:'نلتزم بحماية بياناتك وفق سياسة الخصوصية المتاحة على storely.dev/privacy. أنت تمتلك بياناتك وتحق لك استعادتها أو حذفها في أي وقت.'
          },
          {
            title:'8. توقف الخدمة',
            content:'نحتفظ بالحق في:\n• إيقاف الخدمة مؤقتاً للصيانة مع إشعار مسبق\n• إلغاء حسابات تنتهك الشروط\n• تعديل الخدمة أو أسعارها مع إشعار 30 يوماً مسبق'
          },
          {
            title:'9. حدود المسؤولية',
            content:'Storely غير مسؤولة عن:\n• أي خسائر ناتجة عن بيانات مدخلة بشكل خاطئ\n• انقطاع الخدمة بسبب ظروف خارجة عن إرادتنا\n• قرارات تجارية مبنية على تقارير المنصة'
          },
          {
            title:'10. القانون المطبّق',
            content:'تخضع هذه الشروط لأنظمة المملكة العربية السعودية. أي نزاع يُحسم وفق الأنظمة السعودية المعمول بها.'
          },
          {
            title:'11. التواصل معنا',
            content:'لأي استفسارات حول الشروط والأحكام:\n• واتساب: 966594351667+\n• البريد الإلكتروني: support@storely.dev\n• الموقع: storely.dev'
          },
        ].map((s,i)=>(
          <div key={i} style={{marginBottom:32}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:12,paddingBottom:8,borderBottom:'2px solid #f1f5f9'}}>{s.title}</h2>
            <p style={{fontSize:15,color:'#475569',lineHeight:2,whiteSpace:'pre-line'}}>{s.content}</p>
          </div>
        ))}

        <div style={{marginTop:48,padding:'20px 24px',background:'#f0fdf4',borderRadius:16,border:'1px solid #bbf7d0',textAlign:'center'}}>
          <p style={{fontSize:14,color:'#16a34a',fontWeight:600}}>Storely — منصة إدارة المخزون السعودية · storely.dev</p>
        </div>
      </div>
    </div>
  )
}
