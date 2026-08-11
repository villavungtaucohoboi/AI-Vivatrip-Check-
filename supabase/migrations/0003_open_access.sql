-- =========================================================
-- VivaTrip Check Căn — bỏ yêu cầu đăng nhập
-- Mở quyền đọc/ghi cho role "anon" (khách truy cập không đăng nhập),
-- vì app không còn màn hình login nữa.
-- Chạy SAU 0001_init.sql và 0002_pricing.sql
-- =========================================================

-- products
drop policy if exists "products_select_authenticated" on public.products;
drop policy if exists "products_insert_admin" on public.products;
drop policy if exists "products_update_admin" on public.products;
drop policy if exists "products_delete_admin" on public.products;

create policy "products_all_public" on public.products
  for all to anon, authenticated using (true) with check (true);

-- product_images
drop policy if exists "product_images_select_authenticated" on public.product_images;
drop policy if exists "product_images_write_admin" on public.product_images;

create policy "product_images_all_public" on public.product_images
  for all to anon, authenticated using (true) with check (true);

-- hotel_rates
drop policy if exists "hotel_rates_select_authenticated" on public.hotel_rates;
drop policy if exists "hotel_rates_write_admin" on public.hotel_rates;

create policy "hotel_rates_all_public" on public.hotel_rates
  for all to anon, authenticated using (true) with check (true);

-- holidays
drop policy if exists "holidays_select_authenticated" on public.holidays;
drop policy if exists "holidays_write_admin" on public.holidays;

create policy "holidays_all_public" on public.holidays
  for all to anon, authenticated using (true) with check (true);

-- storage: ảnh sản phẩm — cho phép upload/sửa/xóa không cần đăng nhập
drop policy if exists "product_images_bucket_write_admin" on storage.objects;
drop policy if exists "product_images_bucket_update_admin" on storage.objects;
drop policy if exists "product_images_bucket_delete_admin" on storage.objects;

create policy "product_images_bucket_write_public" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'product-images');

create policy "product_images_bucket_update_public" on storage.objects
  for update to anon, authenticated using (bucket_id = 'product-images');

create policy "product_images_bucket_delete_public" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'product-images');
