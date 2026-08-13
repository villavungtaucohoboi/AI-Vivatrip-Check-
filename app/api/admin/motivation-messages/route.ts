import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.message?.trim() || !body.action_text?.trim() || !body.category) {
    return NextResponse.json({ error: "Vui lòng nhập đủ thông điệp, hành động và category." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("motivation_messages").insert({
    category: body.category,
    message: body.message.trim(),
    action_text: body.action_text.trim(),
    is_active: body.is_active ?? true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/admin/motivation");
  return NextResponse.json({ ok: true });
}
