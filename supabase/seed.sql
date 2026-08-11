-- =========================================================
-- VivaTrip Check Căn — dữ liệu mẫu (15 sản phẩm / 5 khu vực)
-- Chạy SAU KHI đã chạy migrations/0001_init.sql
-- =========================================================

insert into public.products
  (id, product_code, product_name, type, area, address, bedrooms, beds, standard_guests, max_guests, price, pool, near_beach, karaoke, bbq, note, google_maps_url, thumbnail_url)
values
  -- Phan Thiết
  ('a0000000-0000-4000-8000-000000000001', 'VIL-PTH-001', 'Villa Ocean Mũi Né', 'villa', 'Phan Thiết', 'Đường Nguyễn Đình Chiểu, Mũi Né, Phan Thiết', 5, 10, 10, 15, 9800000, true, true, false, true, 'Villa 2 tầng, sân vườn rộng, phù hợp nhóm gia đình.', 'https://www.google.com/maps/search/?api=1&query=Villa+Ocean+Mui+Ne', 'https://picsum.photos/seed/vil-pth-001/800/600'),
  ('a0000000-0000-4000-8000-000000000002', 'RES-PTH-001', 'Phan Thiết Sea Resort', 'resort', 'Phan Thiết', 'Đường Huỳnh Thúc Kháng, Phan Thiết', null, null, null, 60, 15500000, true, true, false, false, 'Resort nguyên căn, có bãi biển riêng.', 'https://www.google.com/maps/search/?api=1&query=Phan+Thiet+Sea+Resort', 'https://picsum.photos/seed/res-pth-001/800/600'),
  ('a0000000-0000-4000-8000-000000000003', 'HOT-PTH-001', 'Hotel Cát Trắng Phan Thiết', 'hotel', 'Phan Thiết', '12 Nguyễn Tất Thành, Phan Thiết', null, null, null, null, 1800000, true, true, false, false, 'Khách sạn 3 sao gần trung tâm, phù hợp đoàn khách lẻ.', 'https://www.google.com/maps/search/?api=1&query=Hotel+Cat+Trang+Phan+Thiet', 'https://picsum.photos/seed/hot-pth-001/800/600'),

  -- Vũng Tàu
  ('a0000000-0000-4000-8000-000000000004', 'VIL-VTU-001', 'Villa Biển Xanh Vũng Tàu', 'villa', 'Vũng Tàu', 'Đường Thùy Vân, Bãi Sau, Vũng Tàu', 4, 8, 8, 12, 7200000, true, true, true, true, 'View biển, có phòng karaoke riêng.', 'https://www.google.com/maps/search/?api=1&query=Villa+Bien+Xanh+Vung+Tau', 'https://picsum.photos/seed/vil-vtu-001/800/600'),
  ('a0000000-0000-4000-8000-000000000005', 'RES-VTU-001', 'Vũng Tàu Ocean Resort', 'resort', 'Vũng Tàu', 'Đường Trần Phú, Vũng Tàu', null, null, null, 40, 18000000, true, true, false, false, 'Resort cao cấp, hồ bơi vô cực hướng biển.', 'https://www.google.com/maps/search/?api=1&query=Vung+Tau+Ocean+Resort', 'https://picsum.photos/seed/res-vtu-001/800/600'),
  ('a0000000-0000-4000-8000-000000000006', 'HOT-VTU-001', 'Hotel Bãi Sau Vũng Tàu', 'hotel', 'Vũng Tàu', '88 Thùy Vân, Bãi Sau, Vũng Tàu', null, null, null, null, 1500000, false, true, false, false, 'Khách sạn trung tâm, gần chợ đêm.', 'https://www.google.com/maps/search/?api=1&query=Hotel+Bai+Sau+Vung+Tau', 'https://picsum.photos/seed/hot-vtu-001/800/600'),

  -- Hạ Long
  ('a0000000-0000-4000-8000-000000000007', 'VIL-HLG-001', 'Villa Vịnh Ngọc Hạ Long', 'villa', 'Hạ Long', 'Bãi Cháy, Hạ Long, Quảng Ninh', 5, 9, 10, 16, 13500000, true, false, true, true, 'View vịnh Hạ Long, có sân BBQ ngoài trời.', 'https://www.google.com/maps/search/?api=1&query=Villa+Vinh+Ngoc+Ha+Long', 'https://picsum.photos/seed/vil-hlg-001/800/600'),
  ('a0000000-0000-4000-8000-000000000008', 'RES-HLG-001', 'Ha Long Bay Resort', 'resort', 'Hạ Long', 'Tuần Châu, Hạ Long, Quảng Ninh', null, null, null, 30, 22000000, true, false, false, false, 'Resort trên đảo Tuần Châu, có du thuyền riêng.', 'https://www.google.com/maps/search/?api=1&query=Ha+Long+Bay+Resort', 'https://picsum.photos/seed/res-hlg-001/800/600'),
  ('a0000000-0000-4000-8000-000000000009', 'HOT-HLG-001', 'Hotel Hạ Long View', 'hotel', 'Hạ Long', 'Đường Hạ Long, Bãi Cháy', null, null, null, null, 1600000, true, false, false, false, 'Khách sạn 4 sao, ban công hướng vịnh.', 'https://www.google.com/maps/search/?api=1&query=Hotel+Ha+Long+View', 'https://picsum.photos/seed/hot-hlg-001/800/600'),

  -- Nha Trang
  ('a0000000-0000-4000-8000-000000000010', 'VIL-NTR-001', 'Villa Trăng Biển Nha Trang', 'villa', 'Nha Trang', 'Đường Trần Phú, Nha Trang', 4, 7, 8, 12, 8600000, true, true, false, true, 'Sát biển, hồ bơi riêng, sân BBQ.', 'https://www.google.com/maps/search/?api=1&query=Villa+Trang+Bien+Nha+Trang', 'https://picsum.photos/seed/vil-ntr-001/800/600'),
  ('a0000000-0000-4000-8000-000000000011', 'RES-NTR-001', 'Nha Trang Beach Resort', 'resort', 'Nha Trang', 'Bãi Dài, Cam Ranh, Nha Trang', null, null, null, 50, 25000000, true, true, false, false, 'Resort 5 sao, bãi biển riêng, nhiều hồ bơi.', 'https://www.google.com/maps/search/?api=1&query=Nha+Trang+Beach+Resort', 'https://picsum.photos/seed/res-ntr-001/800/600'),
  ('a0000000-0000-4000-8000-000000000012', 'HOT-NTR-001', 'Hotel Trung Tâm Nha Trang', 'hotel', 'Nha Trang', '45 Trần Phú, Nha Trang', null, null, null, null, 1900000, true, true, false, false, 'Khách sạn gần biển, đi bộ ra bãi tắm 2 phút.', 'https://www.google.com/maps/search/?api=1&query=Hotel+Trung+Tam+Nha+Trang', 'https://picsum.photos/seed/hot-ntr-001/800/600'),

  -- Phú Quốc
  ('a0000000-0000-4000-8000-000000000013', 'VIL-PQC-001', 'Villa Bãi Dài Phú Quốc', 'villa', 'Phú Quốc', 'Bãi Dài, Gành Dầu, Phú Quốc', 6, 11, 12, 18, 16800000, true, true, true, true, 'Villa lớn, gần Vinpearl Safari, có phòng karaoke.', 'https://www.google.com/maps/search/?api=1&query=Villa+Bai+Dai+Phu+Quoc', 'https://picsum.photos/seed/vil-pqc-001/800/600'),
  ('a0000000-0000-4000-8000-000000000014', 'RES-PQC-001', 'Phú Quốc Paradise Resort', 'resort', 'Phú Quốc', 'Bãi Trường, Phú Quốc', null, null, null, 45, 28000000, true, true, false, false, 'Resort 5 sao, gần cáp treo Hòn Thơm.', 'https://www.google.com/maps/search/?api=1&query=Phu+Quoc+Paradise+Resort', 'https://picsum.photos/seed/res-pqc-001/800/600'),
  ('a0000000-0000-4000-8000-000000000015', 'HOT-PQC-001', 'Hotel Dương Đông Phú Quốc', 'hotel', 'Phú Quốc', 'Trần Hưng Đạo, Dương Đông, Phú Quốc', null, null, null, null, 1400000, false, false, false, false, 'Khách sạn trung tâm thị trấn, gần chợ đêm Dinh Cậu.', 'https://www.google.com/maps/search/?api=1&query=Hotel+Duong+Dong+Phu+Quoc', 'https://picsum.photos/seed/hot-pqc-001/800/600');

