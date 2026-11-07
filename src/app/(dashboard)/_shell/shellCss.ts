import { C } from './nav'

export const SHELL_CSS = `
  .sh-root{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;direction:rtl;min-height:100vh;background:${C.bg}}
  .sh-root *{box-sizing:border-box}
  @keyframes spin{to{transform:rotate(360deg)}}
  .sh-loading{display:flex;align-items:center;justify-content:center;min-height:60vh}
  .sh-spinner{width:28px;height:28px;border:3px solid ${C.border};border-top-color:${C.primary};border-radius:50%;animation:spin .8s linear infinite}

  .sh-logo{width:32px;height:32px;border-radius:8px;object-fit:cover;border:1px solid ${C.border};background:white;flex-shrink:0}
  .sh-avatar{width:32px;height:32px;border-radius:50%;background:${C.primaryL};color:${C.primary};border:none;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;cursor:pointer;font-family:inherit}
  .sh-icon-btn{position:relative;width:38px;height:38px;border-radius:8px;border:none;background:transparent;color:${C.text3};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
  .sh-icon-btn:hover{background:#f2f4f7;color:${C.text}}
  .sh-icon-sm{width:32px;height:32px}
  .sh-dot{position:absolute;top:8px;right:9px;width:7px;height:7px;border-radius:50%;background:${C.danger};border:1.5px solid white}
  .sh-count{min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:#f2f4f7;color:${C.text2};font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
  .sh-count-float{position:absolute;top:-6px;right:-10px;background:${C.danger};color:white;min-width:17px;height:17px;font-size:10px;border:1.5px solid white}

  .sh-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;border-radius:8px;border:1px solid ${C.border2};background:${C.surface};color:${C.text};font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap}
  .sh-btn:hover:not(:disabled){background:#f9fafb}
  .sh-btn:disabled{opacity:.55;cursor:not-allowed}
  .sh-btn-sm{padding:6px 11px;font-size:12.5px}
  .sh-btn-primary{background:${C.primary};border-color:${C.primary};color:white}
  .sh-btn-primary:hover:not(:disabled){background:${C.primaryD}}
  .sh-btn-danger{color:${C.danger};border-color:#fecdca}
  .sh-btn-danger:hover:not(:disabled){background:${C.dangerL}}
  .sh-btn-ghost{border-color:transparent;background:transparent;color:${C.text3}}

  .sh-group-label{--nt:${C.primary};display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:${C.text2};padding:6px 10px 7px;letter-spacing:.1px}
  .sh-group-label::before{content:'';width:7px;height:7px;border-radius:50%;flex-shrink:0;background:var(--nt);box-shadow:0 0 0 3px color-mix(in srgb,var(--nt) 16%,transparent)}
  .sh-group-label::after{content:'';flex:1;height:1px;background:${C.border}}
  .sh-nav{--nt:${C.primary};--nb:${C.primaryL};position:relative;width:100%;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;border:none;background:transparent;color:${C.text2};font-size:13.5px;font-weight:500;font-family:inherit;cursor:pointer;text-align:right;margin-bottom:1px;transition:background .15s,color .15s}
  .sh-nav svg{color:${C.text4};flex-shrink:0;transition:color .15s}
  .sh-nav:hover{background:#f4f5f7;color:${C.text}}
  .sh-nav:hover svg{color:var(--nt)}
  .sh-nav.on{background:var(--nb);color:var(--nt);font-weight:600}
  .sh-nav.on svg{color:var(--nt)}
  .sh-nav.on::before{content:'';position:absolute;right:-10px;top:8px;bottom:8px;width:3px;border-radius:3px 0 0 3px;background:var(--nt)}
  .sh-nav-scroll{flex:1;overflow-y:auto;padding:4px 10px 12px}

  /* القائمة الجانبية على الكمبيوتر — فيروزي غامق */
  .desk-sidebar .sh-group-label{color:#8fbdb5}
  .desk-sidebar .sh-group-label::before{background:var(--ns,#99e0d6);box-shadow:0 0 0 3px rgba(255,255,255,.07)}
  .desk-sidebar .sh-group-label::after{background:rgba(255,255,255,.1)}
  .desk-sidebar .sh-nav{color:#d3ebe7}
  .desk-sidebar .sh-nav svg{color:#86b8b0}
  .desk-sidebar .sh-nav:hover{background:rgba(255,255,255,.07);color:#fff}
  .desk-sidebar .sh-nav:hover svg{color:var(--ns,#fff)}
  .desk-sidebar .sh-nav.on{background:#fff;color:var(--nt);box-shadow:0 2px 8px -2px rgba(0,0,0,.25)}
  .desk-sidebar .sh-nav.on svg{color:var(--nt)}
  .desk-sidebar .sh-nav.on::before{background:var(--ns,#fff)}
  .desk-sidebar .sh-count{background:rgba(255,255,255,.14);color:#fff}
  .desk-sidebar .sh-nav.on .sh-count{background:var(--nb);color:var(--nt)}
  .desk-sidebar .sh-logo{border-color:rgba(255,255,255,.2)}
  .desk-sidebar .sh-branch{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);color:#e2f3f0}
  .desk-sidebar .sh-branch:hover:not(:disabled){background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22)}
  .desk-sidebar .sh-avatar{background:rgba(255,255,255,.14);color:#fff}
  .desk-sidebar .sh-icon-btn{color:#a7cfc8}
  .desk-sidebar .sh-icon-btn:hover{background:rgba(255,255,255,.08);color:#fff}

  .sh-branch{margin-top:12px;width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid ${C.border};border-radius:8px;background:${C.surface};color:${C.text2};font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}
  .sh-branch:disabled{cursor:default}
  .sh-branch:hover:not(:disabled){border-color:${C.border2};background:#f9fafb}
  .sh-branch-inline{display:inline-flex;align-items:center;gap:3px;max-width:100%;min-width:0;padding:0;border:none;background:none;color:${C.text3};font-size:12px;font-weight:500;font-family:inherit;cursor:pointer}
  .sh-branch-inline:disabled{cursor:default}

  .sh-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;margin-bottom:16px;border-radius:10px;border:1px solid ${C.primaryB};background:${C.primaryL};color:${C.text};font-size:13px}
  .sh-banner-quiet{border-color:${C.border};background:${C.surface}}
  .sh-link-btn{background:none;border:none;padding:0;font:inherit;font-weight:700;color:${C.primary};cursor:pointer;text-decoration:underline;text-underline-offset:3px}
  .sh-banner-warn{border-color:#fedf89;background:#fffaeb}

  .sh-overlay{position:fixed;inset:0;z-index:1000;background:rgba(16,24,40,.45);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;direction:rtl}
  .sh-modal{background:${C.surface};border-radius:14px;width:100%;padding:24px;box-shadow:0 20px 40px rgba(16,24,40,.18)}
  .sh-sheet-wrap{align-items:flex-end;padding:0}
  .sh-sheet{background:${C.surface};border-radius:16px 16px 0 0;width:100%;max-width:560px;padding:12px 16px calc(24px + env(safe-area-inset-bottom));max-height:90dvh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;animation:shUp .22s ease}
  @keyframes shUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}

  /* الجوال */
  .desk-layout{display:none}
  .mob-layout{display:flex;flex-direction:column;min-height:100vh}
  .mob-header{position:fixed;top:0;right:0;left:0;z-index:100;display:flex;align-items:center;gap:10px;height:60px;padding:0 12px 0 14px;background:${C.surface};border-bottom:1px solid ${C.border}}
  .mob-content{flex:1;padding:16px 14px 88px;margin-top:60px}
  .mob-bottom-nav{position:fixed;bottom:0;right:0;left:0;z-index:100;display:flex;background:${C.surface};border-top:1px solid ${C.border};padding-bottom:env(safe-area-inset-bottom)}
  .sh-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:9px 2px 8px;border:none;background:none;color:${C.text4};font-size:11px;font-weight:500;font-family:inherit;cursor:pointer}
  .sh-tab.on{color:${C.primary};font-weight:700}

  /* الكمبيوتر */
  @media(min-width:768px){
    .mob-layout{display:none}
    .desk-layout{display:block;min-height:100vh}
    .desk-sidebar{position:fixed;top:0;right:0;bottom:0;width:244px;display:flex;flex-direction:column;background:linear-gradient(180deg,#0d4543 0%,#0b3b3a 45%,#0a3231 100%);color-scheme:dark;z-index:100}
    .desk-topbar{position:fixed;top:0;right:244px;left:0;height:56px;z-index:99;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:${C.surface};border-bottom:1px solid ${C.border}}
    .desk-content{margin-right:244px;padding:80px 28px 40px;min-height:100vh;max-width:calc(100vw - 244px)}
  }
`
