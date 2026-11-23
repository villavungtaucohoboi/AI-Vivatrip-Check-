# Soạn báo giá chương trình — thiết kế

Ngày: 23/11/2026 · Repo: VivaTrip Check Căn (Next.js 15 App Router + Supabase + Vercel)

## 1. Vì sao làm

Sale đang báo giá chương trình cho đoàn (VD "Hà Nội 2N1Đ, 05–06/12/2026, 20 người lớn") bằng **Excel**:
1 file nhiều tab, mỗi tab 1 phương án nơi ở (Ivory, Flamingo, Wyndham…), bảng 8 cột (Dịch vụ · Đơn vị tính ·
Số lượng · Số đêm/số bữa · Đơn giá · Thành tiền · Link ảnh · Thông tin dịch vụ), dòng nhóm I. Vận chuyển /
II. Phòng nghỉ / III. Ăn uống và vui chơi, cuối bảng: Tổng → VAT 8% (chỉ cộng cho ăn uống + xe, phòng đã gồm VAT)
→ Tổng gồm VAT. File mẫu: Google Sheet "Báo giá Iris tháng 05/12/2026".

Vấn đề người dùng nêu: **nhìn không chuyên nghiệp**, nhiều cột; khách phải mở nhiều tab. Họ **sợ quá nhiều
thông tin**. Khách nhận báo giá **qua Zalo, dạng link hoặc PDF**.

Mục tiêu: sale soạn báo giá ngay trên web, gửi khách **1 link đẹp** (mở tốt trên điện thoại) và **PDF A4** giống hệt.

## 2. Mục tiêu / không làm / tuyệt đối tránh

**Mục tiêu**
- Soạn báo giá nhanh hơn Excel: chọn resort/villa có sẵn trên web để tự điền; danh sách dịch vụ hay dùng; chép phương án.
- Bản gửi khách gọn, có thương hiệu VivaTrip, đọc từ trên xuống, ít cột.
- Hỗ trợ **1 phương án** (trường hợp hay gặp nhất) và **nhiều phương án** để khách so sánh.
- Lưu lại, mở ra sửa, nhân bản, gửi lại.

**Không làm (đợt này)**: CRM/danh bạ khách, thanh toán/đặt cọc online, ký điện tử, gửi email từ web,
theo dõi khách đã mở link chưa, PDF tạo ở máy chủ, khách chỉnh sửa/chấp nhận báo giá trên link, nhiều loại tiền.

**Tuyệt đối tránh**
- Lộ **thông tin nội bộ** cho khách: giá net/giá mua, chiết khấu/com, nguồn giá (`price_source`), `contract_summary`,
  `surcharge_note`, tên đối tác. Bản gửi khách chỉ có những gì sale gõ hoặc chọn hiển thị.
- Lộ **thông tin khách** (tên, SĐT, email) cho người ngoài: bảng báo giá KHÔNG được mở cho `anon` như các bảng sản phẩm.
- Bản gửi khách trông rối hơn bản mẫu đã duyệt (xem §5).

## 3. Cách làm đã chọn (Approaches)

| Cách | Mô tả | Đánh đổi |
|---|---|---|
| **A — đã chọn** | Trang link `/bg/<mã>`; nút "Tải PDF" dùng in của trình duyệt + CSS in A4 | 1 bố cục duy nhất, nhẹ, không tốn Vercel. PDF trên điện thoại phải qua Chia sẻ → In → Lưu PDF |
| B | Máy chủ tạo PDF bằng `@react-pdf/renderer` | Tải PDF 1 chạm cả trên điện thoại, nhưng 2 bố cục phải giữ đồng bộ, xử lý phông tiếng Việt |
| C | Máy chủ chạy Chrome ẩn chụp trang thành PDF | Giống hệt web nhưng nặng, 5–10s/lần, dễ vượt giới hạn gói Vercel Hobby |

Người dùng chọn **A** (sale đang soạn trên máy tính, gửi link là chính). B có thể bổ sung sau.

## 4. Dữ liệu

### Bảng mới `public.quotes` (migration `0032_quotes.sql`)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid pk | |
| `code` | text unique not null | mã ngẫu nhiên 8 ký tự không nhầm lẫn (bỏ 0/O/1/I/L), dùng trong link `/bg/<code>` |
| `number` | text | số báo giá hiển thị, `BG-YYMM-NNN` (NNN tăng trong tháng) |
| `status` | text | `draft` \| `sent` (sale tự đánh dấu khi gửi) — chỉ để lọc danh sách |
| `customer` | jsonb | `{ name, company, phone, email }` — đều tuỳ chọn |
| `program` | jsonb | `{ title, date_from, date_to, pax_text, pax_count, itinerary_note }` — `pax_text` VD "20 người lớn", `pax_count` số để tính giá/khách |
| `options` | jsonb | mảng phương án (dưới) |
| `notes` | text[] | ghi chú cuối báo giá |
| `vat_rate` | numeric default 8 | % VAT áp cho các dòng có `vat=true` |
| `valid_until` | date | hiệu lực |
| `sale_name`, `sale_phone` | text | người phụ trách, hiện ở chân báo giá |
| `created_at`, `updated_at` | timestamptz | |

