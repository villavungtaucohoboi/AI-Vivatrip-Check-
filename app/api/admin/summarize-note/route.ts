import { NextRequest, NextResponse } from "next/server";
import { summarizeNoteBasic } from "@/lib/villa-text";

// Rút gọn nội dung căn khi Admin dán nguyên bài từ chủ nhà / Facebook / Zalo.
// - Có biến môi trường ANTHROPIC_API_KEY (Vercel → Settings → Environment
//   Variables) → dùng AI Claude tóm tắt (rất rẻ, ~vài chục đồng/lần).
// - Có GEMINI_API_KEY (Google AI Studio, có gói miễn phí) → dùng Gemini.
// - Không có → dùng bộ lọc tự viết (miễn phí), vẫn bỏ được emoji, hashtag,
//   câu quảng cáo, dòng trùng.
// Route nằm dưới /api/admin nên đã được middleware bảo vệ bằng mật khẩu Admin.

const PROMPT = `Bạn là trợ lý viết nội dung cho đội sale du lịch VivaTrip. Viết lại nội dung giới thiệu villa dưới đây thành ghi chú NGẮN GỌN, HẤP DẪN, ĐỦ Ý, theo ĐÚNG khung cố định sau (bỏ mục nào không có thông tin, giữ nguyên tiêu đề mục kể cả emoji):

🏡 KHÔNG GIAN
🎉 TIỆN ÍCH
📍 VỊ TRÍ & VIEW
⏰ NHẬN – TRẢ PHÒNG
📌 CHÍNH SÁCH
✨ ĐIỂM CỘNG

Quy tắc:
- Dưới mỗi tiêu đề, mỗi dòng 1 ý, BẮT ĐẦU bằng 1 emoji đúng nghĩa (VD 🛏️ phòng ngủ, 🚿 WC, 🏊 hồ bơi, 🎤 karaoke, 🍖 BBQ, 🎱 bida, 🏓 pickleball, 🍳 bếp, 🌅 view, 🏞️ thiên nhiên, 📍 khoảng cách, 🕑 giờ, 💵 phụ thu, 🧾 cọc/huỷ, 👶 trẻ em, 🐾 thú cưng, ⚠️ lưu ý).
- Mỗi dòng tối đa 15 chữ, giọng văn tươi vui, gợi cảm giác muốn ở, nhưng CHỈ dùng thông tin có trong bài, KHÔNG bịa.
- Bỏ lời chào, hashtag, số điện thoại, link, câu "inbox ngay".
- Giữ nguyên các con số (phòng, giường, khách, giá, giờ, km, m2).
- Các mục cách nhau 1 dòng trống. Chỉ trả về nội dung theo khung, không thêm lời dẫn.`;

export async function POST(req: NextRequest) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  const raw = (text ?? "").trim();
  if (!raw) return NextResponse.json({ error: "Chưa có nội dung để rút gọn." }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
          max_tokens: 700,
          messages: [{ role: "user", content: `${PROMPT}\n\nNỘI DUNG GỐC:\n"""\n${raw.slice(0, 12000)}\n"""` }],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        const out = data.content?.find((c) => c.type === "text")?.text?.trim();
        if (out) return NextResponse.json({ summary: out, engine: "ai" });
      }
    } catch {
      // lỗi mạng / hết hạn mức → rơi xuống bản miễn phí
    }
  }

  // Gemini (Google AI Studio) — có gói MIỄN PHÍ, giới hạn số lượt/phút & /ngày.
  const gemini = process.env.GEMINI_API_KEY;
  if (gemini) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(gemini)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\nNỘI DUNG GỐC:\n"""\n${raw.slice(0, 12000)}\n"""` }] }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.2 },
          }),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const out = data.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("").trim();
        if (out) return NextResponse.json({ summary: out, engine: "ai" });
      }
    } catch {
      // hết lượt miễn phí / lỗi mạng → dùng bản lọc miễn phí bên dưới
    }
  }

  const summary = summarizeNoteBasic(raw);
  return NextResponse.json({ summary: summary || raw, engine: "basic" });
}
