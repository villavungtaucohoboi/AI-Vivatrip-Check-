-- =========================================================
-- Du thuyền: phân loại (Day Cruise / Dinner Cruise; Vịnh Hạ Long / Vịnh Lan Hạ)
-- và giá trẻ em theo khoảng tuổi "từ ... đến ... tuổi". Chạy SAU 0023. Chạy lại an toàn.
-- =========================================================
alter table public.cruises add column if not exists variant text;
-- day:   'day_cruise' | 'dinner_cruise'      night: 'ha_long' | 'lan_ha'

alter table public.cruise_child_prices
  add column if not exists age_from int check (age_from is null or age_from >= 0),
  add column if not exists age_to int check (age_to is null or age_to >= 0);

NOTIFY pgrst, 'reload schema';
