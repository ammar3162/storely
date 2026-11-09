export const LP_CSS = `
.lp{--ink:#203640;--ink2:#4F6678;--ink3:#66737C;--line:#E2E7EA;--cream:#F7F9FA;--sand:#EEF2F4;--teal:#203640;--teal2:#203640;--mint:#A3917F;
  font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;background:var(--cream);color:var(--ink);overflow-x:hidden}
.lp *{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
.lp a{color:inherit}
.lp-wrap{max-width:1180px;margin:0 auto;padding:0 28px}
.lp-display,.lp-h2,.lp-cta h2{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;font-weight:700;letter-spacing:0}

/* الأزرار */
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:10px;font:600 14px/1 'IBM Plex Sans Arabic',sans-serif;border:1px solid transparent;cursor:pointer;text-decoration:none;transition:transform .15s,background .2s,border-color .2s,color .2s;white-space:nowrap}
.lp-btn:active{transform:scale(.98)}
.lp-btn-lg{padding:15px 26px;font-size:15.5px}
.lp-btn-dark{background:var(--teal);color:#fff}
.lp-btn-dark:hover{background:#16262D}
.lp-btn-ghost{background:transparent;color:var(--ink)}
.lp-btn-ghost:hover{background:rgba(32,54,64,.06)}
.lp-btn-soft{background:#fff;color:var(--ink);border-color:var(--line)}
.lp-btn-soft:hover{border-color:#CBD4DC}
.lp-btn-line{background:#fff;color:var(--ink);border-color:var(--line)}
.lp-btn-line:hover{border-color:var(--teal2);color:var(--teal2)}
.lp-btn-white{background:#fff;color:var(--teal)}
.lp-btn-glass{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.28)}
.lp-btn-glass:hover{background:rgba(255,255,255,.16)}
.lp-btn-wa{background:#25d366;color:#fff;margin-top:22px}
.lp-play{width:26px;height:26px;border-radius:50%;background:var(--teal);color:#fff;display:grid;place-items:center}

/* شريط الإعلانات */
.lp-marquee{position:fixed;top:0;right:0;left:0;z-index:1001;height:36px;background:var(--teal);overflow:hidden;display:flex;align-items:center}
.lp-marquee-track{display:flex;white-space:nowrap;animation:lpMarquee 35s linear infinite}
.lp-marquee-item{color:#fff;font-size:13px;font-weight:600;padding:0 24px;display:flex;align-items:center;gap:8px}
@keyframes lpMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* القائمة */
.lp-nav{position:fixed;right:0;left:0;z-index:1000;transition:background .3s,box-shadow .3s,backdrop-filter .3s}
.lp-nav.on{background:rgba(247,249,250,.88);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);box-shadow:0 1px 0 var(--line)}
.lp-nav-in{height:70px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.lp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:19px;color:var(--ink)}
.lp-brand img{width:36px;height:36px;border-radius:10px;background:#fff;object-fit:cover}
.lp-links{display:flex;gap:30px}
.lp-links a{text-decoration:none;font-size:14.5px;color:var(--ink2);font-weight:500}
.lp-links a:hover{color:var(--teal2)}
.lp-burger{background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink)}
.lp-mob-menu{background:var(--cream);border-top:1px solid var(--line);padding:18px 28px 24px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 30px -20px rgba(0,0,0,.2)}
.lp-mob-menu a{text-decoration:none;font-size:16px;padding:10px 0;border-bottom:1px solid var(--line)}

/* الواجهة */
.lp-hero{position:relative;padding-bottom:40px;background:radial-gradient(900px 500px at 15% 10%,rgba(163,145,127,.10),transparent 60%),radial-gradient(700px 400px at 90% 90%,rgba(32,54,64,.04),transparent 60%)}
.lp-hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center}
.lp-pill{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:13px;font-weight:600;color:var(--ink2);margin-bottom:26px}
.lp-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.15)}
.lp-display{position:relative;z-index:0;font-size:62px;line-height:1.28;color:var(--ink);margin-bottom:22px}
.lp-display em{font-style:normal;color:var(--teal2);position:relative;white-space:nowrap}
.lp-display em::after{content:'';position:absolute;right:0;left:0;bottom:6px;height:12px;background:rgba(163,145,127,.35);border-radius:6px;z-index:-1}
.lp-lead{font-size:18px;line-height:1.9;color:var(--ink2);max-width:560px;margin-bottom:34px}
.lp-cta-row{display:flex;gap:12px;flex-wrap:wrap}
.lp-ticks{list-style:none;display:flex;gap:22px;flex-wrap:wrap;margin-top:30px}
.lp-ticks li{display:flex;align-items:center;gap:7px;font-size:14px;color:var(--ink3)}
.lp-ticks svg{color:var(--teal2)}
.lp-hero-media{position:relative;display:flex;justify-content:center;padding:20px 0}
.lp-halo{position:absolute;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,#2E4B58 0%,#203640 70%);top:50%;left:50%;transform:translate(-50%,-50%);opacity:.95}
.lp-halo::before{content:'';position:absolute;inset:-34px;border-radius:50%;border:1px dashed rgba(32,54,64,.35)}
.lp-phone{position:relative;width:290px;aspect-ratio:9/19.2;border-radius:44px;background:#111b20;padding:10px;box-shadow:0 50px 80px -40px rgba(32,54,64,.7),0 0 0 1px rgba(255,255,255,.06) inset;transform:rotate(-3deg)}
.lp-phone video{width:100%;height:100%;object-fit:cover;border-radius:35px;display:block;background:#203640}
.lp-partners{text-align:center;margin-top:56px}
.lp-partners p{font-size:12.5px;color:var(--ink3);margin-bottom:18px}
/* شعارات العملاء: بطاقات بنفس المقاس — الشعار المربع والعريض يطلعون بنفس الوضوح */
.lp-partner-grid{list-style:none;margin:0 auto;padding:0;display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:1040px}
.lp-partner{width:140px;display:flex;flex-direction:column;align-items:center;gap:9px}
.lp-partner-logo{width:100%;aspect-ratio:1/1;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:18px;display:flex;align-items:center;justify-content:center;padding:10px;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:transform .2s,box-shadow .2s}
.lp-partner-logo img{width:100%;height:100%;min-height:0;min-width:0;object-fit:contain;display:block;border-radius:10px}
.lp-partner:hover .lp-partner-logo{transform:translateY(-2px);box-shadow:0 10px 24px rgba(15,23,42,.08)}
.lp-partner-name{font-size:12.5px;font-weight:600;color:var(--ink2,#334155);text-align:center;line-height:1.3}
.lp-stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:64px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.lp-stats>div{padding:24px 10px;text-align:center;border-left:1px solid var(--line)}
.lp-stats>div:last-child{border-left:none}
.lp-stats strong{display:block;font-family:'IBM Plex Sans Arabic',sans-serif;font-weight:700;font-size:30px;color:var(--teal)}
.lp-stats span{font-size:13px;color:var(--ink3)}

/* الأقسام */
.lp-section{padding:110px 0}
.lp-sand{background:var(--sand)}
.lp-head{text-align:center;max-width:680px;margin:0 auto 54px}
.lp-tag{display:inline-block;font-size:13px;font-weight:700;color:var(--teal2);background:rgba(32,54,64,.08);border-radius:999px;padding:6px 14px;margin-bottom:16px}
.lp-tag-light{color:var(--mint);background:rgba(163,145,127,.12)}
.lp-h2{font-size:42px;line-height:1.35;color:var(--ink);margin-bottom:18px}
.lp-body{font-size:17px;line-height:1.95;color:var(--ink2);margin-bottom:26px}
.lp-split{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.lp-split-rev>:first-child{order:2}
.lp-photo{position:relative;border-radius:16px}
.lp-photo img{width:100%;aspect-ratio:4/3.4;object-fit:cover;border-radius:16px;display:block;box-shadow:0 40px 70px -40px rgba(32,54,64,.45)}
.lp-photo-wide img{aspect-ratio:4/3.2;object-position:35% center}
.lp-note{position:absolute;bottom:-26px;left:28px;background:#fff;border-radius:20px;padding:14px 18px;display:flex;gap:12px;align-items:center;box-shadow:0 24px 40px -18px rgba(32,54,64,.35);border:1px solid var(--line)}
.lp-note-ic{width:42px;height:42px;border-radius:13px;background:#F3F5F6;display:grid;place-items:center;font-size:20px}
.lp-note b{display:block;font-size:15px}
.lp-note small{font-size:12.5px;color:var(--ink3)}
.lp-list{list-style:none;display:flex;flex-direction:column;gap:14px}
.lp-list li{display:flex;gap:12px;align-items:center;font-size:16px;color:var(--ink)}
.lp-list li>span{width:26px;height:26px;border-radius:50%;background:rgba(32,54,64,.1);color:var(--teal2);display:grid;place-items:center;flex-shrink:0}
.lp-link{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--teal2);text-decoration:none}
.lp-link:hover{gap:10px}
.lp-chat{position:absolute;bottom:22px;right:22px;left:22px;display:flex;flex-direction:column;gap:8px;max-width:300px;margin-right:auto}
.lp-bubble{background:#fff;border-radius:16px 16px 16px 4px;padding:10px 14px;font-size:13.5px;line-height:1.6;box-shadow:0 12px 24px -12px rgba(0,0,0,.3);align-self:flex-start}
.lp-bubble-out{background:#d9fdd3;border-radius:16px 16px 4px 16px;align-self:flex-end}

/* كيف يشتغل */
.lp-how{background:radial-gradient(700px 500px at 20% 30%,rgba(163,145,127,.12),transparent 60%),var(--teal);color:#fff;padding:110px 0;margin:0 20px;border-radius:20px}
.lp-how-media{display:flex;justify-content:center}
.lp-how .lp-phone{transform:rotate(2deg);box-shadow:0 50px 90px -30px rgba(0,0,0,.6)}
.lp-steps{list-style:none;display:flex;flex-direction:column;gap:6px;margin-top:10px}
.lp-steps li{display:flex;gap:18px;padding:18px 0;border-bottom:1px solid rgba(255,255,255,.1)}
.lp-steps li:last-child{border-bottom:none}
.lp-step-n{font-family:'IBM Plex Sans Arabic',sans-serif;font-weight:700;font-size:26px;color:var(--mint);min-width:40px;line-height:1.3}
.lp-steps b{font-size:18px;display:block;margin-bottom:4px}
.lp-steps p{font-size:15px;line-height:1.8;color:rgba(255,255,255,.72)}

/* المميزات */
.lp-feats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.lp-feat{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px;transition:transform .2s,box-shadow .2s,border-color .2s}
.lp-feat:hover{transform:translateY(-3px);box-shadow:0 22px 40px -26px rgba(32,54,64,.35);border-color:#CBD4DC}
.lp-feat-ic{width:48px;height:48px;border-radius:10px;background:var(--bg);color:var(--fg);display:grid;place-items:center;margin-bottom:18px}
.lp-feat h3{font-size:18px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.lp-feat h3 em{font-style:normal;font-size:11px;font-weight:700;color:var(--fg);background:var(--bg);padding:3px 9px;border-radius:99px}
.lp-feat p{font-size:14.5px;line-height:1.85;color:var(--ink3)}

/* الأسعار */
.lp-toggle{display:inline-flex;gap:4px;background:#fff;border:1px solid var(--line);padding:4px;border-radius:10px;margin-top:6px}
.lp-toggle button{border:none;background:none;padding:9px 20px;border-radius:8px;font:600 14px 'IBM Plex Sans Arabic',sans-serif;color:var(--ink3);cursor:pointer;display:flex;align-items:center;gap:6px}
.lp-toggle button.on{background:var(--teal);color:#fff}
.lp-toggle button span{font-size:11px;background:rgba(163,145,127,.25);color:inherit;padding:2px 8px;border-radius:99px}
.lp-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:start}
.lp-plan-who{font-size:13px;opacity:.7;margin:-6px 0 14px}
.lp-plan-extra{font-size:12.5px;font-weight:700;color:var(--teal2);margin:-12px 0 18px}
.lp-plan.pop .lp-plan-extra{color:var(--mint)}
.lp-plans-trial{font-size:15px;color:var(--ink2);margin:-4px 0 18px}
.lp-plan-yearly{font-size:12px;opacity:.7;margin:-4px 0 10px}
.lp-compare{margin-top:56px}
.lp-compare h3{font-size:22px;font-weight:800;text-align:center;margin-bottom:18px}
.lp-compare-scroll{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:22px}
.lp-compare table{width:100%;border-collapse:collapse;min-width:640px;font-size:14px}
.lp-compare th{padding:16px 12px;font-size:15px;font-weight:800;text-align:center;border-bottom:1px solid var(--line);position:sticky;top:0;background:#fff}
.lp-compare th:first-child,.lp-compare td:first-child{text-align:right;padding-right:22px;width:34%}
.lp-compare td{padding:12px;text-align:center;border-bottom:1px solid var(--line)}
.lp-compare .pop{background:rgba(32,54,64,.06)}
.lp-compare th.pop{color:var(--teal)}
.lp-compare tr.grp td{background:var(--sand);font-weight:800;font-size:13px;color:var(--ink2);text-align:right;padding:10px 22px}
.lp-compare .yes{color:var(--teal2)}
.lp-compare .no{color:#cbd5e1}
.lp-compare .addon{font-size:12px;font-weight:700;color:var(--ink2);background:var(--sand);padding:3px 10px;border-radius:99px}
.lp-plans-foot{text-align:center;font-size:14px;color:var(--ink2);margin-top:26px}
.lp-plan{position:relative;background:#fff;border:1px solid var(--line);border-radius:16px;padding:26px}
.lp-plan.pop{background:var(--teal);color:#fff;border-color:var(--teal);box-shadow:0 40px 70px -40px rgba(32,54,64,.7)}
.lp-plan-badge{position:absolute;top:-13px;right:28px;background:var(--mint);color:var(--teal);font-size:12px;font-weight:700;padding:5px 14px;border-radius:99px}
.lp-plan-name{font-size:17px;font-weight:700;margin-bottom:12px}
.lp-plan-price{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.lp-plan-price strong{font-family:'IBM Plex Sans Arabic',sans-serif;font-weight:700;font-size:46px;line-height:1}
.lp-plan-price span{font-size:14px;opacity:.65}
.lp-plan-limits{font-size:13.5px;opacity:.7;margin-bottom:22px}
.lp-plan ul{list-style:none;display:flex;flex-direction:column;gap:11px;margin-top:24px;padding-top:22px;border-top:1px solid var(--line)}
.lp-plan.pop ul{border-color:rgba(255,255,255,.14)}
.lp-plan li{display:flex;gap:9px;align-items:flex-start;font-size:14px;line-height:1.5}
.lp-plan li svg{color:var(--teal2);flex-shrink:0;margin-top:2px}
.lp-plan.pop li svg{color:var(--mint)}
.lp-plan.pop .lp-btn-dark{background:#fff;color:var(--teal)}
.lp-plan-note{margin-top:20px;background:var(--sand);border-radius:14px;padding:12px 14px;font-size:12.5px;line-height:1.7;color:var(--ink2)}

/* طلب العرض */
.lp-demo{display:grid;grid-template-columns:.8fr 1.2fr;background:#fff;border-radius:20px;overflow:hidden;border:1px solid var(--line);box-shadow:0 40px 80px -50px rgba(32,54,64,.4);padding:0}
.lp-demo-side{background:radial-gradient(400px 300px at 80% 0%,rgba(163,145,127,.18),transparent 60%),var(--teal);color:#fff;padding:48px 40px;display:flex;flex-direction:column;justify-content:center}
.lp-demo-side img{width:56px;height:56px;border-radius:16px;background:#fff;margin-bottom:24px}
.lp-demo-side h3{font-family:'IBM Plex Sans Arabic',sans-serif;font-weight:700;font-size:28px;line-height:1.5;margin-bottom:14px}
.lp-demo-side p{font-size:15px;line-height:1.9;color:rgba(255,255,255,.75)}
.lp-demo-side .lp-btn-wa{align-self:flex-start}
.lp-demo-form{padding:44px}
.lp-demo-form h2{font-size:24px;font-weight:700;margin-bottom:6px}
.lp-demo-form>p{font-size:14.5px;color:var(--ink3);margin-bottom:24px}
.lp-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
.lp-fields label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:600;color:var(--ink2)}
.lp-fields .full{grid-column:1/-1}
.lp-fields input,.lp-fields select{width:100%;padding:13px 15px;border:1px solid var(--line);border-radius:14px;font:15px 'IBM Plex Sans Arabic',sans-serif;background:var(--cream);outline:none;transition:border-color .2s,box-shadow .2s;color:var(--ink)}
.lp-fields input:focus,.lp-fields select:focus{border-color:var(--teal2);box-shadow:0 0 0 4px rgba(32,54,64,.1);background:#fff}
.lp-agree{display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--ink3);margin-bottom:20px;cursor:pointer;line-height:1.6}
.lp-agree input{margin-top:4px;accent-color:var(--teal2)}
.lp-agree a{color:var(--teal2)}
.lp-msg{border-radius:12px;padding:11px 14px;margin-bottom:16px;font-size:13.5px;font-weight:600}
.lp-msg.ok{background:#ecfdf5;color:#047857}
.lp-msg.err{background:#fef2f2;color:#dc2626}

/* الأسئلة */
.lp-faq{background:#fff;border:1px solid var(--line);border-radius:16px;padding:6px 28px}
.lp-faq>div:last-child{border-bottom:none!important}

/* الدعوة */
.lp-cta{text-align:center;color:#fff;border-radius:20px;padding:84px 28px;margin-bottom:90px;background:radial-gradient(600px 300px at 50% 0%,rgba(163,145,127,.25),transparent 70%),linear-gradient(160deg,#2E4B58,#203640 60%,#16262D)}
.lp-cta h2{font-size:44px;line-height:1.4;margin-bottom:14px}
.lp-cta p{font-size:17px;color:rgba(255,255,255,.75);margin-bottom:34px}

/* التذييل */
.lp-footer{background:#16262D;color:#fff;padding:64px 0 30px}
.lp-foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:44px}
.lp-foot-tag{font-size:14px;color:rgba(255,255,255,.65);line-height:1.8;max-width:260px;margin-top:14px}
.lp-foot-title{font-size:13px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:14px}
.lp-foot-link{display:block;text-decoration:none;font-size:14.5px;color:rgba(255,255,255,.88);margin-bottom:10px}
.lp-foot-link:hover{color:var(--mint)}
.lp-foot-social{display:flex;gap:10px;margin-top:18px}
.lp-foot-social a{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.85);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);transition:background .2s,color .2s}
.lp-foot-social a:hover{background:rgba(255,255,255,.16);color:var(--mint)}
.lp-foot-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:13px}
.lp-foot-bottom small{display:block;color:rgba(255,255,255,.45);margin-top:6px;font-size:11.5px}
.lp-wa-float{position:fixed;bottom:24px;left:24px;z-index:999;width:56px;height:56px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 12px 26px -8px rgba(37,211,102,.55);transition:transform .2s}
.lp-wa-float:hover{transform:scale(1.08)}

/* الظهور عند التمرير */
.lp-anim .rv{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.lp-anim .rv.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.lp-marquee-track{animation-duration:80s}}

/* الشاشات */
.lp-mob{display:none}
@media(max-width:980px){
  .lp-hero-grid,.lp-split{grid-template-columns:1fr;gap:48px}
  .lp-split-rev>:first-child{order:0}
  .lp-display{font-size:46px}
  .lp-h2{font-size:34px}
  .lp-feats,.lp-plans{grid-template-columns:1fr 1fr}
  .lp-demo{grid-template-columns:1fr}
  .lp-foot-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:720px){
.lp-partner-grid{gap:10px}
.lp-partner{width:calc((100% - 20px)/3)}
.lp-partner-logo{border-radius:14px;padding:8px}
.lp-partner-name{font-size:11.5px}
  .lp-desk{display:none!important}
  .lp-mob{display:block}
  .lp-wrap{padding:0 18px}
  .lp-display{font-size:36px}
  .lp-lead{font-size:16px}
  .lp-h2{font-size:29px}
  .lp-section,.lp-how{padding:56px 0}
  .lp-how{margin:0 10px;border-radius:16px}
  .lp-feats,.lp-plans{grid-template-columns:1fr}
  /* المزايا على الجوال: سطر مضغوط — الأيقونة جنب العنوان والوصف */
  .lp-feats{gap:10px}
  .lp-feat{display:grid;grid-template-columns:40px 1fr;column-gap:12px;padding:16px;border-radius:16px}
  .lp-feat-ic{width:40px;height:40px;border-radius:12px;margin:0;grid-row:span 2}
  .lp-feat h3{font-size:16px;margin-bottom:4px}
  .lp-feat p{font-size:13.5px;line-height:1.75}
  .lp-stats{grid-template-columns:1fr 1fr}
  .lp-stats>div:nth-child(2){border-left:none}
  .lp-stats>div:nth-child(-n+2){border-bottom:1px solid var(--line)}
  .lp-halo{width:300px;height:300px}
  .lp-phone{width:240px}
  .lp-fields{grid-template-columns:1fr}
  .lp-demo-form,.lp-demo-side{padding:30px 22px}
  .lp-cta{border-radius:16px;padding:60px 20px}
  .lp-cta h2{font-size:32px}
  .lp-cta-row .lp-btn{width:100%}
  .lp-foot-grid{grid-template-columns:1fr}
  .lp-note{left:14px;bottom:-22px}
}
`
