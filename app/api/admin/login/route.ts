import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const { password }: { password: string } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "Chưa cấu hình mật khẩu Admin (thiếu biến môi trường ADMIN_PASSWORD)." },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Sai mật khẩu. Vui lòng thử lại." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 ngày
    path: "/",
  });
  return res;
}
