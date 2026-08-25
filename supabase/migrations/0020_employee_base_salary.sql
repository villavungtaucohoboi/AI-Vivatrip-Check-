-- =========================================================
-- VivaTrip Check Căn — Bảng lương: lương cố định gắn theo NHÂN VIÊN
-- thay vì nằm trong cơ chế chung. Mỗi nhân viên có mức mặc định riêng
-- (Lương cố định / Phụ cấp / Bảo hiểm), đổi mặc định không ảnh hưởng các
-- kỳ lương đã tính trước đó.
-- =========================================================

alter table public.employees
  add column if not exists base_salary bigint not null default 0,
  add column if not exists default_allowance bigint not null default 0,
  add column if not exists default_insurance bigint not null default 0;

comment on column public.employees.base_salary is 'Mức lương cố định MẶC ĐỊNH — kỳ lương mới tự lấy theo số này, sửa riêng từng kỳ không ảnh hưởng số này trừ khi Admin chọn "cập nhật làm mặc định".';
comment on column public.employees.default_allowance is 'Phụ cấp mặc định — tương tự base_salary.';
comment on column public.employees.default_insurance is 'Bảo hiểm mặc định (khấu trừ) — tương tự base_salary.';

do $$
declare
  comp record;
begin
  for comp in
    select sc.id, sc.scheme_id, sc.name, (sc.config_json->>'amount')::bigint as amount
    from public.salary_components sc
    where sc.calculation_type = 'fixed' and sc.name in ('Lương cơ bản', 'Phụ cấp')
  loop
    if comp.name = 'Lương cơ bản' then
      update public.employees set base_salary = coalesce(comp.amount, 0)
      where salary_scheme_id = comp.scheme_id and base_salary = 0;
    elsif comp.name = 'Phụ cấp' then
      update public.employees set default_allowance = coalesce(comp.amount, 0)
      where salary_scheme_id = comp.scheme_id and default_allowance = 0;
    end if;
  end loop;

  delete from public.salary_components
  where calculation_type = 'fixed' and name in ('Lương cơ bản', 'Phụ cấp');
end $$;
