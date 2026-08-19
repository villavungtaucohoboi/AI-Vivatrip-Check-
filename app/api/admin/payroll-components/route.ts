import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const body: {
    scheme_id: string;
    name: string;
    component_type: "income" | "deduction" | "info";
    calculation_type: "fixed" | "manual" | "percentage_tiered" | "quantity_rate";
    config_json?: Record<string, unknown>;
  } = await req.json();

  if (!body.scheme_id || !body.name?.trim()) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { count } = await supabase
    .from("salary_components")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", body.scheme_id);

  const defaultConfig =
    body.calculation_type === "percentage_tiered"
      ? { tiers: [{ min: 0, max: null, rate: 0 }] }
      : body.calculation_type === "fixed"
      ? { amount: 0 }
      : body.calculation_type === "quantity_rate"
      ? { rate: 0, unit: "" }
      : {};

  const { data, error } = await supabase
    .from("salary_components")
    .insert({
      scheme_id: body.scheme_id,
      name: body.name.trim(),
      component_type: body.component_type,
      calculation_type: body.calculation_type,
      config_json: body.config_json ?? defaultConfig,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
