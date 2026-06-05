export default function PendingPage() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#1a4731,#0d2818)',fontFamily:"'Segoe UI',system-ui,sans-serif",direction:'rtl',padding:20}}>
      <div style={{background:'white',borderRadius:20,padding:'48px 40px',width:'100%',maxWidth:440,boxShadow:'0 25px 60px rgba(0,0,0,0.25)',textAlign:'center'}}>
        <div style={{width:72,height:72,background:'#fef3c7',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,margin:'0 auto 20px'}}>⏳</div>
        <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:8}}>حسابك بانتظار التفعيل</h1>
        <p style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>
          شكراً لتسجيلك في Storely!<br/>
          حسابك قيد المراجعة من قِبل الإدارة.<br/>
          سيتم تفعيله بعد التحقق من الاشتراك.
        </p>
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px',marginBottom:24,fontSize:13,color:'#475569'}}>
          للاستفسار تواصل معنا عبر واتساب
        </div>
        <a href="/login" style={{display:'block',padding:'12px',background:'#1a4731',color:'white',borderRadius:10,fontSize:14,fontWeight:600,textDecoration:'none'}}>
          العودة لتسجيل الدخول
        </a>
      </div>
    </div>
  )
}
