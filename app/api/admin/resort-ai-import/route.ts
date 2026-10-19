import { NextRequest, NextResponse } from "next/server";
import { callAI, extractJSON, type AIImage } from "@/lib/ai-text";

// AI ĐỌC HỢP ĐỒNG / BẢNG GIÁ (chữ dán vào và/hoặc ẢNH chụp màn hình, nhiều ảnh)
// → thông tin resort, các GIAI ĐOẠN giá, hạng phòng + giá từng giai đoạn,
//   phụ thu, tóm tắt hợp đồng. Admin xem lại rồi mới Lưu.

const PROMPT = `Bạn là trợ lý nhập liệu cho công ty du lịch VivaTrip. Đọc hợp đồng / bảng giá của resort - khách sạn - homestay (chữ và/hoặc ảnh) và trả về DUY NHẤT 1 object JSON:

{
  "resort": {
    "name": "tên resort",
    "type": "resort" | "hotel" | "homestay",
    "star": số sao (3/4/5) hoặc null,
    "area": "tên khu vực NGẮN để tìm kiếm, VD 'Hội An', 'Đà Nẵng', 'Phú Quốc', 'Hạ Long'",
    "address": "địa chỉ đầy đủ" hoặc "",
    "image_link": "link album ảnh nếu có" hoặc "",
    "amenities": { "pool": bool, "near_beach": bool, "sea_view": bool, "near_lake": bool, "karaoke": bool, "bbq": bool, "pickleball": bool },
    "perks": "các quyền lợi / tiện ích khách được hưởng (gửi khách được), mỗi dòng 1 ý bắt đầu bằng ✅, VD '✅ Ăn sáng buffet', '✅ Xe đưa đón phố cổ Hội An', '✅ Wifi miễn phí'"
  },
  "periods": [
    {
      "name": "tên giai đoạn ngắn, VD 'Giai đoạn thường', 'Cao điểm', 'Đỉnh điểm', 'Lễ Tết'",
      "ranges": [ { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" } ],
      "weekend_split": true nếu giai đoạn này có giá cuối tuần riêng, ngược lại false,
      "holiday": true nếu đây là giá áp dụng riêng cho các ngày lễ (không ghi ngày cụ thể), ngược lại false
    }
  ],
  "weekend_nights": các đêm tính giá cuối tuần (0=CN,1=T2,...,5=T6,6=T7), mặc định [5,6],
  "rooms": [
    {
      "room_type": "tên hạng phòng",
      "rate_plan": "gói giá, VD 'Ăn sáng', 'Không ăn sáng', '2 bữa (HB)', '3 bữa (FB)', 'All Inclusive', 'Commit 2 bữa' — CÙNG 1 hạng phòng có nhiều gói giá thì ghi THÀNH NHIỀU DÒNG, mỗi dòng 1 gói",
      "area_m2": số hoặc null,
      "bed": "loại giường" hoặc null,
      "capacity": số NGƯỜI LỚN tối đa/phòng hoặc null,
      "max_children": số trẻ em tối đa/phòng hoặc null,
      "breakfast": true/false,
      "extra_bed_price": giá giường phụ (VNĐ) hoặc null,
      "prices": [ { "period": số thứ tự giai đoạn trong mảng periods (bắt đầu từ 0), "wd": giá ngày thường hoặc giá chung (VNĐ), "we": giá cuối tuần (VNĐ) hoặc null } ]
    }
  ],
  "surcharge_note": "phụ thu, mỗi dòng 1 ý bắt đầu bằng emoji: 👤 người lớn thêm, 🧒 trẻ em theo tuổi, 🛏️ giường phụ, 🌏 phụ phí thị trường nước ngoài, 🎉 Gala bắt buộc...",
  "contract_summary": "tóm tắt điều khoản cho Sale, mỗi dòng 1 ý bắt đầu bằng emoji: 📆 hiệu lực hợp đồng, 🕑 nhận/trả phòng, 🧾 cọc - thanh toán, ↩️ huỷ/đổi, ⚠️ lưu ý (Tết Âm lịch, số phòng tối đa, giá có VAT/phí phục vụ chưa...)"
}

Quy tắc:
- Giá luôn là số VNĐ đầy đủ (1,700,000 → 1700000). Giá USD không đổi được → để null, ghi vào contract_summary.
- Một giai đoạn có thể gồm NHIỀU khoảng ngày (VD 02/01–31/05 và 03/09–23/12) → đưa hết vào "ranges" của cùng giai đoạn đó.
- Ngày luôn ghi đủ năm theo hợp đồng (YYYY-MM-DD). Nếu bảng không ghi năm, lấy năm của hợp đồng.
- Thứ tự periods: giai đoạn thường trước, các giai đoạn giá cao hơn sau.
- Bảng chỉ có 1 mức giá → 1 giai đoạn tên "Giá chung" với ranges rỗng.
- Chỉ dùng thông tin có trong tài liệu, không bịa. Không có thì để null, false hoặc "".
- Chỉ trả JSON.`;

