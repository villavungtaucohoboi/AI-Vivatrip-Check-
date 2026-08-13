-- =========================================================
-- VivaTrip Check Căn — thêm "Tiểu khu vực" (VD Đồng Đò trong Sóc Sơn)
-- để hỗ trợ tìm kiếm phân cấp Khu vực -> Tiểu khu vực.
-- =========================================================

alter table public.products
  add column if not exists sub_region text;

comment on column public.products.sub_region is
  'Tiểu khu vực/địa điểm cụ thể trong 1 khu vực lớn (VD "Đồng Đò" trong "Sóc Sơn") — tùy chọn, để trống nếu không cần';

create index if not exists products_sub_region_idx on public.products (sub_region);

-- Lấy danh sách tiểu khu vực thực tế đang có sản phẩm, theo đúng khu vực
-- (dùng cho dropdown "Tiểu khu vực" trong Bộ lọc — chỉ hiện cái có thật).
create or replace function public.get_sub_regions_for_area(p_area text)
returns table (sub_region text)
language sql
stable
as $$
  select distinct trim(regexp_replace(products.sub_region, '\s+', ' ', 'g')) as sub_region
  from public.products
  where lower(trim(products.area)) = lower(trim(p_area))
    and products.sub_region is not null
    and trim(products.sub_region) <> ''
  order by 1;
$$;

grant execute on function public.get_sub_regions_for_area(text) to anon, authenticated;