**Phương án** (`options[]`):
`{ id, name, place, image_url, highlights: string[], product_id?, items: Item[] }`

**Dòng dịch vụ** (`Item`):
`{ id, group, name, note, qty, qty_unit, times, times_unit, unit_price, vat }`
- `group`: `"Nơi nghỉ" | "Vận chuyển" | "Ăn uống & vui chơi" | "Khác"` (thứ tự cố định khi hiển thị).
- Thành tiền = `qty × times × unit_price`. Ô trống tính là **1** cho `qty`/`times` (Excel coi trống = 0 → ra 0đ sai);
  `unit_price` trống = dòng "Theo thực tế" (không cộng tổng, hiện chữ "Theo thực tế" thay vì 0đ).
- Hiển thị cột "Số lượng" ghép: `"20 khách × 2 bữa"`, `"4 villa × 1 đêm"`, `"1 xe"` (bỏ `× 1 …` khi times = 1 và không có times_unit).

**Tính tổng mỗi phương án**: Cộng = Σ thành tiền; VAT = Σ(thành tiền các dòng `vat=true`) × vat_rate%; Tổng = Cộng + VAT;
Giá/khách = Tổng / pax_count (làm tròn nghìn; ẩn nếu không có pax_count). Mọi số làm tròn đồng, hiện dạng `5.990.000đ`
(dùng `fmt` / `vnd` sẵn có trong `lib/tour-utils.ts`).

### Quyền truy cập
- RLS bật, **không có policy cho anon/authenticated** (giống bảng lương `0017`). Mọi đọc/ghi qua API route dùng
  `createServiceClient()` (`lib/supabase/service.ts`, cần `SUPABASE_SERVICE_ROLE_KEY` — đã có trên Vercel cho bảng lương).
- Trang khách `/bg/[code]`: server component đọc **đúng 1 báo giá theo code**; không có API liệt kê công khai.
- Khu soạn `/bao-gia/*` và API `/api/quotes/*`: **mật khẩu chung cho sale** (người dùng chọn).
  - Biến môi trường mới `SALE_PASSWORD`; trang `/bao-gia/login` + `POST /api/quotes/login` đặt cookie httpOnly
    `vivatrip_sale` (30 ngày). Không lưu nguyên văn mật khẩu trong cookie: lưu HMAC-SHA256(`SALE_PASSWORD`, chuỗi cố định)
    và so khớp ở middleware (Web Crypto, chạy được ở Edge).
  - Cookie Admin hợp lệ (`vivatrip_admin`) cũng được vào.
  - `middleware.ts` mở rộng `matcher` để chặn `/bao-gia/:path*` (trừ `/bao-gia/login`) và `/api/quotes/:path*`
    (trừ `/api/quotes/login`); trang → chuyển về login, API → 401.
  - Vì dùng chung 1 mật khẩu nên không biết ai tạo/sửa; người phụ trách (tên + SĐT) sale tự điền, trình duyệt nhớ lần trước.

### Tên miền riêng cho khách: `baogia.vivatrip.vn` (người dùng chọn)
Lý do: link trên tên miền công cụ nội bộ (`vivatripcheck.vercel.app`) cho khách lần ra các trang đang mở tự do có chiết khấu
nội bộ, nguồn giá, com.
- Thêm `baogia.vivatrip.vn` vào **cùng project Vercel** (người dùng thêm bản ghi CNAME `baogia` → `cname.vercel-dns.com`
  và thêm domain trong Vercel → Settings → Domains; mình hướng dẫn từng bước khi xong code).
- `middleware.ts` kiểm tra `host`: nếu là tên miền báo giá (biến `QUOTE_HOST`, mặc định `baogia.vivatrip.vn`) thì **chỉ cho**
  `/bg/*` và tài nguyên tĩnh cần cho trang đó (`/_next/*`, `/brand/*`, `/icons/*`, favicon); `/` và mọi đường dẫn khác → 404
  (hoặc chuyển về `https://vivatrip.vn`). Tên miền nội bộ vẫn mở `/bg/*` để sale xem thử.
- Link copy cho khách luôn dùng `NEXT_PUBLIC_QUOTE_BASE_URL` (mặc định `https://baogia.vivatrip.vn`); nếu chưa cấu hình
  tên miền thì sale vẫn xem được qua tên miền nội bộ.
- Trang `/bg` không tải ChatWidget/Header/BottomNav và không gọi `/api/admin/session` (tránh lộ endpoint nội bộ, tránh lỗi CORS).

