-- =========================================================
-- VivaTrip Check Căn — module "Khi áp lực nhất"
-- Không đụng tới bảng/module hiện có.
-- Ghim (favorites) và lịch sử chống lặp lưu ở trình duyệt (localStorage),
-- không tạo bảng DB riêng — đơn giản hơn, không cần tài khoản thật.
-- =========================================================

create table public.motivation_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_text_original text,
  quote_text_vi text not null,
  author text,
  source_reference text,
  category text not null,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.motivation_messages (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  message text not null,
  action_text text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index motivation_quotes_category_idx on public.motivation_quotes (category);
create index motivation_messages_category_idx on public.motivation_messages (category);

create trigger motivation_quotes_set_updated_at
  before update on public.motivation_quotes
  for each row execute procedure public.set_updated_at();
create trigger motivation_messages_set_updated_at
  before update on public.motivation_messages
  for each row execute procedure public.set_updated_at();

alter table public.motivation_quotes enable row level security;
alter table public.motivation_messages enable row level security;

-- RLS mở giống toàn app — Admin-only CRUD được chặn ở tầng ứng dụng
-- (API dưới /api/admin/* đã được middleware bảo vệ bằng mật khẩu Admin).
create policy "motivation_quotes_all_public" on public.motivation_quotes
  for all to anon, authenticated using (true) with check (true);
create policy "motivation_messages_all_public" on public.motivation_messages
  for all to anon, authenticated using (true) with check (true);

-- =========================================================
-- Seed data — CHỈ "Thông điệp VivaTrip" (không gán tên danh nhân nào khi
-- chưa được Admin xác minh, đúng yêu cầu bắt buộc trong đề bài). Category
-- khớp với 7 trạng thái Sale chọn trên giao diện.
-- =========================================================
insert into public.motivation_messages (category, message, action_text, sort_order) values
('pressure', 'Không cần giải quyết cả ngày trong vài phút. Chọn một việc quan trọng nhất trước, hoàn thành nó rồi mới đến việc tiếp theo.', 'Tạm bỏ qua những việc khác và xử lý đúng 1 khách.', 1),
('pressure', 'Áp lực thường đến từ việc cố ôm quá nhiều thứ cùng lúc. Bạn không cần làm hết mọi việc ngay bây giờ.', 'Chọn 1 việc dễ hoàn thành nhất và làm xong nó trước.', 2),
('pressure', 'Hít thở một chút cũng là một phần của công việc. Không ai làm tốt khi đang căng như dây đàn.', 'Uống một ngụm nước, sau đó xử lý khách tiếp theo.', 3),
('pressure', 'Một ngày bận rộn không có nghĩa là một ngày thất bại. Cứ làm từng việc một theo đúng thứ tự.', 'Viết ra 3 việc cần làm, chọn việc quan trọng nhất làm trước.', 4),

('determination', 'Động lực có thể thay đổi từng ngày, nhưng một hành động nhỏ vẫn nằm trong quyền kiểm soát của mình. Bắt đầu bằng việc tiếp theo.', 'Chọn case có khả năng nhất và hành động ngay, không mở thêm việc mới.', 1),
('determination', 'Không cần cảm thấy sẵn sàng 100% mới bắt đầu. Cứ làm việc nhỏ nhất trước, động lực sẽ đến sau.', 'Follow-up lại 1 khách đang im lặng.', 2),
('determination', 'Bạn không cần trở thành Sale giỏi nhất trong một ngày. Chỉ cần hôm nay xử lý tốt hơn một tình huống so với hôm qua.', 'Kiểm tra lại 1 khách cũ có khả năng quay lại.', 3),
('determination', 'Mỗi việc nhỏ hoàn thành đều là một bước tiến, dù không ai nhìn thấy ngay lúc này.', 'Hoàn thành 1 việc đang dang dở trước khi nhận việc mới.', 4),

('rejection', 'Một lần từ chối chỉ cho mình thêm dữ liệu về điều khách chưa thấy phù hợp. Ghi lại lý do, điều chỉnh phương án và bước sang cuộc tư vấn tiếp theo.', 'Ghi lại 1 lý do khách vừa từ chối trước khi chuyển case.', 1),
('rejection', 'Không phải khách hàng nào cũng trở thành booking. Nhưng mỗi lần tư vấn tốt đều giúp mình hiểu khách hơn một chút.', 'Tìm thêm 1 phương án tốt hơn cho case khó nhất hôm nay.', 2),
('rejection', 'Đừng để một cuộc trò chuyện chưa thuận lợi quyết định tâm trạng của những cuộc trò chuyện tiếp theo.', 'Đọc lại yêu cầu của khách tiếp theo trước khi bắt đầu tư vấn.', 3),
('rejection', 'Từ chối hôm nay không phải là đóng lại cánh cửa mãi mãi. Đôi khi khách quay lại vào đúng lúc mình không ngờ tới.', 'Lưu lại thông tin khách để chăm sóc lại sau.', 4),

('unlucky_day', 'Có những ngày nỗ lực chưa chuyển thành kết quả ngay. Đừng đánh giá cả ngày chỉ bằng một vài giờ chưa thuận lợi.', 'Chọn một khách có tín hiệu tốt nhất và tập trung vào case đó trước.', 1),
('unlucky_day', 'Có những ngày kết quả đến nhanh, có những ngày kết quả đến chậm. Điều quan trọng là chất lượng công việc mình làm hôm nay.', 'Đóng những thứ không cần thiết và hoàn thành 1 việc đang dang dở.', 2),
('unlucky_day', 'Chưa có đơn không có nghĩa hôm nay là một ngày thất bại. Việc của mình lúc này chỉ là tiếp tục làm tốt bước tiếp theo.', 'Chọn 1 khách đang dang dở và follow-up lại thật tử tế.', 3),

('overwhelmed', 'Khi có quá nhiều việc cùng lúc, việc quan trọng không phải làm nhanh hơn mà là xác định đúng việc cần làm trước.', 'Chọn đúng 1 việc cần hoàn thành trong 5 phút tới.', 1),
('overwhelmed', 'Không cần giải quyết tất cả mọi thứ ngay lúc này. Chọn đúng một việc quan trọng nhất và làm nó thật tốt.', 'Chọn 1 khách và tập trung xử lý riêng khách đó trong 5 phút.', 2),
('overwhelmed', 'Rối thường vì đang nghĩ tới quá nhiều việc chưa làm. Viết chúng ra sẽ nhẹ đầu hơn nhiều.', 'Viết ra hết những việc đang nghĩ tới, rồi chọn 1 việc làm trước.', 3),

('grit', 'Kỷ luật không phải là làm nhiều hơn, mà là quay lại đúng việc cần làm — kể cả khi không thấy hứng thú.', 'Chọn case có khả năng nhất và hành động ngay, không mở thêm việc mới.', 1),
('grit', 'Kiên trì không có nghĩa là không mệt. Nó có nghĩa là vẫn bước tiếp một bước nhỏ dù đang mệt.', 'Follow-up lại 1 khách đang im lặng, chỉ 1 tin nhắn ngắn thôi.', 2),
('grit', 'Người kiên trì không phải là người không bao giờ muốn dừng lại, mà là người vẫn tiếp tục dù muốn dừng.', 'Hoàn thành nốt 1 việc đang làm dở trước khi nghỉ.', 3),

('focus', 'Tập trung không phải làm nhiều việc cùng lúc, mà là chỉ làm đúng 1 việc trong khoảng thời gian ngắn.', 'focus_mode', 1),
('focus', 'Trong 5 phút tới, chỉ cần 1 việc thôi. Mọi thứ khác có thể đợi.', 'focus_mode', 2),
('focus', 'Ưu tiên không phải làm được nhiều việc, mà là làm đúng việc quan trọng trước.', 'focus_mode', 3);
