-- =========================================================
-- VivaTrip Check Căn — Bảng lương: dữ liệu mẫu để test đăng nhập ngay
-- =========================================================

create extension if not exists pgcrypto;

insert into public.departments (name) values ('Sale'), ('Sản phẩm'), ('Điều hành');

with dept_sale as (select id from public.departments where name = 'Sale')
insert into public.salary_schemes (name, department_id, effective_from, active)
select 'SALE 2026', dept_sale.id, '2026-01-01', true from dept_sale;

with scheme as (select id from public.salary_schemes where name = 'SALE 2026')
insert into public.salary_components (scheme_id, name, component_type, calculation_type, config_json, sort_order)
select scheme.id, v.name, v.ctype, v.calc, v.config::jsonb, v.sort
from scheme, (values
  ('Lương cơ bản', 'income', 'fixed', '{"amount": 6000000}', 1),
  ('Phụ cấp', 'income', 'fixed', '{"amount": 800000}', 2),
  ('Hoa hồng khách mới', 'income', 'percentage_tiered',
    '{"tiers": [{"min":0,"max":50000000,"rate":7}, {"min":50000000,"max":80000000,"rate":10}, {"min":80000000,"max":null,"rate":12}]}', 3),
  ('Hoa hồng khách cũ', 'income', 'percentage_tiered', '{"tiers": [{"min":0,"max":null,"rate":15}]}', 4),
  ('Hoa hồng khách tiktok', 'income', 'percentage_tiered', '{"tiers": [{"min":0,"max":null,"rate":8}]}', 5),
  ('Thưởng booking', 'income', 'quantity_rate', '{"rate": 100000, "unit": "booking"}', 6),
  ('Bảo hiểm', 'deduction', 'manual', '{}', 7)
) as v(name, ctype, calc, config, sort);

with dept_sp as (select id from public.departments where name = 'Sản phẩm')
insert into public.salary_schemes (name, department_id, effective_from, active)
select 'SẢN PHẨM 2026', dept_sp.id, '2026-01-01', true from dept_sp;

with scheme as (select id from public.salary_schemes where name = 'SẢN PHẨM 2026')
insert into public.salary_components (scheme_id, name, component_type, calculation_type, config_json, sort_order)
select scheme.id, v.name, v.ctype, v.calc, v.config::jsonb, v.sort
from scheme, (values
  ('Lương cơ bản', 'income', 'fixed', '{"amount": 7000000}', 1),
  ('Phụ cấp', 'income', 'fixed', '{"amount": 1000000}', 2),
  ('Hoa hồng check-in', 'income', 'percentage_tiered',
    '{"tiers": [{"min":0,"max":50000000,"rate":10}, {"min":50000000,"max":null,"rate":13}]}', 3),
  ('Thưởng booking', 'income', 'quantity_rate', '{"rate": 100000, "unit": "booking"}', 4),
  ('Thưởng KPI', 'income', 'manual', '{}', 5),
  ('Bảo hiểm', 'deduction', 'manual', '{}', 6),
  ('Tạm ứng', 'deduction', 'manual', '{}', 7)
) as v(name, ctype, calc, config, sort);

with dept_sp as (select id from public.departments where name = 'Sản phẩm'),
     scheme_sp as (select id from public.salary_schemes where name = 'SẢN PHẨM 2026')
insert into public.employees (employee_code, full_name, position, department_id, salary_scheme_id, password_hash, must_change_password)
select 'NV001', 'Lê Thanh Thảo', 'Nhân viên Sản phẩm', dept_sp.id, scheme_sp.id, crypt('123456', gen_salt('bf', 10)), true
from dept_sp, scheme_sp;

with dept_sale as (select id from public.departments where name = 'Sale'),
     scheme_sale as (select id from public.salary_schemes where name = 'SALE 2026')
