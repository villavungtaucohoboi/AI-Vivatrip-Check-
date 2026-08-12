import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { name, default_year } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Vui lòng nhập tên Sheet." }, { status: 400 });
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("holiday_fund_sheets")
    .select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("holiday_fund_sheets")
    .insert({
      name: name.trim(),
      default_year: default_year || new Date().getFullYear(),
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
