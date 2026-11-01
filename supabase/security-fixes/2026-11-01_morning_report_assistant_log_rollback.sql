-- رجوع عن 2026-11-01_morning_report_assistant_log.sql (يمسح سجل الأسئلة وأرقام المدراء)
drop table if exists public.assistant_questions;
alter table public.profiles drop column if exists report_whatsapp;
