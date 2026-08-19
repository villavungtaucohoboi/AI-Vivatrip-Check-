import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const body: { month: number; year: number } = await req.json();
  if (!body.month || !body.year) {
    return NextResponse.json({ error: "Vui lòng chọn tháng/năm." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("payroll_periods")
    .select("id")
    .eq("month", body.month)
    .eq("year", body.year)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Kỳ lương này đã tồn tại." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("payroll_periods")
    .insert({ month: body.month, year: body.year, status: "draft" })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
