-- Lưu bản nội dung GỐC của từng căn trước khi bị "Rút gọn ý chính", để Admin
-- có thể khôi phục lại bất cứ lúc nào (kể cả sau khi đã lưu, tải lại trang).
-- Chỉ THÊM 1 cột mới, không sửa/xoá dữ liệu cũ.
alter table public.products add column if not exists note_original text;
