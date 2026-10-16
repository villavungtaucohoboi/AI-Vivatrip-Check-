-- GIAI ĐOẠN GIÁ LINH HOẠT + HOMESTAY + HẠNG SAO + QUYỀN LỢI
-- Chỉ THÊM cột / nới điều kiện, không xoá dữ liệu cũ.

-- Cho phép loại sản phẩm "homestay"
alter table public.products drop constraint if exists products_type_check;
alter table public.products add constraint products_type_check check (type in ('villa', 'hotel', 'resort', 'homestay'));

-- Giai đoạn giá của từng resort, VD:
-- [{"key":"p1","name":"Giai đoạn thường","ranges":[{"from":"2026-01-02","to":"2026-05-31"},{"from":"2026-09-03","to":"2026-12-23"}]},
--  {"key":"p2","name":"Cao điểm","ranges":[{"from":"2026-06-01","to":"2026-09-02"}]},
--  {"key":"p3","name":"Đỉnh điểm","ranges":[{"from":"2026-12-24","to":"2026-12-31"}]}]
alter table public.products add column if not exists rate_periods jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists star int;            -- hạng sao
alter table public.products add column if not exists perks text;          -- quyền lợi / tiện ích bao gồm (gửi khách được)
alter table public.products add column if not exists image_link text;     -- link album ảnh gốc (Sale xem)

-- Giá từng hạng phòng theo giai đoạn: {"p1":{"wd":1700000,"we":null},"p2":{"wd":1900000,"we":null}}
alter table public.hotel_rates add column if not exists period_prices jsonb not null default '{}'::jsonb;
alter table public.hotel_rates add column if not exists max_children int;  -- số trẻ em tối đa / phòng
