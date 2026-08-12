-- =========================================================
-- VivaTrip Check Căn — tách chiết khấu "cuối tuần" (Mục 2) thành đúng
-- 3 khung riêng biệt, khớp 1-1 với 3 khung giá: Thứ 2-Thứ 5, Thứ 6 & CN,
-- Thứ 7 & Ngày lễ — không gộp Thứ 6/CN/Thứ 7 chung 1 mức nữa.
-- =========================================================

alter table public.products
  add column if not exists discount_friday_sunday_type text not null default 'percent'
    check (discount_friday_sunday_type in ('percent', 'amount')),
  add column if not exists discount_friday_sunday_value numeric not null default 0,
  add column if not exists discount_saturday_holiday_type text not null default 'percent'
    check (discount_saturday_holiday_type in ('percent', 'amount')),
  add column if not exists discount_saturday_holiday_value numeric not null default 0;

-- Chuyển dữ liệu chiết khấu "cuối tuần" cũ (nếu có) sang cho cả 2 khung mới,
-- để không mất cấu hình admin đã nhập trước đó.
update public.products
set
  discount_friday_sunday_type = discount_weekend_type,
  discount_friday_sunday_value = discount_weekend_value,
  discount_saturday_holiday_type = discount_weekend_type,
  discount_saturday_holiday_value = discount_weekend_value
where discount_scheme = 'by_day_type';

alter table public.products
  drop column if exists discount_weekend_type,
  drop column if exists discount_weekend_value;
