// Quyết định của middleware (hàm thuần để test được).
//  - Tên miền báo giá cho khách (baogia.vivatrip.vn): CHỈ mở /bg/* + tài nguyên tĩnh — khách không lần ra trang nội bộ.
//  - Tên miền nội bộ: /bao-gia và /api/quotes cần mật khẩu sale hoặc phiên Admin.

export type RouteDecision =
  | { action: "next" }
  | { action: "notfound" }
  | { action: "redirect"; to: string }
  | { action: "unauthorized" };

const QUOTE_HOST_ALLOW = [/^\/bg\//, /^\/_next\//, /^\/brand\//, /^\/icons\//, /^\/favicon\.ico$/, /^\/manifest\.webmanifest$/];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

export function decideRoute(
  input: { host: string; pathname: string; search: string; sale: boolean; admin: boolean },
  quoteHost: string
): RouteDecision {
  // Bỏ cổng và dấu chấm cuối ("baogia.vivatrip.vn." cũng là cùng tên miền)
  const host = input.host.toLowerCase().split(":")[0].replace(/\.+$/, "");
  const { pathname } = input;

  if (host === quoteHost.toLowerCase().replace(/\.+$/, "")) {
    if (pathname === "/") return { action: "redirect", to: "https://vivatrip.vn" };
    return QUOTE_HOST_ALLOW.some((re) => re.test(pathname)) ? { action: "next" } : { action: "notfound" };
  }

  const ok = input.sale || input.admin;
  if (under(pathname, "/bao-gia")) {
    if (under(pathname, "/bao-gia/login") || ok) return { action: "next" };
    return { action: "redirect", to: `/bao-gia/login?next=${encodeURIComponent(pathname + input.search)}` };
  }
  if (under(pathname, "/api/quotes")) {
    if (under(pathname, "/api/quotes/login") || ok) return { action: "next" };
    return { action: "unauthorized" };
  }
  return { action: "next" };
}

/** Đường dẫn quay lại sau đăng nhập: chỉ nhận đường dẫn nội bộ (chặn "//x", "/\\x", "https://x"…) */
export function safeNext(next: string | null | undefined): string {
  if (!next || !/^\/(?![\/\\])/.test(next) || next.includes("\\")) return "/bao-gia";
  return next;
}
