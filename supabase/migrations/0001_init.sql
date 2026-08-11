-- =========================================================
-- VivaTrip Check Căn — schema khởi tạo
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. PROFILES (mở rộng auth.users với role/name)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'sale' check (role in ('admin', 'sale')),
  created_at timestamptz not null default now()
);

-- Tự tạo profile khi có user mới đăng ký trong auth.users
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email), 'sale');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Hàm kiểm tra quyền admin, dùng lại nhiều nơi trong RLS
create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable set search_path = public;

-- ---------------------------------------------------------
-- 2. PRODUCTS
-- ---------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique not null,
  product_name text not null,
  type text not null check (type in ('villa', 'hotel', 'resort')),
  area text not null,
  address text,
  bedrooms int,
  beds int,
  standard_guests int,
  max_guests int,
  price numeric,
  pool boolean not null default false,
  near_beach boolean not null default false,
  karaoke boolean not null default false,
  bbq boolean not null default false,
  note text,
  google_maps_url text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_area_idx on public.products (area);
create index products_type_idx on public.products (type);
create index products_price_idx on public.products (price);

create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- 3. PRODUCT IMAGES
-- ---------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0
);

create index product_images_product_id_idx on public.product_images (product_id);

-- ---------------------------------------------------------
-- 4. HOTEL RATES (bảng giá — chỉ áp dụng cho type = 'hotel')
-- ---------------------------------------------------------
create table public.hotel_rates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  room_type text not null,
  price numeric not null,
  capacity int,
  breakfast boolean not null default false,
  extra_bed_price numeric,
  note text,
  updated_at timestamptz not null default now()
);

create index hotel_rates_product_id_idx on public.hotel_rates (product_id);

create trigger hotel_rates_set_updated_at
  before update on public.hotel_rates
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.hotel_rates enable row level security;

-- profiles: ai cũng xem được (để hiển thị tên trên UI), chỉ tự sửa được chính mình
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- products: Sale + Admin đều xem được toàn bộ; chỉ Admin được thêm/sửa/xóa
create policy "products_select_authenticated" on public.products
  for select to authenticated using (true);

create policy "products_insert_admin" on public.products
  for insert to authenticated with check (public.is_admin());

create policy "products_update_admin" on public.products
  for update to authenticated using (public.is_admin());

create policy "products_delete_admin" on public.products
  for delete to authenticated using (public.is_admin());

-- product_images: giống products
create policy "product_images_select_authenticated" on public.product_images
  for select to authenticated using (true);

create policy "product_images_write_admin" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- hotel_rates: giống products
create policy "hotel_rates_select_authenticated" on public.hotel_rates
  for select to authenticated using (true);

create policy "hotel_rates_write_admin" on public.hotel_rates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------
-- 6. STORAGE BUCKET cho ảnh sản phẩm
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_bucket_read_public" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_bucket_write_admin" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images' and public.is_admin()
  );

create policy "product_images_bucket_update_admin" on storage.objects
  for update to authenticated using (
    bucket_id = 'product-images' and public.is_admin()
  );

create policy "product_images_bucket_delete_admin" on storage.objects
  for delete to authenticated using (
    bucket_id = 'product-images' and public.is_admin()
  );