insert into public.employees (employee_code, full_name, position, department_id, salary_scheme_id, password_hash, must_change_password)
select 'NV002', 'Nguyễn Minh Quân', 'Sale — Chuyên viên tư vấn', dept_sale.id, scheme_sale.id, crypt('123456', gen_salt('bf', 10)), true
from dept_sale, scheme_sale;

insert into public.payroll_periods (month, year, status) values (8, 2026, 'approved');

with period as (select id from public.payroll_periods where month=8 and year=2026),
     emp as (select id from public.employees where employee_code='NV001')
insert into public.payslips (payroll_period_id, employee_id, scheme_snapshot, total_income, total_deduction, net_pay, status)
select period.id, emp.id, '{}'::jsonb, 22100000, 1155079, 20944921, 'approved'
from period, emp;

with slip as (select p.id from public.payslips p join public.employees e on e.id=p.employee_id where e.employee_code='NV001')
insert into public.payslip_items (payslip_id, component_name, component_type, calculation_type, calculated_value, breakdown_json, sort_order)
select slip.id, v.name, v.ctype, v.calc, v.val, v.breakdown::jsonb, v.sort
from slip, (values
  ('Lương cơ bản', 'income', 'fixed', 7000000, null, 1),
  ('Phụ cấp', 'income', 'fixed', 1000000, null, 2),
  ('Hoa hồng check-in', 'income', 'percentage_tiered', 7600000,
    '{"revenue": 70000000, "breakdown": [{"range":"0 – 50tr","rate":"10%","base":50000000,"result":5000000},{"range":"50tr – trở lên","rate":"13%","base":20000000,"result":2600000}]}', 3),
  ('Thưởng booking', 'income', 'quantity_rate', 5500000, '{"qty": 55, "rate": 100000}', 4),
  ('Thưởng KPI', 'income', 'manual', 1000000, null, 5),
  ('Bảo hiểm', 'deduction', 'manual', -557500, null, 6),
  ('Tạm ứng', 'deduction', 'manual', -597579, null, 7)
) as v(name, ctype, calc, val, breakdown, sort);

with period as (select id from public.payroll_periods where month=8 and year=2026),
     emp as (select id from public.employees where employee_code='NV002')
insert into public.payslips (payroll_period_id, employee_id, scheme_snapshot, total_income, total_deduction, net_pay, status)
select period.id, emp.id, '{}'::jsonb, 23380000, 480000, 22900000, 'approved'
from period, emp;

with slip as (select p.id from public.payslips p join public.employees e on e.id=p.employee_id where e.employee_code='NV002')
insert into public.payslip_items (payslip_id, component_name, component_type, calculation_type, calculated_value, breakdown_json, sort_order)
select slip.id, v.name, v.ctype, v.calc, v.val, v.breakdown::jsonb, v.sort
from slip, (values
  ('Lương cơ bản', 'income', 'fixed', 6000000, null, 1),
  ('Phụ cấp', 'income', 'fixed', 800000, null, 2),
  ('Hoa hồng khách mới', 'income', 'percentage_tiered', 4500000,
    '{"revenue": 60000000, "breakdown": [{"range":"0 – 50tr","rate":"7%","base":50000000,"result":3500000},{"range":"50tr – 80tr","rate":"10%","base":10000000,"result":1000000}]}', 3),
  ('Hoa hồng khách cũ', 'income', 'percentage_tiered', 4500000,
    '{"revenue": 30000000, "breakdown": [{"range":"0 – trở lên","rate":"15%","base":30000000,"result":4500000}]}', 4),
  ('Hoa hồng khách tiktok', 'income', 'percentage_tiered', 1280000,
    '{"revenue": 16000000, "breakdown": [{"range":"0 – trở lên","rate":"8%","base":16000000,"result":1280000}]}', 5),
  ('Thưởng booking', 'income', 'quantity_rate', 6300000, '{"qty": 63, "rate": 100000}', 6),
  ('Bảo hiểm', 'deduction', 'manual', -480000, null, 7)
) as v(name, ctype, calc, val, breakdown, sort);
