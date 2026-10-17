-- Giá mua của ai (nhà cung cấp / nguồn giá, VD "Mustgo") — chỉ Sale xem
alter table public.products add column if not exists price_source text;
