import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { EMPLOYEE_COOKIE_NAME } from "@/lib/payroll-constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isPayrollArea = pathname.startsWith("/payroll") || pathname.startsWith("/api/payroll");

  if (isPayrollArea) {
    // Trang/API đăng nhập nhân viên: luôn cho vào, không cần phiên.
    if (pathname.startsWith("/payroll/login") || pathname === "/api/payroll/login") {
      return NextResponse.next();
    }

    // Middleware chỉ kiểm tra NHANH có cookie hay không (để redirect sớm,
    // đỡ tải trang thừa) — việc XÁC MINH CHỮ KÝ thật sự (chống giả mạo) luôn
    // được làm lại đầy đủ ở chính route/page (getEmployeeIdFromSession),
    // nên bảo mật không phụ thuộc vào riêng bước này.
    const hasSessionCookie = !!request.cookies.get(EMPLOYEE_COOKIE_NAME)?.value;

    if (!hasSessionCookie) {
      if (pathname.startsWith("/api/payroll")) {
        return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/payroll/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Trang tìm sản phẩm / chi tiết sản phẩm: mở tự do, không cần mật khẩu.
  if (!isAdminArea) {
    return NextResponse.next();
  }

  // Trang / API đăng nhập Admin, và API kiểm tra phiên (dùng để hiện/ẩn nút
  // Admin phía client) — luôn cho vào, không cần mật khẩu.
  if (
    pathname.startsWith("/admin/login") ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/session"
  ) {
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
  matcher: ["/admin/:path*", "/api/admin/:path*", "/payroll/:path*", "/api/payroll/:path*"],
};
