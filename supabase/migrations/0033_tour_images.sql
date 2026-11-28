-- Ảnh tour nước ngoài: 5–7 ảnh / tour (ảnh đầu tiên là ảnh bìa). Chạy lại không sao.
alter table public.tours add column if not exists images text[] not null default '{}';
-- Ghi công tác giả cho ảnh miễn phí (Wikimedia CC BY…): "Tác giả / Giấy phép / Wikimedia Commons"
alter table public.tours add column if not exists image_credits text[] not null default '{}';
