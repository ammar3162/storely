import { C } from './constants'

export const IV_CSS = `
  .iv-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
  .iv-title{font-size:20px;font-weight:700;color:${C.text};margin:0}
  .iv-sub{font-size:13px;color:${C.text3};margin:4px 0 0;font-variant-numeric:tabular-nums}
  .iv-tools{display:flex;gap:8px;flex-wrap:wrap}
  @media(max-width:640px){.iv-hide-sm{display:none}.iv-tools .sh-btn{padding:9px 11px}}
  .iv-note{background:${C.surface};border:1px solid ${C.border};border-radius:10px;margin-bottom:14px}
  .iv-note-head{width:100%;display:flex;align-items:center;gap:10px;padding:11px 14px;border:none;background:none;font-family:inherit;font-size:13px;color:${C.text2};cursor:pointer;text-align:right}
  .iv-note-head svg{color:${C.text4};flex-shrink:0}
  .iv-link{color:${C.primary};font-weight:600;font-size:13px}
  .iv-note-list{border-top:1px solid ${C.border};max-height:240px;overflow-y:auto}
  .iv-note-item{width:100%;display:flex;justify-content:space-between;padding:10px 14px;border:none;border-bottom:1px solid ${C.border};background:none;font-family:inherit;font-size:13px;color:${C.text};cursor:pointer;text-align:right}
  .iv-note-item:hover{background:#f9fafb}
  .iv-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
  .iv-tabs{display:inline-flex;background:#eef0f3;border-radius:9px;padding:3px}
  .iv-tab{border:none;background:none;padding:7px 14px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;color:${C.text2};cursor:pointer;white-space:nowrap}
  .iv-tab.on{background:white;color:${C.text};font-weight:600;box-shadow:0 1px 2px rgba(16,24,40,.08)}
  .iv-tab-n{color:${C.text4};font-weight:500;margin-right:4px;font-variant-numeric:tabular-nums}
  .iv-search{flex:1;min-width:200px;position:relative;display:flex;align-items:center}
  .iv-search svg{position:absolute;right:11px;color:${C.text4};pointer-events:none}
  .iv-search input{width:100%;padding:9px 34px 9px 12px;border:1px solid ${C.border2};border-radius:8px;font-size:13px;font-family:inherit;background:white;color:${C.text};outline:none}
  .iv-cats{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px}
  .iv-cat{flex-shrink:0;padding:5px 11px;border-radius:99px;border:1px solid ${C.border};background:white;font-family:inherit;font-size:12.5px;color:${C.text2};cursor:pointer;white-space:nowrap}
  .iv-cat.on{border-color:${C.text};color:${C.text};font-weight:600}
  .iv-list{display:block;background:white;border:1px solid ${C.border};border-radius:12px;overflow:hidden}
  .iv-item{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border:none;border-bottom:1px solid ${C.border};background:none;font-family:inherit;text-align:right;cursor:pointer}
  .iv-item:last-child{border-bottom:none}
  .iv-item:active{background:#f9fafb}
  .iv-name{font-size:14px;font-weight:600;color:${C.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .iv-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:${C.text3};margin-top:3px}
  .iv-qty{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
  .iv-unit{font-size:12px;font-weight:400;color:${C.text3}}
  .iv-min{font-size:11.5px;color:${C.text4};margin-top:2px}
  .iv-table-wrap{background:white;border:1px solid ${C.border};border-radius:12px;overflow:hidden}
  .iv-table{width:100%;border-collapse:collapse}
  .iv-table th{text-align:right;padding:10px 16px;font-size:12px;font-weight:600;color:${C.text3};background:#f9fafb;border-bottom:1px solid ${C.border};white-space:nowrap}
  .iv-table td{padding:12px 16px;border-bottom:1px solid ${C.border};font-size:13px;color:${C.text};vertical-align:middle}
  .iv-table tbody tr{cursor:pointer}
  .iv-table tbody tr:hover td{background:#f9fafb}
  .iv-table tbody tr:last-child td{border-bottom:none}
  .iv-act{border:none;background:none;padding:4px 8px;font-family:inherit;font-size:13px;font-weight:500;color:${C.text2};cursor:pointer;border-radius:6px}
  .iv-act:hover{background:#f2f4f7}
  @media(min-width:768px){.iv-sheet-wrap{align-items:center!important;padding:20px}.iv-sheet{border-radius:14px!important}}
`

