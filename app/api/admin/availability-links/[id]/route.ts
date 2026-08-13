import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isValidUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: {
    region_id?: string;
    name?: string;
    url?: string;
    note?: string;
    is_active?: boolean;
    sort_order?: number;
    updated_by?: string;
  } = await req.json();

  if (body.url !== undefined && !isValidUrl(body.url)) {
    return NextResponse.json({ error: "Link không hợp lệ." }, { status: 400 });
  }

  const payload = {
    ...(body.region_id !== undefined && { region_id: body.region_id }),
    ...(body.name !== undefined && { name: body.name.trim() }),
    ...(body.url !== undefined && { url: body.url.trim() }),
    ...(body.note !== undefined && { note: body.note.trim() || null }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
    updated_by: body.updated_by?.trim() || null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("availability_links").update(payload).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/availability-links");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from("availability_links").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/availability-links");
  return NextResponse.json({ ok: true });
}
