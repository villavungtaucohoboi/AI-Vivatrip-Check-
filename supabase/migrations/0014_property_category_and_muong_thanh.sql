-- =========================================================
-- VivaTrip Check Căn — Link check lịch: chia theo LOẠI SẢN PHẨM
-- (Villa / Khách sạn-Resort) thay vì theo mục đích link.
-- Mường Thanh (hệ thống chuỗi) gộp chung 1 sheet, không tách vùng miền.
-- =========================================================

alter table public.availability_link_regions
  add column if not exists property_category text not null default 'villa'
    check (property_category in ('villa', 'khach_san_resort')),
  add column if not exists is_chain boolean not null default false;

comment on column public.availability_link_regions.property_category is
  'villa: sheet dành cho villa. khach_san_resort: sheet dành cho khách sạn/resort';
comment on column public.availability_link_regions.is_chain is
  'true = hệ thống chuỗi (VD Mường Thanh) — gộp chung 1 sheet, không tách theo vùng miền';

-- Tạo sheet riêng cho Mường Thanh (nếu chưa có) — thuộc Khách sạn/Resort, đánh dấu is_chain
insert into public.availability_link_regions (name, property_category, is_chain, sort_order)
select 'Mường Thanh', 'khach_san_resort', true, 0
where not exists (
  select 1 from public.availability_link_regions
  where lower(trim(name)) = lower(trim('Mường Thanh'))
);

