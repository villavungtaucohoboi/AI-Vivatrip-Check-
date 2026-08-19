import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: {
    name?: string;
    config_json?: Record<string, unknown>;
    active?: boolean;
    include_in_net_pay?: boolean;
  } = await req.json();

  const payload: Record<string, unknown> = {};
  if (body.name !== undefined) payload.name = body.name.trim();
  if (body.config_json !== undefined) payload.config_json = body.config_json;
  if (body.active !== undefined) payload.active = body.active;
  if (body.include_in_net_pay !== undefined) payload.include_in_net_pay = body.include_in_net_pay;

  const supabase = createServiceClient();
  const { error } = await supabase.from("salary_components").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("salary_components").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
