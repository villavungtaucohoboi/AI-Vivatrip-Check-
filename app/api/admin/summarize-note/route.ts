import { NextRequest, NextResponse } from "next/server";
import { summarizeNoteBasic } from "@/lib/villa-text";
import { callAI, cleanAIOutput } from "@/lib/ai-text";

// Rút gọn nội dung căn khi Admin dán nguyên bài từ chủ nhà / Facebook / Zalo.
// - Có biến môi trường ANTHROPIC_API_KEY (Vercel → Settings → Environment
//   Variables) → dùng AI Claude tóm tắt (rất rẻ, ~vài chục đồng/lần).
// - Có GEMINI_API_KEY (Google AI Studio, có gói miễn phí) → dùng Gemini.
// - Không có → dùng bộ lọc tự viết (miễn phí), vẫn bỏ được emoji, hashtag,
//   câu quảng cáo, dòng trùng.
// Route nằm dưới /api/admin nên đã được middleware bảo vệ bằng mật khẩu Admin.

const PROMPT = `Bạn là trợ lý viết nội dung cho đội sale du lịch VivaTrip. Viết lại nội dung giới thiệu villa dưới đây thành bản NGẮN GỌN, DỄ ĐỌC, HẤP DẪN, ĐỦ Ý theo ĐÚNG khung và THỨ TỰ sau (bỏ mục nào không có thông tin, giữ nguyên tiêu đề kể cả emoji):

⭐ TỔNG QUAN
(1 dòng duy nhất dạng: 🛏️ X phòng ngủ · 🚿 Y WC · 👥 Z khách (tối đa N) · 📐 ~Sm2 — chỉ ghi phần có trong bài)
🛏️ PHÒNG & KHÔNG GIAN
(kết cấu từng phòng: phòng ngủ trước, rồi WC, bếp, phòng khách)
🎉 TIỆN ÍCH MIỄN PHÍ
💳 DỊCH VỤ TÍNH PHÍ
👥 SỨC CHỨA & PHỤ THU
📍 VỊ TRÍ & VIEW
⏰ NHẬN – TRẢ PHÒNG
📌 LƯU Ý

Quy tắc:
- Dưới mỗi tiêu đề, mỗi dòng 1 ý, BẮT ĐẦU bằng 1 emoji đúng nghĩa (🛏️ phòng ngủ, 🛖 bungalow, 🚿 WC, 🍳 bếp, 🛋️ phòng khách, 🏊 hồ bơi, 🎤 karaoke, 🍖 BBQ, 🎱 bida, ⚽ bi lắc, 🧹 dọn dẹp, ⏱️ thêm giờ, 🍽️ đồ ăn, 👥 khách, 👶 trẻ em, 💵 phụ thu, ⛰️ núi, 🌊 hồ/biển, 🛒 tạp hoá, 🕑 giờ, 🧾 cọc/huỷ, 🐾 thú cưng, ⚠️ lưu ý).
- Mỗi dòng tối đa 15 chữ, rõ ràng, tươi vui, CHỈ dùng thông tin có trong bài, KHÔNG bịa.
- Đúng mục: tiện ích miễn phí và dịch vụ tính phí phải tách riêng theo bài gốc.
- Bỏ lời chào, câu tả cảm xúc chung chung, hashtag, số điện thoại, link, "inbox/liên hệ".
- Giữ nguyên các con số (phòng, giường, khách, giá, giờ, km, m2).
- Các mục cách nhau 1 dòng trống. Chỉ trả về nội dung theo khung, không thêm lời dẫn.`;

export async function POST(req: NextRequest) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const raw = (text ?? "").trim();
  if (!raw) return NextResponse.json({ error: "Chưa có nội dung để rút gọn." }, { status: 400 });

  const ai = await callAI(PROMPT, raw, 800);
  if (ai.text) return NextResponse.json({ summary: cleanAIOutput(ai.text), engine: "ai" });

  const summary = summarizeNoteBasic(raw);
  return NextResponse.json({ summary: summary || raw, engine: "basic", aiError: ai.error });
}
