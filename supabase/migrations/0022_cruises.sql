-- =========================================================
-- VivaTrip Check Căn — mục "Du thuyền Hạ Long"
-- Không đụng tới bảng/module hiện có (products, hotel_rates, ...).
-- Du thuyền tách riêng 2 nhóm: category = 'day' (trong ngày) | 'night' (qua đêm).
-- File lịch trình dùng chung bucket "product-images" (thư mục cruise-files/).
-- =========================================================

create table public.cruises (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('day', 'night')),
  name text not null,
  duration_label text,
  star int check (star between 1 and 5),
  price_adult bigint not null default 0 check (price_adult >= 0),
  price_child bigint not null default 0 check (price_child >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  -- [{ "label": "Ăn trưa buffet", "included": true }, ...]
  meals jsonb not null default '[]'::jsonb,
  -- ["xe", "kayak", "hang", ...] — danh sách mã dịch vụ được tích "bao gồm"
  services jsonb not null default '[]'::jsonb,
  -- mỗi dòng 1 mốc: "giờ | nội dung"
  itinerary text not null default '',
  note text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cruise_cabins (
  id uuid primary key default gen_random_uuid(),
  cruise_id uuid not null references public.cruises (id) on delete cascade,
  name text not null,
  price bigint not null default 0 check (price >= 0),
  sort_order int not null default 0
);

create table public.cruise_files (
  id uuid primary key default gen_random_uuid(),
  cruise_id uuid not null references public.cruises (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index cruises_category_idx on public.cruises (category, sort_order);
create index cruise_cabins_cruise_id_idx on public.cruise_cabins (cruise_id);
create index cruise_files_cruise_id_idx on public.cruise_files (cruise_id);

create trigger cruises_set_updated_at
  before update on public.cruises
  for each row execute procedure public.set_updated_at();

alter table public.cruises enable row level security;
alter table public.cruise_cabins enable row level security;
alter table public.cruise_files enable row level security;

-- RLS mở giống toàn bộ app hiện tại — chặn Sale sửa/xóa được xử lý ở tầng
-- ứng dụng (API ghi nằm dưới /api/admin/*, middleware bảo vệ bằng mật khẩu Admin).
create policy "cruises_all_public" on public.cruises
  for all to anon, authenticated using (true) with check (true);
create policy "cruise_cabins_all_public" on public.cruise_cabins
  for all to anon, authenticated using (true) with check (true);
create policy "cruise_files_all_public" on public.cruise_files
  for all to anon, authenticated using (true) with check (true);
