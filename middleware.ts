import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  // Trang tìm sản phẩm / chi tiết sản phẩm: mở tự do, không cần mật khẩu.
  if (!isAdminArea) {
    return NextResponse.next();
  }

  // Trang / API đăng nhập Admin: luôn cho vào (tránh redirect loop / tự khoá chính nó).
  if (pathname.startsWith("/admin/login") || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_PASSWORD;
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!expected || cookieValue !== expected) {
    // API routes: trả lỗi 401 thay vì redirect (không có trang để chuyển tới).
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Chưa đăng nhập Admin" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
