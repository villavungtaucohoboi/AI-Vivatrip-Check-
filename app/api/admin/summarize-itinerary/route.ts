import { NextRequest, NextResponse } from "next/server";
import { callAI, cleanAIOutput } from "@/lib/ai-text";
import { parseItinerary } from "@/lib/itinerary-parser";

// Rút gọn lịch trình du thuyền bằng AI (Gemini miễn phí / Claude).
// Không có AI hoặc AI lỗi → dùng bộ tách miễn phí (parseItinerary).
// Nằm dưới /api/admin nên chỉ Admin dùng được.

const PROMPT = `Bạn là trợ lý cho đội sale du lịch VivaTrip. Chuyển lịch trình du thuyền dưới đây thành danh sách mốc giờ NGẮN GỌN để in lên ảnh gửi khách.

ĐỊNH DẠNG BẮT BUỘC — mỗi mốc đúng 1 dòng:
HHhMM | nội dung ngắn
Ví dụ:
09h00 | Check-in tại cảng tàu khách quốc tế Hạ Long
09h45 | Tàu khởi hành, ngắm vịnh Hạ Long
Nếu là tour nhiều ngày, trước các mốc của mỗi ngày thêm 1 dòng: NGÀY 1 | tiêu đề ngắn của ngày

Quy tắc:
- Giờ viết dạng 09h00, 13h30 (khoảng giờ: 10h30 - 11h00). Không có giờ cụ thể thì dùng Sáng / Trưa / Chiều / Tối.
- Nội dung mỗi mốc tối đa 14 chữ, giữ tên địa danh, hoạt động chính (hang, kayak, bữa ăn...). Bỏ văn tả cảm xúc, tính từ hoa mỹ.
- Nếu một mốc có nhiều hoạt động thì gộp gọn bằng dấu phẩy.
- TUYỆT ĐỐI KHÔNG ghi giá tiền, phụ thu, số điện thoại, link.
- Chỉ dùng thông tin có trong bài, không bịa thêm mốc.
- Chỉ trả về các dòng lịch trình, không tiêu đề, không lời dẫn, không ký hiệu markdown.`;

export async function POST(req: NextRequest) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const raw = (text ?? "").trim();
  if (!raw) return NextResponse.json({ error: "Chưa có lịch trình để rút gọn." }, { status: 400 });

  const ai = await callAI(PROMPT, raw, 900);
  if (ai.text) {
    // Chuẩn hoá: chỉ giữ các dòng có dạng "giờ | nội dung" hoặc "NGÀY x | ..."
    const lines = cleanAIOutput(ai.text)
      .split("\n")
      .map((l) => l.replace(/^[\s\-*•]+/, "").trim())
      .filter((l) => l.includes("|"));
    if (lines.length) return NextResponse.json({ itinerary: lines.join("\n"), engine: "ai" });
  }
  return NextResponse.json({ itinerary: parseItinerary(raw), engine: "basic", aiError: ai.error });
}
