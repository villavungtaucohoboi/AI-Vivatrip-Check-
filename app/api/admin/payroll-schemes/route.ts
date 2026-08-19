import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const body: { name: string; department_id?: string; effective_from?: string } = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Vui lòng nhập tên cơ chế." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("salary_schemes")
    .insert({
      name: body.name.trim(),
      department_id: body.department_id || null,
      effective_from: body.effective_from || null,
      active: true,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
