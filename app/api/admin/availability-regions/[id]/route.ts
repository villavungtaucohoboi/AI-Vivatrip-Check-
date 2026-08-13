import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: { name?: string; sort_order?: number } = await req.json();

  const supabase = await createClient();
  const { error } = await supabase.from("availability_link_regions").update(body).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/availability-links");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from("availability_link_regions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/availability-links");
  return NextResponse.json({ ok: true });
}
