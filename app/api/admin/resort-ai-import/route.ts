import { NextRequest, NextResponse } from "next/server";
import { callAI, extractJSON, type AIImage } from "@/lib/ai-text";

// AI ĐỌC HỢP ĐỒNG / BẢNG GIÁ (chữ dán vào hoặc ẢNH chụp màn hình) → điền sẵn
// bảng hạng phòng 5 mức giá + mùa cao điểm + phụ thu + tóm tắt hợp đồng.
// Admin xem lại rồi mới Lưu. Nằm dưới /api/admin nên chỉ Admin dùng được.

const PROMPT = `Bạn là trợ lý nhập liệu cho công ty du lịch VivaTrip. Đọc hợp đồng / bảng giá phòng khách sạn - resort (chữ hoặc ảnh) và trả về DUY NHẤT 1 object JSON đúng cấu trúc:

{
  "rooms": [
    {
      "room_type": "tên hạng phòng",
      "area_m2": số hoặc null,
      "bed": "loại giường, VD '1 giường đôi' hoặc '2 giường đơn'" hoặc null,
      "capacity": số người lớn tối đa/phòng hoặc null,
      "breakfast": true/false (giá đã gồm ăn sáng chưa),
      "price_low_weekday": giá thấp điểm ngày thường (VNĐ, số nguyên) hoặc null,
      "price_low_weekend": giá thấp điểm cuối tuần hoặc null,
      "price_high_weekday": giá cao điểm ngày thường hoặc null,
      "price_high_weekend": giá cao điểm cuối tuần hoặc null,
      "price_holiday": giá lễ Tết hoặc null
    }
  ],
  "high_seasons": "các khoảng cao điểm dạng dd/mm-dd/mm, cách nhau dấu ;  VD '01/06-31/08; 20/12-05/01'" hoặc "",
  "weekend_nights": mảng số thứ của các ĐÊM tính giá cuối tuần (0=CN,1=T2,...,5=T6,6=T7), VD [5,6]; không rõ thì [5,6],
  "surcharge_note": "phụ thu, mỗi dòng 1 ý bắt đầu bằng emoji: 👤 người lớn thêm, 🧒 trẻ em theo tuổi, 🛏️ giường phụ, 🎉 tiệc Gala bắt buộc...",
  "contract_summary": "tóm tắt điều khoản cho sale, mỗi dòng 1 ý bắt đầu bằng emoji: 🕑 giờ nhận/trả phòng, 🧾 đặt cọc - thanh toán, ↩️ huỷ/đổi, ⚠️ lưu ý lễ Tết, 💼 giá đã gồm VAT/phí phục vụ chưa"
}

Quy tắc:
- Giá luôn là số VNĐ đầy đủ (1.650.000 → 1650000; "1tr65" → 1650000). Giá theo USD thì đổi ra VNĐ KHÔNG được — để null và ghi chú vào contract_summary.
- Nếu bảng chỉ có 1 mức giá cho mọi ngày → điền vào price_low_weekday, các mức khác để null.
- Nếu có giá "cuối tuần" mà không chia mùa → điền vào price_low_weekend.
- Nếu có giá theo mùa (cao điểm / hè / Tết) → điền đúng cột, và ghi khoảng ngày vào high_seasons.
- Giá là giá BÁN cho khách (net/giá công bố). Nếu có cả giá net đại lý và giá công bố, dùng giá công bố.
- Chỉ dùng thông tin có trong tài liệu, không bịa. Không có thì để null hoặc "".
- Chỉ trả JSON, không giải thích.`;

interface AIResult {
  rooms?: Record<string, unknown>[];
  high_seasons?: string;
  weekend_nights?: number[];
  surcharge_note?: string;
  contract_summary?: string;
}

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; image?: AIImage };
  const text = (body.text ?? "").trim();
  if (!text && !body.image?.data) {
    return NextResponse.json({ error: "Dán chữ hợp đồng hoặc chọn ảnh chụp bảng giá trước." }, { status: 400 });
  }

  const ai = await callAI(PROMPT, text, 4000, { image: body.image, json: true });
  if (!ai.text) {
    return NextResponse.json(
      { error: `AI chưa đọc được (${ai.error ?? "không rõ lý do"}). Phần này cần bật AI (GEMINI_API_KEY).` },
      { status: 422 }
    );
  }
  const data = extractJSON<AIResult>(ai.text);
  if (!data || !Array.isArray(data.rooms)) {
    return NextResponse.json({ error: "AI trả về không đúng định dạng, thử lại hoặc cắt ảnh rõ hơn." }, { status: 422 });
  }

  const rooms = data.rooms
    .map((r) => ({
      room_type: String(r.room_type ?? "").trim(),
      area_m2: num(r.area_m2),
      bed: r.bed ? String(r.bed) : null,
      capacity: num(r.capacity),
      breakfast: r.breakfast === true || r.breakfast === "true",
      price_low_weekday: num(r.price_low_weekday),
      price_low_weekend: num(r.price_low_weekend),
      price_high_weekday: num(r.price_high_weekday),
      price_high_weekend: num(r.price_high_weekend),
      price_holiday: num(r.price_holiday),
    }))
    .filter((r) => r.room_type);

  return NextResponse.json({
    rooms,
    high_seasons: typeof data.high_seasons === "string" ? data.high_seasons : "",
    weekend_nights: Array.isArray(data.weekend_nights) ? data.weekend_nights.filter((n) => n >= 0 && n <= 6) : [5, 6],
    surcharge_note: data.surcharge_note ?? "",
    contract_summary: data.contract_summary ?? "",
  });
}
