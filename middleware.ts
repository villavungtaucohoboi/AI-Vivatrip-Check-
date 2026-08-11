import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Trang tìm sản phẩm / chi tiết sản phẩm: mở tự do, không cần mật khẩu.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Trang nhập mật khẩu Admin: luôn cho vào (tránh redirect loop).
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_PASSWORD;
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!expected || cookieValue !== expected) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
