-- استرجاع 2026-09-24_extra_branch_addon.sql (بعد إرجاع الكود القديم)
begin;

update organizations o
set max_branches = b.max_branches
from _bak_2026_09_24_max_branches b
where b.id = o.id;

update marketplace_addons a
set monthly_price = b.monthly_price, is_active = b.is_active
from _bak_2026_09_24_extra_branch_addon b
where b.id = a.id;

commit;
