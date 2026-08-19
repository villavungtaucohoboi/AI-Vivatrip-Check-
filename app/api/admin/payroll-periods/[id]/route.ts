import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: { status: "draft" | "calculated" | "approved" | "locked"; actor?: string; reason?: string } =
    await req.json();

  const supabase = createServiceClient();
  const { data: current } = await supabase.from("payroll_periods").select("status").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Không tìm thấy kỳ lương." }, { status: 404 });

  const payload: Record<string, unknown> = { status: body.status };
  if (body.status === "locked") payload.locked_at = new Date().toISOString();

  const { error } = await supabase.from("payroll_periods").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.status === "locked" || (current.status === "locked" && body.status !== "locked")) {
    await supabase.from("payroll_audit_logs").insert({
      actor: body.actor?.trim() || "Admin",
      entity_type: "payroll_period",
      entity_id: id,
      field: "status",
      old_value: current.status,
      new_value: body.reason ? `${body.status} (lý do: ${body.reason})` : body.status,
    });

    await supabase.from("payslips").update({ status: body.status }).eq("payroll_period_id", id);
  }

  return NextResponse.json({ ok: true });
}
