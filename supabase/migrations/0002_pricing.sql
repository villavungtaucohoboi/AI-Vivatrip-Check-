-- =========================================================
-- VivaTrip Check Căn — bảng giá theo thứ / ngày lễ + chiết khấu
-- Chạy SAU 0001_init.sql (và sau seed.sql nếu đã chạy)
-- =========================================================

-- ---------------------------------------------------------
-- 1. Thêm cột giá theo khung ngày cho products (áp dụng cho villa/resort;
--    hotel tiếp tục dùng `price` + bảng hotel_rates như cũ, không đổi).
-- ---------------------------------------------------------
alter table public.products
  add column if not exists price_weekday numeric,
  add column if not exists price_friday_sunday numeric,
  add column if not exists price_saturday_holiday numeric,
  add column if not exists discount_percent numeric not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

comment on column public.products.price is
  'Villa/resort: bằng price_weekday, chỉ để tham khảo/sort nhanh khi không có ngày cụ thể. Hotel: giá phòng thấp nhất, nhập tay như cũ.';
comment on column public.products.price_weekday is 'Giá Thứ 2 - Thứ 5 (villa/resort)';
comment on column public.products.price_friday_sunday is 'Giá Thứ 6 & Chủ nhật (villa/resort)';
comment on column public.products.price_saturday_holiday is 'Giá Thứ 7 & Ngày lễ (villa/resort)';

-- ---------------------------------------------------------
-- 2. Bảng ngày lễ — dùng chung cho toàn bộ app, Admin quản lý qua UI
-- ---------------------------------------------------------
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  holiday_name text not null,
  created_at timestamptz not null default now()
);

create index holidays_date_idx on public.holidays (holiday_date);

alter table public.holidays enable row level security;

create policy "holidays_select_authenticated" on public.holidays
  for select to authenticated using (true);

create policy "holidays_write_admin" on public.holidays
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
