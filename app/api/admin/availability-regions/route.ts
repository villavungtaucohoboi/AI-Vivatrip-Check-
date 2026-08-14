import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const {
    name,
    property_category,
    is_chain,
  }: { name: string; property_category?: "villa" | "khach_san_resort"; is_chain?: boolean } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Vui lòng nhập tên khu vực." }, { status: 400 });
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("availability_link_regions")
    .select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("availability_link_regions")
    .insert({
      name: name.trim(),
      property_category: property_category ?? "villa",
      is_chain: !!is_chain,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidatePath("/availability-links");
  return NextResponse.json({ id: data.id });
}
