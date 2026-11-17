// أقسام الصفحة الرئيسية بأسلوب صفحات أبل (2026-11-17): خلفيات أبل (أبيض، رمادي #F5F5F7) والكحلي مكان الأسود وحركاتها
// المرتبطة بالتمرير (useScrollFx يضع --p من 0 إلى 1)، والكحلي لون الأزرار والروابط فقط. الشاشات حقيقية داخل
// إطار جوال (.ap-phone في LP_CSS). بدون جافاسكربت أو مع تقليل الحركة: كل شيء في وضعه النهائي.
export const AP_CSS = `
/* الواجهة: ثلاثة جوالات — الفيديو في الوسط، وشاشتا المالك والموظف بزاوية — تطلع من أسفل البلاطة */
.ap-hero{background:var(--light);text-align:center;padding:48px 20px 0;overflow:hidden}
.ap-hero h1{font-size:clamp(40px,5.6vw,80px);font-weight:600;line-height:1.12;color:var(--ink);overflow-wrap:break-word;min-width:0}
.ap-lead{font-size:clamp(21px,2vw,28px);line-height:1.36;color:var(--ink);max-width:760px;margin:18px auto 0}
.ap-acts{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:30px}
.ap-note{font-size:14px;color:var(--ink);margin-top:16px}
.ap-alt{border:0;background:none;font:400 17px var(--font);color:var(--navy);cursor:pointer;margin-top:2px;min-height:44px;padding:0 8px;text-decoration:underline;text-decoration-color:var(--hair);text-underline-offset:6px}
.ap-alt:hover{text-decoration-color:var(--navy)}
.ap-stage{--vw:clamp(240px,21vw,300px);--sw:clamp(196px,17vw,250px);position:relative;max-width:1040px;margin:30px auto 0;height:clamp(330px,27vw,400px);overflow:hidden;display:flex;justify-content:center;align-items:flex-start;padding-top:14px}
.ap-stage.is-playing{height:auto;overflow:visible;padding-bottom:48px}
.ap-stage.is-playing .ap-side{display:none}
.ap-video{--r:52px;--b:10px;width:var(--vw);z-index:3;transform-origin:50% 0}
.ap-video .ap-phone-screen{background:var(--dark)}
.ap-video video,.ap-cover,.ap-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:var(--dark)}
.ap-cover{border:0;padding:0;cursor:pointer}
.ap-play{position:absolute;top:31%;left:50%;transform:translate(-50%,-50%);width:76px;height:76px;border-radius:50%;background:var(--white);color:var(--ink);display:grid;place-items:center;box-shadow:var(--play-shadow);transition:transform .2s var(--ease)}
.ap-cover:hover .ap-play{transform:translate(-50%,-50%) scale(1.05)}
.ap-cover:active .ap-play{transform:translate(-50%,-50%) scale(.96)}
.ap-side{--r:44px;--b:9px;position:absolute;top:84px;width:var(--sw);z-index:2;transform-origin:50% 100%}
.ap-side-r{right:calc(50% - var(--vw)/2 - var(--sw) + 64px);transform:rotate(7deg)}
.ap-side-l{left:calc(50% - var(--vw)/2 - var(--sw) + 64px);transform:rotate(-7deg)}

/* حركة الواجهة عند الفتح: النص يطلع بالتتابع، والجوالات ترتفع من أسفل (خاصية translate مستقلة عن الدوران) */
@keyframes apUp{from{opacity:0;translate:0 26px}to{opacity:1;translate:0 0}}
@keyframes apRise{from{opacity:0;translate:0 120px}to{opacity:1;translate:0 0}}
.ap-hero h1{animation:apUp .9s var(--ease) both}
.ap-lead{animation:apUp .9s var(--ease) .08s both}
.ap-acts{animation:apUp .9s var(--ease) .16s both}
.ap-note,.ap-alt{animation:apUp .9s var(--ease) .22s both}
.ap-video{animation:apRise 1.2s var(--ease) .2s both}
.ap-side{animation:apRise 1.3s var(--ease) .38s both}
/* ومع التمرير: الجوال الأوسط يكبر قليلاً والجانبيان يتباعدان */
.lp-fx .ap-stage:not(.is-playing) .ap-video{transform:scale(calc(1 + var(--p, 0) * .06))}
.lp-fx .ap-stage:not(.is-playing) .ap-side-r{transform:translateX(calc(var(--p, 0) * 60px)) rotate(calc(7deg + var(--p, 0) * 5deg))}
.lp-fx .ap-stage:not(.is-playing) .ap-side-l{transform:translateX(calc(var(--p, 0) * -60px)) rotate(calc(-7deg - var(--p, 0) * 5deg))}

/* عملاء حقيقيون */
.ap-cust{padding:72px 0 8px;text-align:center}
.ap-cust h2{font-size:17px;font-weight:600;color:var(--ink)}
.ap-logos{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:28px 40px;margin-top:24px}
.ap-logos li{display:flex;flex-direction:column;align-items:center;gap:8px;width:96px}
.ap-logos img{width:64px;height:64px;object-fit:contain;border-radius:16px;background:var(--white);border:1px solid var(--hair)}
.ap-logos span{font-size:12px;color:var(--ink);line-height:1.4}

/* يوم واحد: بطاقات أبل — كحلي ورمادي فاتح بالتناوب، وفي كل بطاقة جوال بشاشة حقيقية يطلع مع التمرير */
.ap-intro{text-align:center;padding:120px 24px 52px}
.ap-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:0 14px;max-width:1440px;margin:0 auto}
.ap-tile{position:relative;overflow:hidden;text-align:center;padding:64px 32px 0;display:flex;flex-direction:column;align-items:center;border-radius:30px}
.ap-txt{display:flex;flex-direction:column;align-items:center}
.ap-wide{grid-column:1 / -1}
.ap-dark{background:var(--dark);color:var(--on-dark)}
.ap-light{background:var(--light);color:var(--ink)}
.ap-time{font-size:17px;font-weight:600}
.ap-dark .ap-time{color:var(--on-dark)}
.ap-light .ap-time{color:var(--navy)}
.ap-tile h3{font-size:clamp(32px,2.8vw,40px);font-weight:600;line-height:1.2;margin-top:8px;max-width:15ch}
.ap-wide h3{max-width:20ch;font-size:clamp(32px,3.9vw,56px);line-height:1.16}
.ap-tile p{font-size:clamp(19px,1.5vw,21px);line-height:1.42;margin-top:12px;max-width:560px}
.ap-wide p{font-size:clamp(19px,1.9vw,28px);line-height:1.36}
.ap-dark p{color:var(--on-dark)}
.ap-light p{color:var(--ink)}
.ap-tile .ap-shot{margin-top:44px;width:min(300px,72vw);height:clamp(380px,34vw,480px)}
.ap-wide .ap-shot{width:min(320px,74vw);height:clamp(400px,37vw,540px)}
.lp-fx .ap-shot[data-fx]{transform:translateY(calc((1 - var(--p, 1)) * 120px));opacity:calc(.35 + var(--p, 1) * .65);will-change:transform}

/* السلسلة: خمس حلقات مرقّمة، والخط بينها يتعبّى مع التمرير وتضيء كل حلقة عند وصوله؛ والنتيجة شاشة المالك */
.ap-chain{padding:120px 0}
.ap-flow{list-style:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px;position:relative;margin-top:12px}
.ap-flow::before,.ap-flow::after{content:'';position:absolute;top:21px;right:10%;width:80%;height:2px;background:var(--hair)}
.ap-flow::after{background:var(--navy);transform-origin:100% 50%;transform:scaleX(var(--p, 1))}
.ap-flow li{position:relative;text-align:center;padding-top:62px}
.ap-flow i{position:absolute;top:0;left:50%;margin-left:-22px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:17px;font-weight:600;background:var(--navy);color:var(--white);box-shadow:0 0 0 8px var(--white);transition:background-color .35s var(--ease),color .35s var(--ease),transform .35s var(--ease)}
.lp-fx .ap-flow li:not(.on) i{background:var(--light-2);color:var(--ink);transform:scale(.86)}
.ap-flow b{display:block;font-size:21px;font-weight:600;color:var(--ink)}
.ap-flow span{display:block;font-size:17px;line-height:1.65;color:var(--ink);margin-top:6px}
.ap-chain figure{margin-top:72px}
.ap-desk{max-width:1060px;margin:0 auto;background:var(--bezel);border-radius:26px;padding:14px 14px 30px;box-shadow:inset 0 0 0 1.5px var(--bezel-edge),var(--desk-shadow);transform-origin:50% 0}
.lp-fx .ap-desk{transform:scale(calc(.84 + var(--p, 1) * .16));opacity:calc(.3 + var(--p, 1) * .7)}
.ap-desk-screen{border-radius:12px;overflow:hidden;background:var(--white)}
.ap-desk-screen img{width:100%}
.ap-cap{text-align:center;font-size:14px;color:var(--ink);margin-top:20px}

/* الأدوار: بطاقة لكل دور بجوالها — أعمدة على الكمبيوتر وسحب جانبي على الجوال */
.ap-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.ap-role{background:var(--light);border-radius:30px;padding:36px 24px 0;overflow:hidden;display:flex;flex-direction:column;text-align:center;align-items:center}
.ap-role h3{font-size:28px;font-weight:600;color:var(--ink)}
.ap-role ul{list-style:none;margin-top:18px;text-align:start;width:100%;border-top:1px solid var(--hair)}
.ap-role li{font-size:17px;line-height:1.55;color:var(--ink);padding:11px 0;border-bottom:1px solid var(--hair)}
.ap-role .ap-shot{margin-top:32px;width:min(210px,84%);height:330px}
.ap-role .ap-phone{--r:36px;--b:7px}

/* من نحن: بلاطة كحلية */
.ap-about{background:var(--dark);color:var(--on-dark);padding:120px 0}
.ap-about .lp-h2{color:var(--on-dark)}
.ap-about-body{max-width:800px;margin:0 auto;text-align:center}
.ap-about-body p{font-size:clamp(19px,1.6vw,21px);line-height:1.85;color:var(--on-dark);margin-top:20px}
.ap-principles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:64px}
.ap-principles div{border-top:1px solid var(--hair-dark);padding-top:22px}
.ap-principles dt{font-size:21px;font-weight:600}
.ap-principles dd{font-size:17px;line-height:1.7;color:var(--on-dark);margin-top:10px}

/* ابدأ: بلاطة فاتحة بالسعر المعلن */
.ap-start{background:var(--light);text-align:center;padding:120px 24px;margin:0 14px;border-radius:30px}
.ap-price{display:flex;align-items:baseline;justify-content:center;gap:12px;margin-top:28px;color:var(--ink)}
.ap-price b{font-size:clamp(72px,8vw,96px);font-weight:600;line-height:1}
.ap-price span{font-size:21px;color:var(--ink)}
.ap-per{font-size:clamp(19px,1.5vw,21px);color:var(--ink);margin-top:10px}
.ap-ticks{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:12px 28px;margin-top:30px}
.ap-ticks li{display:flex;align-items:center;gap:8px;font-size:17px;color:var(--ink)}
.ap-ticks svg{color:var(--navy);flex-shrink:0}
.ap-steps{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;max-width:1200px;margin:52px auto 0;counter-reset:s}
.ap-steps li{background:var(--white);border-radius:24px;padding:26px;text-align:start;display:flex;gap:14px;align-items:center;font-size:17px;color:var(--ink)}
.ap-steps li::before{counter-increment:s;content:counter(s);width:38px;height:38px;border-radius:50%;background:var(--navy);color:var(--white);display:grid;place-items:center;font-size:15px;font-weight:600;flex-shrink:0}

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
  .lp-fx .ap-stage:not(.is-playing) .ap-side-r{transform:translateX(calc(var(--p, 0) * 30px)) rotate(calc(7deg + var(--p, 0) * 4deg))}
  .lp-fx .ap-stage:not(.is-playing) .ap-side-l{transform:translateX(calc(var(--p, 0) * -30px)) rotate(calc(-7deg - var(--p, 0) * 4deg))}
  .ap-play{width:64px;height:64px}
  .ap-intro{padding:88px 20px 32px}
  .ap-grid{grid-template-columns:minmax(0,1fr);padding:0 10px;gap:10px}
  .ap-tile{padding:52px 20px 0;border-radius:26px}
  .ap-tile h3,.ap-wide h3{font-size:32px;line-height:1.2}
  .ap-tile p,.ap-wide p{font-size:19px}
  .ap-lead{font-size:21px}
  .ap-tile .ap-shot,.ap-wide .ap-shot{width:min(258px,70vw);height:390px}
  .ap-tile .ap-phone{--r:40px;--b:8px}
  .ap-chain{padding:80px 0 64px}
  .ap-flow{grid-template-columns:minmax(0,1fr);gap:0;max-width:420px;margin-inline:auto}
  .ap-flow::before,.ap-flow::after{top:22px;right:21px;width:2px;height:calc(100% - 70px)}
  .ap-flow::after{transform-origin:50% 0;transform:scaleY(var(--p, 1))}
  .ap-flow li{text-align:start;padding:8px 64px 32px 0;min-height:44px}
  .ap-flow i{left:auto;right:0;margin-left:0}
  .ap-chain figure{display:none}
  .ap-about{padding:80px 0}
  .ap-principles{grid-template-columns:minmax(0,1fr);margin-top:44px}
  .ap-start{padding:80px 20px;margin:0 10px;border-radius:26px}
  .ap-acts .lp-btn{flex:1 1 auto}
}
@media (prefers-reduced-motion:reduce){
  .ap-hero h1,.ap-lead,.ap-acts,.ap-note,.ap-alt,.ap-video,.ap-side{animation:none}
}
`
