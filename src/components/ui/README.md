# Storely UI System

Reusable frontend-only components for the Storely enterprise SaaS redesign.

## Shared presentation

`design-tokens.ts` owns the palette, spacing, control sizes, typography, radii and shadows.
`system-styles.tsx` derives the common component CSS from those tokens and is mounted once in the root layout.
The component classes keep existing props, event handlers and data behavior intact. Avoid overriding internal typography, dimensions or metric grid borders in pages; use the existing sizes and variants instead.

The legacy exports in `src/lib/ds.ts` and `src/app/storely-admin/_admin/kit.tsx` now consume the same tokens. Admin buttons, cards, headers and empty states delegate to Storely primitives, while the table and drawer use the same shared CSS.

The component pass covers buttons; card headers and surfaces; separate metric blocks with wrapping text; tables and action groups; labels, inputs, selects, textareas and errors; badges; search toolbars; empty/loading states; pagination; confirmations; toast messages; announcements; and admin drawers.

The only page integrations remove metric presentation overrides in Dashboard, Admin Overview and Admin Metrics. Page content, metrics, actions and workflows stay unchanged.

### Files in the component pass

- `src/components/ui/`: `design-tokens.ts`, `system-styles.tsx`, `button.tsx`, `card.tsx`, `data-table.tsx`, `metric-strip.tsx`, `page-header.tsx`, `form-field.tsx`, `status-badge.tsx`, `table-action.tsx`, `empty-state.tsx`, `app-layout.tsx`, and this README.
- Legacy adapters: `src/lib/ds.ts`, `src/app/storely-admin/_admin/kit.tsx`.
- Shared overlays and feedback: `src/components/ConfirmDialog.tsx`, `src/components/FeatureAnnouncement.tsx`, `src/components/pagination.tsx`, `src/components/toast.tsx`.
- Global style registration: `src/app/layout.tsx`, `src/app/globals.css`.
- Minimal metric integration: `src/app/(dashboard)/dashboard/page.tsx`, `src/app/storely-admin/page.tsx`, `src/app/storely-admin/metrics/page.tsx`.

## Principles

- Use cards only for meaningful grouping.
- Prefer dense tables for operational data.
- Use semantic badge colors only: success, warning, danger, info.
- Keep empty states compact: one icon, one short message, one clear action.
- Avoid gradients, decorative icon boxes, emoji icons, oversized radius, and heavy shadows.

## Components

- `StorelyAppLayout`: professional shell with navy sidebar, grouped navigation, responsive drawer.
- `StorelyPageHeader`: title, description, and actions.
- `StorelyButton`: primary, secondary, danger, and ghost actions.
- `StorelyDataTable`: dense table with optional search, sorting, toolbar, pagination, and empty state.
- `StorelyMetricStrip`: compact horizontal operational metrics; use instead of multiple KPI cards.
- `StorelyFormField`: consistent label, required state, helper text, and error text around form controls.
- `StorelyTableAction`: quiet row-level view, edit, delete, and more actions.
- `StorelyCard`: restrained grouping surface.
- `StorelyStatusBadge`: semantic status labels.
- `StorelyEmptyState`: compact no-data state.

## First Adoption Targets

- `src/app/(dashboard)/dashboard/page.tsx`: replace decorative dashboard cards, colored icon boxes, and large visual emphasis with restrained grouped panels.
- `src/app/(dashboard)/inventory/page.tsx`: migrate product list to `StorelyDataTable`, `StorelyPageHeader`, and semantic stock badges.
- `src/app/(dashboard)/purchases/page.tsx`: migrate purchase list and filters to the shared table/header/buttons.
- `src/app/(dashboard)/suppliers/page.tsx`: replace supplier stat cards and supplier rows with shared card/table/badge primitives.
- `src/app/(dashboard)/staff-management/page.tsx`: replace staff cards and empty state with compact enterprise patterns.
- `src/app/(dashboard)/reports/page.tsx`: standardize report filter panels and report tables.
- `src/app/(dashboard)/branches/page.tsx`, `src/app/(dashboard)/branch-managers/page.tsx`, `src/app/(dashboard)/branch-compare/page.tsx`, `src/app/(dashboard)/transfer-stock/page.tsx`: standardize branch management headers, panels, and status treatments.
- `src/app/(dashboard)/attendance/page.tsx`, `src/app/(dashboard)/hr-management/page.tsx`: migrate workforce tables and empty states.
- `src/app/(dashboard)/settings/page.tsx`, `src/app/(dashboard)/notifications/page.tsx`, `src/app/(dashboard)/online-store/page.tsx`, `src/app/(dashboard)/addons-market/page.tsx`, `src/app/(dashboard)/profitability/page.tsx`, `src/app/(dashboard)/ai-tools/page.tsx`: move page shells, actions, and content grouping onto the shared components.
