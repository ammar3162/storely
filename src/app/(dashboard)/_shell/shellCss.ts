import { C } from './nav'

// إطار لوحة المالك بأسلوب أبل (2026-11-17): خط أبل من النظام، شريط علوي شفاف بالضبابية، قائمة جانبية فاتحة
// والعنصر المختار حبة رمادية بنص كحلي، وشريط سفلي على الجوال مثل الآيفون (الأيقونة المختارة كحلية).
// الألوان كلها من رموز النظام (var(--storely-*)) فيتبعها الوضع الليلي تلقائياً.
export const SHELL_CSS = `
  .sh-root{font-family:var(--storely-font);direction:rtl;min-height:100vh;background:${C.bg};color:${C.text}}
  .sh-root *{box-sizing:border-box}
  @keyframes spin{to{transform:rotate(360deg)}}
  .sh-loading{display:flex;align-items:center;justify-content:center;min-height:60vh}
  .sh-spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.primary};border-radius:50%;animation:spin .8s linear infinite}

  .sh-logo{width:32px;height:32px;border-radius:8px;object-fit:cover;border:1px solid ${C.border};background:white;flex-shrink:0}
  .sh-avatar{width:34px;height:34px;border-radius:50%;background:var(--storely-fill);color:${C.text};border:none;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;cursor:pointer;font-family:inherit}
  .sh-icon-btn{position:relative;width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:${C.text};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
  .sh-icon-btn:hover{background:var(--storely-fill)}
  .sh-icon-sm{width:34px;height:34px}
  .sh-dot{position:absolute;top:8px;right:9px;width:8px;height:8px;border-radius:50%;background:${C.danger};border:1.5px solid white}
  .sh-count{min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:var(--storely-fill);color:${C.text};font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center}
  .sh-count-float{position:absolute;top:-6px;right:-10px;background:${C.danger};color:white;min-width:18px;height:18px;font-size:11px;border:1.5px solid white}

  .sh-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:8px 18px;border-radius:999px;border:1px solid transparent;background:var(--storely-fill);color:${C.text};font-size:15px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;transition:background-color .15s}
  .sh-btn:hover:not(:disabled){background:var(--storely-control-border)}
  .sh-btn:disabled{opacity:.55;cursor:not-allowed}
  .sh-btn-sm{min-height:32px;padding:5px 14px;font-size:14px}
  .sh-btn-primary{background:${C.primary};border-color:${C.primary};color:white}
  .sh-btn-primary:hover:not(:disabled){background:${C.primaryD}}
  .sh-btn-danger{color:${C.danger};background:${C.dangerL};border-color:transparent}
  .sh-btn-danger:hover:not(:disabled){background:${C.dangerL}}
  .sh-btn-ghost{border-color:transparent;background:transparent;color:${C.primary}}

  /* عناوين مجموعات القائمة: نص صغير بدون نقاط ولا خطوط */
  .sh-group-label{display:block;font-size:13px;font-weight:600;color:${C.text3};padding:14px 12px 6px}
  .sh-nav{--nt:${C.primary};position:relative;width:100%;display:flex;align-items:center;gap:10px;min-height:38px;padding:8px 12px;border-radius:10px;border:none;background:transparent;color:${C.text};font-size:15px;font-weight:400;font-family:inherit;cursor:pointer;text-align:start;margin-bottom:2px;transition:background-color .15s,color .15s}
  .sh-nav svg{color:${C.text3};flex-shrink:0;transition:color .15s}
  .sh-nav:hover{background:var(--storely-fill)}
  .sh-nav.on{background:var(--storely-fill);color:var(--nt);font-weight:600}
  .sh-nav.on svg{color:var(--nt)}
  .sh-nav-scroll{flex:1;overflow-y:auto;padding:4px 10px 12px}

  .sh-branch{margin-top:12px;width:100%;display:flex;align-items:center;gap:8px;min-height:40px;padding:8px 12px;border:none;border-radius:12px;background:var(--storely-fill);color:${C.text};font-size:15px;font-weight:500;font-family:inherit;cursor:pointer}
  .sh-branch:disabled{cursor:default}
  .sh-branch:hover:not(:disabled){background:var(--storely-control-border)}
  .sh-branch-inline{display:inline-flex;align-items:center;gap:3px;max-width:100%;min-width:0;padding:0;border:none;background:none;color:${C.text3};font-size:13px;font-weight:500;font-family:inherit;cursor:pointer}
  .sh-branch-inline:disabled{cursor:default}

  .sh-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;margin-bottom:16px;border-radius:14px;border:0;background:${C.surface};color:${C.text};font-size:15px}
  .sh-banner-quiet{background:${C.surface}}
  .sh-link-btn{background:none;border:none;padding:0;font:inherit;font-weight:600;color:${C.primary};cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  .sh-banner-warn{background:#fffaeb}

  .sh-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--storely-font);direction:rtl}
  .sh-modal{background:${C.surface};border-radius:22px;width:100%;max-height:calc(100dvh - 40px);overflow-y:auto;padding:24px;box-shadow:var(--storely-panel-shadow)}
  .sh-sheet-wrap{align-items:flex-end;padding:0}
  .sh-sheet{background:${C.surface};border-radius:22px 22px 0 0;width:100%;max-width:560px;padding:12px 16px calc(24px + env(safe-area-inset-bottom));max-height:90dvh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;animation:shUp .22s ease}
  @keyframes shUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}

  /* الجوال: شريط علوي وسفلي شفافان بالضبابية مثل الآيفون */
  .desk-layout{display:none}
  .mob-layout{display:flex;flex-direction:column;min-height:100vh}
  .mob-header{position:fixed;top:0;right:0;left:0;z-index:100;display:flex;align-items:center;gap:10px;height:56px;padding:0 12px 0 14px;background:rgba(255,255,255,.82);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px);border-bottom:1px solid ${C.border}}
  .mob-content{flex:1;padding:16px 14px 92px;margin-top:56px}
  .mob-bottom-nav{position:fixed;bottom:0;right:0;left:0;z-index:100;display:flex;background:rgba(255,255,255,.86);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px);border-top:1px solid ${C.border};padding-bottom:env(safe-area-inset-bottom)}
  .sh-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:52px;padding:7px 2px 6px;border:none;background:none;color:${C.text3};font-size:11px;font-weight:500;font-family:inherit;cursor:pointer}
  .sh-tab.on{color:${C.primary};font-weight:600}

  /* القائمة الجانبية على الكمبيوتر بالكحلي (طلب المالك 2026-11-17: «نفس اللون الأول»):
     نص أبيض، والعنصر المختار حبة بيضاء بنص كحلي — بخط أبل ومقاساته */
  .desk-sidebar .sh-group-label{color:rgba(255,255,255,.6)}
  .desk-sidebar .sh-nav{color:rgba(255,255,255,.9)}
  .desk-sidebar .sh-nav svg{color:rgba(255,255,255,.65)}
  .desk-sidebar .sh-nav:hover{background:rgba(255,255,255,.08);color:#fff}
  .desk-sidebar .sh-nav:hover svg{color:#fff}
  .desk-sidebar .sh-nav.on{background:#fff;color:${C.primary};font-weight:600}
  .desk-sidebar .sh-nav.on svg{color:${C.primary}}
  .desk-sidebar .sh-count{background:rgba(255,255,255,.14);color:#fff}
  .desk-sidebar .sh-nav.on .sh-count{background:var(--storely-fill);color:${C.primary}}
  .desk-sidebar .sh-logo{border-color:rgba(255,255,255,.2)}
  .desk-sidebar .sh-branch{background:rgba(255,255,255,.08);color:rgba(255,255,255,.92)}
  .desk-sidebar .sh-branch:hover:not(:disabled){background:rgba(255,255,255,.14)}
  .desk-sidebar .sh-avatar{background:rgba(255,255,255,.14);color:#fff}
  .desk-sidebar .sh-icon-btn{color:rgba(255,255,255,.75)}
  .desk-sidebar .sh-icon-btn:hover{background:rgba(255,255,255,.1);color:#fff}
  .desk-sidebar :focus-visible{outline:2px solid #fff;outline-offset:2px}

  /* الكمبيوتر: قائمة جانبية كحلية وشريط علوي شفاف */
  @media(min-width:768px){
    .mob-layout{display:none}
    .desk-layout{display:block;min-height:100vh}
    .desk-sidebar{position:fixed;top:0;right:0;bottom:0;width:248px;display:flex;flex-direction:column;background:${C.primary};color-scheme:dark;z-index:100}
    .desk-topbar{position:fixed;top:0;right:248px;left:0;height:56px;z-index:99;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:rgba(255,255,255,.82);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px);border-bottom:1px solid ${C.border}}
    .desk-content{margin-right:248px;padding:80px 32px 48px;min-height:100vh;max-width:calc(100vw - 248px)}
  }
`
