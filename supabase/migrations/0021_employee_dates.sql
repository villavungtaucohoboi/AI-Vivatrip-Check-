-- =========================================================
-- VivaTrip Check Căn — thêm Ngày vào làm + Ngày sinh cho nhân viên
-- =========================================================

alter table public.employees
  add column if not exists join_date date,
  add column if not exists date_of_birth date;

comment on column public.employees.join_date is 'Ngày vào làm — không bắt buộc.';
comment on column public.employees.date_of_birth is 'Ngày tháng năm sinh — không bắt buộc.';