-- Thêm 61 link bảng giá Mường Thanh toàn quốc, TẤT CẢ vào chung sheet Mường Thanh
-- (ghi_chú vẫn giữ tên file gốc + khu vực gợi ý để dễ tìm bằng ô search, không tách sheet riêng)
with mt_region as (
  select id from public.availability_link_regions where lower(trim(name)) = lower(trim('Mường Thanh')) limit 1
)
insert into public.availability_links (region_id, name, url, note, is_active, created_by, updated_by)
select mt_region.id, v.name, v.url, v.note, true, 'Import Mường Thanh', 'Import Mường Thanh'
from (values
  ('MT Luxury Khánh Hòa 2026', 'https://docs.google.com/document/d/1E2OhGJ9ell_CRhtygSo7BrCSYKF-Qf28/edit?usp=drivesdk', 'MT Luxury Khánh Hòa 2026.docx [Miền Trung]'),
  ('MT Luxury Đà Nẵng 2026_Update', 'https://drive.google.com/file/d/1Oto-s1s7b5as-h6qL9QUABmqQDCGUTao/view?usp=drivesdk', 'MT Luxury Đà Nẵng 2026_Update [Miền Trung]'),
  ('MT Grand Hạ Long 2026', 'https://docs.google.com/document/d/1w9tJ0ZpeoepRdmVCPmx09H9KQydaeoY1/edit?usp=drivesdk', 'MT Grand Hạ Long 2026.docx [Miền Bắc]'),
  ('MT Grand Gia Lai 2026 - Update 15.06', 'https://docs.google.com/document/d/19qbhwcwxia4M4E8Y-WyOOvzMPJlYTAeb/edit?usp=drivesdk', 'MT Grand Gia Lai 2026 - Update 15.06 [Tây Nguyên]'),
  ('MT Luxury Hạ Long Centre I 2026 - HĐ TOP ACC', 'https://docs.google.com/document/d/1-VLGX0C5CaixeFQjh5eHV1vM1_WsMaBQ/edit?usp=drivesdk', 'MT Luxury Hạ Long Centre I 2026 - HĐ TOP ACC [Miền Bắc]'),
  ('MT Grand Tuyên Quang - Update 30.07', 'https://drive.google.com/file/d/11Ypt5R7b6sF9QO66euAT8-1nDGlm8C5C/view?usp=drivesdk', 'MT Grand Tuyên Quang - Update 30.07 [Miền Bắc]'),
  ('MT Holiday Mộc Châu 2026 - update', 'https://docs.google.com/document/d/1Z4qp6n7MJHV27pT2JEH9766Clac0ccF6/edit?usp=drivesdk', 'MT Holiday Mộc Châu 2026 - update.docx [Miền Bắc]'),
  ('MT - Nhật Lệ 2026 - Update', 'https://drive.google.com/file/d/12qe7HKqPWZCD0840A9R0jW_unko-ijZa/view?usp=drivesdk', 'MT - Nhật Lệ 2026 - Update [Bắc Trung Bộ]'),
  ('MT Luxury Viễn Triều - Update 06.07', 'https://docs.google.com/document/d/1pmsm8Fno7zAaF9afMt-R1lNsxB5k-kDbHZNdlBK0yjE/edit?usp=drivesdk', 'MT Luxury Viễn Triều - Update 06.07 [Miền Trung]'),
  ('MT Holiday Quảng Bình 2026', 'https://docs.google.com/document/d/1qETn9hHGPho45Bwjf55ZJeFZ0u8jpuJryxmiqyKGa0E/edit?usp=drivesdk', 'MT Holiday Quảng Bình 2026 [Bắc Trung Bộ]'),
  ('MT Grand Bãi Cháy 2026', 'https://docs.google.com/document/d/1-UayGsRZO1lHb-_7G6xwVp5xOihvasjS/edit?usp=drivesdk', 'MT Grand Bãi Cháy 2026.docx [Miền Bắc]'),
  ('MT Holiday Đà Lạt 2026', 'https://docs.google.com/document/d/1cftjlLu7IzdXMgG_H8FMAWF70hJDnOnb/edit?usp=drivesdk', 'MT Holiday Đà Lạt 2026.docx [Tây Nguyên]'),
  ('MT Holiday Huế 2026', 'https://drive.google.com/file/d/17ouhGQLQEVD1nlfJ67dzPrW6ks3ec9Nm/view?usp=drivesdk', 'MT Holiday Huế 2026 (1).pdf [Bắc Trung Bộ]'),
  ('MT Holiday Suối Mơ 2026', 'https://docs.google.com/document/d/1QEbunMpiIAdX6CzzJAKagLb1mnn3Z--9/edit?usp=drivesdk', 'MT Holiday Suối Mơ 2026.docx [Chưa chắc khu vực]'),
  ('MT Holiday Vũng Tàu 2026 - Update 13.01', 'https://docs.google.com/document/d/1mN_Wsh65TUkPyIJsWb7pjNE5gDQZ_5h-/edit?usp=drivesdk', 'MT Holiday Vũng Tàu 2026 - Update 13.01 [Miền Nam]'),
  ('MT Holiday Con Cuông 2026', 'https://docs.google.com/document/d/1v9NJC3kK1F7eN3353jy8-eD2PWIrJxdC/edit?usp=drivesdk', 'MT Holiday Con Cuông 2026 [Bắc Trung Bộ]'),
  ('MT Holiday Hội An 2026', 'https://drive.google.com/file/d/15Erxlf8U3BMfGIKAdUTJAxb43jONZGJJ/view?usp=drivesdk', 'MT Holiday Hội An 2026 (1).pdf [Miền Trung]'),
  ('MT Holiday Mũi Né 2026 - Update Bữa ăn bắt buộc', 'https://drive.google.com/file/d/1ctzlcO9eNqWFB9_FXiR0J_FLnCqy08Lq/view?usp=drivesdk', 'MT Holiday Mũi Né 2026 - Update Bữa ăn bắt buộc (1).pdf [Miền Trung]'),
  ('MT Luxury Xuân Thành 2026', 'https://docs.google.com/document/d/1dcybsfe0Eg_na9R_QtsSrvGIO0gOfaYE/edit?usp=drivesdk', 'MT Luxury Xuân Thành 2026 [Bắc Trung Bộ]'),
  ('MT - Quy Nhơn 2026', 'https://docs.google.com/document/d/1Df-bKz2G5CzZRipVYnWD4zPxqCrK6-9_/edit?usp=drivesdk', 'MT - Quy Nhơn 2026.docx [Miền Trung]'),
  ('MT Luxury Phú Quốc 2026', 'https://docs.google.com/document/d/1hinHclfTX0mhpu7jV4pyyUP4CcTT67HD/edit?usp=drivesdk', 'MT Luxury Phú Quốc 2026.docx [Miền Nam]'),
  ('MT Luxury Diễn Lâm 2026', 'https://docs.google.com/document/d/18_GbL5ytfzFGzVSAKBwCkOd35Do0wFBX/edit?usp=drivesdk', 'MT Luxury Diễn Lâm 2026 [Bắc Trung Bộ]'),
  ('MT Luxury Quảng Ninh 2026 - HĐ TOP ACC', 'https://docs.google.com/document/d/1hEGBuRkY9XErB0T6KxGSuUGdaWCbyr5E/edit?usp=drivesdk', 'MT Luxury Quảng Ninh 2026 - HĐ TOP ACC [Miền Bắc]'),
  ('MT Luxury Hạ Long Centre II 2026', 'https://docs.google.com/document/d/1HgJRLdxYHImquK8PLY-xqSxV5xQ8F_Ri/edit?usp=drivesdk', 'MT Luxury Hạ Long Centre II 2026 [Miền Bắc]'),
  ('MT Luxury Sông Hàn 2026_Update', 'https://drive.google.com/file/d/1pVM3rQ5xiC1p30GGH4E6wdnme99dgLdd/view?usp=drivesdk', 'MT Luxury Sông Hàn 2026_Update [Miền Trung]'),
  ('MT Luxury Sài Gòn 2026', 'https://docs.google.com/document/d/1T-1RrRnoaWIa-31Frj8298Aa0lCNNXG8/edit?usp=drivesdk', 'MT Luxury Sài Gòn 2026 [Miền Nam]'),
  ('MT - Sapa 2026', 'https://docs.google.com/document/d/10I-62fNLtnYW5tP-WcZ9aPSWmqpKK97a/edit?usp=drivesdk', 'MT - Sapa 2026 [Miền Bắc]'),
  ('MT Luxury Cao Bằng 2026 - CTKM Hè', 'https://drive.google.com/file/d/1uSCcFNpAZ8nR7QJEWHxiX2nhsK4nvmX-/view?usp=drivesdk', 'MT Luxury Cao Bằng 2026 - CTKM Hè [Miền Bắc]'),
  ('MT Luxury Buôn Ma Thuột 2026 - Update 22.06', 'https://drive.google.com/file/d/1FEYYKcJk_Vc6USXtmQwROdNTKkcsiJ7m/view?usp=drivesdk', 'MT Luxury Buôn Ma Thuột 2026 - Update 22.06.pdf [Tây Nguyên]'),
  ('MT Grand Nha Trang 2026 - Update 12.06', 'https://docs.google.com/document/d/18bQY0ZhjRqEC-oaAmKjZWSGoFK9jNqFI/edit?usp=drivesdk', 'MT Grand Nha Trang 2026 - Update 12.06.doc [Miền Trung]'),
  ('MT Luxury Cần Thơ 2026 - Update', 'https://docs.google.com/document/d/105YyjP4eYggGsL3aso2efKNkLVKdAQyT/edit?usp=drivesdk', 'MT Luxury Cần Thơ 2026 - Update [Miền Nam]'),
  ('MT Grand Hà Tĩnh 2026 - Update 19.01', 'https://docs.google.com/document/d/1dE3Cbrl3kGA_hF2EsvLuVPmvTnUwawZd/edit?usp=drivesdk', 'MT Grand Hà Tĩnh 2026 - Update 19.01.doc [Bắc Trung Bộ]'),
  ('MT Luxury Hà Nam 2026', 'https://drive.google.com/file/d/1KB2CNUQqQUYuXw6hOh_JCgoUMS2NSBUN/view?usp=drivesdk', 'MT Luxury Hà Nam 2026 [Miền Bắc]'),
  ('MT Grand Hà Nội 2026 - Thợ Nhuộm', 'https://drive.google.com/file/d/1KcB0vI7fBkHAlNEFrVNIGsagBLNPqf7B/view?usp=drivesdk', 'MT Grand Hà Nội 2026 - Thợ Nhuộm [Miền Bắc]'),
  ('MT Luxury Lạng Sơn 2026', 'https://drive.google.com/file/d/1qMPioEVOj8bCRpTtJfDnI8O2Rb41E5h7/view?usp=drivesdk', 'MT Luxury Lạng Sơn 2026 [Miền Bắc]'),
  ('MT Grand Hà Nội 2026 - Bắc Linh Đàm', 'https://drive.google.com/file/d/1OEhBevjR5xUm08XdymVlQDd8P-gJX5Jx/view?usp=drivesdk', 'MT Grand Hà Nội 2026 - Bắc Linh Đàm [Miền Bắc]'),
  ('MT Grand Bắc Giang 2026', 'https://docs.google.com/document/d/1AIbigsAhXja5Lm2gutHq54FUCFwN316i/edit?usp=drivesdk', 'MT Grand Bắc Giang 2026 [Miền Bắc]'),
  ('MT Grand Sài Gòn Centre 2026', 'https://drive.google.com/file/d/1ouNB1lHQflisHW8m_0twOtsvkUkYCSX9/view?usp=drivesdk', 'MT Grand Sài Gòn Centre 2026 [Miền Nam]'),
  ('MT Grand Hoàng Mai 2026', 'https://drive.google.com/file/d/1TTEAB1KxtMW7-3H8iGjCU-ryHb0KPJCK/view?usp=drivesdk', 'MT Grand Hoàng Mai 2026 [Chưa chắc khu vực]'),
  ('MT Luxury Nha Trang 2026', 'https://drive.google.com/file/d/1lHgBoDa0C8xI_Rslee6AYU9ArDP5ZYmL/view?usp=drivesdk', 'MT Luxury Nha Trang 2026 [Miền Trung]'),
  ('MT Grand Điện Biên Phủ 2026', 'https://docs.google.com/document/d/1hr9O3WNvhgjMA8XJ4NpgjENvQyLLmDGb/edit?usp=drivesdk', 'MT Grand Điện Biên Phủ 2026 [Chưa chắc khu vực]'),
  ('MT Grand Quảng Trị 2026', 'https://docs.google.com/document/d/1M01BUf4YOD3hpCHM1iejVFl9812VwEb1/edit?usp=drivesdk', 'MT Grand Quảng Trị 2026 [Bắc Trung Bộ]'),
  ('MT Luxury Sông Lam 2026', 'https://docs.google.com/document/d/168AlhWxZQV3M459o_4h1SpbfTNDhp4Dm/edit?usp=drivesdk', 'MT Luxury Sông Lam 2026 [Bắc Trung Bộ]'),
  ('MT Luxury Điện Biên Phủ 2026', 'https://docs.google.com/document/d/10taMzy4S5GN2LyGUx8S3AwxRFUI1r2D8/edit?usp=drivesdk', 'MT Luxury Điện Biên Phủ 2026 [Chưa chắc khu vực]'),
  ('MT Luxury Phú Thọ 2026', 'https://drive.google.com/file/d/1dD2BXX8XQI5fjBLiz9HZza27NH4hNn0f/view?usp=drivesdk', 'MT Luxury Phú Thọ 2026 [Miền Bắc]'),
  ('MT - Vinh 2026', 'https://docs.google.com/document/d/1pChPmQ2O3Xms2Py_UBI5o-ai51xNkQrT/edit?usp=drivesdk', 'MT - Vinh 2026 [Bắc Trung Bộ]'),
  ('MT - Thanh Niên Vinh 2026', 'https://drive.google.com/file/d/1Uzdx6Nc7OSj63G_prULiMR5uDjmm7K-K/view?usp=drivesdk', 'MT - Thanh Niên Vinh 2026 [Bắc Trung Bộ]'),
  ('MT - Diễn Châu 2026', 'https://docs.google.com/document/d/1j7ywj6unN2C2FSqE64WKv6ePS5PVzXQr/edit?usp=drivesdk', 'MT - Diễn Châu 2026 [Bắc Trung Bộ]'),
  ('MT - Cửa Đông 2026', 'https://docs.google.com/document/d/1ordZcO1F6avxxskMb7Xr8vNsb76I4Vdz/edit?usp=drivesdk', 'MT - Cửa Đông 2026 [Bắc Trung Bộ]'),
  ('MT - Lai Châu 2026', 'https://drive.google.com/file/d/1udWnzBtDQKTKYgQCwZizqQchCTZzQ0Wt/view?usp=drivesdk', 'MT - Lai Châu 2026 [Miền Bắc]'),
  ('MT Grand Cửa Lò 2026', 'https://drive.google.com/file/d/1encunW8Qo_adFbJ5cj4Rl4SQGUeQMCsQ/view?usp=drivesdk', 'MT Grand Cửa Lò 2026 [Bắc Trung Bộ]'),
  ('MT Grand Thanh Hóa 2026', 'https://drive.google.com/file/d/12Rx3tNruXNxY-IXClpCA_XUKdArftnSZ/view?usp=drivesdk', 'MT Grand Thanh Hóa 2026 [Bắc Trung Bộ]'),
  ('MT Grand Đà Nẵng 2026', 'https://drive.google.com/file/d/1V-ludae48j5X3sbCRtEsASplBDe6FftW/view?usp=drivesdk', 'MT Grand Đà Nẵng 2026 [Miền Trung]'),
  ('MT Grand Phương Đông 2026', 'https://docs.google.com/document/d/1OVRz-ixZXTzzSdjSL_k9_3IE5ltrgPi9/edit?usp=drivesdk', 'MT Grand Phương Đông 2026 [Chưa chắc khu vực]'),
  ('MT Grand Quảng Nam 2026', 'https://drive.google.com/file/d/1eWWQQdCPG12KXY5HUOv1TBjmAcDLyKHu/view?usp=drivesdk', 'MT Grand Quảng Nam 2026 [Miền Trung]'),
  ('MT Grand Xa La 2026', 'https://drive.google.com/file/d/1IfE-CNyamoH4xCnjt_kfbh1PsIT1CvLO/view?usp=drivesdk', 'MT Grand Xa La 2026 [Miền Bắc]'),
  ('MT Holiday Lý Sơn 2026', 'https://drive.google.com/file/d/165k_F3mbs-r3gPzxw9DEx-XhgG2o1f2Q/view?usp=drivesdk', 'MT Holiday Lý Sơn 2026 [Miền Trung]'),
  ('MT Luxury Cà Mau 2026', 'https://drive.google.com/file/d/12s-NPwjoB7FzXVBR36wtxVyNvZE30NLM/view?usp=drivesdk', 'MT Luxury Cà Mau 2026 [Miền Nam]'),
  ('MT Luxury Cao Bằng 2026', 'https://drive.google.com/file/d/1z4d_EUpQxvaOcl9EGyFX1iBxd1XK2qxS/view?usp=drivesdk', 'MT Luxury Cao Bằng 2026 [Miền Bắc]'),
  ('MT Luxury Bắc Ninh 2026', 'https://docs.google.com/document/d/11fd3XePdF1trzj5QIz_NylK-QhQAJgew/edit?usp=drivesdk', 'MT Luxury Bắc Ninh 2026 [Miền Bắc]'),
  ('MT Grand Lào Cài 2026', 'https://docs.google.com/document/d/1X5f3tM4S5vJOwzJXKcvY7HxLTH9CIkqM/edit?usp=drivesdk', 'MT Grand Lào Cài 2026 [Miền Bắc]')
) as v(name, url, note), mt_region;