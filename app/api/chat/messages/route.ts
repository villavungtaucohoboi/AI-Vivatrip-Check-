import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_LENGTH = 500;

export async function POST(req: NextRequest) {
  const body: { nickname?: string; message?: string } = await req.json();
  const nickname = body.nickname?.trim().slice(0, 30);
  const message = body.message?.trim().slice(0, MAX_LENGTH);

  if (!nickname || !message) {
    return NextResponse.json({ error: "Thiếu biệt danh hoặc nội dung." }, { status: 400 });
  }

  const supabase = await createClient();

  // Kiểm tra chat có đang bị Admin khoá không — chặn ở server, không chỉ ẩn
  // nút gửi trên giao diện (tránh gửi được bằng cách gọi API trực tiếp).
  const { data: settings } = await supabase.from("chat_settings").select("is_enabled").eq("id", 1).single();
  if (settings && settings.is_enabled === false) {
    return NextResponse.json({ error: "Chat đang tạm khoá." }, { status: 403 });
  }

  const { error } = await supabase.from("team_chat_messages").insert({ nickname, message });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
