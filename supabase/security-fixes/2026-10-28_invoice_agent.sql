-- 2026-10-28 وكيل الفواتير: العميل يرفع الفاتورة، الوكيل يقرأها ويطابق أصنافها مع المخزون،
-- يسجّل الواضح ويسأل عن المشكوك فيه — وبعد تأكيد العميل تنحفظ كمشتريات (بنفس منطق الحفظ الحالي).
begin;
create table if not exists public.invoice_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  created_by uuid,
  invoice_image text,
  supplier text,
  supplier_vat_number text,
  invoice_number text,
  invoice_date date,
  has_vat boolean not null default true,
  total numeric,
  items jsonb not null default '[]'::jsonb,   -- [{name, qty, unit, total, status: matched|ask|new|skip, product_id, candidates}]
  status text not null default 'needs_review' check (status in ('needs_review', 'ready', 'saved', 'cancelled')),
  result_summary text,
  created_at timestamptz not null default now(),
  saved_at timestamptz
);
create index if not exists invoice_drafts_org_status on public.invoice_drafts (org_id, status, created_at desc);
alter table public.invoice_drafts enable row level security;
revoke all on public.invoice_drafts from anon, authenticated, public;

-- اللي يتعلمه الوكيل: «اسم الصنف كما يجي بالفاتورة» → صنف المخزون
create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alias_norm text not null,
  created_at timestamptz not null default now(),
  unique (org_id, alias_norm)
);
alter table public.product_aliases enable row level security;
revoke all on public.product_aliases from anon, authenticated, public;

drop trigger if exists trg_org_live_ping on public.invoice_drafts;
create trigger trg_org_live_ping after insert or update or delete on public.invoice_drafts for each row execute function public.org_live_ping();
commit;
