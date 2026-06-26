'use client'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
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
        <h1 style={{fontSize:32,fontWeight:900,color:'#0f172a',marginBottom:8}}>سياسة الخصوصية</h1>
        <p style={{fontSize:14,color:'#64748b',marginBottom:40}}>آخر تحديث: يونيو 2026</p>

        {[
          {
            title:'1. المقدمة',
            content:'تلتزم Storely بحماية خصوصية مستخدميها. توضح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها عند استخدام منصتنا لإدارة المخزون.'
          },
          {
            title:'2. البيانات التي نجمعها',
            content:'نجمع البيانات التالية:\n• بيانات الحساب: الاسم، البريد الإلكتروني، رقم الجوال\n• بيانات المنشأة: اسم المنشأة، نوع النشاط، عدد الفروع\n• بيانات المخزون: المنتجات، الكميات، المشتريات، سجلات الصرف\n• بيانات الاستخدام: سجلات الدخول، النشاط داخل النظام'
          },
          {
            title:'3. كيف نستخدم بياناتك',
            content:'نستخدم بياناتك لأغراض تشغيل الخدمة فقط:\n• تقديم خدمة إدارة المخزون\n• إرسال تنبيهات نقص المخزون\n• تحسين تجربة المستخدم\n• التواصل معك بشأن حسابك\n\nلا نبيع بياناتك لأي طرف ثالث.'
          },
          {
            title:'4. حماية البيانات',
            content:'نحمي بياناتك باستخدام:\n• تشفير SSL/TLS لجميع الاتصالات\n• قواعد بيانات مشفرة على خوادم آمنة\n• نسخ احتياطية أسبوعية تلقائية\n• صلاحيات وصول محدودة للموظفين'
          },
          {
            title:'5. مشاركة البيانات',
            content:'لا نشارك بياناتك مع أطراف ثالثة إلا في الحالات التالية:\n• بموافقتك الصريحة\n• عند الضرورة القانونية بأمر قضائي\n• مع مزودي الخدمة الضروريين لتشغيل المنصة (Supabase للتخزين، Resend للإيميل)'
          },
          {
            title:'6. حقوقك',
            content:'لديك الحق في:\n• الاطلاع على بياناتك الشخصية\n• تصحيح أي بيانات غير دقيقة\n• حذف حسابك وجميع بياناتك نهائياً\n• تصدير بياناتك\n\nللممارسة هذه الحقوق، تواصل معنا عبر واتساب.'
          },
          {
            title:'7. ملفات تعريف الارتباط (Cookies)',
            content:'نستخدم cookies ضرورية فقط لتشغيل النظام مثل الحفاظ على جلسة تسجيل الدخول. لا نستخدم cookies للتتبع الإعلاني.'
          },
          {
            title:'8. التغييرات على السياسة',
            content:'قد نحدّث هذه السياسة من وقت لآخر. سنخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني أو داخل المنصة.'
          },
          {
            title:'9. التواصل معنا',
            content:'لأي استفسارات حول سياسة الخصوصية، تواصل معنا:\n• واتساب: 966594351667+\n• البريد الإلكتروني: support@storely.dev\n• الموقع: storely.dev'
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
