import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Xoá tour (ngày khởi hành xoá theo). PATCH {hidden} để ẩn / hiện.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("tours").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/tours");
  revalidatePath("/admin/tours");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { hidden?: boolean };
  const supabase = await createClient();
  const { error } = await supabase.from("tours").update({ hidden: !!body.hidden }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/tours");
  revalidatePath("/admin/tours");
  return NextResponse.json({ ok: true });
}
