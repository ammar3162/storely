# Storely UI System

Reusable frontend-only components for the Storely enterprise SaaS redesign.

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
