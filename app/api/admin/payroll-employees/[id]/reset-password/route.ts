import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/payroll-auth";
import { generateTempPassword } from "@/lib/generate-password";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const { error } = await supabase
    .from("employees")
    .update({ password_hash: passwordHash, must_change_password: true })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("payroll_audit_logs").insert({
    actor: "Admin",
    entity_type: "employee",
    entity_id: id,
    field: "password_reset",
  });

  return NextResponse.json({ tempPassword });
}
