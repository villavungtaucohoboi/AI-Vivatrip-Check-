-- =========================================================
-- VivaTrip Check Căn — băng chữ chạy "Top 3 doanh số"
-- Admin tự nhập/sửa tay hằng ngày (app hiện chưa có dữ liệu booking/doanh số
-- theo từng Sale để tự động tính), không phải bảng xếp hạng tự động.
-- =========================================================

create table public.sales_leaderboard (
  id uuid primary key default gen_random_uuid(),
  rank int not null unique check (rank in (1, 2, 3)),
  name text not null default '',
  amount numeric not null default 0,
  updated_by text,
  updated_at timestamptz not null default now()
);

create trigger sales_leaderboard_set_updated_at
  before update on public.sales_leaderboard
  for each row execute procedure public.set_updated_at();

alter table public.sales_leaderboard enable row level security;

-- Đọc mở cho mọi người (băng chữ hiện trên mọi trang) — sửa chỉ qua
-- /api/admin/* đã được middleware bảo vệ bằng mật khẩu Admin.
create policy "sales_leaderboard_all_public" on public.sales_leaderboard
  for all to anon, authenticated using (true) with check (true);

insert into public.sales_leaderboard (rank, name, amount) values
  (1, 'Chưa cập nhật', 0),
  (2, 'Chưa cập nhật', 0),
  (3, 'Chưa cập nhật', 0)
on conflict (rank) do nothing;
