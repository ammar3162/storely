import { storelyTokens as t } from './design-tokens'

// Shared presentation for current primitives and the legacy adapters. No page selectors.
export const storelySystemCss = `
  @layer theme, base, components, utilities;
  :root {
    --storely-navy: ${t.color.navy}; --storely-text: #203640; --storely-muted: #66737C;
    --storely-subtle: #687985; --storely-border: #E2E7EA;
    --storely-control-border: #E2E7EA; --storely-cream: #F7F9FA;
    --storely-background: #F7F9FA; --storely-surface: #FFFFFF;
    --storely-shadow: ${t.shadow.surface}; --storely-panel-shadow: ${t.shadow.panel};
    --storely-backdrop: ${t.color.backdrop};
  }
  @layer components {
  .storely-button, .storely-table-action {
    display: inline-flex; align-items: center; justify-content: center; gap: ${t.spacing[2]}px;
    max-width: 100%; min-width: 0; flex-shrink: 0; border: 1px solid ${t.color.border};
    border-radius: ${t.radius.control}; font-family: ${t.typography.family};
    font-size: ${t.typography.body}px; font-weight: 600; line-height: 1.5;
    cursor: pointer; text-align: center; transition: background .15s, border-color .15s;
    text-decoration: none; transform: none; overflow-wrap: anywhere;
  }
  .storely-button { min-height: ${t.control.medium}px; padding: 9px 16px; }
  .storely-button[data-size=sm] { min-height: 32px; padding: 6px 11px; font-size: 12.5px; }
  .storely-button[data-size=lg] { min-height: ${t.control.large}px; padding: ${t.spacing[2]}px ${t.spacing[5]}px; }
  .storely-button[data-variant=primary] { background: ${t.color.navy}; border-color: ${t.color.navy}; color: ${t.color.onPrimary}; }
  .storely-button[data-variant=primary]:hover:not(:disabled) { background: ${t.color.navyHover}; border-color: ${t.color.navyHover}; }
  .storely-button[data-variant=secondary] { background: ${t.color.surface}; color: ${t.color.text}; }
  .storely-button[data-variant=tertiary] { background: ${t.color.infoBg}; color: ${t.color.text}; border-color: transparent; }
  .storely-button[data-variant=ghost] { background: transparent; border-color: transparent; color: ${t.color.textMuted}; }
  .storely-button[data-variant=secondary]:hover:not(:disabled), .storely-button[data-variant=ghost]:hover:not(:disabled), .storely-button[data-variant=tertiary]:hover:not(:disabled) { background: ${t.color.background}; color: ${t.color.text}; border-color: ${t.color.border}; }
  .storely-button[data-variant=danger] { background: ${t.color.surface}; border-color: ${t.color.dangerBorder}; color: ${t.color.danger}; }
  .storely-button[data-variant=danger]:hover:not(:disabled) { background: ${t.color.dangerBg}; }
  .storely-button:disabled, .storely-table-action:disabled { opacity: .5; cursor: not-allowed; }
  .storely-button:active, .storely-table-action:active { transform: none; }
  .storely-button:focus-visible, .storely-table-action:focus-visible, .storely-feature:focus-visible { outline: none; box-shadow: ${t.shadow.focus}; }
  .storely-button-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .storely-button-icon > svg { width: 16px; height: 16px; }
  .storely-card, .storely-data-table { min-width: 0; overflow: hidden; background: ${t.color.surface}; border: 1px solid ${t.color.border}; border-radius: ${t.radius.card}; box-shadow: ${t.shadow.surface}; color: ${t.color.text}; }
  .storely-card, .storely-data-table, .storely-metric-strip, .storely-page-header, .storely-field, .storely-empty, .storely-pagination { font-family: ${t.typography.family}; font-size: ${t.typography.body}px; line-height: ${t.typography.lineHeight}; }
  .storely-card-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: ${t.spacing[3]}px; padding: 14px 18px; border-bottom: 1px solid ${t.color.border}; }
  .storely-card-heading { min-width: 0; flex: 1 1 180px; }
  .storely-card-title { margin: 0; font-size: ${t.typography.section}px; font-weight: 700; line-height: 1.6; overflow-wrap: anywhere; }
  .storely-card-description { margin-top: 2px; font-size: 12px; line-height: 1.7; color: ${t.color.textMuted}; overflow-wrap: anywhere; }
  .storely-actions { display: flex; flex-wrap: wrap; align-items: center; gap: ${t.spacing[2]}px; min-width: 0; }
  .storely-page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
  .storely-page-heading { min-width: 0; flex: 1 1 300px; }
  .storely-page-title { margin: 0; font-size: ${t.typography.title}px; line-height: 1.5; font-weight: 700; color: ${t.color.text}; overflow-wrap: anywhere; }
  .storely-page-description { max-width: 760px; margin-top: 3px; font-size: 13px; line-height: 1.8; color: ${t.color.textMuted}; overflow-wrap: anywhere; }
  .storely-eyebrow { margin-bottom: ${t.spacing[1]}px; font-size: ${t.typography.supporting}px; font-weight: 600; color: ${t.color.textMuted}; }
  .storely-metric-strip { min-width: 0; background: transparent; border: 0; box-shadow: none; }
  .storely-metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 1px; overflow: hidden; border: 1px solid ${t.color.border}; border-radius: ${t.radius.card}; background: ${t.color.border}; }
  .storely-metric { min-width: 0; padding: 14px 16px; background: ${t.color.surface}; }
  .storely-metric-label { font-size: 12px; line-height: 1.7; font-weight: 500; color: ${t.color.textMuted}; overflow-wrap: anywhere; }
  .storely-metric-value { margin-top: 6px; font-size: ${t.typography.title}px; line-height: 1.4; font-weight: 600; font-variant-numeric: tabular-nums; color: ${t.color.text}; overflow-wrap: anywhere; }
  .storely-metric-helper { margin-top: 2px; font-size: 11.5px; line-height: 1.7; color: ${t.color.textMuted}; overflow-wrap: anywhere; }
  .storely-metric-value[data-tone=success] { color: ${t.color.success}; }
  .storely-metric-value[data-tone=warning] { color: ${t.color.warning}; }
  .storely-metric-value[data-tone=danger] { color: ${t.color.danger}; }
  .storely-metric-value[data-tone=info] { color: ${t.color.info}; }
  .storely-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px 14px; border-bottom: 1px solid ${t.color.border}; }
  .storely-search { display: block; position: relative; flex: 1 1 240px; max-width: 480px; min-width: 0; }
  .storely-search-icon { pointer-events: none; position: absolute; inset-inline-start: ${t.spacing[3]}px; top: 50%; transform: translateY(-50%); color: ${t.color.textMuted}; }
  .storely-search .storely-input { padding-inline-start: 40px; }
  .storely-table-scroll { max-width: 100%; overflow-x: auto; overscroll-behavior-inline: contain; }
  .storely-table { width: 100%; min-width: ${t.layout.tableMinWidth}px; border-collapse: collapse; text-align: start; font-size: 13px; line-height: 1.6; }
  .storely-table th { padding: 10px 16px; background: ${t.color.background}; border-bottom: 1px solid ${t.color.border}; color: ${t.color.textMuted}; font-size: 12px; font-weight: 600; text-align: start; white-space: nowrap; }
  .storely-table td { padding: 12px 16px; border-bottom: 1px solid ${t.color.border}; vertical-align: middle; color: ${t.color.text}; font-size: 13px; }
  .storely-table td[data-dense=true] { padding-block: ${t.spacing[3]}px; }
  .storely-table tbody tr:last-child td { border-bottom: 0; }
  .storely-table tbody tr:hover { background: ${t.color.background}; }
  .storely-table-actions { display: inline-flex; align-items: center; flex-wrap: wrap; gap: ${t.spacing[2]}px; }
  .storely-table-action { min-height: ${t.control.icon}px; padding: ${t.spacing[2]}px ${t.spacing[3]}px; background: ${t.color.surface}; color: ${t.color.textMuted}; font-size: 13px; }
  .storely-table-action[data-icon-only=true] { width: ${t.control.icon}px; padding-inline: 0; }
  .storely-table-action:hover:not(:disabled) { background: ${t.color.background}; color: ${t.color.text}; }
  .storely-table-action[data-action=delete] { color: ${t.color.danger}; }
  .storely-table-action[data-action=delete]:hover:not(:disabled) { background: ${t.color.dangerBg}; }
  .storely-field { min-width: 0; }
  .storely-field-label { display: block; margin-bottom: ${t.spacing[2]}px; font-size: ${t.typography.body}px; font-weight: 600; color: ${t.color.text}; }
  .storely-field-required { margin-inline-start: ${t.spacing[1]}px; color: ${t.color.danger}; }
  .storely-field-description { margin-top: ${t.spacing[2]}px; font-size: 13px; line-height: 1.7; color: ${t.color.textMuted}; }
  .storely-field-description[data-error=true] { color: ${t.color.danger}; }
  .storely-label { display: block; margin-bottom: ${t.spacing[2]}px; font-size: ${t.typography.body}px; font-weight: 600; color: ${t.color.text}; }
  .storely-choice { display: inline-flex; align-items: center; justify-content: center; gap: ${t.spacing[2]}px; min-height: ${t.control.medium}px; padding: ${t.spacing[2]}px ${t.spacing[3]}px; border: 1px solid ${t.color.border}; border-radius: ${t.radius.control}; background: ${t.color.surface}; color: ${t.color.textMuted}; font: inherit; font-size: ${t.typography.body}px; cursor: pointer; }
  .storely-choice:hover, .storely-choice-active { border-color: ${t.color.navy}; color: ${t.color.text}; background: ${t.color.background}; }
  .storely-choice-danger { border-color: ${t.color.dangerBorder}; color: ${t.color.danger}; background: ${t.color.dangerBg}; }
  .storely-choice-warning { border-color: ${t.color.warningBorder}; color: ${t.color.warning}; background: ${t.color.warningBg}; }
  .storely-segmented { display: flex; flex-wrap: wrap; gap: ${t.spacing[2]}px; align-items: center; min-width: 0; }
  .storely-segmented button { min-height: ${t.control.medium}px; padding: ${t.spacing[2]}px ${t.spacing[3]}px; border: 1px solid ${t.color.border}; border-radius: ${t.radius.control}; background: ${t.color.surface}; color: ${t.color.textMuted}; font: inherit; font-size: ${t.typography.body}px; cursor: pointer; }
  .storely-segmented button.active { border-color: ${t.color.navy}; background: ${t.color.navy}; color: ${t.color.onPrimary}; }
  .storely-choice:focus-visible, .storely-segmented button:focus-visible { outline: none; box-shadow: ${t.shadow.focus}; }
  .storely-detail-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: ${t.spacing[4]}px; }
  .storely-duration-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: ${t.spacing[2]}px; margin-bottom: ${t.spacing[3]}px; }
  .storely-detail-row { flex-wrap: wrap; }
  .storely-duration-grid > button, .storely-drawer-body button:not(.storely-button), .storely-drawer-body input { min-height: ${t.control.medium}px; }
  .storely-input, .storely-select, .storely-textarea, .storely-field-control :where(input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), select, textarea) {
    width: 100%; min-width: 0; min-height: ${t.control.medium}px; padding: ${t.spacing[2]}px ${t.spacing[3]}px;
    background: ${t.color.surface}; color: ${t.color.text}; border: 1px solid ${t.color.border}; border-radius: ${t.radius.control}; font-family: inherit; font-size: ${t.typography.body}px; line-height: 1.5;
    transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
  }
  .storely-textarea, .storely-field .storely-field-control textarea { min-height: 112px; resize: vertical; }
  .storely-field-control :is(input[type=checkbox],input[type=radio]) { width: 18px; height: 18px; accent-color: ${t.color.navy}; flex-shrink: 0; }
  .storely-input:focus, .storely-select:focus, .storely-textarea:focus, .storely-field-control :is(input, select, textarea):focus { border-color: ${t.color.navy}; outline: none; box-shadow: ${t.shadow.focus}; }
  .storely-field[data-error=true] .storely-field-control :is(input,select,textarea) { border-color: ${t.color.danger}; }
  .storely-input::placeholder, .storely-textarea::placeholder, .storely-field-control :is(input,textarea)::placeholder { color: ${t.color.textSubtle}; }
  .storely-input:disabled, .storely-select:disabled, .storely-textarea:disabled, .storely-field-control :is(input,select,textarea):disabled { background: ${t.color.background}; color: ${t.color.textMuted}; cursor: not-allowed; opacity: .65; }
  .storely-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border: 1px solid; border-radius: ${t.radius.pill}; font-size: 11px; font-weight: 700; line-height: 1.5; white-space: nowrap; }
  .storely-badge[data-status=success] { color: ${t.color.success}; border-color: ${t.color.successBorder}; background: ${t.color.successBg}; }
  .storely-badge[data-status=warning] { color: ${t.color.warning}; border-color: ${t.color.warningBorder}; background: ${t.color.warningBg}; }
  .storely-badge[data-status=danger] { color: ${t.color.danger}; border-color: ${t.color.dangerBorder}; background: ${t.color.dangerBg}; }
  .storely-badge[data-status=info] { color: ${t.color.info}; border-color: ${t.color.infoBorder}; background: ${t.color.infoBg}; }
  .storely-empty { display: flex; min-height: 140px; flex-direction: column; align-items: center; justify-content: center; gap: ${t.spacing[2]}px; padding: ${t.spacing[8]}px ${t.spacing[6]}px; text-align: center; background: ${t.color.surface}; border: 1px dashed ${t.color.border}; border-radius: ${t.radius.card}; }
  .storely-empty-icon { display: inline-flex; align-items: center; justify-content: center; color: ${t.color.textMuted}; margin-bottom: ${t.spacing[2]}px; }
  .storely-empty-title { font-size: ${t.typography.body}px; line-height: 1.8; font-weight: 600; color: ${t.color.text}; }
  .storely-empty-description { max-width: 480px; font-size: 13px; line-height: 1.8; color: ${t.color.textMuted}; }
  .storely-card .storely-empty, .storely-data-table .storely-empty { border: 0; border-radius: 0; }
  .storely-loading { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: ${t.spacing[3]}px; padding: ${t.spacing[8]}px; color: ${t.color.textMuted}; font-size: ${t.typography.body}px; }
  .storely-pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: ${t.spacing[4]}px; padding: ${t.spacing[5]}px ${t.spacing[6]}px; border-top: 1px solid ${t.color.border}; color: ${t.color.textMuted}; font-size: 13px; }
  .storely-pagination-controls { display: flex; align-items: center; flex-wrap: wrap; gap: ${t.spacing[2]}px; }
  .storely-pagination-number { min-width: 36px; padding-inline: ${t.spacing[2]}px; }
  .storely-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: ${t.spacing[5]}px; background: ${t.color.backdrop}; font-family: ${t.typography.family}; direction: rtl; }
  .storely-dialog, .storely-dialog-shell { background: ${t.color.surface}; color: ${t.color.text}; border: 1px solid ${t.color.border}; border-radius: ${t.radius.panel}; box-shadow: ${t.shadow.panel}; font-family: ${t.typography.family}; }
  .storely-dialog { position: relative; width: 100%; max-width: 480px; max-height: calc(100dvh - 40px); overflow-y: auto; padding: ${t.spacing[6]}px; }
  .storely-dialog-shell { min-width: 0; max-width: 100%; max-height: calc(100dvh - 40px); overflow-y: auto; padding: ${t.spacing[6]}px; }
  .storely-dialog-shell[data-padding=none] { padding: 0; }
  .storely-dialog-shell-header, .storely-dialog-shell-body { padding: ${t.spacing[6]}px; }
  .storely-dialog-shell-header { border-bottom: 1px solid ${t.color.border}; }
  .storely-dialog-title { margin-bottom: ${t.spacing[3]}px; font-size: 20px; line-height: 1.6; font-weight: 600; overflow-wrap: anywhere; }
  .storely-dialog-message { white-space: pre-wrap; overflow-wrap: anywhere; font-size: ${t.typography.body}px; line-height: 1.8; color: ${t.color.textMuted}; }
  .storely-dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: ${t.spacing[3]}px; margin-top: ${t.spacing[6]}px; }
  .storely-notice { display: flex; align-items: flex-start; flex-wrap: wrap; gap: ${t.spacing[4]}px; padding: ${t.spacing[5]}px; border: 1px solid ${t.color.border}; border-radius: ${t.radius.control}; background: ${t.color.surface}; font-size: ${t.typography.body}px; line-height: 1.8; overflow-wrap: anywhere; }
  .storely-notice-body { min-width: 0; flex: 1 1 240px; }
  .storely-drawer { position: fixed; inset: 0; z-index: 1000; font-family: ${t.typography.family}; }
  .storely-drawer-backdrop { position: absolute; inset: 0; background: ${t.color.backdrop}; }
  .storely-drawer-panel { position: absolute; inset-block: 0; inset-inline-end: 0; max-width: 100vw; display: flex; flex-direction: column; background: ${t.color.surface}; color: ${t.color.text}; box-shadow: ${t.shadow.panel}; }
  .storely-drawer-header { display: flex; align-items: flex-start; gap: ${t.spacing[4]}px; padding: ${t.spacing[6]}px; border-bottom: 1px solid ${t.color.border}; }
  .storely-drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: ${t.spacing[6]}px; display: flex; flex-direction: column; gap: ${t.spacing[6]}px; }
  .storely-toast-stack { position: fixed; inset-block-start: ${t.spacing[5]}px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; align-items: stretch; gap: ${t.spacing[3]}px; width: min(480px, calc(100vw - 32px)); pointer-events: none; font-family: ${t.typography.family}; direction: rtl; }
  .storely-toast { display: flex; align-items: flex-start; gap: ${t.spacing[3]}px; padding: ${t.spacing[4]}px ${t.spacing[5]}px; border: 1px solid; border-radius: ${t.radius.card}; background: ${t.color.surface}; box-shadow: ${t.shadow.surface}; font-size: ${t.typography.body}px; line-height: 1.8; overflow-wrap: anywhere; pointer-events: all; }
  .storely-toast > svg { flex-shrink: 0; margin-top: ${t.spacing[1]}px; }
  .storely-tour { max-width: 640px; }
  .storely-tour-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: ${t.spacing[3]}px; margin-block: ${t.spacing[6]}px; }
  .storely-feature { padding: ${t.spacing[4]}px; border: 1px solid ${t.color.border}; border-radius: ${t.radius.control}; background: ${t.color.surface}; text-align: start; font: inherit; color: ${t.color.text}; cursor: pointer; }
  .storely-feature-title { font-size: ${t.typography.body}px; font-weight: 600; margin-bottom: ${t.spacing[2]}px; }
  .storely-feature-description { font-size: 13px; line-height: 1.8; color: ${t.color.textMuted}; }
  .storely-announcement { position: fixed; inset-block-start: 0; inset-inline: 0; z-index: 8000; border-bottom: 1px solid ${t.color.border}; background: ${t.color.surface}; padding: ${t.spacing[4]}px ${t.spacing[6]}px; color: ${t.color.text}; font-family: ${t.typography.family}; direction: rtl; display: flex; flex-wrap: wrap; gap: ${t.spacing[4]}px; box-shadow: ${t.shadow.surface}; }
  @media(max-width:640px) {
    .storely-detail-grid { grid-template-columns: minmax(0,1fr); }
    .storely-duration-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
    .storely-card-header, .storely-toolbar, .storely-pagination, .storely-drawer-header, .storely-drawer-body { padding: ${t.spacing[4]}px; }
    .storely-metric-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .storely-metric:last-child:nth-child(odd) { grid-column: 1 / -1; }
    .storely-metric { padding: 12px 14px; }
    .storely-metric-value { margin-top: 2px; font-size: 20px; }
    .storely-metric-helper { margin-top: 0; }
    .storely-dialog { padding: ${t.spacing[4]}px; }
    .storely-dialog-shell, .storely-dialog-shell-header, .storely-dialog-shell-body { padding: ${t.spacing[4]}px; }
    .storely-page-heading { flex-basis: 100%; }
    .storely-dialog-actions > button { flex: 1 1 120px; }
    .storely-search { max-width: none; }
    .storely-tour-grid { grid-template-columns: minmax(0,1fr); }
  }
  @media(prefers-reduced-motion:reduce) { .storely-button, .storely-table-action { transition: none; } }
  }
`

export function StorelySystemStyles() {
  return <style>{storelySystemCss}</style>
}
