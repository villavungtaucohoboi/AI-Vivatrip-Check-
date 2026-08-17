import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const body: { is_enabled: boolean; updated_by?: string } = await req.json();
  const supabase = await createClient();

  const { error } = await supabase
    .from("chat_settings")
    .update({ is_enabled: body.is_enabled, updated_by: body.updated_by?.trim() || null })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/admin/chat");
  return NextResponse.json({ ok: true });
}
