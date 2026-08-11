-- =========================================================
-- Cập nhật dữ liệu mẫu cho bảng giá theo thứ/ngày lễ
-- Chạy sau 0002_pricing.sql, an toàn để chạy lại (dùng UPDATE theo product_code)
-- =========================================================

update public.products set
  price_weekday = v.weekday, price_friday_sunday = v.friday_sunday,
  price_saturday_holiday = v.sat_holiday, discount_percent = v.discount,
  price = v.weekday
from (values
  ('VIL-PTH-001', 7300000::numeric, 9800000::numeric, 12300000::numeric, 10::numeric),
  ('RES-PTH-001', 11600000, 15500000, 19400000, 5),
  ('VIL-VTU-001', 5400000, 7200000, 9000000, 10),
  ('RES-VTU-001', 13500000, 18000000, 22500000, 5),
  ('VIL-HLG-001', 10100000, 13500000, 16900000, 10),
  ('RES-HLG-001', 16500000, 22000000, 27500000, 5),
  ('VIL-NTR-001', 6500000, 8600000, 10800000, 10),
  ('RES-NTR-001', 18800000, 25000000, 31300000, 5),
  ('VIL-PQC-001', 12600000, 16800000, 21000000, 10),
  ('RES-PQC-001', 21000000, 28000000, 35000000, 5)
) as v(code, weekday, friday_sunday, sat_holiday, discount)
where products.product_code = v.code;

insert into public.holidays (holiday_date, holiday_name) values
  ('2026-09-02', 'Quốc khánh'),
  ('2027-01-01', 'Tết dương lịch')
on conflict (holiday_date) do nothing;
