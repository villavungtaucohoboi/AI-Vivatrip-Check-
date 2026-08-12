-- =========================================================
-- VivaTrip Check Căn — chiết khấu: 2 chế độ chọn được
-- Mục 1 "uniform": 1 mức chiết khấu (percent/amount) áp dụng chung cả 3 khung giá
-- Mục 2 "by_day_type": chiết khấu riêng cho ngày thường và cuối tuần (T6,T7,CN,lễ)
-- =========================================================

alter table public.products
  add column if not exists discount_scheme text not null default 'uniform'
    check (discount_scheme in ('uniform', 'by_day_type')),
  add column if not exists discount_type text not null default 'percent'
    check (discount_type in ('percent', 'amount')),
  add column if not exists discount_value numeric not null default 0,
  add column if not exists discount_weekday_type text not null default 'percent'
    check (discount_weekday_type in ('percent', 'amount')),
  add column if not exists discount_weekday_value numeric not null default 0,
  add column if not exists discount_weekend_type text not null default 'percent'
    check (discount_weekend_type in ('percent', 'amount')),
  add column if not exists discount_weekend_value numeric not null default 0;

comment on column public.products.discount_scheme is
  'uniform: 1 mức chiết khấu chung 3 khung giá. by_day_type: chiết khấu riêng ngày thường/cuối tuần';
comment on column public.products.discount_weekend_value is
  'Chiết khấu áp dụng cho cả khung Thứ 6&CN và Thứ 7&Lễ (gộp chung "cuối tuần")';

-- Chuyển dữ liệu discount_percent cũ (nếu có) sang chế độ "uniform" mới
update public.products
set discount_scheme = 'uniform', discount_type = 'percent', discount_value = discount_percent
where type <> 'hotel' and discount_percent is not null and discount_percent > 0;
