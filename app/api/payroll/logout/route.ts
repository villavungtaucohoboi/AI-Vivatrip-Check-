import { NextResponse } from "next/server";
import { destroyEmployeeSession } from "@/lib/payroll-auth";

export async function POST() {
  await destroyEmployeeSession();
  return NextResponse.json({ ok: true });
}
