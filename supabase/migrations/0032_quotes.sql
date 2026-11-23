-- =========================================================
-- BÁO GIÁ CHƯƠNG TRÌNH (soạn trên web, gửi khách link baogia.vivatrip.vn/bg/<code> + PDF)
--
-- QUAN TRỌNG VỀ BẢO MẬT: bảng chứa tên / SĐT / email khách hàng.
-- RLS BẬT nhưng KHÔNG tạo policy nào cho anon/authenticated → mặc định chặn toàn bộ
-- truy cập bằng anon key từ trình duyệt. Mọi đọc/ghi đi qua API route của app
-- (app/api/quotes/*, app/bg/[code]) dùng SUPABASE_SERVICE_ROLE_KEY.
-- =========================================================

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- mã ngẫu nhiên trong link gửi khách
  number text not null,                            -- số báo giá hiển thị: BG-YYMM-NNN
  status text not null default 'draft',            -- draft | sent
  customer jsonb not null default '{}'::jsonb,     -- { name, company, phone, email }
  program jsonb not null default '{}'::jsonb,      -- { title, date_from, date_to, pax_text, pax_count, itinerary_note }
  options jsonb not null default '[]'::jsonb,      -- [{ id, name, place, image_url, highlights[], product_id, items[] }]
  notes text[] not null default '{}',
  vat_rate numeric not null default 8,
  valid_until date,
  sale_name text not null default '',
  sale_phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_updated_at_idx on public.quotes (updated_at desc);
create index if not exists quotes_number_idx on public.quotes (number);

alter table public.quotes enable row level security;
-- KHÔNG tạo policy (xem ghi chú đầu file).
