-- =========================================================
-- VivaTrip Check Căn — sửa logic số khách khi tìm Villa
-- Thêm cột phụ thu/khách vượt chuẩn (không bắt buộc). standard_guests và
-- max_guests đã có sẵn từ trước, không cần thêm/đổi gì — chỉ đổi CÁCH DÙNG
-- 2 cột này ở tầng ứng dụng (search + hiển thị), không đổi schema của chúng.
-- =========================================================

alter table public.products
  add column if not exists extra_guest_fee int;

comment on column public.products.extra_guest_fee is
  'Phụ thu (VNĐ) cho MỖI khách vượt quá standard_guests — để trống nếu chưa xác định, hệ thống sẽ không tự đoán giá.';
