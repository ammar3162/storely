// الصفحة التعريفية المتسلسلة (2026-11-17) — طبقة فوق LP_CSS: نفس الهوية (كحلي + رملي + لمسة تركواز)، بلا تدرجات ولا توهج
export const ST_CSS = `
.lp{--st-ink:var(--ink);--st-ink2:var(--ink2);--st-ink3:var(--ink3);--st-bg:var(--cream);--st-card:#FFFFFF;--st-sand:#F4EFE6;--st-paper:#FBFAF6;
  --st-teal:#1F7F74;--st-hair:rgba(32,54,64,.10);--st-hair2:rgba(32,54,64,.18);--st-on-ink:#FFFFFF;--st-shadow:rgba(32,54,64,.55);--st-shadow2:rgba(32,54,64,.45);--st-r1:10px;--st-r2:16px;--st-r3:20px;
  --st-font:'IBM Plex Sans Arabic',system-ui,sans-serif;--st-ease:cubic-bezier(.2,.7,.2,1)}
html,body{overflow-x:clip}
.lp a:focus-visible,.lp button:focus-visible,.lp input:focus-visible,.lp select:focus-visible,.lp textarea:focus-visible{outline:2px solid var(--st-teal);outline-offset:2px}
.st-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}

/* شريط الإعلانات: سطر ثابت */
.lp-marquee{justify-content:center;padding:0 16px}
.st-announce{min-width:0;color:var(--st-on-ink);font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}

/* الواجهة */
.st-hero{padding-bottom:48px;background:var(--st-bg)}
.st-hero-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:64px;align-items:center}
.st-display{font-family:var(--st-font);font-weight:600;font-size:clamp(36px,4.6vw,58px);line-height:1.28;color:var(--st-ink);margin-bottom:20px;overflow-wrap:break-word;min-width:0}
.st-lead{font-size:19px;line-height:1.85;color:var(--st-ink2);max-width:520px;margin-bottom:32px}
.st-actions{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
.st-textlink{font-size:15.5px;font-weight:600;color:var(--st-ink);text-decoration:underline;text-decoration-color:var(--st-hair2);text-underline-offset:6px;transition:text-decoration-color .15s var(--st-ease)}
.st-textlink:hover{text-decoration-color:var(--st-ink)}
.st-ticks{list-style:none;display:flex;gap:20px;flex-wrap:wrap;margin-top:28px}
.st-ticks li{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--st-ink3)}
.st-ticks svg{color:var(--st-teal);flex-shrink:0}
.st-ticks-col{flex-direction:column;gap:12px}
.st-hero-media{display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.st-player{position:relative;width:min(340px,78vw);aspect-ratio:9/16;border-radius:var(--st-r3);background:var(--st-ink);overflow:hidden;box-shadow:0 30px 60px -36px var(--st-shadow)}
.st-player video,.st-player img{width:100%;height:100%;object-fit:cover;display:block}
.st-player-cover{position:absolute;inset:0;width:100%;height:100%;border:0;padding:0;cursor:pointer;background:none}
.st-player-btn{position:absolute;inset:0;margin:auto;width:64px;height:64px;border-radius:50%;background:var(--st-card);color:var(--st-ink);display:grid;place-items:center;transition:transform .15s var(--st-ease)}
.st-player-cover:hover .st-player-btn{transform:scale(1.04)}
.st-player-cover:active .st-player-btn{transform:scale(.97)}
.st-vid-tabs{display:flex;gap:6px;padding:4px;border:1px solid var(--st-hair);border-radius:12px;background:var(--st-card)}
.st-vid-tabs button{min-height:44px;display:flex;gap:8px;align-items:center;border:0;background:none;padding:8px 12px;border-radius:8px;font:500 13.5px var(--st-font);color:var(--st-ink2);cursor:pointer;transition:background-color .15s var(--st-ease),color .15s var(--st-ease)}
.st-vid-tabs button.on{background:var(--st-bg);color:var(--st-ink);box-shadow:inset 0 0 0 1px var(--st-hair)}
.st-vid-tabs .st-num{color:var(--st-ink3);font-size:12.5px}

/* العملاء */
.st-customers{padding:8px 0 72px}
.st-small-title{font-size:14px;font-weight:500;color:var(--st-ink3);margin-bottom:20px}
.st-logo-row{list-style:none;display:flex;flex-wrap:wrap;gap:16px}
.st-logo-row li{display:flex;flex-direction:column;align-items:center;gap:8px;width:104px}
.st-logo{width:104px;height:104px;border-radius:var(--st-r2);background:var(--st-card);border:1px solid var(--st-hair);padding:10px;display:grid;place-items:center}
.st-logo img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}
.st-logo-name{font-size:12.5px;color:var(--st-ink3);text-align:center;line-height:1.4}

/* الأقسام */
.st-section{padding:96px 0}
.st-band{background:var(--st-sand)}
.st-head{max-width:640px;margin-bottom:44px}
.st-h2{font-family:var(--st-font);font-weight:600;font-size:clamp(28px,3.2vw,40px);line-height:1.35;color:var(--st-ink);margin-bottom:12px;overflow-wrap:break-word;min-width:0}
.st-sub{font-size:17px;line-height:1.85;color:var(--st-ink2)}

/* يوم في مطعمك */
.st-day{list-style:none;border-top:1px solid var(--st-hair2)}
.st-day-row{display:grid;grid-template-columns:120px minmax(0,1fr) minmax(0,1fr);gap:32px;padding:24px 0;border-bottom:1px solid var(--st-hair)}
.st-day-time{font-size:15px;font-weight:600;color:var(--st-ink);padding-top:2px}
.st-day-label{display:block;font-size:13px;color:var(--st-ink3);margin-bottom:6px}
.st-day-was p{font-size:17px;line-height:1.7;color:var(--st-ink)}
.st-day-now .st-day-label{color:var(--st-teal)}
.st-day-now p{font-size:16px;line-height:1.75;color:var(--st-ink2)}

/* السلسلة + السند */
.st-chain-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:64px;align-items:center}
.st-chain{list-style:none;margin-top:32px;position:relative}
.st-chain li{display:flex;gap:16px;align-items:flex-start;padding:14px 0;position:relative}
.st-chain li:not(:last-child)::after{content:'';position:absolute;inset-inline-start:17px;top:52px;bottom:-14px;border-inline-start:1px dashed var(--st-hair2)}
.st-chain-ic{width:36px;height:36px;border-radius:var(--st-r1);border:1px solid var(--st-hair2);background:var(--st-card);color:var(--st-ink);display:grid;place-items:center;flex-shrink:0}
.st-chain b{display:block;font-size:17px;font-weight:600;margin-bottom:2px}
.st-chain p{font-size:15.5px;line-height:1.7;color:var(--st-ink2)}
.st-receipt-wrap{display:flex;flex-direction:column;align-items:center;gap:12px}
.st-receipt-wrap figcaption{font-size:13px;color:var(--st-ink2)}
.st-receipt{width:min(340px,100%);background:var(--st-paper);padding:28px 24px 30px;color:var(--st-ink);box-shadow:0 24px 40px -30px var(--st-shadow2);
  -webkit-mask:radial-gradient(circle 6px at 8px 0,#0000 98%,#000) top/16px 51% repeat-x,radial-gradient(circle 6px at 8px 100%,#0000 98%,#000) bottom/16px 51% repeat-x;
  mask:radial-gradient(circle 6px at 8px 0,#0000 98%,#000) top/16px 51% repeat-x,radial-gradient(circle 6px at 8px 100%,#0000 98%,#000) bottom/16px 51% repeat-x}
.st-receipt-head{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:14px;margin-bottom:10px;border-bottom:1px dashed var(--st-hair2)}
.st-receipt-head b{font-size:16px;font-weight:600}
.st-receipt-head span{font-size:13px;color:var(--st-ink3)}
.st-receipt-rows>div{display:flex;justify-content:space-between;gap:12px;padding:7px 0;font-size:15px}
.st-receipt-rows dt{color:var(--st-ink2)}
.st-receipt-rows dd small{font-size:12px;color:var(--st-ink3)}
.st-receipt-rows .st-rule{border-top:1px dashed var(--st-hair2);margin-top:6px;padding-top:12px}
.st-receipt-rows .st-total{border-top:1px solid var(--st-ink);margin-top:8px;padding-top:12px;font-weight:600}
.st-receipt-rows .st-total dt{color:var(--st-ink)}
.st-receipt-ok{margin-top:16px;font-size:14px;font-weight:600;color:var(--st-teal)}

/* الأدوار */
.st-role-tabs{display:inline-flex;flex-wrap:wrap;gap:4px;padding:4px;border:1px solid var(--st-hair);border-radius:12px;background:var(--st-card);margin-bottom:28px}
.st-role-tabs button{min-height:44px;border:0;background:none;padding:10px 18px;border-radius:9px;font:500 15px var(--st-font);color:var(--st-ink2);cursor:pointer;transition:background-color .15s var(--st-ease),color .15s var(--st-ease)}
.st-foot-brand{color:var(--st-on-ink)}
.lp h1,.lp h2,.lp h3{text-wrap:balance}
.lp p{text-wrap:pretty}
.lp-agree a{white-space:nowrap}
.lp .lp-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.st-role-tabs button.on{background:var(--st-ink);color:var(--st-on-ink)}
.st-role-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:center}
.st-role-points{list-style:none;display:flex;flex-direction:column;gap:16px}
.st-role-points li{display:flex;gap:10px;align-items:center;font-size:18px;color:var(--st-ink)}
.st-role-points svg{color:var(--st-teal);flex-shrink:0}
.st-pv{background:var(--st-card);border:1px solid var(--st-hair);border-radius:var(--st-r2);padding:20px;display:flex;flex-direction:column;gap:12px;max-width:420px;width:100%;position:relative}
.st-pv-title{font-size:15px;font-weight:600;color:var(--st-ink)}
.st-pv-list>div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--st-hair);font-size:15px}
.st-pv-list>div:last-child{border-bottom:0}
.st-pv-list dt{color:var(--st-ink2)}
.st-pv-list dd small{font-size:12px;color:var(--st-ink3)}
.st-pv-list .st-total{font-weight:600}
.st-pv-wa{border-start-start-radius:4px}
.st-pv-time{position:absolute;inset-block-end:10px;inset-inline-end:14px;font-size:12px;color:var(--st-ink3)}
.st-pv-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--st-hair);border-radius:12px}
.st-pv-item b{display:block;font-size:15px;font-weight:600}
.st-pv-item span{font-size:13px;color:var(--st-ink3)}
.st-pv-btn{font-size:13px;font-weight:600;color:var(--st-on-ink)!important;background:var(--st-ink);border-radius:8px;padding:6px 12px}

/* من نحن */
.st-about{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:64px;align-items:start}
.st-about-text p{font-size:17.5px;line-height:1.95;color:var(--st-ink2);margin-top:14px;max-width:620px}
.st-principles{border-top:1px solid var(--st-hair2)}
.st-principles>div{padding:18px 0;border-bottom:1px solid var(--st-hair)}
.st-principles dt{font-size:17px;font-weight:600;color:var(--st-ink);margin-bottom:4px}
.st-principles dd{font-size:15.5px;line-height:1.75;color:var(--st-ink2)}

/* ابدأ */
.st-start{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:64px;align-items:center}
.st-price{display:flex;align-items:baseline;gap:10px;margin-top:8px;color:var(--st-ink)}
.st-price span{font-size:17px;color:var(--st-ink2)}
.st-price b{font-size:56px;font-weight:600;line-height:1}
.st-start .st-sub{margin-bottom:8px}
.st-start .st-actions{margin-top:28px}
.st-steps{list-style:none;display:flex;flex-direction:column;gap:12px}
.st-steps li{display:flex;align-items:center;gap:16px;padding:18px 20px;background:var(--st-card);border:1px solid var(--st-hair);border-radius:var(--st-r2)}
.st-steps .st-num{width:32px;height:32px;border-radius:50%;border:1px solid var(--st-hair2);display:grid;place-items:center;font-weight:600;font-size:14px;flex-shrink:0}
.st-steps p{font-size:16.5px;color:var(--st-ink)}

/* الدعوة الأخيرة وطلب العرض: لون واحد بدون تدرّج */
.lp-cta{background:var(--st-ink);margin-top:24px}
.lp-cta h2{font-weight:600}
.lp-demo-side{background:var(--st-ink)}
.lp-demo{box-shadow:none}
#demo{scroll-margin-top:96px}

@media (max-width:980px){
  .st-hero-grid,.st-chain-grid,.st-role-panel,.st-about,.st-start{grid-template-columns:minmax(0,1fr);gap:40px}
  .st-hero-media{order:2;align-items:center}
  .st-day-row{grid-template-columns:minmax(0,1fr);gap:8px}
  .st-section{padding:72px 0}
}
@media (max-width:720px){
  .st-logo-row li{width:84px}.st-logo{width:84px;height:84px}
  .st-lead{font-size:17px}
  .st-role-tabs{display:flex;width:100%}
  .st-role-tabs button{flex:1 1 auto;padding:10px 8px;font-size:14px}
}
@media (prefers-reduced-motion:reduce){
  .lp *,.lp *::before,.lp *::after{transition:none!important;animation:none!important}
  html{scroll-behavior:auto}
}
`
