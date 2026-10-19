import { NextRequest, NextResponse } from "next/server";
import { callAI, extractJSON } from "@/lib/ai-text";

// Dự phòng: sheet Excel của đối tác không theo dạng bảng chuẩn → nhờ AI đọc ngày đi / giá / com / số chỗ.
export const maxDuration = 60;

const PROMPT = `Đây là 1 sheet Excel lịch khởi hành tour của đối tác (mỗi dòng "R<số>: ô | ô | ..."; ô gộp đã được trải ra).
Trả về DUY NHẤT JSON: {"programs":[{"name":"tên chương trình","duration":"VD 5N4Đ","airline":"hãng bay","rows":[{"date":"YYYY-MM-DD","adult":giá bán người lớn,"old_adult":giá gạch hoặc null,"child":null hoặc giá,"infant":null hoặc giá,"com":hoa hồng đại lý/khách hoặc null,"seats":tổng chỗ hoặc null,"sold":đã bán hoặc null,"tag":"Noel"|"Tết DL"|null}]}]}
- Giá VNĐ đầy đủ. Ô có 2 giá (giá cũ gạch + giá mới) → adult = giá mới, old_adult = giá cũ.
- Chỉ có "còn nhận" → sold = seats - còn nhận.
- Ngày không ghi năm → năm gần nhất sau {TODAY}.
- Chỉ trả JSON.`;

export async function POST(req: NextRequest) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "Sheet trống." }, { status: 400 });
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const ai = await callAI(PROMPT.replace("{TODAY}", today), text, 16000, { json: true, maxInput: 60000 });
  if (!ai.text) return NextResponse.json({ error: `AI chưa đọc được (${ai.error ?? "không rõ"}).` }, { status: 422 });
  const d = extractJSON<{ programs?: unknown[] }>(ai.text);
  if (!d?.programs) return NextResponse.json({ error: "AI trả về sai định dạng." }, { status: 422 });
  return NextResponse.json(d);
}
