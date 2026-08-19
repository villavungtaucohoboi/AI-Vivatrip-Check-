import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: { name?: string; active?: boolean } = await req.json();

  const payload: Record<string, unknown> = {};
  if (body.name !== undefined) payload.name = body.name.trim();
  if (body.active !== undefined) payload.active = body.active;

  const supabase = createServiceClient();
  const { error } = await supabase.from("salary_schemes").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { count } = await supabase.from("employees").select("id", { count: "exact", head: true }).eq("salary_scheme_id", id);
  if (count && count > 0) {
    return NextResponse.json({ error: `Còn ${count} nhân viên đang dùng cơ chế này, không xoá được.` }, { status: 400 });
  }

  const { error } = await supabase.from("salary_schemes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