-- Ảnh phụ cho từng sản phẩm (thumbnail_url ở trên đã là ảnh đại diện)
insert into public.product_images (product_id, image_url, sort_order)
select id, thumbnail_url, 0 from public.products
union all
select id, 'https://picsum.photos/seed/' || product_code || '-2/800/600', 1 from public.products
union all
select id, 'https://picsum.photos/seed/' || product_code || '-3/800/600', 2 from public.products;

-- Bảng giá cho các sản phẩm loại "hotel"
insert into public.hotel_rates (product_id, room_type, price, capacity, breakfast, extra_bed_price, note)
values
  ('a0000000-0000-4000-8000-000000000003', 'Deluxe Room', 1800000, 2, true, 300000, null),
  ('a0000000-0000-4000-8000-000000000003', 'Premier Room', 2300000, 2, true, 300000, null),
  ('a0000000-0000-4000-8000-000000000003', 'Family Room', 3200000, 4, true, 300000, 'Phù hợp gia đình 2 người lớn + 2 trẻ em'),

  ('a0000000-0000-4000-8000-000000000006', 'Superior Room', 1500000, 2, true, 250000, null),
  ('a0000000-0000-4000-8000-000000000006', 'Deluxe Room', 1900000, 2, true, 250000, null),
  ('a0000000-0000-4000-8000-000000000006', 'Family Suite', 2900000, 4, true, 250000, null),

  ('a0000000-0000-4000-8000-000000000009', 'Deluxe Bay View', 1600000, 2, true, 300000, null),
  ('a0000000-0000-4000-8000-000000000009', 'Premier Bay View', 2100000, 2, true, 300000, null),
  ('a0000000-0000-4000-8000-000000000009', 'Family Room', 3000000, 4, true, 300000, null),

  ('a0000000-0000-4000-8000-000000000012', 'Superior Room', 1900000, 2, true, 250000, null),
  ('a0000000-0000-4000-8000-000000000012', 'Deluxe Sea View', 2200000, 2, true, 250000, null),
  ('a0000000-0000-4000-8000-000000000012', 'Family Room', 3000000, 4, true, 250000, null),

  ('a0000000-0000-4000-8000-000000000015', 'Standard Room', 1400000, 2, true, 200000, null),
  ('a0000000-0000-4000-8000-000000000015', 'Deluxe Room', 1750000, 2, true, 200000, null),
  ('a0000000-0000-4000-8000-000000000015', 'Family Room', 2500000, 4, true, 200000, null);
