import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getEmployeeIdFromSession, hashPassword, verifyPassword } from "@/lib/payroll-auth";

export async function POST(req: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." }, { status: 401 });
  }

  const body: { currentPassword?: string; newPassword?: string } = await req.json();
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Mật khẩu mới cần ít nhất 6 ký tự." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, password_hash")
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
  }

  const ok = await verifyPassword(currentPassword, employee.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Mật khẩu hiện tại không đúng." }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  const { error } = await supabase
    .from("employees")
    .update({ password_hash: newHash, must_change_password: false })
    .eq("id", employeeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
