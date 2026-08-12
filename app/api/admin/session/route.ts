import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const isAdmin = await isAdminSession();
  return NextResponse.json({ isAdmin });
}
