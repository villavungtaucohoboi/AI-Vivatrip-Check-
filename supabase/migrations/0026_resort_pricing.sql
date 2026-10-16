-- BẢNG GIÁ RESORT / KHÁCH SẠN THEO MÙA
-- Chỉ THÊM cột mới, không sửa / xoá dữ liệu cũ.

-- Mỗi hạng phòng: 5 mức giá (thấp/cao điểm × ngày thường/cuối tuần + lễ Tết)
alter table public.hotel_rates add column if not exists area_m2 int;
alter table public.hotel_rates add column if not exists bed text;
alter table public.hotel_rates add column if not exists price_low_weekday numeric;
alter table public.hotel_rates add column if not exists price_low_weekend numeric;
alter table public.hotel_rates add column if not exists price_high_weekday numeric;
alter table public.hotel_rates add column if not exists price_high_weekend numeric;
alter table public.hotel_rates add column if not exists price_holiday numeric;
alter table public.hotel_rates add column if not exists discount_percent numeric not null default 0;
alter table public.hotel_rates add column if not exists sort_order int not null default 0;

-- Giá cũ (cột price) coi như giá thấp điểm ngày thường
update public.hotel_rates set price_low_weekday = price where price_low_weekday is null;

-- Cài đặt riêng từng resort
alter table public.products add column if not exists high_seasons jsonb not null default '[]'::jsonb; -- [{"from":"06-01","to":"08-31"}]
alter table public.products add column if not exists weekend_nights int[] not null default '{5,6}';     -- đêm T6 (5), T7 (6)
alter table public.products add column if not exists surcharge_note text;     -- phụ thu (Sale xem)
alter table public.products add column if not exists contract_summary text;   -- tóm tắt hợp đồng (chỉ Sale xem)
