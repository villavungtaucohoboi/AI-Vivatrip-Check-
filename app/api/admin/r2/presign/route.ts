import { NextRequest, NextResponse } from "next/server";
import { presignPut, r2Ready } from "@/lib/r2";

// Cấp link up ảnh thẳng lên R2 (đường dẫn /api/admin/... đã được middleware khoá bằng mật khẩu Admin).
export async function POST(req: NextRequest) {
  const err = r2Ready();
  if (err) return NextResponse.json({ error: err }, { status: 500 });
  const { keys } = (await req.json().catch(() => ({}))) as { keys?: string[] };
  const list = (keys ?? []).filter((k) => /^[a-z0-9][a-z0-9/_.-]{3,200}$/.test(k) && !k.includes("..")).slice(0, 200);
  if (!list.length) return NextResponse.json({ error: "Thiếu tên file." }, { status: 400 });
  return NextResponse.json({ urls: Object.fromEntries(list.map((k) => [k, presignPut(k)])) });
}
