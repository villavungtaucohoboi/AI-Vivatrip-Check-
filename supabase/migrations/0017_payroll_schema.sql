-- =========================================================
-- VivaTrip Check Căn — module BẢNG LƯƠNG (Giai đoạn 1)
-- Đăng nhập nhân viên riêng (mã NV + mật khẩu, không dùng chung
-- ADMIN_PASSWORD) + bảo mật thật ở tầng database, không chỉ ẩn giao diện.
--
-- QUAN TRỌNG VỀ BẢO MẬT: các bảng dưới đây KHÔNG có policy nào cho phép
-- anon/authenticated — nghĩa là app dùng NEXT_PUBLIC_SUPABASE_ANON_KEY (như
-- toàn bộ app hiện tại) sẽ KHÔNG đọc/ghi được gì ở đây dù có URL hay không.
-- Đường duy nhất để chạm vào dữ liệu lương là qua các route /api/payroll/*
-- (server-side), dùng SUPABASE_SERVICE_ROLE_KEY, và mỗi route tự kiểm tra
-- cookie phiên nhân viên đã ký trước khi lọc đúng employee_id của người đó.
-- =========================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.salary_schemes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id uuid references public.departments (id) on delete set null,
  effective_from date,
  effective_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mỗi "khoản" trong 1 cơ chế lương — linh hoạt như Excel, Admin tự thêm.
-- calculation_type quyết định cách đọc config_json:
--   fixed              -> config_json = { amount: 7000000 }
--   percentage_tiered  -> config_json = { tiers: [{min,max,rate}, ...] }  (tính THEO BẬC)
--   quantity_rate      -> config_json = { rate: 100000, unit: "booking" }
--   manual             -> config_json = {} (Admin nhập tay mỗi kỳ, không có công thức)
create table public.salary_components (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.salary_schemes (id) on delete cascade,
  name text not null,
  component_type text not null check (component_type in ('income', 'deduction', 'info')),
  calculation_type text not null check (calculation_type in ('fixed', 'manual', 'percentage_tiered', 'quantity_rate')),
  config_json jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  include_in_net_pay boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nhân viên — đăng nhập RIÊNG bằng mã NV + mật khẩu (bcrypt hash), KHÔNG
-- dùng chung ADMIN_PASSWORD. Không liên kết với bảng products/profiles hiện có.
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  position text,
  department_id uuid references public.departments (id) on delete set null,
  salary_scheme_id uuid references public.salary_schemes (id) on delete set null,
  password_hash text not null,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  month int not null check (month between 1 and 12),
  year int not null,
  status text not null default 'draft' check (status in ('draft', 'calculated', 'approved', 'locked')),
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  unique (month, year)
);

-- Snapshot toàn bộ cơ chế lương TẠI THỜI ĐIỂM chốt — đảm bảo sau này Admin
-- đổi % cơ chế thì các phiếu lương cũ đã chốt KHÔNG bị thay đổi theo.
create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references public.payroll_periods (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  scheme_snapshot jsonb not null default '{}'::jsonb,
  total_income bigint not null default 0,
  total_deduction bigint not null default 0,
  net_pay bigint not null default 0,
  status text not null default 'draft' check (status in ('draft', 'calculated', 'approved', 'locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_period_id, employee_id)
);

create table public.payslip_items (
  id uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references public.payslips (id) on delete cascade,
  component_name text not null,
  component_type text not null check (component_type in ('income', 'deduction', 'info')),
  calculation_type text not null,
  input_value jsonb,
  calculated_value bigint not null default 0,
  override_value bigint,
  override_reason text,
  breakdown_json jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.payroll_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  entity_type text not null,
  entity_id uuid,
  field text,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index employees_code_idx on public.employees (employee_code);
create index payslips_employee_idx on public.payslips (employee_id);
create index payslips_period_idx on public.payslips (payroll_period_id);
create index payslip_items_payslip_idx on public.payslip_items (payslip_id);
create index salary_components_scheme_idx on public.salary_components (scheme_id);

create trigger salary_schemes_set_updated_at before update on public.salary_schemes for each row execute procedure public.set_updated_at();
create trigger salary_components_set_updated_at before update on public.salary_components for each row execute procedure public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees for each row execute procedure public.set_updated_at();
create trigger payslips_set_updated_at before update on public.payslips for each row execute procedure public.set_updated_at();

-- =========================================================
-- RLS: bật nhưng KHÔNG tạo bất kỳ policy nào cho anon/authenticated.
-- Mặc định Postgres RLS là DENY ALL khi không có policy khớp — đây chính là
-- hàng rào bảo mật thật sự, không phải chỉ ẩn ở giao diện.
-- =========================================================
alter table public.departments enable row level security;
alter table public.salary_schemes enable row level security;
alter table public.salary_components enable row level security;
alter table public.employees enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payslips enable row level security;
alter table public.payslip_items enable row level security;
alter table public.payroll_audit_logs enable row level security;
