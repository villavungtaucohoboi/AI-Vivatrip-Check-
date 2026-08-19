import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createEmployeeSession, verifyPassword } from "@/lib/payroll-auth";

export async function POST(req: NextRequest) {
  const body: { employeeCode?: string; password?: string } = await req.json();
  const employeeCode = body.employeeCode?.trim().toUpperCase();
  const password = body.password ?? "";

  if (!employeeCode || !password) {
    return NextResponse.json({ error: "Vui lòng nhập mã nhân viên và mật khẩu." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, password_hash, is_active, must_change_password, full_name")
    .eq("employee_code", employeeCode)
    .maybeSingle();

  // Không tiết lộ "mã NV không tồn tại" hay "sai mật khẩu" khác nhau — tránh
  // lộ danh sách mã nhân viên hợp lệ cho người dò quét.
  const genericError = { error: "Mã nhân viên hoặc mật khẩu không đúng." };

  if (!employee || !employee.is_active) {
    return NextResponse.json(genericError, { status: 401 });
  }

  const ok = await verifyPassword(password, employee.password_hash);
  if (!ok) {
    return NextResponse.json(genericError, { status: 401 });
  }

  await createEmployeeSession(employee.id);

  return NextResponse.json({
    ok: true,
    fullName: employee.full_name,
    mustChangePassword: employee.must_change_password,
  });
}