interface AIOut {
  resort?: Record<string, unknown>;
  periods?: { name?: string; ranges?: { from?: string; to?: string }[]; weekend_split?: boolean; holiday?: boolean }[];
  weekend_nights?: number[];
  rooms?: (Record<string, unknown> & { prices?: { period?: number; wd?: unknown; we?: unknown }[] })[];
  surcharge_note?: string;
  contract_summary?: string;
}

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const isDate = (s: unknown) => typeof s === "string" && /^(\d{4}-)?\d{2}-\d{2}$/.test(s);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; images?: AIImage[] };
  const text = (body.text ?? "").trim();
  const images = (body.images ?? []).filter((x) => x?.data).slice(0, 6);
  if (!text && !images.length) {
    return NextResponse.json({ error: "Dán chữ hợp đồng hoặc thêm ảnh chụp bảng giá trước." }, { status: 400 });
  }

  const ai = await callAI(PROMPT, text, 8000, { images, json: true });
  if (!ai.text) {
    return NextResponse.json({ error: `AI chưa đọc được (${ai.error ?? "không rõ lý do"}).` }, { status: 422 });
  }
  const d = extractJSON<AIOut>(ai.text);
  if (!d || !Array.isArray(d.rooms) || !Array.isArray(d.periods)) {
    return NextResponse.json({ error: "AI trả về không đúng định dạng — thử lại, hoặc cắt ảnh rõ hơn / dán chữ." }, { status: 422 });
  }

  const periods = d.periods.map((p, i) => ({
    key: `p${i + 1}`,
    name: String(p.name ?? `Giai đoạn ${i + 1}`).trim(),
    ranges: (p.ranges ?? []).filter((r) => isDate(r.from) && isDate(r.to)).map((r) => ({ from: r.from as string, to: r.to as string })),
    weekend_split: !!p.weekend_split,
    holiday: !!p.holiday,
  }));
  const rooms = d.rooms
    .map((r) => {
      const prices: Record<string, { wd: number | null; we: number | null }> = {};
      for (const pr of r.prices ?? []) {
        const per = periods[Number(pr.period)];
        if (per) prices[per.key] = { wd: num(pr.wd), we: num(pr.we) };
      }
      return {
        room_type: String(r.room_type ?? "").trim(),
        rate_plan: String(r.rate_plan ?? "").trim(),
        area_m2: num(r.area_m2),
        bed: r.bed ? String(r.bed) : null,
        capacity: num(r.capacity),
        max_children: num(r.max_children),
        breakfast: r.breakfast === true || r.breakfast === "true",
        extra_bed_price: num(r.extra_bed_price),
        prices,
      };
    })
    .filter((r) => r.room_type);

  const rs = d.resort ?? {};
  const am = (rs.amenities ?? {}) as Record<string, unknown>;
  const type = ["resort", "hotel", "homestay"].includes(String(rs.type)) ? String(rs.type) : "resort";
  return NextResponse.json({
    resort: {
      name: String(rs.name ?? "").trim(),
      type,
      star: num(rs.star),
      area: String(rs.area ?? "").trim(),
      address: String(rs.address ?? "").trim(),
      image_link: String(rs.image_link ?? "").trim(),
      perks: String(rs.perks ?? "").trim(),
      amenities: Object.fromEntries(
        ["pool", "near_beach", "sea_view", "near_lake", "karaoke", "bbq", "pickleball"].map((key) => [key, am[key] === true])
      ),
    },
    periods,
    weekend_nights: Array.isArray(d.weekend_nights) ? d.weekend_nights.filter((n) => n >= 0 && n <= 6) : [5, 6],
    rooms,
    surcharge_note: d.surcharge_note ?? "",
    contract_summary: d.contract_summary ?? "",
  });
}
