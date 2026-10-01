-- نسخة مشفّرة (AES-256-GCM) من رمز PIN للموظف، يقدر المالك يعرضها بأيقونة العين.
-- الدخول يبقى على الـ bcrypt في عمود pin. التشفير/فك التشفير في الخادم فقط (src/lib/pinVault.ts).
alter table public.staff_members add column if not exists pin_enc text;
