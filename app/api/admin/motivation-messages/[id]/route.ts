import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const payload: Record<string, unknown> = {};
  if (body.message !== undefined) payload.message = body.message.trim();
  if (body.action_text !== undefined) payload.action_text = body.action_text.trim();
  if (body.category !== undefined) payload.category = body.category;
  if (body.is_active !== undefined) payload.is_active = !!body.is_active;

  const supabase = await createClient();
  const { error } = await supabase.from("motivation_messages").update(payload).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/admin/motivation");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from("motivation_messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/admin/motivation");
  return NextResponse.json({ ok: true });
}
