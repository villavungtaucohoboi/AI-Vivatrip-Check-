-- =========================================================
-- VivaTrip Check Căn — tách "View biển" và "Sát biển" thành 2 tiện ích riêng
-- (trước đây chỉ có 1 cột near_beach dùng chung)
-- =========================================================

alter table public.products
  add column if not exists sea_view boolean not null default false;

comment on column public.products.sea_view is 'Có view biển (nhìn thấy biển, không nhất thiết sát biển)';
comment on column public.products.near_beach is 'Sát biển / đi bộ ra biển được ngay';

-- Dữ liệu cũ: sản phẩm nào đã tick "Gần biển" trước đây, coi như vừa có view vừa sát biển
update public.products set sea_view = true where near_beach = true;
