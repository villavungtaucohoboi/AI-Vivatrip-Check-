-- TOUR NƯỚC NGOÀI: chương trình tour (lịch trình, bao gồm, visa…) + các ngày khởi hành
-- (giá NL/TE/EB, giá gạch, com đại lý, tổng chỗ, đã bán). Ngày đã qua tự ẩn trên web.

create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  country text not null default '',
  from_city text not null default 'Hà Nội',
  days int,
  nights int,
  airline text,
  flights text,
  route_text text,
  places text[] not null default '{}',
  highlights text[] not null default '{}',
  itinerary jsonb not null default '[]'::jsonb,      -- [{"t":"Hà Nội – Seoul","meals":"3 bữa","items":["..."],"hotel":"..."}]
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  visa_notes text[] not null default '{}',
  sale_terms text[] not null default '{}',           -- chỉ Sale xem
  partner text,                                      -- đối tác (giá mua của ai)
  partner_file text,
  source_link text,
  group_label text,
  cover_url text,
  single_usd numeric,                                -- phụ thu phòng đơn USD/đêm
  tips_usd numeric,
  visa_discount numeric not null default 0,          -- khách có sẵn visa được trừ (đ/khách)
  route_key text,                                    -- cùng tuyến (để so giá nhiều đối tác)
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tour_departures (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  depart_date date not null,
  adult numeric not null,          -- giá bán người lớn
  old_adult numeric,               -- giá gạch (nếu có)
  child numeric,
  infant numeric,
  com numeric,                     -- hoa hồng đại lý / khách
  seats int,                       -- tổng chỗ
  sold int,                        -- đã bán
  tag text,                        -- Noel, Tết DL…
  updated_at timestamptz not null default now(),
  unique (tour_id, depart_date)
);
create index if not exists tour_departures_date_idx on public.tour_departures (depart_date);

alter table public.tours enable row level security;
alter table public.tour_departures enable row level security;
drop policy if exists "tours_all_public" on public.tours;
create policy "tours_all_public" on public.tours for all to anon, authenticated using (true) with check (true);
drop policy if exists "tour_departures_all_public" on public.tour_departures;
create policy "tour_departures_all_public" on public.tour_departures for all to anon, authenticated using (true) with check (true);
