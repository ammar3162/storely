export const LP_CSS = `
/* hallmark v2.0.0 · custom direction via unslop (calm, precise, close to the shop floor; world: back-of-house before opening) · shape: video hero → customers → day → chain → roles → about → start → faq → cta + demo · signature: cashier-closing receipt in code · genre: modern-minimal */
/* critique: one bright moment besides the video (the receipt); headings start-aligned; no eyebrows, no stats row, no AI photos; figures tabular */
.lp{--ink:#203640;--ink2:#4F6678;--ink3:#66737C;--line:#E2E7EA;--cream:#F7F9FA;--sand:#EEF2F4;--teal:#203640;--teal2:#203640;--mint:#A3917F;--font:'IBM Plex Sans Arabic',system-ui,sans-serif;
  --black-a20:rgba(0,0,0,.2);--cream-a88:rgba(247,249,250,.88);--cream-a94:rgba(247,249,250,.94);--device:#111B20;--err:#DC2626;--err-bg:#FEF2F2;--ink-a06:rgba(32,54,64,.06);--ink-a08:rgba(32,54,64,.08);--ink-a10:rgba(32,54,64,.1);--ink-a40:rgba(32,54,64,.4);--ink-a70:rgba(32,54,64,.7);--ink-deep:#16262D;--ink-soft:#2E4B58;--line2:#CBD4DC;--mint-a18:rgba(163,145,127,.18);--mint-a25:rgba(163,145,127,.25);--no:#CBD5E1;--ok:#047857;--ok-bg:#ECFDF5;--wa:#25D366;--focus:#1F7F74;--wa-ink:#0E7A6E;--field-edge:#80909B;--wa-a55:rgba(37,211,102,.55);--white:#FFFFFF;--white-a06:rgba(255,255,255,.06);--white-a08:rgba(255,255,255,.08);--white-a10:rgba(255,255,255,.1);--white-a12:rgba(255,255,255,.12);--white-a14:rgba(255,255,255,.14);--white-a16:rgba(255,255,255,.16);--white-a28:rgba(255,255,255,.28);--white-a45:rgba(255,255,255,.45);--white-a50:rgba(255,255,255,.5);--white-a65:rgba(255,255,255,.65);--white-a75:rgba(255,255,255,.75);--white-a85:rgba(255,255,255,.85);--white-a88:rgba(255,255,255,.88);
  font-family:var(--font);background:var(--cream);color:var(--ink);overflow-x:clip}
.lp *{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
html,body{overflow-x:clip}
.lp a:focus-visible,.lp button:focus-visible,.lp input:focus-visible,.lp select:focus-visible,.lp textarea:focus-visible,.lp summary:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.lp h1,.lp h2,.lp h3{text-wrap:balance}
.lp p{text-wrap:pretty}
.lp .lp-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.lp-footer .lp-brand{color:var(--white)}
.lp-agree a{white-space:nowrap}
.lp a{color:inherit}
.lp-wrap{max-width:1180px;margin:0 auto;padding:0 28px}
.lp-h2,.lp-cta h2{font-family:var(--font);font-weight:600;letter-spacing:0}

/* الأزرار */
.lp-btn{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:10px;font:600 14px/1 var(--font);border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform .15s,background .2s,border-color .2s,color .2s;white-space:nowrap}
.lp-btn:active{transform:scale(.98)}
.lp-btn-lg{padding:15px 26px;font-size:15.5px}
.lp-btn-dark{background:var(--teal);color:var(--white)}
.lp-btn-dark:hover{background:var(--ink-deep)}
.lp-btn-ghost{background:transparent;color:var(--ink)}
.lp-btn-ghost:hover{background:var(--ink-a06)}
.lp-btn-soft{background:var(--white);color:var(--ink);border-color:var(--line)}
.lp-btn-soft:hover{border-color:var(--line2)}
.lp-btn-line{background:var(--white);color:var(--ink);border-color:var(--line)}
.lp-btn-line:hover{border-color:var(--teal2);color:var(--teal2)}
.lp-btn-white{background:var(--white);color:var(--teal)}
.lp-btn-glass{background:var(--white-a10);color:var(--white);border-color:var(--white-a28)}
.lp-btn-glass:hover{background:var(--white-a16)}
.lp-btn-wa{background:var(--white);color:var(--ink);margin-top:22px}
.lp-btn-wa svg{color:var(--wa-ink)}
.lp-btn-wa:hover{background:var(--cream)}

/* شريط الإعلانات */
.lp-marquee{position:fixed;top:0;right:0;left:0;z-index:1001;height:36px;background:var(--teal);overflow:hidden;display:flex;align-items:center}

/* القائمة */
.lp-nav{position:fixed;right:0;left:0;z-index:1000;transition:background .3s,box-shadow .3s,backdrop-filter .3s}
.lp-nav.on{background:var(--cream-a88);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);box-shadow:0 1px 0 var(--line)}
.lp-nav-in{height:70px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.lp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:600;font-size:19px;color:var(--ink)}
.lp-brand img{width:36px;height:36px;border-radius:10px;background:var(--white);object-fit:cover}
.lp-links{display:flex;gap:30px}
.lp-links a{text-decoration:none;font-size:14.5px;color:var(--ink2);font-weight:500;white-space:nowrap}
.lp-links a:hover{color:var(--teal2)}
.lp-burger{background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink)}
.lp-mob-menu{background:var(--cream);border-top:1px solid var(--line);padding:18px 28px 24px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 30px -20px var(--black-a20)}
.lp-mob-menu a{text-decoration:none;font-size:16px;padding:10px 0;border-bottom:1px solid var(--line)}

/* الواجهة */

.lp-cta-row{display:flex;gap:12px;flex-wrap:wrap}

.lp-phone{position:relative;width:290px;aspect-ratio:9/19.2;border-radius:44px;background:var(--device);padding:10px;box-shadow:0 50px 80px -40px var(--ink-a70),0 0 0 1px var(--white-a06) inset;transform:rotate(-3deg)}
.lp-phone video{width:100%;height:100%;object-fit:cover;border-radius:35px;display:block;background:var(--ink)}

/* شعارات العملاء: بطاقات بنفس المقاس — الشعار المربع والعريض يطلعون بنفس الوضوح */

/* الأقسام */
.lp-section{padding:110px 0}
.lp-sand{background:var(--sand)}
.lp-head{text-align:center;max-width:680px;margin:0 auto 54px}
.lp-tag{display:inline-block;font-size:13px;font-weight:600;color:var(--teal2);background:var(--ink-a08);border-radius:999px;padding:6px 14px;margin-bottom:16px}

.lp-h2{font-size:42px;line-height:1.35;color:var(--ink);margin-bottom:18px}

/* كيف يشتغل */

/* المميزات */

/* الأسعار */
.lp-toggle{display:inline-flex;gap:4px;background:var(--white);border:1px solid var(--line);padding:4px;border-radius:10px;margin-top:6px}
.lp-toggle button{border:none;background:none;padding:9px 20px;border-radius:8px;font:600 14px var(--font);color:var(--ink3);cursor:pointer;display:flex;align-items:center;gap:6px}
.lp-toggle button.on{background:var(--teal);color:var(--white)}
.lp-toggle button span{font-size:11px;background:var(--mint-a25);color:inherit;padding:2px 8px;border-radius:99px}
.lp-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:start}
.lp-plan-who{font-size:13px;opacity:.7;margin:-6px 0 14px}
.lp-plan-extra{font-size:12.5px;font-weight:600;color:var(--teal2);margin:-12px 0 18px}
.lp-plan.pop .lp-plan-extra{color:var(--mint)}
.lp-plans-trial{font-size:15px;color:var(--ink2);margin:-4px 0 18px}
.lp-plan-yearly{font-size:12px;opacity:.7;margin:-4px 0 10px}
.lp-compare{margin-top:56px}
.lp-compare h3{font-size:22px;font-weight:600;text-align:center;margin-bottom:18px}
.lp-compare-scroll{overflow-x:auto;background:var(--white);border:1px solid var(--line);border-radius:22px}
.lp-compare table{width:100%;border-collapse:collapse;min-width:640px;font-size:14px}
.lp-compare th{padding:16px 12px;font-size:15px;font-weight:600;text-align:center;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--white)}
.lp-compare th:first-child,.lp-compare td:first-child{text-align:right;padding-right:22px;width:34%}
.lp-compare td{padding:12px;text-align:center;border-bottom:1px solid var(--line)}
.lp-compare .pop{background:var(--ink-a06)}
.lp-compare th.pop{color:var(--teal)}
.lp-compare tr.grp td{background:var(--sand);font-weight:600;font-size:13px;color:var(--ink2);text-align:right;padding:10px 22px}
.lp-compare .yes{color:var(--teal2)}
.lp-compare .no{color:var(--no)}
.lp-compare .addon{font-size:12px;font-weight:600;color:var(--ink2);background:var(--sand);padding:3px 10px;border-radius:99px}
.lp-plans-foot{text-align:center;font-size:14px;color:var(--ink2);margin-top:26px}
.lp-plan{position:relative;background:var(--white);border:1px solid var(--line);border-radius:16px;padding:26px}
.lp-plan.pop{background:var(--teal);color:var(--white);border-color:var(--teal);box-shadow:0 40px 70px -40px var(--ink-a70)}
.lp-plan-badge{position:absolute;top:-13px;right:28px;background:var(--mint);color:var(--teal);font-size:12px;font-weight:600;padding:5px 14px;border-radius:99px}
.lp-plan-name{font-size:17px;font-weight:600;margin-bottom:12px}
.lp-plan-price{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.lp-plan-price strong{font-family:var(--font);font-weight:600;font-size:46px;line-height:1}
.lp-plan-price span{font-size:14px;opacity:.65}
.lp-plan-limits{font-size:13.5px;opacity:.7;margin-bottom:22px}
.lp-plan ul{list-style:none;display:flex;flex-direction:column;gap:11px;margin-top:24px;padding-top:22px;border-top:1px solid var(--line)}
.lp-plan.pop ul{border-color:var(--white-a14)}
.lp-plan li{display:flex;gap:9px;align-items:flex-start;font-size:14px;line-height:1.5}
.lp-plan li svg{color:var(--teal2);flex-shrink:0;margin-top:2px}
.lp-plan.pop li svg{color:var(--mint)}
.lp-plan.pop .lp-btn-dark{background:var(--white);color:var(--teal)}
.lp-plan-note{margin-top:20px;background:var(--sand);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.7;color:var(--ink2)}

/* طلب العرض */
.lp-demo{display:grid;grid-template-columns:.8fr 1.2fr;background:var(--white);border-radius:20px;overflow:hidden;border:1px solid var(--line);box-shadow:0 40px 80px -50px var(--ink-a40);padding:0}
.lp-demo-side{background:radial-gradient(400px 300px at 80% 0%,var(--mint-a18),transparent 60%),var(--teal);color:var(--white);padding:48px 40px;display:flex;flex-direction:column;justify-content:center}
.lp-demo-side img{width:56px;height:56px;border-radius:16px;background:var(--white);margin-bottom:24px}
.lp-demo-side h3{font-family:var(--font);font-weight:600;font-size:28px;line-height:1.5;margin-bottom:14px}
.lp-demo-side p{font-size:15px;line-height:1.9;color:var(--white-a75)}
.lp-demo-side .lp-btn-wa{align-self:flex-start}
.lp-demo-form{padding:44px}
.lp-demo-form h2{font-size:24px;font-weight:600;margin-bottom:6px}
.lp-demo-form>p{font-size:14.5px;color:var(--ink3);margin-bottom:24px}
.lp-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
.lp-fields label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:600;color:var(--ink2)}
.lp-fields .full{grid-column:1/-1}
.lp-fields input,.lp-fields select{width:100%;padding:13px 15px;border:1px solid var(--field-edge);border-radius:14px;font:15px var(--font);background:var(--cream);outline:none;transition:border-color .2s,box-shadow .2s;color:var(--ink)}
.lp-fields input:focus,.lp-fields select:focus{border-color:var(--teal2);box-shadow:0 0 0 4px var(--ink-a10);background:var(--white)}
.lp-agree{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--ink3);margin-bottom:20px;cursor:pointer;line-height:1.6}
.lp-agree input{margin-top:4px;accent-color:var(--teal2)}
.lp-agree a{color:var(--teal2)}
.lp-msg{border-radius:12px;padding:11px 14px;margin-bottom:16px;font-size:13.5px;font-weight:600}
.lp-msg.ok{background:var(--ok-bg);color:var(--ok)}
.lp-msg.err{background:var(--err-bg);color:var(--err)}

/* الأسئلة */
.lp-faq{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:6px 28px}
.lp-faq>div:last-child{border-bottom:none!important}

/* الدعوة */
.lp-cta{text-align:center;color:var(--white);border-radius:20px;padding:84px 28px;margin-bottom:90px;background:radial-gradient(600px 300px at 50% 0%,var(--mint-a25),transparent 70%),linear-gradient(160deg,var(--ink-soft),var(--ink) 60%,var(--ink-deep))}
.lp-cta h2{font-size:44px;line-height:1.4;margin-bottom:14px}
.lp-cta p{font-size:17px;color:var(--white-a75);margin-bottom:34px}

/* التذييل */
.lp-footer{background:var(--ink-deep);color:var(--white);padding:64px 0 30px}
.lp-foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:44px}
.lp-foot-tag{font-size:14px;color:var(--white-a65);line-height:1.8;max-width:260px;margin-top:14px}
.lp-foot-title{font-size:13px;font-weight:600;color:var(--white-a50);margin-bottom:14px}
.lp-foot-link{display:block;text-decoration:none;font-size:14.5px;color:var(--white-a88);margin-bottom:10px}
.lp-foot-link:hover{color:var(--mint)}
.lp-foot-social{display:flex;gap:10px;margin-top:18px}
.lp-foot-social a{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--white-a85);background:var(--white-a08);border:1px solid var(--white-a12);transition:background .2s,color .2s}
.lp-foot-social a:hover{background:var(--white-a16);color:var(--mint)}
.lp-foot-bottom{border-top:1px solid var(--white-a10);padding-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:13px}
.lp-foot-bottom small{display:block;color:var(--white-a45);margin-top:6px;font-size:11.5px}
.lp-wa-float{position:fixed;bottom:24px;left:24px;z-index:999;width:56px;height:56px;border-radius:50%;background:var(--wa);display:grid;place-items:center;box-shadow:0 12px 26px -8px var(--wa-a55);transition:transform .2s}
.lp-wa-float:hover{transform:scale(1.08)}

/* الظهور عند التمرير */
.lp-anim .rv{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.lp-anim .rv.in{opacity:1;transform:none}

/* الشاشات */
.lp-mob{display:none}
@media(max-width:980px){
  .lp-h2{font-size:34px}
  .lp-plans{grid-template-columns:1fr 1fr}
  .lp-demo{grid-template-columns:1fr}
  .lp-foot-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:1080px){
  .lp-desk{display:none!important}
  .lp-mob{display:block}
}
@media(max-width:720px){
  .lp-wrap{padding:0 18px}
  .lp-h2{font-size:29px}
  .lp-section{padding:56px 0}
  .lp-plans{grid-template-columns:1fr}
  /* المزايا على الجوال: سطر مضغوط — الأيقونة جنب العنوان والوصف */
  .lp-phone{width:240px}
  .lp-fields{grid-template-columns:1fr}
  .lp-demo-form,.lp-demo-side{padding:30px 22px}
  .lp-cta{border-radius:16px;padding:60px 20px}
  .lp-cta h2{font-size:32px}
  .lp-cta-row .lp-btn{width:100%}
  .lp-foot-grid{grid-template-columns:1fr}
}

/* ═══ الواجهة: شاشة Storely + الإشعارات ═══ */

/* ═══ المشكلات وحلولها ═══ */

/* ═══ الفيديو ═══ */

/* ═══ يومك مع Storely (داخل «كيف يعمل») ═══ */

/* ═══ ابدأ في 3 خطوات ═══ */

/* ═══ زر ثابت على الجوال ═══ */
.lp-sticky{display:none}
@media(max-width:720px){
  .lp-sticky{display:block;position:fixed;bottom:0;right:0;left:0;z-index:998;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:var(--cream-a94);backdrop-filter:blur(10px);border-top:1px solid var(--line);transform:translateY(110%);transition:transform .25s}
  .lp-sticky.on{transform:none}
  .lp-sticky .lp-btn{width:100%;padding:14px;font-size:15px}
  .lp-wa-float{bottom:84px}
}

`
