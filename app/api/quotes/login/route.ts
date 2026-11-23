import { NextRequest, NextResponse } from "next/server";
import { SALE_COOKIE, saleToken } from "@/lib/sale-auth";

// Đăng nhập khu soạn báo giá bằng mật khẩu chung cho sale (biến môi trường SALE_PASSWORD).
export async function POST(req: NextRequest) {
  const expected = process.env.SALE_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Chưa cấu hình mật khẩu sale (SALE_PASSWORD)." }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (typeof body.password !== "string" || body.password !== expected) {
    return NextResponse.json({ error: "Sai mật khẩu. Vui lòng thử lại." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SALE_COOKIE, await saleToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

// Đăng xuất
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SALE_COOKIE);
  return res;
}
