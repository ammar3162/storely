// أقسام الصفحة الرئيسية بأسلوب صفحات منتجات أبل وسامسونج (2026-11-17) — طبقة فوق LP_CSS وبنفس رموزها:
// أبيض، رمادي النظام الفاتح، كحلي، والنقطة النعناعية فقط. الشاشات حقيقية داخل إطار جوال (.ap-phone في LP_CSS).
export const AP_CSS = `
.ap-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--mint);flex-shrink:0}

/* الواجهة: ثلاثة جوالات — الفيديو في الوسط، وشاشتا المالك والموظف بزاوية — تطلع من أسفل البلاطة */
.ap-hero{background:var(--light);text-align:center;padding:60px 20px 0;overflow:hidden}
.ap-hero h1{font-size:clamp(40px,6.6vw,92px);font-weight:700;line-height:1.08;color:var(--navy);overflow-wrap:break-word;min-width:0}
.ap-lead{font-size:clamp(19px,1.9vw,27px);line-height:1.5;color:var(--ink2);max-width:760px;margin:18px auto 0}
.ap-acts{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:30px}
.ap-note{font-size:14.5px;color:var(--ink2);margin-top:16px}
.ap-alt{border:0;background:none;font:500 15px var(--font);color:var(--navy);cursor:pointer;margin-top:2px;min-height:44px;padding:0 8px;text-decoration:underline;text-decoration-color:var(--hair);text-underline-offset:6px}
.ap-alt:hover{text-decoration-color:var(--navy)}
.ap-stage{--vw:clamp(240px,21vw,300px);--sw:clamp(196px,17vw,250px);position:relative;max-width:1040px;margin:30px auto 0;height:clamp(340px,28vw,410px);overflow:hidden;display:flex;justify-content:center;align-items:flex-start;padding-top:14px}
.ap-stage.is-playing{height:auto;overflow:visible;padding-bottom:48px}
.ap-stage.is-playing .ap-side{display:none}
.ap-video{--r:52px;--b:10px;width:var(--vw);z-index:3}
.ap-video .ap-phone-screen{background:var(--navy)}
.ap-video video,.ap-cover,.ap-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:var(--navy)}
.ap-cover{border:0;padding:0;cursor:pointer}
.ap-play{position:absolute;top:31%;left:50%;transform:translate(-50%,-50%);width:76px;height:76px;border-radius:50%;background:var(--white);color:var(--navy);display:grid;place-items:center;box-shadow:var(--play-shadow);transition:transform .2s var(--ease)}
.ap-cover:hover .ap-play{transform:translate(-50%,-50%) scale(1.05)}
.ap-cover:active .ap-play{transform:translate(-50%,-50%) scale(.96)}
.ap-side{--r:44px;--b:9px;position:absolute;top:84px;width:var(--sw);z-index:2;transform-origin:50% 100%}
.ap-side-r{right:calc(50% - var(--vw)/2 - var(--sw) + 64px);transform:rotate(7deg)}
.ap-side-l{left:calc(50% - var(--vw)/2 - var(--sw) + 64px);transform:rotate(-7deg)}

/* عملاء حقيقيون */
.ap-cust{padding:72px 0 8px;text-align:center}
.ap-cust h2{font-size:15px;font-weight:500;color:var(--ink2)}
.ap-logos{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:28px 40px;margin-top:24px}
.ap-logos li{display:flex;flex-direction:column;align-items:center;gap:8px;width:96px}
.ap-logos img{width:64px;height:64px;object-fit:contain;border-radius:16px;background:var(--white);border:1px solid var(--hair)}
.ap-logos span{font-size:13px;color:var(--ink2);line-height:1.4}

/* يوم واحد: بطاقات كبيرة بزوايا دائرية تتبادل الكحلي والرمادي الفاتح، وفي كل بطاقة جوال بشاشة حقيقية */
.ap-intro{text-align:center;padding:120px 24px 52px}
.ap-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:0 14px;max-width:1440px;margin:0 auto}
.ap-tile{position:relative;overflow:hidden;text-align:center;padding:64px 32px 0;display:flex;flex-direction:column;align-items:center;border-radius:30px}
.ap-txt{display:flex;flex-direction:column;align-items:center}
.ap-wide{grid-column:1 / -1}
.ap-navy{background:var(--navy);color:var(--on-navy)}
.ap-light{background:var(--light);color:var(--navy)}
.ap-time{display:inline-flex;align-items:center;gap:8px;font-size:16px;font-weight:500}
.ap-navy .ap-time{color:var(--on-navy2)}
.ap-light .ap-time{color:var(--ink2)}
.ap-tile h3{font-size:clamp(32px,3.7vw,54px);font-weight:700;line-height:1.14;margin-top:12px;max-width:15ch}
.ap-wide h3{max-width:20ch}
.ap-tile p{font-size:clamp(17px,1.5vw,21px);line-height:1.6;margin-top:14px;max-width:560px}
.ap-navy p{color:var(--on-navy2)}
.ap-light p{color:var(--ink2)}
.ap-tile .ap-shot{margin-top:44px;width:min(300px,72vw);height:clamp(380px,34vw,480px)}
.ap-wide .ap-shot{width:min(320px,74vw);height:clamp(400px,37vw,540px)}

/* السلسلة: الخط النعناعي يمتد من الحلقة الأولى للأخيرة، والنقاط تضيء بالترتيب؛ والنتيجة شاشة المالك في إطار شاشة */
.ap-chain{padding:120px 0}
.ap-flow{list-style:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px;position:relative;margin-top:12px}
.ap-flow::before,.ap-flow::after{content:'';position:absolute;top:8px;right:10%;width:80%;height:2px;background:var(--hair)}
.ap-flow::after{background:var(--mint);transform-origin:100% 50%;transition:transform 1.6s var(--ease) .2s}
.lp-anim .ap-flow:not(.in)::after{transform:scaleX(0)}
.ap-flow li{position:relative;text-align:center;padding-top:40px}
.ap-flow li::before{content:'';position:absolute;top:0;left:50%;margin-left:-9px;width:18px;height:18px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 7px var(--white);transition:transform .5s var(--ease) calc(.25s + var(--i,0) * .3s)}
.lp-anim .ap-flow:not(.in) li::before{transform:scale(0)}
.ap-flow b{display:block;font-size:21px;font-weight:700;color:var(--navy)}
.ap-flow span{display:block;font-size:15.5px;line-height:1.65;color:var(--ink2);margin-top:6px}
.ap-chain figure{margin-top:72px}
.ap-desk{max-width:1060px;margin:0 auto;background:var(--bezel);border-radius:26px;padding:14px 14px 30px;box-shadow:inset 0 0 0 1.5px var(--bezel-edge),var(--desk-shadow)}
.ap-desk-screen{border-radius:12px;overflow:hidden;background:var(--white)}
.ap-desk-screen img{width:100%}
.ap-cap{text-align:center;font-size:14.5px;color:var(--ink2);margin-top:20px}

/* الأدوار: بطاقة لكل دور بجوالها — أعمدة على الكمبيوتر وسحب جانبي على الجوال */
.ap-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.ap-role{background:var(--light);border-radius:30px;padding:36px 24px 0;overflow:hidden;display:flex;flex-direction:column;text-align:center;align-items:center}
.ap-role h3{font-size:28px;font-weight:700;color:var(--navy)}
.ap-role ul{list-style:none;margin-top:18px;display:grid;gap:10px;text-align:start;width:100%}
.ap-role li{display:flex;gap:10px;align-items:baseline;font-size:16px;line-height:1.55;color:var(--ink2)}
.ap-role li .ap-dot{transform:translateY(-2px)}
.ap-role .ap-shot{margin-top:32px;width:min(210px,84%);height:330px}
.ap-role .ap-phone{--r:36px;--b:7px}

/* من نحن: بلاطة كحلية */
.ap-about{background:var(--navy);color:var(--on-navy);padding:120px 0}
.ap-about .lp-h2{color:var(--on-navy)}
.ap-about-body{max-width:800px;margin:0 auto;text-align:center}
.ap-about-body p{font-size:clamp(19px,1.8vw,23px);line-height:1.85;color:var(--on-navy2);margin-top:20px}
.ap-principles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:64px}
.ap-principles div{border-top:1px solid var(--hair-dark);padding-top:22px}
.ap-principles dt{display:flex;align-items:center;gap:10px;font-size:21px;font-weight:700}
.ap-principles dd{font-size:16px;line-height:1.7;color:var(--on-navy2);margin-top:10px}

/* ابدأ: بلاطة فاتحة بالسعر المعلن */
.ap-start{background:var(--light);text-align:center;padding:120px 24px;margin:0 14px;border-radius:30px}
.ap-price{display:flex;align-items:baseline;justify-content:center;gap:12px;margin-top:28px;color:var(--navy)}
.ap-price b{font-size:clamp(80px,10vw,136px);font-weight:700;line-height:1}
.ap-price span{font-size:21px;color:var(--ink2)}
.ap-per{font-size:18px;color:var(--ink2);margin-top:10px}
.ap-ticks{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:12px 28px;margin-top:30px}
.ap-ticks li{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--navy)}
.ap-steps{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;max-width:1000px;margin:52px auto 0;counter-reset:s}
.ap-steps li{background:var(--white);border-radius:24px;padding:26px;text-align:start;display:flex;gap:14px;align-items:center;font-size:17px;color:var(--navy)}
.ap-steps li::before{counter-increment:s;content:counter(s);width:38px;height:38px;border-radius:50%;background:var(--navy);color:var(--on-navy);display:grid;place-items:center;font-size:15px;font-weight:500;flex-shrink:0}

@media (min-width:981px){
  .ap-wide{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:56px;align-items:end;text-align:start;padding:0 80px;min-height:620px}
  .ap-wide .ap-txt{align-items:flex-start;align-self:center;padding:80px 0}
  .ap-wide h3,.ap-wide p{max-width:none}
  .ap-wide .ap-shot{margin:72px auto 0}
}
@media (max-width:980px){
  .ap-roles{grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:minmax(260px,76%);overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;padding:0 20px 8px;margin:0 -20px;scrollbar-width:none}
  .ap-roles::-webkit-scrollbar{display:none}
  .ap-role{scroll-snap-align:center}
  .ap-principles{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .ap-steps{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:720px){
  .ap-hero{padding:40px 20px 0}
  .ap-stage{--vw:224px;--sw:168px;margin-top:22px;height:322px;padding-top:10px}
  .ap-video{--r:40px;--b:8px}
  .ap-side{--r:34px;--b:7px;top:64px}
  .ap-side-r{right:calc(50% - var(--vw)/2 - var(--sw) + 92px)}
  .ap-side-l{left:calc(50% - var(--vw)/2 - var(--sw) + 92px)}
  .ap-play{width:64px;height:64px}
  .ap-intro{padding:88px 20px 32px}
  .ap-grid{grid-template-columns:minmax(0,1fr);padding:0 10px;gap:10px}
  .ap-tile{padding:52px 20px 0;border-radius:26px}
  .ap-tile .ap-shot,.ap-wide .ap-shot{width:min(258px,70vw);height:390px}
  .ap-tile .ap-phone{--r:40px;--b:8px}
  .ap-chain{padding:80px 0 64px}
  .ap-flow{grid-template-columns:minmax(0,1fr);gap:0;max-width:420px;margin-inline:auto}
  .ap-flow::before,.ap-flow::after{top:9px;right:8px;width:2px;height:calc(100% - 46px)}
  .ap-flow::after{transform-origin:50% 0}
  .lp-anim .ap-flow:not(.in)::after{transform:scaleY(0)}
  .ap-flow li{text-align:start;padding:0 44px 28px 0}
  .ap-flow li::before{top:0;left:auto;right:0;margin-left:0}
  .ap-chain figure{display:none}
  .ap-about{padding:80px 0}
  .ap-principles{grid-template-columns:minmax(0,1fr);margin-top:44px}
  .ap-start{padding:80px 20px;margin:0 10px;border-radius:26px}
  .ap-acts .lp-btn{flex:1 1 auto}
}
`
