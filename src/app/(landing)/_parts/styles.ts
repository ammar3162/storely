export const LP_CSS = `
/* hallmark v2.0.0 · direction: apple.com structure in Storely's identity (2026-11-17, owner's call) · tones: white page, sand tiles (logo ring), navy tiles (logo field), mint only as the logo's dot · type: IBM Plex Sans Arabic · signature: real Storely screens rising from the tiles */
/* critique: colour comes from the logo's three colours and the real screens, nothing else; one idea per tile; no eyebrows, no invented numbers, no gradients */
.lp{--navy:#203640;--navy-deep:#16262D;--sand:#F4EFE6;--sand-2:#EBE3D5;--mint:#5FC4B8;--white:#FFFFFF;--cream:#F7F9FA;
  --ink:#203640;--ink2:#56656D;--ink3:#66727A;--hair:rgba(32,54,64,.12);--hair-dark:rgba(255,255,255,.16);--on-navy:#FFFFFF;--on-navy2:rgba(255,255,255,.74);
  --line:#E2E7EA;--line2:#CBD4DC;--field-edge:#80909B;--focus:#203640;--no:#CBD5E1;
  --teal:#203640;--teal2:#203640;--mint-a25:rgba(95,196,184,.25);
  --ink-a06:rgba(32,54,64,.06);--ink-a08:rgba(32,54,64,.08);--ink-a10:rgba(32,54,64,.1);--ink-a40:rgba(32,54,64,.4);--ink-a70:rgba(32,54,64,.7);--white-a14:rgba(255,255,255,.14);
  --ok:#047857;--ok-bg:#ECFDF5;--err:#B91C1C;--err-bg:#FEF2F2;--wa-ink:#0E7A6E;
  --shot-shadow:0 30px 60px -30px rgba(16,30,36,.45);--desk-shadow:0 50px 100px -50px rgba(16,30,36,.45);--play-shadow:0 10px 30px -10px rgba(16,30,36,.5);--float-shadow:0 12px 28px -10px rgba(16,30,36,.6);--nav-glass:rgba(255,255,255,.82);--sand-a60:rgba(244,239,230,.6);
  --font:'IBM Plex Sans Arabic',system-ui,sans-serif;--ease:cubic-bezier(.2,.7,.2,1);
  font-family:var(--font);background:var(--white);color:var(--ink);overflow-x:clip;-webkit-font-smoothing:antialiased}
.lp *{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
html,body{overflow-x:clip}
.lp a{color:inherit;text-decoration:none}
.lp img{display:block;max-width:100%}
.lp a:focus-visible,.lp button:focus-visible,.lp input:focus-visible,.lp select:focus-visible,.lp textarea:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
.lp h1,.lp h2,.lp h3{text-wrap:balance;letter-spacing:0}
.lp p{text-wrap:pretty}
.lp-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.lp-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}

/* الأزرار: حبوب مثل أبل — كحلي على الفاتح، ورملي على الكحلي */
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
.lp-btn-white,.lp a.lp-btn-white{background:var(--sand);color:var(--navy)}
.lp-btn-white:hover{background:var(--white)}
.lp-btn-glass,.lp a.lp-btn-glass{border-color:var(--sand-a60);color:var(--sand);background:transparent}
.lp-btn-glass:hover{background:var(--sand);color:var(--navy)}
.lp-btn-wa,.lp a.lp-btn-wa{background:var(--sand);color:var(--navy);margin-top:24px}
.lp-btn-wa svg{color:var(--wa-ink)}
.lp-btn-wa:hover{background:var(--white)}
.lp-link{display:inline-flex;align-items:center;gap:4px;font-size:17px;color:var(--navy);border-bottom:1px solid transparent;transition:border-color .2s var(--ease)}
.lp-link:hover{border-color:currentColor}

/* شريط الإعلان (من لوحة الإدارة): سطر هادئ فوق القائمة مثل أبل */
.lp-ribbon{background:var(--sand);color:var(--navy);text-align:center;padding:12px 20px;font-size:14px;line-height:1.6}

/* القائمة: شريط رفيع شفاف يبقى أعلى الصفحة */
.lp-nav{position:sticky;top:0;z-index:1000;background:var(--nav-glass);backdrop-filter:saturate(1.8) blur(20px);-webkit-backdrop-filter:saturate(1.8) blur(20px);border-bottom:1px solid var(--hair)}
.lp-nav-in{height:56px;display:flex;align-items:center;gap:20px}
.lp-brand{display:flex;align-items:center;gap:9px;font-weight:500;font-size:18px;color:var(--navy)}
.lp-brand img{width:30px;height:30px;border-radius:8px}
.lp-links{display:flex;gap:30px;margin-inline-start:auto}
.lp-links a{font-size:14.5px;color:var(--ink2);white-space:nowrap;transition:color .2s var(--ease)}
.lp-links a:hover{color:var(--navy)}
.lp-nav-end{display:flex;align-items:center;gap:10px;margin-inline-start:28px}
.lp-nav-end .lp-btn{min-height:36px;padding:0 16px;font-size:14.5px}
.lp-burger{width:44px;height:44px;display:none;place-items:center;border:0;background:none;color:var(--navy);cursor:pointer;border-radius:12px}
.lp-mob-menu{position:fixed;inset:56px 0 0 0;background:var(--white);padding:16px 24px 40px;display:flex;flex-direction:column;overflow-y:auto;z-index:999}
.lp-mob-menu a:not(.lp-btn){font-size:26px;font-weight:500;color:var(--navy);padding:14px 0;border-bottom:1px solid var(--hair)}
.lp-mob-menu .lp-btn{margin-top:14px;width:100%}

/* أقسام وعناوين مشتركة */
.lp-section{padding:120px 0}
.lp-sand{background:var(--sand)}
.lp-head{text-align:center;max-width:760px;margin:0 auto 48px}
.lp-h2{font-size:clamp(32px,4.4vw,56px);font-weight:700;line-height:1.18;color:var(--navy)}
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
.lp-compare tr.grp td{background:var(--sand);font-weight:500;font-size:13px;color:var(--ink2);text-align:right;padding:10px 22px}
.lp-compare .yes{color:var(--navy)}
.lp-compare .no{color:var(--no)}
.lp-compare .addon{font-size:12px;font-weight:500;color:var(--ink2);background:var(--sand);padding:3px 10px;border-radius:99px}
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
.lp-plan.pop .lp-btn-dark{background:var(--sand);color:var(--navy)}
.lp-plan-note{margin-top:20px;background:var(--sand);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.7;color:var(--ink2)}

/* الأسئلة: صفوف بخط رفيع مثل أبل */
.lp-faq{max-width:820px;margin:0 auto;border-top:1px solid var(--hair)}
.lp-faq-item{border-bottom:1px solid var(--hair)}
.lp-faq-q{width:100%;min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 0;background:none;border:0;cursor:pointer;font:500 clamp(17px,1.6vw,20px)/1.5 var(--font);color:var(--navy);text-align:start}
.lp-faq-q svg{flex-shrink:0;color:var(--navy);transition:transform .25s var(--ease)}
.lp-faq-q[aria-expanded="true"] svg{transform:rotate(45deg)}
.lp-faq-a{padding:0 0 24px;font-size:17px;line-height:1.85;color:var(--ink2);max-width:720px}

/* الدعوة الأخيرة: بلاطة كحلية كاملة */
.lp-cta{background:var(--navy);color:var(--on-navy);text-align:center;padding:120px 24px 0;overflow:hidden}
.lp-cta h2{font-size:clamp(34px,5vw,64px);font-weight:700;line-height:1.15}
.lp-cta p{font-size:clamp(18px,1.7vw,22px);color:var(--on-navy2);margin-top:14px}
.lp-cta-row{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:32px}
.lp-cta-shots{display:flex;justify-content:center;align-items:flex-start;gap:20px;margin:56px auto 0;height:300px;overflow:hidden}
.lp-cta-shots div{width:min(236px,17vw);flex-shrink:0;border-radius:28px 28px 0 0;overflow:hidden;background:var(--white);box-shadow:var(--shot-shadow)}
.lp-cta-shots div:nth-child(2),.lp-cta-shots div:nth-child(4){margin-top:-28px}
.lp-cta-shots div:nth-child(3){margin-top:-52px}
.lp-cta-shots img{width:100%}

/* طلب العرض */
.lp-demo{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);background:var(--white);border-radius:28px;overflow:hidden;border:1px solid var(--hair)}
.lp-demo-side{background:var(--navy);color:var(--on-navy);padding:56px 44px;display:flex;flex-direction:column;justify-content:center}
.lp-demo-side img{width:56px;height:56px;border-radius:16px;margin-bottom:24px}
.lp-demo-side h3{font-weight:700;font-size:clamp(26px,2.6vw,34px);line-height:1.35;margin-bottom:12px}
.lp-demo-side p{font-size:17px;line-height:1.85;color:var(--on-navy2)}
.lp-demo-side .lp-btn-wa{align-self:flex-start}
.lp-demo-form{padding:48px 44px}
.lp-demo-form h2{font-size:clamp(26px,2.6vw,34px);font-weight:700;margin-bottom:8px;color:var(--navy)}
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
.lp-footer{background:var(--sand);color:var(--ink2);padding:56px 0 28px;font-size:14px}
.lp-foot-grid{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr));gap:32px;padding-bottom:32px;border-bottom:1px solid var(--hair)}
.lp-footer .lp-brand{color:var(--navy)}
.lp-foot-tag{font-size:14px;line-height:1.8;max-width:280px;margin-top:12px}
.lp-foot-title{font-size:14px;font-weight:500;color:var(--navy);margin-bottom:12px}
.lp-foot-link{display:block;font-size:14px;color:var(--ink2);padding:5px 0}
.lp-foot-link:hover{color:var(--navy)}
.lp-foot-social{display:flex;gap:8px;margin-top:18px}
.lp-foot-social a{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:var(--navy);border:1px solid var(--hair);transition:background-color .2s var(--ease),color .2s var(--ease)}
.lp-foot-social a:hover{background:var(--navy);color:var(--on-navy)}
.lp-foot-bottom{padding-top:22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:13px}
.lp-foot-bottom small{display:block;color:var(--ink2);margin-top:6px;font-size:12.5px}
.lp-wa-float{position:fixed;bottom:20px;left:20px;z-index:998;width:52px;height:52px;border-radius:50%;background:var(--navy);color:var(--on-navy);display:grid;place-items:center;box-shadow:var(--float-shadow);transition:transform .2s var(--ease)}
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
  .lp-nav-end{margin-inline-start:auto}
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
  .lp-cta-shots{height:220px;gap:10px;margin-top:44px}
  .lp-cta-shots div{width:31vw;border-radius:20px 20px 0 0}
  .lp-cta-shots div:nth-child(n+4){display:none}
  .lp-cta-shots div:nth-child(3){margin-top:0}
  .lp-cta-shots div:nth-child(2){margin-top:-24px}
  .lp-cta-row .lp-btn{width:100%}
  .lp-wa-float{width:48px;height:48px;bottom:16px;left:16px}
  .lp-foot-grid{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  .lp *{transition:none!important}
  html{scroll-behavior:auto}
}
`
