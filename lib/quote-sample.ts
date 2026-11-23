// Báo giá mẫu (theo file "Báo giá Iris tháng 05/12/2026") — dùng cho trang xem mẫu /bao-gia/xem-mau.
import { DEFAULT_NOTES, type QuoteGroup, type QuoteInput, type QuoteItem, type QuoteOption } from "@/lib/quote-types";

let seq = 0;
const it = (group: QuoteGroup, name: string, qty: number | null, qty_unit: string, times: number | null, times_unit: string, unit_price: number | null, vat: boolean, note = ""): QuoteItem => ({
  id: `s${++seq}`, group, name, note, qty, qty_unit, times, times_unit, unit_price, vat,
});
const common = (xe: number, dinner: number, lunch: number): QuoteItem[] => [
  it("Vận chuyển", "Xe 29 chỗ đưa đón", 1, "xe", null, "", xe, true, "2 chiều Hà Nội – Resort"),
  it("Vận chuyển", "Dừng đợi ăn trưa trên đường", 1, "lượt", null, "", 300_000, true),
  it("Ăn uống & vui chơi", "Bữa trưa tại nhà hàng resort", 20, "khách", 2, "bữa", lunch, true, "Chưa gồm đồ uống"),
  it("Ăn uống & vui chơi", "Bữa tối tại nhà hàng resort", 20, "khách", 1, "bữa", dinner, true, "Chưa gồm đồ uống"),
  it("Ăn uống & vui chơi", "Sân pickleball", null, "sân", null, "giờ", null, true, "Chưa gồm vợt, bóng"),
  it("Ăn uống & vui chơi", "Hướng dẫn viên", 1, "người", 2, "ngày", 800_000, false),
];
const opt = (id: string, name: string, place: string, highlights: string[], items: QuoteItem[]): QuoteOption => ({ id, name, place, image_url: "", highlights, product_id: null, items });

export const SAMPLE_QUOTE: QuoteInput = {
  status: "draft",
  customer: { name: "Chị Lan", company: "Công ty Iris", phone: "", email: "" },
  program: { title: "Hà Nội 2N1Đ", date_from: "2026-12-05", date_to: "2026-12-06", pax_text: "20 người lớn", pax_count: 20, itinerary_note: "" },
  options: [
    opt("ivory", "Ivory Villas & Resort", "Lương Sơn · Hòa Bình", ["Villa 4PN, bể bơi riêng", "Gồm ăn sáng, VAT & phí dịch vụ"], [
      it("Nơi nghỉ", "Villa 4 phòng ngủ", 1, "villa", 1, "đêm", 7_000_000, false, "Gồm ăn sáng cho 6 người lớn, VAT & phí dịch vụ"),
      it("Nơi nghỉ", "Villa 4 phòng ngủ hướng vườn, bể bơi riêng", 3, "villa", 1, "đêm", 8_000_000, false),
      ...common(3_500_000, 400_000, 300_000),
    ]),
    opt("wyndham", "Wyndham Skylake", "Chương Mỹ · Hà Nội", ["15 phòng Junior Suite", "Ăn sáng buffet quốc tế"], [
      it("Nơi nghỉ", "Resort Junior Suite", 15, "phòng", 1, "đêm", 2_500_000, false, "Gồm ăn sáng tiêu chuẩn quốc tế"),
      ...common(3_800_000, 450_000, 350_000),
    ]),
    opt("flamingo", "Flamingo Đại Lải", "Phúc Yên · Vĩnh Phúc", ["Villa 3PN, miễn phí qua cổng", "Gồm 01 bữa sáng"], [
      it("Nơi nghỉ", "Villa 3 phòng ngủ", 5, "villa", 1, "đêm", 13_000_000, false, "Miễn phí qua cổng resort, 01 bữa sáng"),
      ...common(3_200_000, 500_000, 400_000),
    ]),
  ],
  notes: [...DEFAULT_NOTES],
  vat_rate: 8,
  valid_until: "2026-11-30",
  sale_name: "Nguyễn Văn A",
  sale_phone: "0912 345 678",
};

/** Báo giá rất dài — để thử bản in PDF */
export const SAMPLE_QUOTE_LARGE: QuoteInput = {
  ...SAMPLE_QUOTE,
  options: Array.from({ length: 5 }, (_, k) =>
    opt(`big${k}`, `Phương án dài ${k + 1}`, "Thử in", ["Ghi chú dài để thử ngắt trang"], Array.from({ length: 30 }, (_, j) =>
      it((["Nơi nghỉ", "Vận chuyển", "Ăn uống & vui chơi", "Khác"] as QuoteGroup[])[j % 4], `Dịch vụ số ${j + 1} có tên khá dài để thử xuống dòng trong bảng`, 2 + j, "khách", 1 + (j % 3), "bữa", 150_000 * (j + 1), j % 2 === 0, "Ghi chú rất dài: ".repeat(6))
    ))
  ),
};
