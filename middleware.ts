import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { decideRoute } from "@/lib/route-guard";
import { SALE_COOKIE, isSaleTokenValid } from "@/lib/sale-auth";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const expectedAdmin = process.env.ADMIN_PASSWORD;
  const isAdmin = !!expectedAdmin && request.cookies.get(ADMIN_COOKIE_NAME)?.value === expectedAdmin;

  // 1) Tên miền báo giá cho khách + khu soạn báo giá (mật khẩu chung cho sale)
  const needsSaleCheck = pathname.startsWith("/bao-gia") || pathname.startsWith("/api/quotes");
  const isSale = needsSaleCheck ? await isSaleTokenValid(request.cookies.get(SALE_COOKIE)?.value, process.env.SALE_PASSWORD) : false;
  const decision = decideRoute(
    { host: request.headers.get("host") ?? "", pathname, search, sale: isSale, admin: isAdmin },
    process.env.QUOTE_HOST || "baogia.vivatrip.vn"
  );
  if (decision.action === "notfound") return new NextResponse("Không tìm thấy trang", { status: 404 });
  if (decision.action === "unauthorized") return NextResponse.json({ error: "Chưa đăng nhập báo giá" }, { status: 401 });
  if (decision.action === "redirect") return NextResponse.redirect(new URL(decision.to, request.url));

  // 2) Khu Admin (giữ nguyên như trước)
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
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

  if (!isAdmin) {
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
  // Chạy cho mọi đường dẫn (trừ file build tĩnh) để chặn được tên miền báo giá.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
