-- GÓI GIÁ cho từng hạng phòng: cùng 1 hạng phòng có thể có nhiều gói
-- (Ăn sáng, 2 bữa HB, 3 bữa FB, All Inclusive, Commit, Combo…) — mỗi gói 1 dòng.
alter table public.hotel_rates add column if not exists rate_plan text;
