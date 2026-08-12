-- =========================================================
-- VivaTrip Check Căn — thêm 2 tiện ích lọc: Sân pickleball, View hồ
-- =========================================================

alter table public.products
  add column if not exists pickleball boolean not null default false,
  add column if not exists near_lake boolean not null default false;

comment on column public.products.pickleball is 'Có sân pickleball';
comment on column public.products.near_lake is 'Có view hồ / gần hồ (không phân biệt tên hồ cụ thể)';