## 5. Bố cục bản gửi khách (`/bg/[code]` + PDF)

Theo bản mẫu người dùng đã xem (`mau-bao-gia.html`), sửa theo góp ý "xe và ăn uống mỗi bên khác nhau":

**Đầu trang** (mọi trường hợp): logo `public/brand/vivatrip-logo.png` · khối công ty bên phải
(CÔNG TY CỔ PHẦN XÂY DỰNG VÀ DU LỊCH VIVA · 71 Trần Đăng Ninh, Hà Đông, Hà Nội · Hotline 0942 988 699 · info@vivatrip.vn ·
vivatrip.vn) · tiêu đề "BÁO GIÁ CHƯƠNG TRÌNH" · Số BG, ngày lập, hiệu lực · dải 4 ô: Khách hàng | Chương trình | Thời gian | Số khách.

**1 phương án**: ảnh + tên + nơi + 2–3 điểm nổi bật → bảng dịch vụ 4 cột (Dịch vụ [ghi chú chữ nhỏ dưới tên] · Số lượng ·
Đơn giá · Thành tiền), dòng nhóm tô nền → Cộng · VAT 8% (ghi rõ "xe & ăn uống" = các dòng có VAT) · **TỔNG THANH TOÁN** (+ ≈ giá/khách).

**Nhiều phương án**: phần "Lựa chọn nơi nghỉ" = thẻ tóm tắt cạnh nhau (ảnh, tên, nơi, highlights, **tổng trọn gói**, giá/khách,
nhãn "Tiết kiệm nhất" cho phương án tổng thấp nhất) → bảng so sánh tổng (cột = phương án; hàng = Nơi nghỉ, Vận chuyển,
Ăn uống & vui chơi, Khác, VAT, Tổng) → **chi tiết từng phương án**, mỗi phương án 1 bảng như trường hợp 1 phương án.
Nhóm/hàng không có dòng nào thì ẩn.

**Cuối**: Ghi chú (gạch đầu dòng) · chân trang tối: Người phụ trách + SĐT · "Cảm ơn Quý khách đã tin chọn VivaTrip".

