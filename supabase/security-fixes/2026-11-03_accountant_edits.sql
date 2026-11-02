-- المحاسب يعدّل إقفالات الكاشير والمصروفات وفواتير المشتريات من بوابته
-- كل تعديل ينحفظ بقيمه قبل وبعد ومصدره (المالك أو المحاسب)، والمالك يقدر يرجّعه
-- أعمدة جديدة فاضية + جدول سجل جديد: ما تغيّر أي بيانات موجودة

-- مصدر آخر تعديل على الإقفال (فاضي = ما انعدّل أو انعدّل قبل هالميزة من المالك)
alter table public.cashier_closings add column if not exists edited_source text;

-- سجل تعديلات الإقفال: مين عدّل (مالك/محاسب) وهل انرجع التعديل
alter table public.cashier_closing_edits add column if not exists source text not null default 'owner';
alter table public.cashier_closing_edits add column if not exists accountant_id uuid;
alter table public.cashier_closing_edits add column if not exists reverted_at timestamptz;
alter table public.cashier_closing_edits add column if not exists reverted_by text;

-- علامة «معدّل» على فاتورة المشتريات
alter table public.purchases add column if not exists edited_at timestamptz;
alter table public.purchases add column if not exists edited_by text;
alter table public.purchases add column if not exists edited_source text;

-- سجل تعديلات المشتريات (batch_id يجمع سطور نفس الفاتورة اللي انعدّلت مع بعض)
create table if not exists public.purchase_edits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  purchase_id uuid not null,
  batch_id uuid not null,
  source text not null default 'owner',
  accountant_id uuid,
  before jsonb not null,
  after jsonb not null,
  edited_by text,
  reverted_at timestamptz,
  reverted_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchase_edits_purchase on public.purchase_edits (purchase_id, created_at desc);
create index if not exists idx_purchase_edits_batch on public.purchase_edits (batch_id);
create index if not exists idx_purchase_edits_org on public.purchase_edits (org_id, created_at desc);
alter table public.purchase_edits enable row level security;
revoke all on public.purchase_edits from anon, authenticated, public;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashier_closings_edited_source_check') then
    alter table public.cashier_closings add constraint cashier_closings_edited_source_check check (edited_source is null or edited_source in ('owner','accountant'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cashier_closing_edits_source_check') then
    alter table public.cashier_closing_edits add constraint cashier_closing_edits_source_check check (source in ('owner','accountant'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'purchases_edited_source_check') then
    alter table public.purchases add constraint purchases_edited_source_check check (edited_source is null or edited_source in ('owner','accountant'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'purchase_edits_source_check') then
    alter table public.purchase_edits add constraint purchase_edits_source_check check (source in ('owner','accountant'));
  end if;
end $$;

notify pgrst, 'reload schema';
