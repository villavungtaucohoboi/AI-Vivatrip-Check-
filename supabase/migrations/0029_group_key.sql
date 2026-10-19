-- Gộp nhiều ĐỐI TÁC cùng 1 khách sạn: các sản phẩm cùng group_key = cùng khách sạn.
-- Để trống = tự gộp theo tên. Chỉ cần đặt khi 2 đối tác ghi tên khác nhau.
alter table public.products add column if not exists price_source text;
alter table public.products add column if not exists group_key text;
