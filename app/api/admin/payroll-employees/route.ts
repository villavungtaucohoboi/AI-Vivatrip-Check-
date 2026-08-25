import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/payroll-auth";
import { generateTempPassword } from "@/lib/generate-password";

export async function POST(req: NextRequest) {
  const body: {
    employee_code: string;
    full_name: string;
    position?: string;
    department_id?: string;
    salary_scheme_id?: string;
    base_salary?: number;
    default_allowance?: number;
    default_insurance?: number;
  } = await req.json();

  if (!body.employee_code?.trim() || !body.full_name?.trim()) {
    return NextResponse.json({ error: "Vui lòng nhập Mã nhân viên và Họ tên." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const code = body.employee_code.trim().toUpperCase();

  const { data: existing } = await supabase.from("employees").select("id").eq("employee_code", code).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `Mã nhân viên "${code}" đã tồn tại.` }, { status: 400 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const { data, error } = await supabase
    .from("employees")
    .insert({
      employee_code: code,
      full_name: body.full_name.trim(),
      position: body.position?.trim() || null,
      department_id: body.department_id || null,
      salary_scheme_id: body.salary_scheme_id || null,
      password_hash: passwordHash,
      must_change_password: true,
      base_salary: body.base_salary ?? 0,
      default_allowance: body.default_allowance ?? 0,
      default_insurance: body.default_insurance ?? 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("payroll_audit_logs").insert({
    actor: "Admin",
    entity_type: "employee",
    entity_id: data.id,
    field: "created",
    new_value: code,
  });

  return NextResponse.json({ id: data.id, tempPassword });
}
