-- تاريخ بداية عمل الموظف — راتب الشهر الأول بنسبة الأيام من هذا التاريخ (lib/payroll)
-- 1) العمود بدون قيمة افتراضية → الموظفين الحاليين يبقون NULL (راتبهم كامل كما هو، لا يتغيّر معنى أي بيانات موجودة)
-- 2) بعدها القيمة الافتراضية للموظفين الجدد = تاريخ اليوم بتوقيت الرياض
-- لا يحذف ولا يعدّل أي بيانات. صلاحيات الجدول (RLS) كما هي — العمود يُقرأ ويُكتب من الخادم فقط.
alter table public.staff_members add column if not exists employment_start date;
alter table public.staff_members alter column employment_start set default ((now() at time zone 'Asia/Riyadh')::date);
comment on column public.staff_members.employment_start is 'أول يوم عمل — الشهر الأول بنسبة الأيام. NULL = موظف قديم، راتب كامل';
