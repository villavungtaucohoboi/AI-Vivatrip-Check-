# VivaTrip Check Căn

Công cụ nội bộ giúp đội sale VivaTrip tìm nhanh villa / khách sạn / resort phù hợp
với nhu cầu khách hàng trong kho sản phẩm. Không phải CRM, không có booking, không
check tình trạng phòng trống — chỉ tập trung vào **tìm & tra cứu thật nhanh**.

## Công nghệ

Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui-style components ·
Supabase (Postgres + Auth + Storage) · Deploy trên Vercel.

## Tính năng chính

- Đăng nhập, 2 role: **Admin** (toàn quyền) và **Sale** (chỉ xem/tìm kiếm).
- Tìm sản phẩm bằng câu tự nhiên (VD: "Villa Phan Thiết 15 người khoảng 10 triệu")
  hoặc bằng Bộ lọc thủ công (khu vực, loại, số khách, phòng ngủ, giá, tiện ích).
- Xếp hạng kết quả theo đúng khu vực → đúng loại → đủ sức chứa → giá gần ngân sách
  nhất → số phòng ngủ phù hợp → tiện ích.
- Trang chi tiết sản phẩm, kèm bảng giá riêng cho khách sạn.
- Quản lý sản phẩm (thêm/sửa/xóa), quản lý bảng giá khách sạn, upload ảnh.
- Import Excel: preview, kiểm tra lỗi, import hàng loạt (tạo mới hoặc cập nhật
  theo `product_code`).
- Mobile-first, responsive toàn bộ.

## 1. Cài đặt project

```bash
npm install
cp .env.example .env.local
```

Điền `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` vào `.env.local`
(lấy ở bước 2 bên dưới).

## 2. Setup Supabase

1. Tạo project mới tại [supabase.com](https://supabase.com).
2. Vào **SQL Editor**, chạy lần lượt các file sau (theo đúng thứ tự):
   - [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) — tạo bảng
     `profiles`, `products`, `product_images`, `hotel_rates`, RLS (Sale chỉ đọc, Admin đọc/ghi),
     và storage bucket `product-images` (public) để lưu ảnh sản phẩm.
   - [`supabase/migrations/0002_pricing.sql`](./supabase/migrations/0002_pricing.sql) — thêm cột
     giá theo khung ngày cho villa/resort (`price_weekday`, `price_friday_sunday`,
     `price_saturday_holiday`, `discount_percent`) và bảng `holidays` (Admin quản lý ngày lễ
     qua trang `/admin/holidays`).
3. (Tùy chọn nhưng nên làm) Chạy tiếp:
   - [`supabase/seed.sql`](./supabase/seed.sql) — 15 sản phẩm mẫu ở 5 khu vực để test giao diện
     và tìm kiếm ngay.
   - [`supabase/seed_pricing.sql`](./supabase/seed_pricing.sql) — điền giá theo khung ngày cho
     10 villa/resort mẫu ở trên + 2 ngày lễ mẫu.
4. Vào **Project Settings > API**, copy `Project URL` và `anon public key` vào
   `.env.local`.

### Environment variables

| Biến | Mô tả |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key của project |

App chỉ dùng anon key ở phía client/server — bảo mật dữ liệu hoàn toàn dựa vào
Row Level Security (RLS) đã cấu hình trong migration, không cần service role key.

## 3. Tạo tài khoản Admin đầu tiên

Vì đây là công cụ nội bộ, không có trang tự đăng ký — Admin tạo tài khoản cho
từng sale. Để tạo **Admin đầu tiên**:

1. Vào Supabase Dashboard > **Authentication > Users** > **Add user** > tạo
   user với email + mật khẩu (chọn "Auto Confirm User").
   Trigger trong migration sẽ tự tạo dòng tương ứng trong bảng `profiles` với
   role mặc định là `sale`.
2. Vào **SQL Editor**, chạy lệnh sau để nâng user đó lên Admin (thay email):

   ```sql
   update public.profiles set role = 'admin' where email = 'admin@vivatrip.vn';
   ```

3. Từ giờ, Admin này có thể tạo thêm tài khoản Sale khác qua **Authentication
   > Add user** (giữ role mặc định `sale`, không cần chạy SQL).

## 4. Chạy local

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000), đăng nhập bằng tài khoản
vừa tạo ở bước 3.

## 5. Deploy Vercel

