-- =========================================================
-- VivaTrip Check Căn — module "Quỹ ngày lễ" (Holiday Fund Board)
-- Không đụng tới bảng/schema hiện có (products, hotel_rates, holidays...).
-- =========================================================

create table public.holiday_fund_sheets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_year int not null default extract(year from now())::int,
  sort_order int not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.holiday_fund_posts (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.holiday_fund_sheets (id) on delete cascade,
  author_name text not null,
  -- Không có hệ thống tài khoản đầy đủ (app dùng 1 mật khẩu chung cho Admin) —
  -- poster_token là 1 mã ngẫu nhiên lưu trên trình duyệt người đăng, dùng để nhận
  -- diện "bài của mình" khi sửa/xóa. Đây là nhận diện nhẹ, không phải bảo mật mạnh.
  poster_token text not null,
  raw_content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.holiday_fund_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.holiday_fund_posts (id) on delete cascade,
  sheet_id uuid not null references public.holiday_fund_sheets (id) on delete cascade,
  name text,
  fund_date date,
  price numeric,
  raw_line text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.holiday_fund_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.holiday_fund_posts (id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index holiday_fund_posts_sheet_id_idx on public.holiday_fund_posts (sheet_id);
create index holiday_fund_items_post_id_idx on public.holiday_fund_items (post_id);
create index holiday_fund_items_sheet_id_idx on public.holiday_fund_items (sheet_id);
create index holiday_fund_items_fund_date_idx on public.holiday_fund_items (fund_date);
create index holiday_fund_images_post_id_idx on public.holiday_fund_images (post_id);

create trigger holiday_fund_sheets_set_updated_at
  before update on public.holiday_fund_sheets
  for each row execute procedure public.set_updated_at();

create trigger holiday_fund_posts_set_updated_at
  before update on public.holiday_fund_posts
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- RLS — mở giống toàn bộ app hiện tại (app không dùng Supabase Auth,
-- việc chặn Admin/Sale xử lý ở tầng ứng dụng bằng mật khẩu chung + poster_token)
-- ---------------------------------------------------------
alter table public.holiday_fund_sheets enable row level security;
alter table public.holiday_fund_posts enable row level security;
alter table public.holiday_fund_items enable row level security;
alter table public.holiday_fund_images enable row level security;

create policy "holiday_fund_sheets_all_public" on public.holiday_fund_sheets
  for all to anon, authenticated using (true) with check (true);
create policy "holiday_fund_posts_all_public" on public.holiday_fund_posts
  for all to anon, authenticated using (true) with check (true);
create policy "holiday_fund_items_all_public" on public.holiday_fund_items
  for all to anon, authenticated using (true) with check (true);
create policy "holiday_fund_images_all_public" on public.holiday_fund_images
  for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------
-- Storage bucket riêng cho ảnh Quỹ ngày lễ
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('holiday-fund-images', 'holiday-fund-images', true)
on conflict (id) do nothing;

create policy "holiday_fund_images_bucket_read_public" on storage.objects
  for select using (bucket_id = 'holiday-fund-images');

create policy "holiday_fund_images_bucket_write_public" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'holiday-fund-images');

create policy "holiday_fund_images_bucket_delete_public" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'holiday-fund-images');
