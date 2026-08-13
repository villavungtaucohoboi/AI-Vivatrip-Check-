-- =========================================================
-- VivaTrip Check Căn — chuẩn hóa dữ liệu khu vực bị nhập không đồng nhất
-- (VD "Sóc sơn" và "Sóc Sơn" đang bị coi là 2 khu vực khác nhau)
-- =========================================================

-- Gộp mọi biến thể hoa/thường + khoảng trắng thừa về 1 giá trị đại diện
-- duy nhất cho mỗi khu vực (chọn giá trị nhỏ nhất theo thứ tự chữ cái).
with canonical as (
  select distinct on (lower(trim(regexp_replace(area, '\s+', ' ', 'g'))))
    lower(trim(regexp_replace(area, '\s+', ' ', 'g'))) as norm_key,
    trim(regexp_replace(area, '\s+', ' ', 'g')) as canonical_area
  from public.products
  order by lower(trim(regexp_replace(area, '\s+', ' ', 'g'))), area
)
update public.products p
set area = c.canonical_area
from canonical c
where lower(trim(regexp_replace(p.area, '\s+', ' ', 'g'))) = c.norm_key
  and p.area <> c.canonical_area;

-- Hàm lấy danh sách khu vực (distinct) — vẫn gộp thêm 1 lớp phòng hờ theo
-- khoảng trắng thừa, phần hoa/thường từ nay được chuẩn hóa ngay lúc lưu
-- (xem lib/normalize-area.ts), không còn phụ thuộc vào đây nữa.
create or replace function public.get_distinct_areas()
returns table (area text)
language sql
stable
as $$
  select distinct trim(regexp_replace(products.area, '\s+', ' ', 'g')) as area
  from public.products
  order by 1;
$$;
