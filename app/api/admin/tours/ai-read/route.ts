import { NextRequest, NextResponse } from "next/server";
import { callAI, extractJSON, type AIImage } from "@/lib/ai-text";
import { docxToText, fetchLinkContent } from "@/lib/doc-text";

// AI ĐỌC CHƯƠNG TRÌNH TOUR (link Drive/Docs, file Word/PDF, hoặc chữ dán vào)
// → lịch trình từng ngày, điểm đến, giá theo ngày khởi hành, bao gồm / không bao gồm, visa…
// Admin xem lại trong form rồi mới Lưu.

export const maxDuration = 60;

const PROMPT = `Bạn là trợ lý nhập liệu của công ty du lịch VivaTrip. Đọc chương trình TOUR NƯỚC NGOÀI của đối tác và trả về DUY NHẤT 1 object JSON:
{
  "name": "tên tour ngắn gọn, hấp dẫn (VD 'Khám phá xứ sở Kim Chi')",
  "country": "nước đến (VD 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc'; liên tuyến ghi 'Hàn Quốc + Nhật Bản')",
  "from_city": "nơi khởi hành (VD 'Hà Nội', 'TP.HCM', 'Đà Nẵng')",
  "days": số ngày, "nights": số đêm,
  "airline": "hãng bay" hoặc "",
  "flights": "giờ bay ngắn gọn VD 'Đi 9G410 16h20–22h40 · Về 9G411 00h15–02h25'" hoặc "",
  "route_text": "tuyến điểm ngắn VD 'Hà Nội – Seoul – Nami – Everland'",
  "places": ["MỌI thành phố / địa danh tham quan trong lịch trình, viết chuẩn tên, VD 'Seoul','Đảo Nami','Everland','Busan','Núi Phú Sĩ'"],
  "highlights": ["5-8 điểm nhấn hấp dẫn, mỗi ý 1 dòng ngắn"],
  "itinerary": [ { "t": "tiêu đề ngày VD 'Hà Nội – Incheon'", "meals": "bữa ăn VD '3 bữa', 'Sáng, trưa', '-'", "items": ["các hoạt động theo thứ tự, mỗi ý 1 dòng, giữ giờ giấc & món ăn dự kiến, viết gọn"], "hotel": "nơi nghỉ đêm hoặc ''" } ],
  "includes": ["giá bao gồm, mỗi ý 1 dòng"],
  "excludes": ["không bao gồm, mỗi ý 1 dòng"],
  "visa_notes": ["lưu ý visa / hộ chiếu / xuất nhập cảnh khách cần biết, mỗi ý 1 dòng ngắn"],
  "sale_terms": ["điều khoản cho Sale: cọc, thanh toán, huỷ, đổi ngày, số khách tối thiểu, phạt tách đoàn, phụ thu quốc tịch…"],
  "group_label": "VD 'Khách lẻ ghép đoàn 25 khách'" hoặc "",
  "single_usd": phụ thu phòng đơn USD/đêm hoặc null,
  "tips_usd": tips HDV USD/khách/hành trình hoặc null,
  "visa_discount": số tiền trừ cho khách đã có visa (VNĐ) hoặc 0,
  "departures": [ { "date": "YYYY-MM-DD", "adult": giá người lớn VNĐ, "child": giá trẻ em hoặc null, "infant": giá em bé hoặc null, "tag": "Noel" | "Tết DL" | "Tết" | "30/4" | null } ]
}
QUY TẮC:
- Bảng giá thường gộp nhiều ngày 1 ô và có thể bị DÍNH chữ giữa các ô (VD "14/1002, 09, 10/1105 & 10/12" = 14/10; 02, 09, 10/11; 05 & 10/12). Tách thành TỪNG NGÀY riêng, mỗi ngày 1 dòng departures với đúng giá của hàng đó.
- Ngày không ghi năm → năm gần nhất SAU ngày hôm nay ({TODAY}) theo thứ tự trong bảng.
- Giá là số VNĐ đầy đủ (11.990.000 → 11990000).
- KHÔNG đưa tên công ty đối tác, hotline, website, email của đối tác vào bất kỳ trường nào.
- Giữ đúng nội dung tài liệu, không bịa. Không có thì để "" / [] / null.
- Chỉ trả JSON.`;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { link?: string; text?: string; file?: { name: string; mime: string; data: string } };
  let text = (body.text ?? "").trim();
  const files: AIImage[] = [];
  try {
    if (body.file?.data) {
      const buf = Buffer.from(body.file.data, "base64");
      if (/pdf/i.test(body.file.mime) || /\.pdf$/i.test(body.file.name)) files.push({ mime: "application/pdf", data: body.file.data });
      else if (/\.docx$/i.test(body.file.name) || /wordprocessingml/i.test(body.file.mime)) text = `${text}\n\n${await docxToText(buf)}`;
      else if (/^image\//.test(body.file.mime)) files.push({ mime: body.file.mime, data: body.file.data });
      else text = `${text}\n\n${buf.toString("utf8")}`;
    } else if (body.link?.trim()) {
      const c = await fetchLinkContent(body.link.trim());
      if (c.kind === "pdf") files.push({ mime: "application/pdf", data: c.data });
      else text = `${text}\n\n${c.text}`;
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không đọc được file." }, { status: 422 });
  }
  if (!text.trim() && !files.length) return NextResponse.json({ error: "Dán link, up file hoặc dán chữ chương trình tour trước." }, { status: 400 });

  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const ai = await callAI(PROMPT.replace("{TODAY}", today), text, 12000, { json: true, images: files, maxInput: 40000 });
  if (!ai.text) return NextResponse.json({ error: `AI chưa đọc được (${ai.error ?? "không rõ lý do"}).` }, { status: 422 });
  const d = extractJSON<Record<string, unknown>>(ai.text);
  if (!d || !Array.isArray(d.itinerary)) return NextResponse.json({ error: "AI trả về sai định dạng — thử lại hoặc dán chữ trực tiếp." }, { status: 422 });
  return NextResponse.json({ tour: d, sourceText: text.slice(0, 200) });
}
