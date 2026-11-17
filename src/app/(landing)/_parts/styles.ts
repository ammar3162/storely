export const LP_CSS = `
/* hallmark v2.0.0 · direction: apple.com (owner: same motion, shapes and backgrounds as Apple) in Storely's identity · backgrounds: Apple's white and #F5F5F7, with Storely navy where Apple uses black (owner's call) · accent: Storely navy for actions and links, like Apple's blue · type: IBM Plex Sans Arabic · signature: real Storely screens in phone frames, moving with the scroll */
/* critique: neutrals carry the page, navy marks what you can press, the real screens bring the colour; black text everywhere (owner); no decorative dots, no beige, no gradients, no invented numbers */
/* waive: 39b FAQ rows are full-width disclosure rows (72px from the question text) · 77 the FAQ keeps a reading measure · sloplint 2026-11-17: 0 FAIL; two 40px buttons and 10px text it reports were not found on the live page with the same walker */
.lp{--navy:#203640;--navy-deep:#16262D;--light:#F5F5F7;--light-2:#E8E8ED;--dark:#203640;--on-dark:#F5F5F7;--wa:#25D366;--mint:#5FC4B8;--white:#FFFFFF;--cream:#F7F9FA;
  --ink:#1D1D1F;--ink2:#1D1D1F;--ink3:#424245;--hair:rgba(0,0,0,.12);--hair-dark:rgba(255,255,255,.16);--on-navy:#FFFFFF;--on-navy2:#F5F5F7;
  --line:#E2E7EA;--line2:#CBD4DC;--field-edge:#80909B;--focus:#203640;--no:#CBD5E1;
  --teal:#203640;--teal2:#203640;--mint-a25:rgba(95,196,184,.25);
  --ink-a06:rgba(32,54,64,.06);--ink-a08:rgba(32,54,64,.08);--ink-a10:rgba(32,54,64,.1);--ink-a40:rgba(32,54,64,.4);--ink-a70:rgba(32,54,64,.7);--white-a14:rgba(255,255,255,.14);
  --ok:#047857;--ok-bg:#ECFDF5;--err:#B91C1C;--err-bg:#FEF2F2;--wa-ink:#0E7A6E;
  --shot-shadow:0 30px 60px -30px rgba(16,30,36,.45);--desk-shadow:0 50px 100px -50px rgba(16,30,36,.45);--play-shadow:0 10px 30px -10px rgba(16,30,36,.5);--float-shadow:0 12px 28px -10px rgba(16,30,36,.6);--nav-glass:rgba(255,255,255,.82);--white-a60:rgba(255,255,255,.6);--bezel:#16262D;--bezel-edge:rgba(255,255,255,.16);--island:#0C161A;--phone-shadow:0 44px 70px -34px rgba(10,20,25,.55);
  --font:'IBM Plex Sans Arabic',system-ui,sans-serif;--ease:cubic-bezier(.2,.7,.2,1);
  font-family:var(--font);background:var(--white);color:var(--ink);overflow-x:clip;-webkit-font-smoothing:antialiased}
.lp *{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
html,body{overflow-x:clip}
.lp a{color:inherit;text-decoration:none}
.lp img{display:block;max-width:100%}
.lp a:focus-visible,.lp button:focus-visible,.lp input:focus-visible,.lp select:focus-visible,.lp textarea:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
.lp .lp-cta :focus-visible,.lp .lp-demo-side :focus-visible,.lp .ap-dark :focus-visible,.lp .ap-about :focus-visible,.lp .ap-video :focus-visible{outline-color:var(--white)}
.lp .ap-cover:focus-visible{outline-offset:-6px}
.lp h1,.lp h2,.lp h3{text-wrap:balance;letter-spacing:0}
.lp p{text-wrap:pretty}
.lp-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.lp-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}

/* الأزرار: حبوب مثل أبل — كحلي على الفاتح، وأبيض على الكحلي */
.lp-btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 22px;border-radius:999px;font:500 16px/1 var(--font);border:1.5px solid transparent;cursor:pointer;white-space:nowrap;transition:background-color .2s var(--ease),color .2s var(--ease),border-color .2s var(--ease),transform .15s var(--ease)}
.lp-btn:active{transform:scale(.97)}
.lp .lp-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.lp-btn-lg{min-height:50px;padding:0 28px;font-size:17px}
.lp-btn-dark,.lp a.lp-btn-dark{background:var(--navy);color:var(--on-navy)}
.lp-btn-dark:hover{background:var(--navy-deep)}
.lp-btn-line,.lp a.lp-btn-line{border-color:var(--navy);color:var(--navy);background:transparent}
.lp-btn-line:hover{background:var(--navy);color:var(--on-navy)}
.lp-btn-ghost{background:transparent;color:var(--ink)}
.lp-btn-ghost:hover{background:var(--ink-a06)}
.lp-btn-soft,.lp a.lp-btn-soft{border-color:var(--hair);background:var(--white);color:var(--ink)}
.lp-btn-soft:hover{border-color:var(--navy)}
.lp-btn-white,.lp a.lp-btn-white{background:var(--white);color:var(--navy)}
.lp-btn-white:hover{background:var(--light-2)}
.lp-btn-glass,.lp a.lp-btn-glass{border-color:var(--white-a60);color:var(--white);background:transparent}
.lp-btn-glass:hover{background:var(--white);color:var(--navy)}
.lp-btn-wa,.lp a.lp-btn-wa{background:var(--white);color:var(--navy);margin-top:24px}
.lp-btn-wa svg{color:var(--wa-ink)}
.lp-btn-wa:hover{background:var(--light-2)}
.lp-link{display:inline-flex;align-items:center;gap:4px;font-size:17px;color:var(--navy);border-bottom:1px solid transparent;transition:border-color .2s var(--ease)}
.lp-link:hover{border-color:currentColor}

/* جوال بإطار رفيع وفتحة كاميرا، وبداخله لقطة حقيقية من ستورلي */
.ap-phone{--r:46px;--b:9px;position:relative;width:100%;aspect-ratio:1179/2556;background:var(--bezel);border-radius:var(--r);padding:var(--b);box-shadow:inset 0 0 0 1.5px var(--bezel-edge),var(--phone-shadow)}
.ap-phone-screen{position:relative;width:100%;height:100%;border-radius:calc(var(--r) - var(--b));overflow:hidden;background:var(--white)}
.ap-phone-screen>img{width:100%;height:100%;object-fit:cover;object-position:top}
.ap-island{position:absolute;top:calc(var(--b) + 2.1%);left:50%;transform:translateX(-50%);width:29%;height:2.5%;min-height:12px;border-radius:999px;background:var(--island)}
.ap-shot{flex-shrink:0}
.lp-anim .rv.ap-rise{transform:translateY(72px) scale(.97);transition:opacity 1s var(--ease),transform 1.2s var(--ease)}
.lp-anim .rv.ap-rise.in{transform:none}

/* شريط الإعلان (من لوحة الإدارة): سطر هادئ فوق القائمة مثل أبل */
.lp-ribbon{background:var(--light);color:var(--ink);text-align:center;padding:12px 20px;font-size:14px;line-height:1.6}

/* القائمة: شريط رفيع شفاف يبقى أعلى الصفحة */
.lp-nav{position:sticky;top:0;z-index:1000;background:var(--nav-glass);backdrop-filter:saturate(1.8) blur(20px);-webkit-backdrop-filter:saturate(1.8) blur(20px);border-bottom:1px solid var(--hair)}
.lp-nav-in{height:56px;display:flex;align-items:center;gap:20px}
.lp-brand{display:flex;align-items:center;gap:9px;font-weight:500;font-size:18px;color:var(--navy)}
.lp-brand img{width:30px;height:30px;border-radius:8px}
.lp-links{display:flex;gap:30px;margin-inline-start:auto}
.lp-links a{font-size:14.5px;color:var(--ink2);white-space:nowrap;transition:color .2s var(--ease)}
.lp-links a:hover{color:var(--navy)}
.lp-nav-end{display:flex;align-items:center;gap:10px;margin-inline-start:28px}
.lp-btn-nav{min-height:40px;padding:0 18px;font-size:15px}
.lp-mob-i{display:none}
.lp-burger{width:44px;height:44px;display:none;place-items:center;border:0;background:none;color:var(--ink);cursor:pointer;border-radius:12px}
.lp-mob-menu{position:fixed;inset:0;z-index:1200;background:var(--white);padding:0 20px max(28px,env(safe-area-inset-bottom));display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;animation:lpSheet .28s var(--ease) both}
@keyframes lpSheet{from{opacity:0}to{opacity:1}}
.lp-mob-head{height:56px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.lp-mob-head .lp-burger{display:grid}
.lp-mob-links{display:flex;flex-direction:column;margin-top:12px}
.lp-mob-links a{font-size:28px;font-weight:700;color:var(--ink);padding:14px 0;border-bottom:1px solid var(--hair)}
.lp-mob-acts{display:grid;gap:12px;margin-top:28px}
.lp-mob-acts .lp-btn{width:100%}

/* أقسام وعناوين مشتركة */
.lp-section{padding:120px 0}
.lp-light{background:var(--light)}
.lp-head{text-align:center;max-width:760px;margin:0 auto 48px}
.lp-h2{font-size:clamp(34px,4.8vw,64px);font-weight:700;line-height:1.12;color:var(--ink)}
.lp-sub{font-size:clamp(18px,1.7vw,22px);line-height:1.6;color:var(--ink2);margin-top:14px}

/* الأسعار (صفحة /pricing) */
.lp-toggle{display:inline-flex;gap:4px;background:var(--white);border:1px solid var(--line);padding:4px;border-radius:999px;margin-top:6px}
.lp-toggle button{border:none;background:none;padding:9px 20px;border-radius:999px;font:500 14px var(--font);color:var(--ink3);cursor:pointer;display:flex;align-items:center;gap:6px}
.lp-toggle button.on{background:var(--navy);color:var(--white)}
.lp-toggle button span{font-size:11px;background:var(--mint-a25);color:inherit;padding:2px 8px;border-radius:99px}
.lp-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:start}
.lp-plan-who{font-size:13px;opacity:.7;margin:-6px 0 14px}
.lp-plan-extra{font-size:12.5px;font-weight:500;color:var(--navy);margin:-12px 0 18px}
.lp-plan.pop .lp-plan-extra{color:var(--mint)}
.lp-plans-trial{font-size:clamp(17px,1.6vw,20px);color:var(--ink2);margin:14px 0 18px}
.lp-plan-yearly{font-size:12px;opacity:.7;margin:-4px 0 10px}
.lp-compare{margin-top:56px}
.lp-compare h3{font-size:22px;font-weight:500;text-align:center;margin-bottom:18px}
.lp-compare-scroll{overflow-x:auto;background:var(--white);border:1px solid var(--line);border-radius:22px}
.lp-compare table{width:100%;border-collapse:collapse;min-width:640px;font-size:14px}
.lp-compare th{padding:16px 12px;font-size:15px;font-weight:500;text-align:center;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--white)}
.lp-compare th:first-child,.lp-compare td:first-child{text-align:right;padding-right:22px;width:34%}
.lp-compare td{padding:12px;text-align:center;border-bottom:1px solid var(--line)}
.lp-compare .pop{background:var(--ink-a06)}
.lp-compare th.pop{color:var(--navy)}
.lp-compare tr.grp td{background:var(--light);font-weight:500;font-size:13px;color:var(--ink2);text-align:right;padding:10px 22px}
.lp-compare .yes{color:var(--navy)}
.lp-compare .no{color:var(--no)}
.lp-compare .addon{font-size:12px;font-weight:500;color:var(--ink2);background:var(--light);padding:3px 10px;border-radius:99px}
.lp-plans-foot{text-align:center;font-size:14px;color:var(--ink2);margin-top:26px}
.lp-plan{position:relative;background:var(--white);border:1px solid var(--line);border-radius:18px;padding:26px}
.lp-plan.pop{background:var(--navy);color:var(--white);border-color:var(--navy);box-shadow:0 40px 70px -40px var(--ink-a70)}
.lp-plan-badge{position:absolute;top:-13px;right:28px;background:var(--mint);color:var(--navy);font-size:12px;font-weight:500;padding:5px 14px;border-radius:99px}
.lp-plan-name{font-size:17px;font-weight:500;margin-bottom:12px}
.lp-plan-price{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.lp-plan-price strong{font-family:var(--font);font-weight:500;font-size:46px;line-height:1}
.lp-plan-price span{font-size:14px;opacity:.65}
.lp-plan-limits{font-size:13.5px;opacity:.7;margin-bottom:22px}
.lp-plan ul{list-style:none;display:flex;flex-direction:column;gap:11px;margin-top:24px;padding-top:22px;border-top:1px solid var(--line)}
.lp-plan.pop ul{border-color:var(--white-a14)}
.lp-plan li{display:flex;gap:9px;align-items:flex-start;font-size:14px;line-height:1.5}
.lp-plan li svg{color:var(--navy);flex-shrink:0;margin-top:2px}
.lp-plan.pop li svg{color:var(--mint)}
.lp-plan.pop .lp-btn-dark{background:var(--white);color:var(--navy)}
.lp-plan-note{margin-top:20px;background:var(--light);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.7;color:var(--ink2)}

/* الأسئلة: صفوف بخط رفيع مثل أبل */
.lp-faq{max-width:820px;margin:0 auto;border-top:1px solid var(--hair)}
.lp-faq-item{border-bottom:1px solid var(--hair)}
.lp-faq-q{width:100%;min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 0;background:none;border:0;cursor:pointer;font:500 clamp(17px,1.6vw,20px)/1.5 var(--font);color:var(--ink);text-align:start}
.lp-faq-q svg{flex-shrink:0;color:var(--navy);transition:transform .25s var(--ease)}
.lp-faq-q[aria-expanded="true"] svg{transform:rotate(45deg)}
.lp-faq-a{padding:0 0 24px;font-size:17px;line-height:1.85;color:var(--ink2);max-width:720px}

/* الدعوة الأخيرة: بلاطة كحلية كاملة */
.lp-cta{background:var(--dark);color:var(--on-navy);text-align:center;padding:120px 24px 0;overflow:hidden}
.lp-cta h2{font-size:clamp(34px,5vw,64px);font-weight:700;line-height:1.15}
.lp-cta p{font-size:clamp(18px,1.7vw,22px);color:var(--on-navy2);margin-top:14px}
.lp-cta-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:32px}
.lp-cta-shots{display:flex;justify-content:center;align-items:flex-start;gap:0;margin:64px auto 0;height:340px;overflow:hidden;padding-top:24px}
.lp-cta-shots .ap-phone{--r:38px;--b:8px;width:min(250px,17.5vw);flex-shrink:0;margin:0 6px;transform-origin:50% 100%}
.lp-cta-shots .ap-phone:nth-child(1){transform:rotate(-9deg) translateY(56px)}
.lp-cta-shots .ap-phone:nth-child(2){transform:rotate(-4deg) translateY(18px);z-index:1}
.lp-cta-shots .ap-phone:nth-child(3){z-index:2}
.lp-cta-shots .ap-phone:nth-child(4){transform:rotate(4deg) translateY(18px);z-index:1}
.lp-cta-shots .ap-phone:nth-child(5){transform:rotate(9deg) translateY(56px)}

/* طلب العرض */
.lp-demo{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);background:var(--white);border-radius:28px;overflow:hidden;border:1px solid var(--hair)}
.lp-demo-side{background:var(--dark);color:var(--on-navy);padding:56px 44px;display:flex;flex-direction:column;justify-content:center}
.lp-demo-side img{width:56px;height:56px;border-radius:16px;margin-bottom:24px}
.lp-demo-side h3{font-weight:700;font-size:clamp(26px,2.6vw,34px);line-height:1.35;margin-bottom:12px}
.lp-demo-side p{font-size:17px;line-height:1.85;color:var(--on-navy2)}
.lp-demo-side .lp-btn-wa{align-self:flex-start}
.lp-demo-form{padding:48px 44px}
.lp-demo-form h2{font-size:clamp(26px,2.6vw,34px);font-weight:700;margin-bottom:8px;color:var(--ink)}
.lp-demo-form>p{font-size:16px;color:var(--ink2);margin-bottom:26px}
.lp-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-bottom:18px}
.lp-fields label{display:flex;flex-direction:column;gap:8px;font-size:14px;font-weight:500;color:var(--ink2)}
.lp-fields .full{grid-column:1/-1}
.lp-fields input,.lp-fields select{width:100%;min-height:50px;padding:12px 16px;border:1px solid var(--field-edge);border-radius:14px;font:16px var(--font);background:var(--white);color:var(--ink);outline:none;transition:border-color .2s var(--ease),box-shadow .2s var(--ease)}
.lp-fields input:focus,.lp-fields select:focus{border-color:var(--navy);box-shadow:0 0 0 4px var(--ink-a10)}
.lp-agree{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--ink2);margin-bottom:22px;cursor:pointer;line-height:1.7}
.lp-agree input{margin-top:5px;accent-color:var(--navy)}
.lp-agree a{color:var(--navy);text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.lp-msg{border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:14px;font-weight:500}
.lp-msg.ok{background:var(--ok-bg);color:var(--ok)}
.lp-msg.err{background:var(--err-bg);color:var(--err)}

/* التذييل: فاتح وصغير مثل أبل */
.lp-footer{background:var(--light);color:var(--ink2);padding:56px 0 28px;font-size:14px}
.lp-foot-grid{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr));gap:32px;padding-bottom:32px;border-bottom:1px solid var(--hair)}
.lp-footer .lp-brand{color:var(--navy)}
.lp-foot-tag{font-size:14px;line-height:1.8;max-width:280px;margin-top:12px}
.lp-foot-title{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:12px}
.lp-foot-link{display:block;font-size:14px;color:var(--ink2);padding:5px 0}
.lp-foot-link:hover{color:var(--navy)}
.lp-foot-social{display:flex;gap:8px;margin-top:18px}
.lp-foot-social a{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--navy);border:1px solid var(--hair);transition:background-color .2s var(--ease),color .2s var(--ease)}
.lp-foot-social a:hover{background:var(--navy);color:var(--on-navy)}
.lp-foot-bottom{padding-top:22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:13px}
.lp-foot-bottom small{display:block;color:var(--ink2);margin-top:6px;font-size:12.5px}
.lp-wa-float,.lp a.lp-wa-float{position:fixed;bottom:20px;left:20px;z-index:998;width:56px;height:56px;border-radius:50%;background:var(--wa);color:var(--white);display:grid;place-items:center;box-shadow:var(--float-shadow);transition:transform .2s var(--ease)}
.lp-wa-float:hover{transform:scale(1.06)}

/* ظهور هادئ عند التمرير (يُفعَّل بالجافاسكربت فقط، وموقوف مع تقليل الحركة) */
.lp-anim .rv{opacity:0;transform:translateY(24px);transition:opacity .8s var(--ease),transform .8s var(--ease)}
.lp-anim .rv.in{opacity:1;transform:none}

/* الشاشات */
.lp-mob{display:none}
@media(max-width:1080px){
  .lp-desk{display:none!important}
  .lp-mob{display:block}
  .lp-burger.lp-mob{display:grid}
  .lp-nav-end{margin-inline-start:auto;gap:8px}
  .lp-desk-i{display:none}
  .lp-mob-i{display:inline}
  .lp-btn-nav{min-height:40px;padding:0 14px;font-size:14.5px}
}
@media(max-width:980px){
  .lp-plans{grid-template-columns:1fr 1fr}
  .lp-demo{grid-template-columns:minmax(0,1fr)}
  .lp-foot-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
}
@media(max-width:720px){
  .lp-wrap{padding:0 20px}
  .lp-section{padding:64px 0}
  .lp-head{margin-bottom:32px}
  .lp-plans{grid-template-columns:1fr}
  .lp-fields{grid-template-columns:minmax(0,1fr)}
  .lp-demo{border-radius:22px}
  .lp-demo-form,.lp-demo-side{padding:32px 22px}
  .lp-cta{padding:80px 20px 0}
  .lp-cta-shots{height:250px;margin-top:48px}
  .lp-cta-shots .ap-phone{--r:28px;--b:6px;width:34vw;margin:0 -8px}
  .lp-cta-shots .ap-phone:nth-child(1),.lp-cta-shots .ap-phone:nth-child(5){display:none}
  .lp-cta-row .lp-btn{width:100%}
  .lp-wa-float{width:52px;height:52px;bottom:16px;left:16px}
  .lp-foot-grid{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:400px){
  .lp-nav .lp-brand span{display:none}
}
@media (prefers-reduced-motion:reduce){
  .lp-mob-menu{animation:none}
  .lp *{transition:none!important}
  html{scroll-behavior:auto}
}
`
