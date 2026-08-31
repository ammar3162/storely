'use client'
import { useRouter } from 'next/navigation'

export default function SecurityPage() {
  const router = useRouter()
  return (
    <div style={{fontFamily:"'IBM Plex Sans Arabic',system-ui,sans-serif",direction:'rtl',minHeight:'100vh',background:'#f8fafc'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{background:'#042f2e',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>router.push('/')}>
          <img src="/storely-logo.png" alt="Storely" style={{width:32,height:32,borderRadius:8,objectFit:'cover'}}/>
          <span style={{fontSize:18,fontWeight:800,color:'white'}}>Storely</span>
        </div>
        <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.1)',color:'white',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          الرئيسية
        </button>
      </div>

      <div style={{maxWidth:800,margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{fontSize:32,fontWeight:900,color:'#0f172a',marginBottom:8}}>سياسة الأمان</h1>
        <p style={{fontSize:14,color:'#64748b',marginBottom:8}}>آخر تحديث: أغسطس 2026</p>
        <p style={{fontSize:13,color:'#94a3b8',marginBottom:40}}>مؤسسة باسم علي خلوي لتقنية المعلومات — رقم السجل التجاري 7055023522</p>

        {[
          {
            title:'1. التزامنا',
            content:'أمن بيانات عملائنا أولوية أساسية في Storely. نطبّق ممارسات تقنية وتنظيمية لحماية البيانات من الوصول أو التعديل أو الإفصاح غير المصرح به، ونراجع هذه الممارسات باستمرار مع نمو المنصة.'
          },
          {
            title:'2. حماية البيانات',
            content:'• تشفير جميع الاتصالات أثناء النقل باستخدام HTTPS/TLS بدون استثناء\n• تخزين البيانات على بنية تحتية سحابية موثوقة (Supabase/PostgreSQL) مع نسخ احتياطي دوري\n• عزل بيانات كل منشأة عن غيرها على مستوى قاعدة البيانات — لا تصل أي منشأة لبيانات منشأة أخرى مهما كانت الحالة\n• مفاتيح الوصول الحساسة (service role) تُستخدم فقط من طرف الخادم (server-side)، ولا تصل مطلقاً لمتصفح المستخدم'
          },
          {
            title:'3. إدارة الوصول والصلاحيات',
            content:'• صلاحيات دقيقة على مستوى كل موظف داخل حساب المنشأة (صرف، مخزون، مشتريات، تقارير) يحددها صاحب الحساب بنفسه\n• دخول الموظفين برمز PIN خاص بكل موظف، منفصل تماماً عن حساب المالك\n• لوحة تحكم فريق Storely الإداري محمية بمصادقة منفصلة، وتدعم التحقق بخطوتين (2FA) لحسابات الإدارة\n• مبدأ الحد الأدنى من الصلاحيات (least privilege) عند وصول فريقنا الفني لأي حساب لأغراض الدعم'
          },
          {
            title:'4. مراقبة الأنظمة وسجل التدقيق',
            content:'• كل إجراء إداري حساس (تفعيل حساب، تغيير باقة، إيقاف حساب) يُسجَّل تلقائياً في سجل تدقيق داخلي موضّح فيه من نفّذ الإجراء ومتى\n• مراقبة دورية لصحة الأنظمة والخدمات المرتبطة (قاعدة البيانات، إشعارات واتساب، النسخ الاحتياطي)\n• تنبيهات تلقائية لفريقنا الفني عند أي خلل تشغيلي يؤثر على الخدمة'
          },
          {
            title:'5. الاستجابة للحوادث الأمنية',
            content:'في حال وقوع أي حادث أمني يؤثر على بيانات عملائنا، نلتزم بـ:\n• التحقيق الفوري في الحادث واحتوائه بأسرع وقت ممكن\n• إشعار العملاء المتأثرين بالتفاصيل اللازمة والإجراءات المتخذة\n• توثيق الحادث ومراجعة الإجراءات لمنع تكراره'
          },
          {
            title:'6. الإبلاغ عن ثغرة أمنية',
            content:'لو لاحظت أي ثغرة أمنية محتملة بمنصة Storely، نقدّر تواصلك المسؤول معنا فوراً عبر واتساب أو البريد الإلكتروني أدناه — نتعامل مع كل بلاغ بجدية وسرية تامة.'
          },
          {
            title:'7. التواصل معنا',
            content:'لأي استفسار أمني أو للإبلاغ عن ثغرة، تواصل معنا:\n• واتساب: 966594351667+\n• البريد الإلكتروني: support@storely.dev\n• الموقع: storely.dev'
          },
        ].map((s,i)=>(
          <div key={i} style={{marginBottom:32}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:12,paddingBottom:8,borderBottom:'2px solid #f1f5f9'}}>{s.title}</h2>
            <p style={{fontSize:15,color:'#475569',lineHeight:2,whiteSpace:'pre-line'}}>{s.content}</p>
          </div>
        ))}

        <div style={{marginTop:48,padding:'20px 24px',background:'#f0fdfa',borderRadius:16,border:'1px solid #99f6e4',textAlign:'center'}}>
          <p style={{fontSize:14,color:'#029FA2',fontWeight:600}}>Storely — نحوّل التعقيد إلى تحكّم · storely.dev</p>
        </div>
      </div>
    </div>
  )
}
