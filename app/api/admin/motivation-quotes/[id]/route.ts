import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const payload: Record<string, unknown> = {};
  if (body.quote_text_original !== undefined) payload.quote_text_original = body.quote_text_original?.trim() || null;
  if (body.quote_text_vi !== undefined) payload.quote_text_vi = body.quote_text_vi.trim();
  if (body.author !== undefined) payload.author = body.author?.trim() || null;
  if (body.source_reference !== undefined) payload.source_reference = body.source_reference?.trim() || null;
  if (body.category !== undefined) payload.category = body.category;
  if (body.is_verified !== undefined) payload.is_verified = !!body.is_verified;
  if (body.is_active !== undefined) payload.is_active = !!body.is_active;

  const supabase = await createClient();
  const { error } = await supabase.from("motivation_quotes").update(payload).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/admin/motivation");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from("motivation_quotes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/admin/motivation");
  return NextResponse.json({ ok: true });
}
