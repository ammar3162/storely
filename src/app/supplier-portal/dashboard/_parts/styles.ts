// تصميم بوابة المورد بأسلوب أبل (2026-11-17) — نفس إطار لوحة المالك وبوابة المحاسب:
// قائمة جانبية فاتحة والعنصر المختار حبة رمادية بنص كحلي، بطاقات بيضاء بلا إطار على خلفية #F5F5F7،
// أزرار بأطراف دائرية، والكحلي للإجراءات فقط. الألوان كلها من رموز النظام (var(--storely-*)).
export const SD_CSS = `
.sd{--ink:var(--storely-text);--teal:var(--storely-navy);--teal2:var(--storely-navy);--line:var(--storely-border);--muted:var(--storely-muted);--bg:var(--storely-background);--mint:var(--storely-fill);
  display:flex;min-height:100vh;background:var(--bg);font-family:var(--storely-font);color:var(--ink);font-size:17px;line-height:1.47}
.sd *{box-sizing:border-box}
.sd-side{width:248px;flex-shrink:0;background:var(--storely-surface);color:var(--ink);border-left:1px solid var(--line);display:flex;flex-direction:column;padding:18px 12px;position:sticky;top:0;height:100vh}
.sd-brand{display:flex;gap:10px;align-items:center;padding:2px 6px 16px;border-bottom:1px solid var(--line);margin-bottom:12px}
.sd-brand img{width:40px;height:40px;border-radius:10px;background:#fff;object-fit:cover;border:1px solid var(--line)}
.sd-logo{display:flex;gap:14px;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--line)}
.sd-logo-box{width:84px;height:84px;border-radius:20px;border:1.5px dashed var(--storely-control-border);display:flex;align-items:center;justify-content:center;color:var(--muted);overflow:hidden;flex-shrink:0;background:var(--bg)}
.sd-logo-box img{width:100%;height:100%;object-fit:cover}
.sd-logo b{display:block;font-size:17px;font-weight:600}.sd-logo span{display:block;font-size:13px;color:var(--muted);line-height:1.6}
.sd-brand b{display:block;color:var(--ink);font-size:17px;font-weight:600;line-height:1.3}.sd-brand span{font-size:13px;color:var(--muted)}
.sd-nav{display:flex;flex-direction:column;gap:2px}
.sd-nav button{display:flex;align-items:center;gap:10px;min-height:38px;padding:8px 12px;border-radius:10px;border:none;background:none;color:var(--ink);font:inherit;font-size:15px;font-weight:400;cursor:pointer;text-align:start;transition:background-color .15s,color .15s}
.sd-nav button svg{color:var(--muted);flex-shrink:0;transition:color .15s}
.sd-nav button:hover{background:var(--mint)}
.sd-nav button.on{background:var(--mint);color:var(--teal);font-weight:600}
.sd-nav button.on svg{color:var(--teal)}
.sd-nav button span{flex:1}
.sd-nav em{font-style:normal;background:var(--teal);color:#fff;font-size:12px;font-weight:600;border-radius:99px;min-width:20px;padding:1px 7px;text-align:center}
.sd-out{margin-top:auto;display:flex;align-items:center;gap:8px;min-height:38px;padding:8px 12px;border:none;background:none;color:var(--muted);font:inherit;font-size:15px;cursor:pointer;border-radius:10px;transition:background-color .15s,color .15s}
.sd-out:hover{color:var(--ink);background:var(--mint)}
.sd-main{flex:1;min-width:0;padding:28px 32px 48px;max-width:1180px}
.sd-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.sd-top h1{font-size:28px;font-weight:600;margin:0}.sd-top p{margin:4px 0 0;color:var(--muted);font-size:15px}
.sd-vis{display:flex;align-items:center;gap:8px;min-height:40px;padding:8px 16px;border-radius:999px;font:inherit;font-size:15px;font-weight:500;cursor:pointer;border:none;transition:background-color .15s}
.sd-vis.on{background:var(--mint);color:var(--teal)}.sd-vis.off{background:#fef2f2;color:#b91c1c}
.sd-todo{width:100%;display:flex;align-items:center;gap:10px;background:#fff8eb;border:none;color:#92400e;border-radius:16px;padding:12px 16px;margin-bottom:18px;font:inherit;font-size:15px;cursor:pointer;text-align:start}
.sd-todo span{flex:1}.sd-todo b{color:var(--teal)}
.sd-panel{background:#fff;border:none;border-radius:20px;padding:20px 22px;margin-bottom:16px}
.sd-panel h2{font-size:20px;font-weight:600;margin:0 0 16px;display:flex;align-items:center;gap:8px}
.sd-panel h2 small{font-size:15px;color:var(--muted);font-weight:500}
.sd-grid-products{display:grid;grid-template-columns:minmax(280px,360px) minmax(0,1fr);gap:16px;align-items:start}
.sd-grid-2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.sd-form{display:grid;gap:12px}.sd-form label{display:grid;gap:6px;font-size:15px;font-weight:500;color:var(--ink)}.sd-form label small{font-weight:400;color:var(--muted)}
.sd-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sd-in{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--storely-control-border);border-radius:12px;font:inherit;font-size:17px;color:var(--ink);background:#fff;outline:none}
.sd-in:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(32,54,64,.15)}.sd-in:disabled{background:var(--bg);color:var(--muted)}
.sd-seg{display:flex;align-items:center;gap:6px;background:var(--mint);border-radius:14px;padding:6px 6px 6px 10px;font-size:15px;font-weight:500}
.sd-seg span{flex:1;padding-right:6px}
.sd-seg button{border:none;background:none;font:inherit;font-weight:500;padding:6px 14px;border-radius:999px;cursor:pointer;color:var(--ink)}
.sd-seg button.on{background:#fff;color:var(--ink);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.sd-note{font-size:15px;background:var(--bg);color:var(--ink);border-radius:12px;padding:10px 12px}
.sd-img{display:flex!important;grid-auto-flow:column;align-items:center;gap:10px!important;border:1.5px dashed var(--storely-control-border);border-radius:16px;padding:10px 12px;cursor:pointer;color:var(--muted);font-weight:500!important}
.sd-img img{width:42px;height:42px;border-radius:10px;object-fit:cover}
.sd-actions{display:flex;gap:8px}
.sd-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px 20px;border-radius:999px;border:none;background:var(--teal);color:#fff;font:inherit;font-size:17px;font-weight:500;cursor:pointer;white-space:nowrap;transition:opacity .15s,background-color .15s}
.sd-btn:hover:not(:disabled){opacity:.9}
.sd-btn:disabled{opacity:.5;cursor:not-allowed}.sd-btn.ghost{background:var(--mint);color:var(--ink);border:none}
.sd-empty{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:34px 10px;color:var(--muted)}
.sd-empty b{color:var(--ink);font-size:17px;font-weight:600}.sd-empty span{font-size:15px;max-width:320px;line-height:1.6}
.sd-list{display:flex;flex-direction:column}
.sd-item{display:flex;align-items:center;gap:14px;padding:12px 4px;border-bottom:1px solid var(--line)}
.sd-item:last-child{border-bottom:none}.sd-item.off{opacity:.55}
.sd-thumb{width:46px;height:46px;border-radius:12px;background:var(--bg);color:var(--muted);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.sd-thumb img{width:100%;height:100%;object-fit:cover}
.sd-item-main{flex:1;min-width:0;display:flex;flex-direction:column}.sd-item-main b{font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sd-item-main span{font-size:13px;color:var(--muted)}
.sd-price{font-weight:600;font-size:17px;font-variant-numeric:tabular-nums;white-space:nowrap}.sd-price small{font-size:13px;color:var(--muted);font-weight:500}
.sd-switch{width:51px;height:31px;border-radius:99px;border:none;background:var(--storely-control-border);position:relative;cursor:pointer;flex-shrink:0;padding:0;transition:background-color .2s}
.sd-switch i{position:absolute;top:2px;right:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .2s}
.sd-switch.on{background:var(--teal)}.sd-switch.on i{transform:translateX(-20px)}
.sd-icons{display:flex;gap:6px}.sd-icons button{width:36px;height:36px;border-radius:999px;border:none;background:var(--mint);color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background-color .15s,color .15s}
.sd-icons button:hover{background:var(--storely-control-border)}.sd-icons button.danger:hover{color:#dc2626;background:#fef2f2}
.sd-orders{display:grid;gap:12px}
.sd-order{background:var(--bg);border:none;border-radius:16px;padding:14px 16px}
.sd-order-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.sd-order-head b{font-size:17px;font-weight:600}
.sd-badge{font:inherit;font-size:13px;font-weight:600;padding:4px 10px;border-radius:99px;border:none;white-space:nowrap}
.sd-badge.t-amber{background:#fff4dc;color:#92400e}.sd-badge.t-slate{background:var(--mint);color:var(--muted)}.sd-badge.t-teal{background:var(--mint);color:var(--teal)}.sd-badge.t-blue{background:var(--mint);color:var(--teal)}.sd-badge.t-green{background:#e3f6e9;color:#15803d}
button.sd-badge{cursor:pointer}
.sd-order-items{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.sd-order-items li{background:#fff;border-radius:999px;padding:5px 12px;font-size:15px;display:flex;gap:6px}.sd-order-items li span{color:var(--muted)}
.sd-order-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:15px;color:var(--ink)}
.sd-inline{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sd-inline .sd-in{flex:1;min-width:150px}
.sd-warn{width:100%;font-size:13px;color:#b45309}
.sd-rate{display:flex;align-items:center;gap:4px}.sd-rate>button:not(.sd-btn){background:none;border:none;font-size:20px;cursor:pointer;padding:0}
.sd-chat{border:none;background:var(--bg);border-radius:16px;overflow:hidden;margin-bottom:8px}
.sd-chat-head{width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:none;background:transparent;font:inherit;font-weight:600;cursor:pointer;color:var(--ink)}
.sd-chat-head span{font-size:13px;color:var(--muted);font-weight:400}
.sd-chat-body{max-height:280px;overflow-y:auto;padding:4px 14px 14px;display:flex;flex-direction:column;gap:8px}
.sd-msg{max-width:75%;padding:8px 14px;border-radius:18px;font-size:15px;line-height:1.5}
.sd-msg.me{align-self:flex-end;background:var(--teal);color:#fff}.sd-msg.them{align-self:flex-start;background:#fff}
.sd-figs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.sd-figs>div{background:#fff;border:none;border-radius:20px;padding:16px}
.sd-figs span{font-size:13px;color:var(--muted);font-weight:600}.sd-figs b{display:block;font-size:28px;font-weight:600;line-height:1.15;margin-top:6px;font-variant-numeric:tabular-nums}
.sd-figs b small{font-size:13px;color:var(--muted);font-weight:500}.sd-figs .warn b{color:#b45309}
.sd-rank{list-style:none;margin:0;padding:0}.sd-rank li{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:15px}
.sd-rank li:last-child{border-bottom:none}.sd-rank b{font-weight:600;color:var(--ink);white-space:nowrap;font-variant-numeric:tabular-nums}
.sd-muted{font-size:15px;color:var(--muted)}
.sd-feed{list-style:none;margin:0;padding:0}.sd-feed li{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);color:var(--teal)}
.sd-feed li:last-child{border-bottom:none}
.sd-feed li div{display:flex;flex-direction:column;color:var(--ink);font-size:15px}.sd-feed time{font-size:13px;color:var(--muted)}
.sd button:focus-visible,.sd a:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
@media(max-width:900px){
  .sd{flex-direction:column}
  .sd-side{width:auto;height:auto;position:sticky;top:0;z-index:20;padding:10px 12px;flex-direction:row;align-items:center;gap:10px;overflow-x:auto;border-left:none;border-bottom:1px solid var(--line);background:rgba(255,255,255,.86);-webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px)}
  .sd-brand{border:none;margin:0;padding:0}.sd-brand div{display:none}
  .sd-nav{flex-direction:row;gap:4px}.sd-nav button{min-height:36px;padding:7px 12px;font-size:15px;white-space:nowrap;border-radius:999px}
  .sd-out{margin:0;padding:8px;font-size:0;min-height:36px}.sd-out svg{width:18px;height:18px}
  .sd-main{padding:18px 16px 40px}
  .sd-grid-products,.sd-grid-2{grid-template-columns:minmax(0,1fr)}.sd-figs{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:520px){.sd-row2{grid-template-columns:1fr}.sd-item{gap:10px}.sd-top h1{font-size:24px}}
@media(prefers-reduced-motion:reduce){.sd *{transition:none!important}}
`
