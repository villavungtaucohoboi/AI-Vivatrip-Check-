-- =========================================================
-- VivaTrip Check Căn — tối ưu tốc độ: lấy danh sách khu vực (distinct)
-- trực tiếp trong database thay vì tải hết cột area của mọi sản phẩm về
-- rồi lọc trùng bằng JS (nhanh hơn nhiều khi kho có 1.000+ sản phẩm).
-- =========================================================

create or replace function public.get_distinct_areas()
returns table (area text)
language sql
stable
as $$
  select distinct products.area
  from public.products
  order by products.area;
$$;

grant execute on function public.get_distinct_areas() to anon, authenticated;
