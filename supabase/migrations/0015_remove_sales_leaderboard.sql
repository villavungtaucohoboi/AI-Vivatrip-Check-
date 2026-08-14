-- =========================================================
-- VivaTrip Check Căn — gỡ bỏ tính năng "Băng chữ chạy Top 3"
-- (xóa sạch bảng đã tạo ở migration 0015 trước đó)
-- =========================================================

drop table if exists public.sales_leaderboard;
