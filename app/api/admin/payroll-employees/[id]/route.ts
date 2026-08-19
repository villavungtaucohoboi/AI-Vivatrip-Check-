import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: {
    full_name?: string;
    position?: string;
    department_id?: string | null;
    salary_scheme_id?: string | null;
    is_active?: boolean;
  } = await req.json();

  const payload: Record<string, unknown> = {};
  if (body.full_name !== undefined) payload.full_name = body.full_name.trim();
  if (body.position !== undefined) payload.position = body.position.trim() || null;
  if (body.department_id !== undefined) payload.department_id = body.department_id || null;
  if (body.salary_scheme_id !== undefined) payload.salary_scheme_id = body.salary_scheme_id || null;
  if (body.is_active !== undefined) payload.is_active = body.is_active;

  const supabase = createServiceClient();
  const { error } = await supabase.from("employees").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
