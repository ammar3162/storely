// أقسام الصفحة الرئيسية بأسلوب أبل (2026-11-17) — طبقة فوق LP_CSS وبنفس رموزها: أبيض، رملي، كحلي، والنقطة النعناعية فقط
export const AP_CSS = `
.ap-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--mint);flex-shrink:0}

/* الواجهة: الفيديو في الوسط وشاشتان حقيقيتان تطلعان من أسفل البلاطة */
.ap-hero{background:var(--sand);text-align:center;padding:72px 20px 0;overflow:hidden}
.ap-hero h1{font-size:clamp(42px,6.6vw,88px);font-weight:700;line-height:1.1;color:var(--navy);overflow-wrap:break-word;min-width:0}
.ap-lead{font-size:clamp(19px,1.9vw,26px);line-height:1.55;color:var(--ink2);max-width:720px;margin:18px auto 0}
.ap-acts{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:30px}
.ap-note{font-size:14.5px;color:var(--ink2);margin-top:16px}
.ap-alt{border:0;background:none;font:500 15px var(--font);color:var(--navy);cursor:pointer;margin-top:10px;min-height:44px;padding:0 8px;text-decoration:underline;text-decoration-color:var(--hair);text-underline-offset:6px}
.ap-alt:hover{text-decoration-color:var(--navy)}
.ap-stage{position:relative;height:clamp(470px,46vw,650px);max-width:1000px;margin:52px auto 0}
.ap-video,.ap-side{position:absolute;bottom:0;border-radius:36px 36px 0 0;overflow:hidden;box-shadow:var(--shot-shadow)}
.ap-video{width:clamp(256px,24vw,336px);aspect-ratio:9/16;left:50%;transform:translateX(-50%);bottom:-14%;z-index:3;background:var(--navy);border-radius:36px}
.ap-video video,.ap-video .ap-cover,.ap-video .ap-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ap-cover{border:0;padding:0;cursor:pointer;background:var(--navy)}
.ap-play{position:absolute;inset:0;margin:auto;width:76px;height:76px;border-radius:50%;background:var(--white);color:var(--navy);display:grid;place-items:center;box-shadow:var(--play-shadow);transition:transform .2s var(--ease)}
.ap-cover:hover .ap-play{transform:scale(1.05)}
.ap-cover:active .ap-play{transform:scale(.96)}
.ap-side{width:clamp(200px,19vw,268px);background:var(--white);z-index:2}
.ap-side img{width:100%}
.ap-side-r{right:calc(50% - clamp(256px,24vw,336px)/2 - clamp(150px,14vw,210px));bottom:-24%}
.ap-side-l{left:calc(50% - clamp(256px,24vw,336px)/2 - clamp(150px,14vw,210px));bottom:-24%}

/* عملاء حقيقيون */
.ap-cust{padding:56px 0 8px;text-align:center}
.ap-cust h2{font-size:15px;font-weight:500;color:var(--ink2)}
.ap-logos{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:28px 40px;margin-top:24px}
.ap-logos li{display:flex;flex-direction:column;align-items:center;gap:8px;width:96px}
.ap-logos img{width:64px;height:64px;object-fit:contain;border-radius:16px;background:var(--white);border:1px solid var(--hair)}
.ap-logos span{font-size:13px;color:var(--ink2);line-height:1.4}

/* يوم واحد: بلاطات تتبادل الكحلي والرملي، وفي كل بلاطة شاشة حقيقية */
.ap-intro{text-align:center;padding:96px 24px 44px}
.ap-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:0 12px}
.ap-tile{position:relative;overflow:hidden;text-align:center;padding:60px 28px 0;display:flex;flex-direction:column;align-items:center}
.ap-wide{grid-column:1 / -1}
.ap-navy{background:var(--navy);color:var(--on-navy)}
.ap-sandt{background:var(--sand);color:var(--navy)}
.ap-time{display:inline-flex;align-items:center;gap:8px;font-size:16px;font-weight:500}
.ap-navy .ap-time{color:var(--on-navy2)}
.ap-sandt .ap-time{color:var(--ink2)}
.ap-tile h3{font-size:clamp(30px,3.4vw,48px);font-weight:700;line-height:1.18;margin-top:10px;max-width:16ch}
.ap-wide h3{max-width:22ch}
.ap-tile p{font-size:clamp(17px,1.5vw,21px);line-height:1.6;margin-top:12px;max-width:560px}
.ap-navy p{color:var(--on-navy2)}
.ap-sandt p{color:var(--ink2)}
.ap-shot{margin-top:40px;width:min(300px,74vw);height:clamp(360px,34vw,470px);border-radius:34px 34px 0 0;overflow:hidden;background:var(--white);box-shadow:var(--shot-shadow)}
.ap-wide .ap-shot{width:min(330px,76vw);height:clamp(380px,38vw,520px)}
.ap-shot img{width:100%}

/* السلسلة: خمس حلقات تربطها النقطة النعناعية، والنتيجة شاشة المالك */
.ap-chain{padding:104px 0 96px}
.ap-flow{list-style:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px;position:relative;margin-top:8px}
.ap-flow::before{content:'';position:absolute;top:7px;right:10%;left:10%;height:2px;background:var(--hair)}
.ap-flow li{position:relative;text-align:center;padding-top:34px}
.ap-flow li::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:16px;height:16px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 6px var(--white)}
.ap-flow b{display:block;font-size:20px;font-weight:600;color:var(--navy)}
.ap-flow span{display:block;font-size:15.5px;line-height:1.65;color:var(--ink2);margin-top:6px}
.ap-desk{margin:64px auto 0;max-width:1040px;border-radius:22px;overflow:hidden;border:1px solid var(--hair);box-shadow:var(--desk-shadow)}
.ap-desk img{width:100%}
.ap-cap{text-align:center;font-size:14.5px;color:var(--ink2);margin-top:16px}

/* الأدوار: مقارنة مثل «قارن الطرازات» — أعمدة على الكمبيوتر وسحب جانبي على الجوال */
.ap-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.ap-role{background:var(--sand);border-radius:28px;padding:32px 24px 0;overflow:hidden;display:flex;flex-direction:column;text-align:center;align-items:center}
.ap-role h3{font-size:26px;font-weight:700;color:var(--navy)}
.ap-role ul{list-style:none;margin-top:16px;display:grid;gap:10px;text-align:start;width:100%}
.ap-role li{display:flex;gap:10px;align-items:baseline;font-size:16px;line-height:1.55;color:var(--ink2)}
.ap-role li .ap-dot{transform:translateY(-2px)}
.ap-role .ap-shot{margin-top:28px;width:min(220px,80%);height:300px;border-radius:28px 28px 0 0}

/* من نحن: بلاطة كحلية */
.ap-about{background:var(--navy);color:var(--on-navy);padding:104px 0}
.ap-about .lp-h2{color:var(--on-navy)}
.ap-about-body{max-width:780px;margin:0 auto;text-align:center}
.ap-about-body p{font-size:clamp(18px,1.7vw,22px);line-height:1.85;color:var(--on-navy2);margin-top:18px}
.ap-principles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:56px}
.ap-principles div{border-top:1px solid var(--hair-dark);padding-top:20px}
.ap-principles dt{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:600}
.ap-principles dd{font-size:15.5px;line-height:1.7;color:var(--on-navy2);margin-top:8px}

/* ابدأ: بلاطة رملية بالسعر المعلن */
.ap-start{background:var(--sand);text-align:center;padding:96px 24px}
.ap-price{display:flex;align-items:baseline;justify-content:center;gap:10px;margin-top:26px;color:var(--navy)}
.ap-price b{font-size:clamp(72px,9vw,120px);font-weight:700;line-height:1}
.ap-price span{font-size:20px;color:var(--ink2)}
.ap-per{font-size:18px;color:var(--ink2);margin-top:8px}
.ap-ticks{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:12px 26px;margin-top:28px}
.ap-ticks li{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--navy)}
.ap-steps{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:980px;margin:48px auto 0;counter-reset:s}
.ap-steps li{background:var(--white);border-radius:22px;padding:24px;text-align:start;display:flex;gap:14px;align-items:center;font-size:17px;color:var(--navy)}
.ap-steps li::before{counter-increment:s;content:counter(s);width:36px;height:36px;border-radius:50%;background:var(--navy);color:var(--on-navy);display:grid;place-items:center;font-size:15px;font-weight:600;flex-shrink:0}

@media (max-width:980px){
  .ap-roles{grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:minmax(260px,76%);overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;padding:0 20px 8px;margin:0 -20px;scrollbar-width:none}
  .ap-roles::-webkit-scrollbar{display:none}
  .ap-role{scroll-snap-align:center}
  .ap-principles{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .ap-steps{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:720px){
  .ap-hero{padding-top:52px}
  .ap-stage{height:470px;margin-top:40px}
  .ap-video{width:236px;bottom:-12%}
  .ap-side{width:178px}
  .ap-side-r{right:calc(50% - 118px - 74px);bottom:-30%}
  .ap-side-l{left:calc(50% - 118px - 74px);bottom:-30%}
  .ap-play{width:64px;height:64px}
  .ap-intro{padding:72px 20px 32px}
  .ap-grid{grid-template-columns:minmax(0,1fr);padding:0;gap:12px}
  .ap-tile{padding:52px 20px 0}
  .ap-shot,.ap-wide .ap-shot{width:min(270px,74vw);height:380px}
  .ap-chain{padding:72px 0 64px}
  .ap-flow{grid-template-columns:minmax(0,1fr);gap:0;max-width:420px;margin-inline:auto}
  .ap-flow::before{top:8px;bottom:8px;right:7px;left:auto;width:2px;height:auto}
  .ap-flow li{text-align:start;padding:0 40px 28px 0}
  .ap-flow li::before{top:2px;right:0;left:auto;transform:none}
  .ap-desk{margin-top:36px;border-radius:14px}
  .ap-about{padding:72px 0}
  .ap-principles{grid-template-columns:minmax(0,1fr);margin-top:40px}
  .ap-start{padding:72px 20px}
  .ap-acts .lp-btn{flex:1 1 auto}
}
`
