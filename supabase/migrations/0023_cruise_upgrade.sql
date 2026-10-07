-- =========================================================
-- Nâng cấp Du thuyền: ảnh, giá trẻ em theo mốc tuổi, hạng 3-6 sao,
-- số chỗ / số cabin, link lịch trình. Chạy SAU 0022_cruises.sql.
-- An toàn chạy nhiều lần.
-- =========================================================

-- Hạng sao: cho phép 3-6 sao (trước đây tối đa 5)
alter table public.cruises drop constraint if exists cruises_star_check;
alter table public.cruises
  add constraint cruises_star_check check (star is null or star between 1 and 6);

alter table public.cruises
  add column if not exists capacity int check (capacity is null or capacity >= 0),     -- số chỗ (khách tối đa)
  add column if not exists cabin_count int check (cabin_count is null or cabin_count >= 0),
  add column if not exists itinerary_url text;                                          -- link lịch trình tuỳ chọn (Drive/Canva...)

-- Giá trẻ em theo từng mốc tuổi (1 hoặc nhiều mốc / du thuyền)
create table if not exists public.cruise_child_prices (
  id uuid primary key default gen_random_uuid(),
  cruise_id uuid not null references public.cruises (id) on delete cascade,
  age_label text not null,            -- VD: "5-9 tuổi", "Dưới 5 tuổi: miễn phí"
  price bigint not null default 0 check (price >= 0),
  sort_order int not null default 0
);

-- Ảnh du thuyền (ảnh đầu tiên = ảnh bìa)
create table if not exists public.cruise_images (
  id uuid primary key default gen_random_uuid(),
  cruise_id uuid not null references public.cruises (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

create index if not exists cruise_child_prices_cruise_idx on public.cruise_child_prices (cruise_id);
create index if not exists cruise_images_cruise_idx on public.cruise_images (cruise_id);

alter table public.cruise_child_prices enable row level security;
alter table public.cruise_images enable row level security;

drop policy if exists "cruise_child_prices_all_public" on public.cruise_child_prices;
create policy "cruise_child_prices_all_public" on public.cruise_child_prices
  for all to anon, authenticated using (true) with check (true);
drop policy if exists "cruise_images_all_public" on public.cruise_images;
create policy "cruise_images_all_public" on public.cruise_images
  for all to anon, authenticated using (true) with check (true);

-- Chuyển giá trẻ em cũ (nếu có) thành 1 mốc "Trẻ em"
insert into public.cruise_child_prices (cruise_id, age_label, price, sort_order)
select c.id, 'Trẻ em', c.price_child, 0
from public.cruises c
where c.price_child > 0
  and not exists (select 1 from public.cruise_child_prices p where p.cruise_id = c.id);

NOTIFY pgrst, 'reload schema';