**Quy tắc chung**: không hiện cột link ảnh, không hiện 0đ, ghi chú dài cắt tối đa 2 dòng ở bản web (PDF in đủ).
Responsive: ≤640px các thẻ xếp dọc, bảng vẫn 4 cột (chữ nhỏ hơn), không cuộn ngang trang.
Màu theo `tailwind.config.ts` (teal = đỏ san hô #EF4F58, sand #EDA36B, ink…), font Be Vietnam Pro + Quicksand (tiêu đề).

**Thanh công cụ trên trang khách** (ẩn khi in): "Tải PDF" (`window.print()`), "Gọi" (tel: sale_phone), "Zalo"
(`https://zalo.me/<sale_phone>`).

**PDF**: `@media print` + `@page { size: A4; margin: 12mm }`; ẩn header/bottom nav/chat widget của app; mỗi khối chi tiết
phương án `break-inside: avoid` khi vừa, ngắt trang trước chi tiết phương án thứ 2 trở đi; màu nền in (`print-color-adjust: exact`).
`document.title` = `Bao-gia-<number>-<khách>` để tên file PDF gọn.

**Link Zalo**: `generateMetadata` cho `/bg/[code]` → title "Báo giá <chương trình> – VivaTrip", description
"<thời gian> · <số khách> · <n> phương án", og:image = logo; `robots: noindex`. Trang không dùng layout chung có
Header/BottomNav/ChatWidget (route group riêng hoặc ẩn bằng điều kiện pathname).

## 6. Khu soạn báo giá (sale)

**Điều hướng**: thêm "Báo giá" vào menu "Thêm" của `components/bottom-nav.tsx` và header.

**`/bao-gia` — danh sách**: tìm theo khách/chương trình/số BG; mỗi dòng: số BG, khách, chương trình, thời gian, số phương án,
tổng thấp nhất, trạng thái, ngày sửa; nút Mở / Nhân bản / Copy link / Xoá (xác nhận). Nút "+ Báo giá mới".

**`/bao-gia/[id]` — trình soạn** (máy tính là chính, điện thoại dùng được):
- Bên trái là form, bên phải là **xem trước trực tiếp** (dùng chung component với trang khách). Điện thoại: tab Soạn / Xem trước.
- Khối Khách hàng, Chương trình (ngày đi–về; số đêm tự tính), Người phụ trách (nhớ lần trước bằng localStorage), Hiệu lực
  (mặc định +7 ngày), VAT % (mặc định 8), Ghi chú (gợi ý sẵn: "Giá phòng đã gồm VAT & phí dịch vụ; xe và ăn uống cộng thêm VAT 8%.",
  "Báo giá có hiệu lực đến …, phụ thuộc tình trạng phòng tại thời điểm đặt.").
- **Phương án**: tab theo phương án; "+ Phương án" (trống / **chép từ phương án đang mở**); đổi tên, xoá, kéo đổi thứ tự.
  Mỗi phương án: tên, nơi, ảnh (link ảnh hoặc ảnh sản phẩm), điểm nổi bật (tối đa 3 dòng).
- **Chọn từ kho**: ô tìm resort/villa (dùng `/api/products/names`). Chọn xong:
  - điền tên, `area` làm nơi, `thumbnail_url` làm ảnh, 2–3 dòng đầu của `perks` làm điểm nổi bật;
  - **resort/khách sạn**: chọn hạng phòng (`hotel_rates`) → thêm dòng "Nơi nghỉ" với đơn giá = giá trung bình/đêm theo
    `quoteStay(rate, product, holidays, date_from, date_to)` (`lib/resort-pricing.ts`), `times` = số đêm, ghi chú = `perks`/bữa sáng;
  - **villa**: thêm dòng với giá theo từng đêm qua `getApplicablePrice` (`lib/pricing.ts`) — nếu các đêm khác giá thì
    tách mỗi mức giá thành 1 dòng ("Villa X – đêm T7 06/12");
  - giá điền là **giá bán gốc** (trước chiết khấu nội bộ). Không bao giờ điền chiết khấu/com/nguồn giá.
- **Dòng dịch vụ**: bảng sửa trực tiếp (nhóm, tên, ghi chú, SL + đơn vị, số lần + đơn vị, đơn giá, ô VAT); nút
  "+ Dịch vụ hay dùng": Xe 16/29/45 chỗ (Vận chuyển, VAT bật), Dừng đợi ăn trưa, Bữa sáng/trưa/tối (Ăn uống, VAT bật),
  BBQ, Gala dinner, Hướng dẫn viên, Sân pickleball (giá "Theo thực tế"), Bảo hiểm du lịch. Danh sách cứng trong code, không có giá sẵn.
  Dòng nhóm "Nơi nghỉ" mặc định VAT tắt, các nhóm khác mặc định bật.
- Tự lưu (debounce ~1,5s) + trạng thái "Đã lưu"; nút **Copy link**, **Copy tin Zalo** (VD "VivaTrip gửi anh/chị báo giá
  chương trình Hà Nội 2N1Đ (05–06/12): <link>"), **Mở bản khách xem**, **Tải PDF**, **Đánh dấu đã gửi**, **Nhân bản**.

## 7. Phần kỹ thuật khác

- API: `GET/POST /api/quotes` (danh sách gọn / tạo), `GET/PATCH/DELETE /api/quotes/[id]`, `POST /api/quotes/[id]/duplicate`.
  Validate đầu vào ở server (giới hạn độ dài chữ, số ≥ 0, ≤ 20 phương án, ≤ 100 dòng/phương án).
- Hàm tính tổng thuần (`lib/quote-calc.ts`) dùng chung cho xem trước, trang khách, danh sách.
- Giữ phong cách code sẵn có: client components, `sonner` toast, `components/ui/*`, comment tiếng Việt.
- Không thêm thư viện mới.
- README: thêm mục "Báo giá" + bước chạy migration `0032_quotes.sql`.

## 8. Để lại cho người làm quyết định
Tên/thứ tự cột chi tiết trong form; cách kéo đổi thứ tự (nút lên/xuống là đủ); cách sinh `number` an toàn khi 2 sale tạo cùng lúc
(chấp nhận trùng hiếm → thêm hậu tố); chi tiết responsive; cách tách route group để trang `/bg` không có Header/BottomNav.

## 9. Quyết định đã chốt
- Người dùng: mật khẩu chung cho sale (`SALE_PASSWORD`); link khách trên `baogia.vivatrip.vn`; cách A (link + PDF in từ trình duyệt);
  mỗi phương án có bảng dịch vụ riêng (xe/ăn uống khác nhau theo nơi); 1 phương án là trường hợp thường gặp.
- Mình quyết (người dùng có thể sửa):
  - Link luôn hiện **bản mới nhất**; trang khách ghi "Cập nhật lúc …". Muốn giữ bản cũ → Nhân bản (mã mới).
  - Giá điền từ kho là **giá bán trước chiết khấu nội bộ** (resort: `avgBase` của `quoteStay`; villa: `getApplicablePrice`).
  - Ô SL/số lần để trống = 1; đơn giá trống = "Theo thực tế", không cộng tổng.
  - Nhóm "Nơi nghỉ" mặc định không cộng VAT, các nhóm khác mặc định cộng VAT 8%.
  - Sản phẩm thiếu hạng phòng → thêm 1 dòng "Nơi nghỉ" theo giá chung của sản phẩm, sale sửa tay.
  - Không thêm thư viện mới.
