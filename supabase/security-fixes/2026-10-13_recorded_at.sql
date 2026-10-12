-- وقت التسجيل الفعلي (غير تاريخ الفاتورة): فاتورة بتاريخ قديم تنسجل اليوم لازم تطلع بآخر الحركات ومشتريات اليوم
-- created_at يبقى تاريخ الفاتورة (للمحاسبة والضريبة والفترات)، recorded_at = لحظة الإدخال
alter table public.purchases add column if not exists recorded_at timestamptz;
-- تعبئة القديم = تاريخه نفسه. قفل الشهور يمنع أي تعديل على فواتير شهر مقفل — نوقفه لهالتعبئة بس (ما تغيّر أي رقم)
begin;
alter table public.purchases disable trigger trg_purchases_period_guard;
update public.purchases set recorded_at = created_at where recorded_at is null;
alter table public.purchases enable trigger trg_purchases_period_guard;
commit;
alter table public.purchases alter column recorded_at set default now(), alter column recorded_at set not null;
create index if not exists purchases_org_recorded_idx on public.purchases (org_id, recorded_at desc);

alter table public.stock_movements add column if not exists recorded_at timestamptz;
update public.stock_movements set recorded_at = created_at where recorded_at is null;
alter table public.stock_movements alter column recorded_at set default now(), alter column recorded_at set not null;
create index if not exists stock_movements_org_recorded_idx on public.stock_movements (org_id, recorded_at desc);
