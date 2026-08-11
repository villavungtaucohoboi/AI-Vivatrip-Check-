import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "vivatrip_admin";

// Phiên Admin đơn giản: 1 mật khẩu chung (đặt trong biến môi trường ADMIN_PASSWORD),
// không cần tài khoản/email. Cookie chỉ lưu lại đúng mật khẩu đó (httpOnly) để so
// khớp lại ở mỗi request — phù hợp cho công cụ nội bộ, không cần hệ thống user đầy đủ.
export async function isAdminSession(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return value === expected;
}
