-- =========================================================
-- VivaTrip Check Căn — module "Link check lịch trống"
-- Không đụng tới bảng/module hiện có (products, holiday_fund_*, ...).
-- Ghim (favorites) và lịch sử mở link lưu ở trình duyệt (localStorage),
-- không tạo bảng DB riêng cho 2 việc đó — đơn giản hơn, không cần hệ
-- thống tài khoản thật (app hiện chỉ có 1 mật khẩu Admin dùng chung).
-- =========================================================

create table public.availability_link_regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.availability_links (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.availability_link_regions (id) on delete cascade,
  name text not null,
  url text not null,
  note text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index availability_links_region_id_idx on public.availability_links (region_id);

create trigger availability_link_regions_set_updated_at
  before update on public.availability_link_regions
  for each row execute procedure public.set_updated_at();

create trigger availability_links_set_updated_at
  before update on public.availability_links
  for each row execute procedure public.set_updated_at();

alter table public.availability_link_regions enable row level security;
alter table public.availability_links enable row level security;

-- RLS mở giống toàn bộ app hiện tại — chặn Sale sửa/xóa được xử lý ở tầng
-- ứng dụng (API thêm/sửa/xóa nằm dưới /api/admin/*, middleware đã bảo vệ
-- bằng mật khẩu Admin), không phải ở RLS.
create policy "availability_link_regions_all_public" on public.availability_link_regions
  for all to anon, authenticated using (true) with check (true);
create policy "availability_links_all_public" on public.availability_links
  for all to anon, authenticated using (true) with check (true);