1. Push code lên GitHub.
2. Vào [vercel.com](https://vercel.com) > **New Project** > import repo.
3. Ở phần Environment Variables, thêm `NEXT_PUBLIC_SUPABASE_URL` và
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (giống `.env.local`).
4. Deploy. Vercel tự nhận diện Next.js, không cần cấu hình thêm.

## Cấu trúc thư mục

```
app/
  login/                 Trang đăng nhập
  search/                Trang tìm sản phẩm (màn hình chính)
  products/[id]/         Trang chi tiết sản phẩm
  admin/products/        Quản lý sản phẩm (list, thêm, sửa, import Excel)
  api/search/            API tìm kiếm + xếp hạng
  api/import/            API import Excel (upsert theo product_code)
components/
  ui/                    Các component UI dùng chung (button, input, sheet...)
  admin/                 Component riêng cho khu vực Admin
lib/
  supabase/              Supabase client (browser/server/middleware)
  query-parser.ts        Bộ phân tích câu tìm kiếm tự nhiên (regex/keyword)
  ranking.ts             Logic xếp hạng kết quả tìm kiếm
  import-parser.ts       Đọc & validate file Excel import
supabase/
  migrations/0001_init.sql   Schema + RLS + storage bucket
  seed.sql                    15 sản phẩm mẫu
```

## Bảng giá theo thứ / ngày lễ (villa & resort)

Villa/resort dùng 3 mức giá thay vì 1 giá duy nhất: `price_weekday` (Thứ 2 - Thứ 5),
`price_friday_sunday` (Thứ 6 & Chủ nhật), `price_saturday_holiday` (Thứ 7 & Ngày lễ),
cộng thêm `discount_percent` (chiết khấu nội bộ, không ghi đè giá gốc). Hotel không đổi
— vẫn dùng `price` (giá phòng thấp nhất) + bảng `hotel_rates` như trước.

Toàn bộ logic chọn giá + tính chiết khấu nằm trong `lib/pricing.ts`
(`getApplicablePrice`, `calculateDiscountedPrice`, `resolveProductPricing`) — mọi màn
hình (search, ranking, card, trang chi tiết) đều gọi lại đúng các hàm này, không tự
tính giá riêng lẻ ở đâu khác.

Khi sale gõ câu có ngày cụ thể ("ngày 15/08/2026", "thứ 7 tuần này", "ngày mai"),
`lib/query-parser.ts` chỉ trích xuất ngày đó (không tự quyết định giá) — backend
(`app/api/search/route.ts`) mới là nơi xác định thứ, kiểm tra bảng `holidays`, lấy
đúng khung giá, tính chiết khấu, rồi mới xếp hạng theo ngân sách. Nếu sale không nhập
ngày, hệ thống không giả định weekday — card sẽ hiện đủ cả 3 mức giá.

Admin quản lý ngày lễ tại `/admin/products` > nút **Ngày lễ** (hoặc trực tiếp
`/admin/holidays`). Ngày nào có trong bảng `holidays` sẽ luôn dùng giá Thứ 7 & Ngày lễ,
kể cả khi rơi vào Thứ 2 - Thứ 6.

## Ghi chú về tìm kiếm tự nhiên

`lib/query-parser.ts` dùng bộ phân tích **regex/keyword thuần**, không phụ
thuộc AI API nào — nên app chạy đầy đủ tính năng tìm kiếm ngay cả khi chưa
cấu hình bất kỳ AI service nào. Nếu sau này muốn nâng cấp để hiểu được câu
phức tạp hơn bằng AI (ví dụ Claude API), nên viết một hàm riêng (ví dụ
`lib/ai-parse.ts`) trả về cùng kiểu `SearchFilters`, gọi thử trước, và luôn
fallback về `parseQuery()` nếu AI lỗi hoặc chưa cấu hình — để không bao giờ
làm hỏng tính năng tìm kiếm cốt lõi. AI (nếu dùng) chỉ nên làm nhiệm vụ parse
câu chữ thành filter, **không** được tự tạo tên sản phẩm/giá — mọi kết quả
hiển thị luôn lấy trực tiếp từ database.

## Phạm vi không làm (theo yêu cầu)

Không CRM, không booking, không kiểm tra tình trạng phòng trống, không thanh
toán. Nếu muốn mở rộng các phần này, nên làm ở một dự án/app riêng để giữ
VivaTrip Check Căn đơn giản và nhanh.
