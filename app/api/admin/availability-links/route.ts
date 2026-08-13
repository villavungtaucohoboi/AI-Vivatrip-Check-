import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isValidUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

export async function POST(req: NextRequest) {
  const body: {
    region_id: string;
    name: string;
    url: string;
    note?: string;
    is_active: boolean;
    updated_by?: string;
  } = await req.json();

  if (!body.region_id || !body.name?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }
  if (!isValidUrl(body.url)) {
    return NextResponse.json({ error: "Link không hợp lệ." }, { status: 400 });
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("availability_links")
    .select("id", { count: "exact", head: true })
    .eq("region_id", body.region_id);

  const { data, error } = await supabase
    .from("availability_links")
    .insert({
      region_id: body.region_id,
      name: body.name.trim(),
      url: body.url.trim(),
      note: body.note?.trim() || null,
      is_active: body.is_active,
      sort_order: count ?? 0,
      created_by: body.updated_by?.trim() || null,
      updated_by: body.updated_by?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/availability-links");
  return NextResponse.json({ id: data.id });
}
