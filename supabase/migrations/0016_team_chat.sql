-- =========================================================
-- VivaTrip Check Căn — Chat chung (bong bóng nổi)
-- Công khai, không kiểm duyệt, ai cũng gõ được (đặt biệt danh, không cần
-- tài khoản). Admin có công tắc khoá toàn bộ chat khi cần.
-- Tin nhắn CHỈ ẨN sau 24 giờ (không tự xóa) — Admin tự vào xóa khi cần.
-- =========================================================

create table public.team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index team_chat_messages_created_at_idx on public.team_chat_messages (created_at desc);

alter table public.team_chat_messages enable row level security;

-- Đọc mở cho mọi người. Insert cũng mở ở tầng RLS (không cần tài khoản) —
-- việc kiểm tra "chat có đang bị khoá không" được chặn ở API route
-- (/api/chat/messages), không phải ở đây.
create policy "team_chat_messages_all_public" on public.team_chat_messages
  for all to anon, authenticated using (true) with check (true);

-- Bảng cấu hình 1 dòng duy nhất — công tắc bật/tắt chat toàn hệ thống
create table public.chat_settings (
  id int primary key default 1,
  is_enabled boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint chat_settings_single_row check (id = 1)
);

create trigger chat_settings_set_updated_at
  before update on public.chat_settings
  for each row execute procedure public.set_updated_at();

alter table public.chat_settings enable row level security;

create policy "chat_settings_all_public" on public.chat_settings
  for all to anon, authenticated using (true) with check (true);

insert into public.chat_settings (id, is_enabled) values (1, true)
on conflict (id) do nothing;
