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
    base_salary?: number;
    default_allowance?: number;
    default_insurance?: number;
    join_date?: string | null;
    date_of_birth?: string | null;
  } = await req.json();

  const payload: Record<string, unknown> = {};
  if (body.full_name !== undefined) payload.full_name = body.full_name.trim();
  if (body.position !== undefined) payload.position = body.position.trim() || null;
  if (body.department_id !== undefined) payload.department_id = body.department_id || null;
  if (body.salary_scheme_id !== undefined) payload.salary_scheme_id = body.salary_scheme_id || null;
  if (body.is_active !== undefined) payload.is_active = body.is_active;
  if (body.base_salary !== undefined) payload.base_salary = body.base_salary;
  if (body.default_allowance !== undefined) payload.default_allowance = body.default_allowance;
  if (body.default_insurance !== undefined) payload.default_insurance = body.default_insurance;
  if (body.join_date !== undefined) payload.join_date = body.join_date || null;
  if (body.date_of_birth !== undefined) payload.date_of_birth = body.date_of_birth || null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("employees").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mode = req.nextUrl.searchParams.get("mode") === "hard" ? "hard" : "soft";
  const supabase = createServiceClient();

  if (mode === "soft") {
    // Vô hiệu hoá — GIỮ NGUYÊN toàn bộ lịch sử lương, chỉ chặn không cho
    // đăng nhập nữa và ẩn khỏi danh sách nhân viên đang hoạt động.
    const { error } = await supabase.from("employees").update({ is_active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    // Xoá hẳn — payslips.employee_id có on delete cascade nên toàn bộ lịch
    // sử lương của người này cũng bị xoá theo, không khôi phục được.
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("payroll_audit_logs").insert({
    actor: "Admin",
    entity_type: "employee",
    entity_id: mode === "hard" ? null : id,
    field: mode === "hard" ? "deleted_with_history" : "deactivated_kept_history",
    old_value: id,
  });

  return NextResponse.json({ ok: true });
}
