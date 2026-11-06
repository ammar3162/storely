// تصميم بوابة المورد: قائمة كحلية ثابتة، محتوى فاتح، وحدة ألوان ستورلي
export const SD_CSS = `
.sd{--ink:#13294b;--teal:#0f766e;--teal2:#029FA2;--line:#e2ebea;--muted:#62728a;--bg:#f4f7f7;--mint:#e8f5f2;
  display:flex;min-height:100vh;background:var(--bg);font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:var(--ink)}
.sd *{box-sizing:border-box}
.sd-side{width:248px;flex-shrink:0;background:var(--ink);color:#d6e2ec;display:flex;flex-direction:column;padding:20px 14px;position:sticky;top:0;height:100vh}
.sd-brand{display:flex;gap:10px;align-items:center;padding:4px 6px 20px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:14px}
.sd-brand img{width:40px;height:40px;border-radius:10px;background:#fff;object-fit:cover}
.sd-logo{display:flex;gap:14px;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--line)}
.sd-logo-box{width:84px;height:84px;border-radius:18px;border:1.5px dashed #cdd9d8;display:flex;align-items:center;justify-content:center;color:var(--muted);overflow:hidden;flex-shrink:0;background:#fff}
.sd-logo-box img{width:100%;height:100%;object-fit:cover}
.sd-logo b{display:block;font-size:14.5px}.sd-logo span{display:block;font-size:12.5px;color:var(--muted);line-height:1.6}
.sd-brand b{display:block;color:#fff;font-size:15px;line-height:1.3}.sd-brand span{font-size:12px;color:#94a8bf}
.sd-nav{display:flex;flex-direction:column;gap:3px}
.sd-nav button{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:10px;border:none;background:none;color:inherit;font:inherit;font-size:14.5px;font-weight:600;cursor:pointer;text-align:right}
.sd-nav button:hover{background:rgba(255,255,255,.06)}
.sd-nav button.on{background:#fff;color:var(--ink)}
.sd-nav button span{flex:1}
.sd-nav em{font-style:normal;background:#f59e0b;color:#13294b;font-size:12px;font-weight:800;border-radius:99px;padding:1px 8px}
.sd-out{margin-top:auto;display:flex;align-items:center;gap:8px;padding:10px 12px;border:none;background:none;color:#94a8bf;font:inherit;font-size:13.5px;cursor:pointer;border-radius:10px}
.sd-out:hover{color:#fff;background:rgba(255,255,255,.06)}
.sd-main{flex:1;min-width:0;padding:26px 32px 48px;max-width:1180px}
.sd-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.sd-top h1{font-size:25px;font-weight:700;margin:0}.sd-top p{margin:4px 0 0;color:var(--muted);font-size:14px}
.sd-vis{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:10px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;border:1px solid}
.sd-vis.on{background:var(--mint);border-color:#b7e3dc;color:var(--teal)}.sd-vis.off{background:#fef2f2;border-color:#fecaca;color:#b91c1c}
.sd-todo{width:100%;display:flex;align-items:center;gap:10px;background:#fff8eb;border:1px solid #fde4b0;color:#92400e;border-radius:12px;padding:12px 16px;margin-bottom:18px;font:inherit;font-size:14.5px;cursor:pointer;text-align:right}
.sd-todo span{flex:1}.sd-todo b{color:var(--teal)}
.sd-panel{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin-bottom:16px}
.sd-panel h2{font-size:17px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px}
.sd-panel h2 small{font-size:13px;color:var(--muted);font-weight:600}
.sd-grid-products{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:16px;align-items:start}
.sd-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.sd-form{display:grid;gap:12px}.sd-form label{display:grid;gap:6px;font-size:13px;font-weight:700;color:#334155}.sd-form label small{font-weight:500;color:var(--muted)}
.sd-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sd-in{width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit;font-size:14.5px;color:var(--ink);background:#fff;outline:none}
.sd-in:focus{border-color:var(--teal2);box-shadow:0 0 0 3px rgba(2,159,162,.12)}.sd-in:disabled{background:#f6f8f8;color:var(--muted)}
.sd-seg{display:flex;align-items:center;gap:6px;background:#f6f8f8;border-radius:10px;padding:6px 6px 6px 10px;font-size:13.5px;font-weight:600}
.sd-seg span{flex:1;padding-right:6px}
.sd-seg button{border:none;background:none;font:inherit;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;color:var(--muted)}
.sd-seg button.on{background:#fff;color:var(--teal);box-shadow:0 1px 3px rgba(19,41,75,.12)}
.sd-note{font-size:13px;background:var(--mint);color:var(--teal);border-radius:10px;padding:9px 12px}
.sd-img{display:flex!important;grid-auto-flow:column;align-items:center;gap:10px!important;border:1.5px dashed #cdd9d8;border-radius:12px;padding:10px 12px;cursor:pointer;color:var(--muted);font-weight:600!important}
.sd-img img{width:42px;height:42px;border-radius:8px;object-fit:cover}
.sd-actions{display:flex;gap:8px}
.sd-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 18px;border-radius:10px;border:none;background:var(--teal);color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}
.sd-btn:disabled{opacity:.5;cursor:not-allowed}.sd-btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line)}
.sd-empty{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:34px 10px;color:var(--muted)}
.sd-empty b{color:var(--ink);font-size:15.5px}.sd-empty span{font-size:13.5px;max-width:320px;line-height:1.7}
.sd-list{display:flex;flex-direction:column}
.sd-item{display:flex;align-items:center;gap:14px;padding:12px 4px;border-bottom:1px solid var(--line)}
.sd-item:last-child{border-bottom:none}.sd-item.off{opacity:.55}
.sd-thumb{width:46px;height:46px;border-radius:10px;background:var(--mint);color:var(--teal);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
.sd-thumb img{width:100%;height:100%;object-fit:cover}
.sd-item-main{flex:1;min-width:0;display:flex;flex-direction:column}.sd-item-main b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sd-item-main span{font-size:12.5px;color:var(--muted)}
.sd-price{font-weight:700;font-size:15.5px;font-variant-numeric:tabular-nums;white-space:nowrap}.sd-price small{font-size:12px;color:var(--muted);font-weight:600}
.sd-switch{width:42px;height:24px;border-radius:99px;border:none;background:#d5dddd;position:relative;cursor:pointer;flex-shrink:0;padding:0}
.sd-switch i{position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:right .15s}
.sd-switch.on{background:var(--teal2)}.sd-switch.on i{right:21px}
.sd-icons{display:flex;gap:4px}.sd-icons button{width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer}
.sd-icons button:hover{color:var(--ink)}.sd-icons button.danger:hover{color:#dc2626;border-color:#fecaca}
.sd-orders{display:grid;gap:12px}
.sd-order{border:1px solid var(--line);border-right:4px solid #cbd5e1;border-radius:12px;padding:14px 16px}
.sd-order.t-amber{border-right-color:#f59e0b}.sd-order.t-teal{border-right-color:var(--teal2)}.sd-order.t-blue{border-right-color:#3b82f6}.sd-order.t-green{border-right-color:#16a34a}
.sd-order-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.sd-order-head b{font-size:15.5px}
.sd-badge{font:inherit;font-size:12.5px;font-weight:700;padding:4px 10px;border-radius:99px;border:none;white-space:nowrap}
.sd-badge.t-amber{background:#fff4dc;color:#92400e}.sd-badge.t-slate{background:#eef2f6;color:#475569}.sd-badge.t-teal{background:var(--mint);color:var(--teal)}.sd-badge.t-blue{background:#e6efff;color:#1d4ed8}.sd-badge.t-green{background:#e3f6e9;color:#15803d}
button.sd-badge{cursor:pointer}
.sd-order-items{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.sd-order-items li{background:#f6f8f8;border-radius:8px;padding:5px 10px;font-size:13.5px;display:flex;gap:6px}.sd-order-items li span{color:var(--muted)}
.sd-order-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px;color:#334155}
.sd-inline{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sd-inline .sd-in{flex:1;min-width:150px}
.sd-warn{width:100%;font-size:12.5px;color:#b45309}
.sd-rate{display:flex;align-items:center;gap:4px}.sd-rate>button:not(.sd-btn){background:none;border:none;font-size:20px;cursor:pointer;padding:0}
.sd-chat{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:8px}
.sd-chat-head{width:100%;display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:none;background:#f6f8f8;font:inherit;cursor:pointer}
.sd-chat-head span{font-size:12.5px;color:var(--muted)}
.sd-chat-body{max-height:280px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
.sd-msg{max-width:75%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.6}
.sd-msg.me{align-self:flex-end;background:var(--teal);color:#fff}.sd-msg.them{align-self:flex-start;background:#eef2f6}
.sd-figs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.sd-figs>div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.sd-figs span{font-size:12.5px;color:var(--muted);font-weight:600}.sd-figs b{display:block;font-size:22px;margin-top:4px;font-variant-numeric:tabular-nums}
.sd-figs b small{font-size:12px;color:var(--muted)}.sd-figs .warn b{color:#b45309}
.sd-rank{list-style:none;margin:0;padding:0}.sd-rank li{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}
.sd-rank li:last-child{border-bottom:none}.sd-rank b{font-weight:600;color:var(--muted);white-space:nowrap}
.sd-muted{font-size:13.5px;color:var(--muted)}
.sd-feed{list-style:none;margin:0;padding:0}.sd-feed li{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);color:var(--teal)}
.sd-feed li div{display:flex;flex-direction:column;color:var(--ink);font-size:14px}.sd-feed time{font-size:12px;color:var(--muted)}
.sd button:focus-visible,.sd a:focus-visible{outline:3px solid var(--teal2);outline-offset:2px}
@media(max-width:900px){
  .sd{flex-direction:column}
  .sd-side{width:auto;height:auto;position:sticky;top:0;z-index:20;padding:10px 12px;flex-direction:row;align-items:center;gap:10px;overflow-x:auto}
  .sd-brand{border:none;margin:0;padding:0}.sd-brand div{display:none}
  .sd-nav{flex-direction:row;gap:4px}.sd-nav button{padding:8px 10px;font-size:13px;white-space:nowrap}
  .sd-out{margin:0;padding:8px}.sd-out{font-size:0}.sd-out svg{width:18px;height:18px}
  .sd-main{padding:18px 16px 40px}
  .sd-grid-products,.sd-grid-2{grid-template-columns:1fr}.sd-figs{grid-template-columns:1fr 1fr}
}
@media(max-width:520px){.sd-row2{grid-template-columns:1fr}.sd-item{gap:10px}.sd-price{font-size:14px}}
`
